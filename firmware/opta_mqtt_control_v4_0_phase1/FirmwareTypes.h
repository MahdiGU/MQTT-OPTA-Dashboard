#pragma once

#include <Arduino.h>

struct TemperatureReading {
  float volts;
  float tempC;
  bool fault;
};

struct TelemetryFrame {
  uint32_t sequence;
  uint32_t capturedUpMs;
  uint32_t capturedEpoch;
  int32_t rssi;
  bool outputs[4];
  bool leds[4];
  bool inputs[7];  // I2..I8
  TemperatureReading temperature;
};
