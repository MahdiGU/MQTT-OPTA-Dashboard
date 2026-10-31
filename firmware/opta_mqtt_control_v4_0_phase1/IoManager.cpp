#include "IoManager.h"

#include <math.h>
#include "Config.h"

namespace {
constexpr uint8_t RELAY_PINS[4] = {D0, D1, D2, D3};
constexpr uint8_t LED_PINS[4] = {LED_D0, LED_D1, LED_D2, LED_D3};
constexpr uint8_t DIGITAL_INPUT_PINS[7] = {A1, A2, A3, A4, A5, A6, A7};
constexpr uint8_t RTD_PIN = A0;
}

void IoManager::begin() {
  for (uint8_t i = 0; i < 4; ++i) {
    pinMode(RELAY_PINS[i], OUTPUT);
    pinMode(LED_PINS[i], OUTPUT);
    setOutput(i, false);
  }
  for (uint8_t pin : DIGITAL_INPUT_PINS) {
    pinMode(pin, INPUT);
  }
  analogReadResolution(12);
  analogRead(RTD_PIN);
}

void IoManager::capture(TelemetryFrame& frame) const {
  for (uint8_t i = 0; i < 4; ++i) {
    frame.outputs[i] = outputs_[i];
    frame.leds[i] = leds_[i];
  }
  for (uint8_t i = 0; i < 7; ++i) {
    frame.inputs[i] = digitalRead(DIGITAL_INPUT_PINS[i]) == HIGH;
  }
  frame.temperature = readTemperature();
}

void IoManager::setOutput(uint8_t index, bool on) {
  if (index >= 4) return;
  outputs_[index] = on;
  digitalWrite(RELAY_PINS[index], on ? HIGH : LOW);
  setLed(index, on);
}

void IoManager::setLed(uint8_t index, bool on) {
  if (index >= 4) return;
  leds_[index] = on;
  digitalWrite(LED_PINS[index], on ? HIGH : LOW);
}

bool IoManager::outputState(uint8_t index) const {
  return index < 4 ? outputs_[index] : false;
}

bool IoManager::ledState(uint8_t index) const {
  return index < 4 ? leds_[index] : false;
}

void IoManager::showConnectionStage(uint8_t stage) const {
  const bool blink = ((millis() / 500) % 2) == 1;
  for (uint8_t pin : LED_PINS) digitalWrite(pin, LOW);
  if (stage == 0) {
    digitalWrite(LED_PINS[0], blink ? HIGH : LOW);
  } else {
    digitalWrite(LED_PINS[0], HIGH);
    digitalWrite(LED_PINS[1], blink ? HIGH : LOW);
  }
}

void IoManager::restoreLeds() const {
  for (uint8_t i = 0; i < 4; ++i) {
    digitalWrite(LED_PINS[i], leds_[i] ? HIGH : LOW);
  }
}

float IoManager::readRtdVolts() const {
  uint32_t sum = 0;
  for (uint8_t i = 0; i < Config::RTD_SAMPLES; ++i) {
    sum += analogRead(RTD_PIN);
  }
  const float raw = static_cast<float>(sum) / Config::RTD_SAMPLES;
  return raw * (Config::RTD_ADC_VREF / Config::RTD_ADC_RESOLUTION) /
         Config::RTD_INPUT_DIVIDER;
}

TemperatureReading IoManager::readTemperature() const {
  TemperatureReading result{};
  result.volts = readRtdVolts();
  result.fault = result.volts < Config::SIGNAL_V_MIN - Config::FAULT_MARGIN_V ||
                 result.volts > Config::SIGNAL_V_MAX + Config::FAULT_MARGIN_V;
  result.tempC = NAN;
  if (!result.fault) {
    result.tempC = Config::TEMP_MIN_C +
        (result.volts - Config::SIGNAL_V_MIN) *
        (Config::TEMP_MAX_C - Config::TEMP_MIN_C) /
        (Config::SIGNAL_V_MAX - Config::SIGNAL_V_MIN);
  }
  return result;
}
