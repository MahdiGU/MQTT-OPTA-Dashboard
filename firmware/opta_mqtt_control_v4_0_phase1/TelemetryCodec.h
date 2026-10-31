#pragma once

#include <Arduino.h>
#include "FirmwareTypes.h"

class TelemetryCodec {
 public:
  static bool encode(const TelemetryFrame& frame,
                     const char* bootId,
                     bool replay,
                     size_t pending,
                     uint32_t dropped,
                     char* output,
                     size_t outputSize);
};
