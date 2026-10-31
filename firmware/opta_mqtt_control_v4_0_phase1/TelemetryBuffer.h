#pragma once

#include <Arduino.h>
#include "Config.h"
#include "FirmwareTypes.h"

class TelemetryBuffer {
 public:
  void push(const TelemetryFrame& frame);
  const TelemetryFrame* front() const;
  void pop();
  size_t size() const { return count_; }
  bool empty() const { return count_ == 0; }
  uint32_t dropped() const { return dropped_; }

 private:
  TelemetryFrame frames_[Config::TELEMETRY_BUFFER_CAPACITY]{};
  size_t head_ = 0;
  size_t count_ = 0;
  uint32_t dropped_ = 0;
};
