/*
  Opta WiFi - MQTT status + remote control (Arduino IDE, not the PLC IDE)

  Library: ArduinoMqttClient (Library Manager)

  PUBLISHES
    opta/outputs  JSON every 5 s and right after every command, e.g.
      {"seq":5,"up_s":150,"rssi":-42,
       "outputs":{"D0":0,"D1":1,"D2":0,"D3":0},
       "leds":{"L0":0,"L1":1,"L2":0,"L3":0},
       "i1":{"volts":5.12,"temp_c":26.8,"fault":0},
       "inputs":{"I2":1,"I3":0,"I4":0,"I5":0,"I6":0,"I7":1,"I8":0}}

      I1 is an ANALOG input for the RTD temperature transmitter (volts and
      temperature in degrees C; temp_c is null and fault is 1 if the signal is
      out of range). I2..I8 are digital inputs.
    opta/status   "online" (retained) when connected,
                  "offline" (retained) via MQTT last-will if the Opta drops

  SUBSCRIBES
    opta/cmd      text commands "<TARGET> <ACTION>", case-insensitive:
      TARGET : D0..D3   relay output AND its status LED together
               LED0..LED3  status LED only (relay is not touched)
               ALL        all 4 relays and LEDs
      ACTION : ON | OFF | TOGGLE   (also 1 | 0)
    Examples:  "LED0 ON"   "LED2 OFF"   "D1 TOGGLE"   "ALL OFF"

  Do NOT publish commands with the retain flag, or the last command is
  re-applied on every reconnect.
*/

#include <WiFi.h>
#include <WiFiSSLClient.h>
#include <ArduinoMqttClient.h>
#include <string.h>
#include <ctype.h>

// ---------- logging that can never block the sketch ----------
// 1 = print to the USB serial monitor, but ONLY while a monitor is open
// 0 = no serial output at all (use this to test the Opta powered from 24 V only)
#define DEBUG_SERIAL 1
#if DEBUG_SERIAL
  #define LOG(x)   do { if (Serial) Serial.print(x); } while (0)
  #define LOGLN(x) do { if (Serial) Serial.println(x); } while (0)
#else
  #define LOG(x)   do {} while (0)
  #define LOGLN(x) do {} while (0)
#endif

// ======================= USER SETTINGS =======================
// The original field values are deliberately not stored in Git.
const char* WIFI_SSID = "CHANGE_ME";
const char* WIFI_PASS = "CHANGE_ME";

const char* MQTT_HOST = "CHANGE_ME";
const int   MQTT_PORT = 8883;
const char* MQTT_USER = "CHANGE_ME";
const char* MQTT_PASS = "CHANGE_ME";
const char* MQTT_CLIENT_ID = "CHANGE_ME";

const char* TOPIC_OUTPUTS = "opta/outputs";   // user needs PUBLISH permission
const char* TOPIC_STATUS  = "opta/status";    // user needs PUBLISH permission
const char* TOPIC_CMD     = "opta/cmd";       // user needs SUBSCRIBE permission

const uint32_t PUBLISH_INTERVAL_MS = 5000;
const uint32_t KEEPALIVE_S         = 60;

// ---- RTD temperature transmitter on input I1 (analog) ----
// The transmitter output (voltage at the Opta input) maps linearly to the temperature range.
// Default assumption: 0-10 V output = -50..100 degC. Change SIGNAL_V_MIN/MAX to match yours.
const float TEMP_MIN_C     = -50.0;   // temperature at SIGNAL_V_MIN
const float TEMP_MAX_C     = 100.0;   // temperature at SIGNAL_V_MAX
const float SIGNAL_V_MIN   = 0.0;     // volts at TEMP_MIN_C
const float SIGNAL_V_MAX   = 10.0;    // volts at TEMP_MAX_C
const float FAULT_MARGIN_V = 0.5;     // outside [V_MIN - margin, V_MAX + margin] = sensor fault
// =============================================================

// Opta WiFi: 4 relay outputs D0..D3 (front labels O1..O4), a status LED each (LED_D0..LED_D3)
const uint8_t NUM_OUT = 4;
const uint8_t RELAY_PIN[NUM_OUT] = { D0, D1, D2, D3 };
const uint8_t LED_PIN[NUM_OUT]   = { LED_D0, LED_D1, LED_D2, LED_D3 };
bool relayState[NUM_OUT] = { false, false, false, false };
bool ledState[NUM_OUT]   = { false, false, false, false };

// 8 digital-capable inputs I1..I8 on A0..A7
const uint8_t NUM_IN = 8;
const uint8_t INPUT_PIN[NUM_IN] = { A0, A1, A2, A3, A4, A5, A6, A7 };

// I1 (A0) is used as an ANALOG input for the RTD transmitter, so only I2..I8 are read digitally.
const uint8_t RTD_PIN     = A0;
const uint8_t RTD_SAMPLES = 16;          // readings averaged per measurement
const float   RTD_ADC_VREF    = 3.3;     // Opta ADC reference
const float   RTD_ADC_RES     = 4095.0;  // 12-bit resolution
const float   RTD_ADC_DIVIDER = 0.3034;  // Opta input voltage divider

WiFiSSLClient sslClient;           // created once, reused forever
MqttClient    mqttClient(sslClient);

uint32_t seqNo = 0;
uint32_t lastPublish = 0;
uint32_t nextAttempt = 0;
uint32_t wifiBeginMs = 0;
bool     wifiBegun = false;
int      mqttFails = 0;
bool     publishNow = false;        // set by commands, handled in loop()

// ---------- outputs ----------
void setLed(uint8_t i, bool on) {
  if (i >= NUM_OUT) return;
  ledState[i] = on;
  digitalWrite(LED_PIN[i], on ? HIGH : LOW);
}

void setOutput(uint8_t i, bool on) {      // relay + its LED together
  if (i >= NUM_OUT) return;
  relayState[i] = on;
  digitalWrite(RELAY_PIN[i], on ? HIGH : LOW);
  setLed(i, on);
}

// ---------- command handling ----------
// returns 1 = ON, 0 = OFF, 2 = TOGGLE, -1 = invalid
int parseAction(const char* a) {
  if (!strcmp(a, "ON") || !strcmp(a, "1") || !strcmp(a, "TRUE")) return 1;
  if (!strcmp(a, "OFF") || !strcmp(a, "0") || !strcmp(a, "FALSE")) return 0;
  if (!strcmp(a, "TOGGLE") || !strcmp(a, "T")) return 2;
  return -1;
}

bool nextState(bool current, int action) {
  return (action == 2) ? !current : (action == 1);
}

void handleCommand(char* cmd) {
  for (char* p = cmd; *p; p++) *p = (char)toupper((unsigned char)*p);

  char* target = strtok(cmd, " \t\r\n:=,");
  char* actionStr = strtok(NULL, " \t\r\n:=,");
  if (!target || !actionStr) {
    LOGLN("  Ignored: expected '<TARGET> <ACTION>'");
    return;
  }
  int action = parseAction(actionStr);
  if (action < 0) {
    LOGLN("  Ignored: action must be ON, OFF or TOGGLE");
    return;
  }

  if (!strcmp(target, "ALL")) {
    for (uint8_t i = 0; i < NUM_OUT; i++) setOutput(i, nextState(relayState[i], action));
  } else if (target[0] == 'D' && target[1] >= '0' && target[1] <= '3' && target[2] == 0) {
    uint8_t i = target[1] - '0';
    setOutput(i, nextState(relayState[i], action));
  } else if (!strncmp(target, "LED", 3) && target[3] >= '0' && target[3] <= '3' && target[4] == 0) {
    uint8_t i = target[3] - '0';
    setLed(i, nextState(ledState[i], action));
  } else {
    LOGLN("  Ignored: unknown target (use D0-D3, LED0-LED3 or ALL)");
    return;
  }

  LOGLN("  Command applied.");
  publishNow = true;   // report the new state right away (from loop, not from the callback)
}

// called by mqttClient.poll() when a message arrives on a subscribed topic
void onMqttMessage(int messageSize) {
  static char cmdBuf[48];
  uint8_t n = 0;
  while (mqttClient.available()) {
    int c = mqttClient.read();
    if (c < 0) break;
    if (n < sizeof(cmdBuf) - 1) cmdBuf[n++] = (char)c;   // extra bytes are dropped
  }
  cmdBuf[n] = 0;
  LOG("Command received: "); LOGLN(cmdBuf);
  handleCommand(cmdBuf);
}

// ---------- MQTT helpers ----------
bool publishText(const char* topic, const char* text, bool retain) {
  if (!mqttClient.beginMessage(topic, (unsigned long)strlen(text), retain, 0)) return false;
  mqttClient.print(text);
  return mqttClient.endMessage() == 1;
}

void dropConnection() {
  mqttClient.stop();
  sslClient.stop();
}

// ---------- RTD transmitter on I1 ----------
float readRtdVolts() {
  uint32_t sum = 0;
  for (uint8_t k = 0; k < RTD_SAMPLES; k++) sum += analogRead(RTD_PIN);
  float raw = (float)sum / RTD_SAMPLES;
  return raw * (RTD_ADC_VREF / RTD_ADC_RES) / RTD_ADC_DIVIDER;
}

// Writes a fixed-point number without needing float printf support,
// e.g. v = -123, dec = 1 -> "-12.3"
void fmtFixed(char* out, size_t n, long v, uint8_t dec) {
  long scale = (dec == 1) ? 10 : 100;
  long a = (v < 0) ? -v : v;
  if (dec == 1) snprintf(out, n, "%s%ld.%01ld", (v < 0) ? "-" : "", a / scale, a % scale);
  else          snprintf(out, n, "%s%ld.%02ld", (v < 0) ? "-" : "", a / scale, a % scale);
}

// Reads I1 and fills the JSON text pieces for volts and temperature
void readRtd(char* voltsStr, char* tempStr, size_t n, int* fault) {
  float v = readRtdVolts();
  fmtFixed(voltsStr, n, lroundf(v * 100.0f), 2);

  bool bad = (v < SIGNAL_V_MIN - FAULT_MARGIN_V) || (v > SIGNAL_V_MAX + FAULT_MARGIN_V);
  *fault = bad ? 1 : 0;
  if (bad) {
    snprintf(tempStr, n, "null");
  } else {
    float t = TEMP_MIN_C + (v - SIGNAL_V_MIN) * (TEMP_MAX_C - TEMP_MIN_C) / (SIGNAL_V_MAX - SIGNAL_V_MIN);
    fmtFixed(tempStr, n, lroundf(t * 10.0f), 1);
  }
}

void publishOutputs() {
  static char payload[480];   // static buffer: no heap allocation

  int in[NUM_IN] = { 0 };     // digital inputs I2..I8 are read live from the hardware
  for (uint8_t i = 1; i < NUM_IN; i++) {
    in[i] = (digitalRead(INPUT_PIN[i]) == HIGH) ? 1 : 0;
  }

  char voltsStr[12], tempStr[12];
  int rtdFault = 0;
  readRtd(voltsStr, tempStr, sizeof(voltsStr), &rtdFault);

  snprintf(payload, sizeof(payload),
           "{\"seq\":%lu,\"up_s\":%lu,\"rssi\":%d,"
           "\"outputs\":{\"D0\":%d,\"D1\":%d,\"D2\":%d,\"D3\":%d},"
           "\"leds\":{\"L0\":%d,\"L1\":%d,\"L2\":%d,\"L3\":%d},"
           "\"i1\":{\"volts\":%s,\"temp_c\":%s,\"fault\":%d},"
           "\"inputs\":{\"I2\":%d,\"I3\":%d,\"I4\":%d,\"I5\":%d,\"I6\":%d,\"I7\":%d,\"I8\":%d}}",
           (unsigned long)(seqNo + 1),
           (unsigned long)(millis() / 1000),
           (int)WiFi.RSSI(),
           relayState[0] ? 1 : 0, relayState[1] ? 1 : 0, relayState[2] ? 1 : 0, relayState[3] ? 1 : 0,
           ledState[0] ? 1 : 0,   ledState[1] ? 1 : 0,   ledState[2] ? 1 : 0,   ledState[3] ? 1 : 0,
           voltsStr, tempStr, rtdFault,
           in[1], in[2], in[3], in[4], in[5], in[6], in[7]);

  if (publishText(TOPIC_OUTPUTS, payload, false)) {
    seqNo++;
    LOG("Published: "); LOGLN(payload);
  } else {
    LOGLN("Publish FAILED, reconnecting...");
    dropConnection();
    nextAttempt = millis() + 2000;
  }
}

// ---------- connection stage on the 4 status LEDs (visible without USB) ----------
//  No Wi-Fi             : LED0 blinks, LED1-3 off
//  Wi-Fi OK, no MQTT    : LED0 steady on, LED1 blinks
//  MQTT connected       : LEDs show the commanded state again
// (a blocking Wi-Fi/TLS call can freeze a blink for a few seconds)
void showStage(uint8_t stage) {   // 0 = no Wi-Fi, 1 = Wi-Fi only
  bool blink = ((millis() / 500) % 2) == 1;
  for (uint8_t i = 0; i < NUM_OUT; i++) digitalWrite(LED_PIN[i], LOW);
  if (stage == 0) {
    digitalWrite(LED_PIN[0], blink ? HIGH : LOW);
  } else {
    digitalWrite(LED_PIN[0], HIGH);
    digitalWrite(LED_PIN[1], blink ? HIGH : LOW);
  }
}

void restoreLeds() {
  for (uint8_t i = 0; i < NUM_OUT; i++) digitalWrite(LED_PIN[i], ledState[i] ? HIGH : LOW);
}

// ---------- connection handling (no long blocking waits) ----------
void handleWifi() {
  uint32_t now = millis();
  if (!wifiBegun || now - wifiBeginMs > 20000) {
    if (now < nextAttempt) return;
    LOG("Connecting to Wi-Fi SSID: "); LOGLN(WIFI_SSID);
    dropConnection();
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    wifiBegun = true;
    wifiBeginMs = millis();
    nextAttempt = millis() + 1000;
  }
  if (WiFi.status() == WL_CONNECTED && WiFi.localIP() != IPAddress(0, 0, 0, 0)) {
    LOG("Wi-Fi connected, IP: "); LOG(WiFi.localIP());
    LOG(", RSSI: "); LOG(WiFi.RSSI()); LOGLN(" dBm");
    nextAttempt = millis() + 3000;   // let the network stack settle before the first connect
  }
}

void handleMqttConnect() {
  if (millis() < nextAttempt) return;

  LOG("Connecting to MQTT broker "); LOG(MQTT_HOST); LOGLN(" ...");
  dropConnection();

  mqttClient.setId(MQTT_CLIENT_ID);
  mqttClient.setUsernamePassword(MQTT_USER, MQTT_PASS);
  mqttClient.setKeepAliveInterval(KEEPALIVE_S * 1000UL);
  mqttClient.setConnectionTimeout(10 * 1000UL);

  // last-will: the broker publishes "offline" if the Opta disappears
  mqttClient.beginWill(TOPIC_STATUS, true, 0);
  mqttClient.print("offline");
  mqttClient.endWill();

  if (mqttClient.connect(MQTT_HOST, MQTT_PORT)) {
    LOGLN("MQTT connected.");
    mqttFails = 0;
    restoreLeds();

    // subscriptions are lost on every new connection, so subscribe each time
    if (mqttClient.subscribe(TOPIC_CMD)) {
      LOG("Subscribed to "); LOGLN(TOPIC_CMD);
    } else {
      LOGLN("Subscribe FAILED (check the user's SUBSCRIBE permission in EMQX)");
    }

    publishText(TOPIC_STATUS, "online", true);
    publishNow = true;   // publish the current state right away
  } else {
    LOG("MQTT connect failed, error code = ");
    LOGLN(mqttClient.connectError());
    nextAttempt = millis() + 5000;
    if (++mqttFails >= 5) {                  // repeated failures: restart Wi-Fi too
      LOGLN("Too many failures, restarting Wi-Fi.");
      mqttFails = 0;
      wifiBegun = false;
    }
  }
}

// ---------- setup / loop ----------
void setup() {
#if DEBUG_SERIAL
  Serial.begin(115200);
  uint32_t t0 = millis();
  while (!Serial && millis() - t0 < 3000) { delay(10); }   // bounded wait
#endif
  LOGLN("\nOpta MQTT status + control starting");

  for (uint8_t i = 0; i < NUM_OUT; i++) {
    pinMode(RELAY_PIN[i], OUTPUT);
    pinMode(LED_PIN[i], OUTPUT);
    setOutput(i, false);   // start with everything off
  }
  for (uint8_t i = 1; i < NUM_IN; i++) {   // I2..I8 digital; I1 is analog (RTD)
    pinMode(INPUT_PIN[i], INPUT);
  }
  analogReadResolution(12);   // 12-bit ADC for the RTD input
  analogRead(RTD_PIN);        // first reading is discarded

  mqttClient.onMessage(onMqttMessage);   // register the command callback once
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    showStage(0);
    handleWifi();
    return;
  }

  if (!mqttClient.connected()) {
    showStage(1);
    handleMqttConnect();
    return;
  }

  mqttClient.poll();   // keep-alive + delivers incoming commands to onMqttMessage()

  if (publishNow || millis() - lastPublish >= PUBLISH_INTERVAL_MS) {
    publishNow = false;
    lastPublish = millis();
    publishOutputs();
  }
}
