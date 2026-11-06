/*
  ElMAJD Automation - Arduino Opta firmware 4.0.0-phase1

  Phase 1 changes from v3.3:
  - sensor, I/O, time, encoding and buffering are separate modules;
  - telemetry carries schema/firmware/farm/house/device/boot identity;
  - every sample receives its sequence at capture time;
  - a bounded oldest-first RAM buffer replays samples after reconnect;
  - boot_id + seq is the cloud idempotency key;
  - captured_at is populated after NTP synchronization;
  - I1 uses the approved 0-10 V = -50..100 C baseline;
  - I2-I6 are binary full/empty sensors and I7 is cooling control feedback;
  - relay/LED values remain command/control status, not proof of equipment motion.

  MQTT telemetry and commands use QoS 0. Commands must never be retained.
*/

#include <WiFi.h>
#include <WiFiSSLClient.h>
#include <ArduinoMqttClient.h>
#include <ctype.h>
#include <string.h>

#include "Config.h"
#include "FirmwareTypes.h"
#include "IoManager.h"
#include "TelemetryBuffer.h"
#include "TelemetryCodec.h"
#include "TimeSync.h"

#define DEBUG_SERIAL 1
#if DEBUG_SERIAL
  #define LOG(x) do { if (Serial) Serial.print(x); } while (0)
  #define LOGLN(x) do { if (Serial) Serial.println(x); } while (0)
#else
  #define LOG(x) do {} while (0)
  #define LOGLN(x) do {} while (0)
#endif

WiFiSSLClient sslClient;
MqttClient mqttClient(sslClient);
IoManager io;
TelemetryBuffer telemetryBuffer;
TimeSync timeSync;

char bootId[32] = {0};
uint32_t nextSequence = 0;
uint32_t lastSampleAt = 0;
uint32_t nextWifiAttemptAt = 0;
uint32_t nextMqttAttemptAt = 0;
uint32_t lastDrainAt = 0;
bool captureNow = true;
bool wifiWasConnected = false;

bool publishText(const char* topic, const char* text, bool retain) {
  if (!mqttClient.beginMessage(topic, static_cast<unsigned long>(strlen(text)), retain, 0)) {
    return false;
  }
  mqttClient.print(text);
  return mqttClient.endMessage() == 1;
}

void stopMqtt() {
  mqttClient.stop();
  sslClient.stop();
}

void createBootId() {
  uint8_t mac[6] = {0};
  WiFi.macAddress(mac);
  randomSeed(static_cast<unsigned long>(analogRead(A0)) ^ micros());
  const uint32_t nonce = static_cast<uint32_t>(random(0x7FFFFFFF));
  snprintf(bootId, sizeof(bootId), "%02X%02X%02X%02X%02X%02X-%08lX",
           mac[0], mac[1], mac[2], mac[3], mac[4], mac[5],
           static_cast<unsigned long>(nonce));
}

int parseAction(const char* action) {
  if (!strcmp(action, "ON") || !strcmp(action, "1") || !strcmp(action, "TRUE")) return 1;
  if (!strcmp(action, "OFF") || !strcmp(action, "0") || !strcmp(action, "FALSE")) return 0;
  if (!strcmp(action, "TOGGLE") || !strcmp(action, "T")) return 2;
  return -1;
}

bool nextState(bool current, int action) {
  return action == 2 ? !current : action == 1;
}

void handleCommand(char* command) {
  for (char* p = command; *p; ++p) *p = static_cast<char>(toupper(static_cast<unsigned char>(*p)));
  char* target = strtok(command, " \t\r\n:=,");
  char* actionText = strtok(nullptr, " \t\r\n:=,");
  if (!target || !actionText) {
    LOGLN("Ignored command: expected <TARGET> <ACTION>");
    return;
  }
  const int action = parseAction(actionText);
  if (action < 0) {
    LOGLN("Ignored command: invalid action");
    return;
  }

  bool applied = false;
  if (!strcmp(target, "ALL")) {
    for (uint8_t i = 0; i < 4; ++i) io.setOutput(i, nextState(io.outputState(i), action));
    applied = true;
  } else if (target[0] == 'D' && target[1] >= '0' && target[1] <= '3' && target[2] == '\0') {
    const uint8_t index = target[1] - '0';
    io.setOutput(index, nextState(io.outputState(index), action));
    applied = true;
  } else if (!strncmp(target, "LED", 3) && target[3] >= '0' && target[3] <= '3' && target[4] == '\0') {
    const uint8_t index = target[3] - '0';
    io.setLed(index, nextState(io.ledState(index), action));
    applied = true;
  }

  if (!applied) {
    LOGLN("Ignored command: unknown target");
    return;
  }
  captureNow = true;
  LOGLN("Command applied; immediate state capture requested");
}

void onMqttMessage(int messageSize) {
  (void)messageSize;
  static char command[48];
  uint8_t length = 0;
  while (mqttClient.available()) {
    const int value = mqttClient.read();
    if (value < 0) break;
    if (length < sizeof(command) - 1) command[length++] = static_cast<char>(value);
  }
  command[length] = '\0';
  handleCommand(command);
}

void captureTelemetry() {
  TelemetryFrame frame{};
  frame.sequence = ++nextSequence;
  frame.capturedUpMs = millis();
  frame.capturedEpoch = timeSync.currentEpoch();
  frame.rssi = WiFi.status() == WL_CONNECTED ? WiFi.RSSI() : 0;
  io.capture(frame);
  telemetryBuffer.push(frame);
}

void handleWifi() {
  const bool connected = WiFi.status() == WL_CONNECTED &&
                         WiFi.localIP() != IPAddress(0, 0, 0, 0);
  if (connected) {
    if (!wifiWasConnected) {
      wifiWasConnected = true;
      nextMqttAttemptAt = millis();
      LOG("Wi-Fi connected, IP: ");
      LOGLN(WiFi.localIP());
    }
    return;
  }

  if (wifiWasConnected) {
    wifiWasConnected = false;
    stopMqtt();
  }
  io.showConnectionStage(0);
  if (static_cast<int32_t>(millis() - nextWifiAttemptAt) < 0) return;
  WiFi.disconnect();
  WiFi.begin(Config::WIFI_SSID, Config::WIFI_PASSWORD);
  nextWifiAttemptAt = millis() + Config::WIFI_RETRY_MS;
}

void handleMqtt() {
  if (!wifiWasConnected) return;
  if (mqttClient.connected()) {
    mqttClient.poll();
    return;
  }

  io.showConnectionStage(1);
  if (static_cast<int32_t>(millis() - nextMqttAttemptAt) < 0) return;
  stopMqtt();
  mqttClient.setId(Config::MQTT_CLIENT_ID);
  mqttClient.setUsernamePassword(Config::MQTT_USERNAME, Config::MQTT_PASSWORD);
  mqttClient.setKeepAliveInterval(Config::MQTT_KEEPALIVE_S * 1000UL);
  mqttClient.setConnectionTimeout(10000UL);
  mqttClient.beginWill(Config::TOPIC_STATUS, true, 0);
  mqttClient.print("offline");
  mqttClient.endWill();

  if (!mqttClient.connect(Config::MQTT_HOST, Config::MQTT_PORT)) {
    nextMqttAttemptAt = millis() + Config::MQTT_RETRY_MS;
    return;
  }

  mqttClient.subscribe(Config::TOPIC_COMMAND);
  publishText(Config::TOPIC_STATUS, "online", true);
  io.restoreLeds();
  captureNow = true;
  LOGLN("MQTT connected; buffered telemetry will drain oldest first");
}

void drainTelemetry() {
  if (!mqttClient.connected() || telemetryBuffer.empty()) return;
  if (millis() - lastDrainAt < 50) return;
  lastDrainAt = millis();

  const TelemetryFrame* frame = telemetryBuffer.front();
  if (!frame) return;
  const bool replay = telemetryBuffer.size() > 1 ||
      millis() - frame->capturedUpMs > Config::SAMPLE_INTERVAL_MS * 2;
  char payload[Config::MQTT_PAYLOAD_CAPACITY];
  if (!TelemetryCodec::encode(*frame, bootId, replay, telemetryBuffer.size(),
                              telemetryBuffer.dropped(), payload, sizeof(payload))) {
    LOGLN("Telemetry encoding failed; dropping invalid frame");
    telemetryBuffer.pop();
    return;
  }
  if (!publishText(Config::TOPIC_TELEMETRY, payload, false)) {
    LOGLN("Telemetry publish failed; keeping frame for reconnect replay");
    stopMqtt();
    nextMqttAttemptAt = millis() + Config::MQTT_RETRY_MS;
    return;
  }
  const uint32_t publishedSequence = frame->sequence;
  telemetryBuffer.pop();
  LOG("Published sequence ");
  LOGLN(publishedSequence);
}

void setup() {
#if DEBUG_SERIAL
  Serial.begin(115200);
  const uint32_t serialStartedAt = millis();
  while (!Serial && millis() - serialStartedAt < 3000) delay(10);
#endif
  io.begin();
  createBootId();
  mqttClient.onMessage(onMqttMessage);
  LOG("ElMAJD Opta firmware ");
  LOG(Config::FIRMWARE_VERSION);
  LOG(", boot ");
  LOGLN(bootId);
}

void loop() {
  io.updateExpansion();
  handleWifi();
  handleMqtt();
  timeSync.tick(wifiWasConnected);

  const uint32_t now = millis();
  if (captureNow || now - lastSampleAt >= Config::SAMPLE_INTERVAL_MS) {
    captureNow = false;
    lastSampleAt = now;
    captureTelemetry();
  }
  drainTelemetry();
}
