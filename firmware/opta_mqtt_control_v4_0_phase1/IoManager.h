#pragma once

#include <Arduino.h>
#include "FirmwareTypes.h"

class IoManager {
 public:
  void begin();
  void updateExpansion();
  void capture(TelemetryFrame& frame) const;
  void setOutput(uint8_t index, bool on);
  void setLed(uint8_t index, bool on);
  bool outputState(uint8_t index) const;
  bool ledState(uint8_t index) const;
  void showConnectionStage(uint8_t stage) const;
  void restoreLeds() const;

 private:
  void captureFeedChains(TelemetryFrame& frame) const;
  float readRtdVolts() const;
  TemperatureReading readTemperature() const;

  bool outputs_[4] = {false, false, false, false};
  bool leds_[4] = {false, false, false, false};
};
