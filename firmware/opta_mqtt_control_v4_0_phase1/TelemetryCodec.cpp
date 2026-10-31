#include "TelemetryCodec.h"

#include <math.h>
#include "Config.h"

namespace {
void formatFixed(char* output, size_t outputSize, long value, uint8_t decimals) {
  const long scale = decimals == 1 ? 10 : 100;
  const long absolute = value < 0 ? -value : value;
  if (decimals == 1) {
    snprintf(output, outputSize, "%s%ld.%01ld", value < 0 ? "-" : "",
             absolute / scale, absolute % scale);
  } else {
    snprintf(output, outputSize, "%s%ld.%02ld", value < 0 ? "-" : "",
             absolute / scale, absolute % scale);
  }
}
}

bool TelemetryCodec::encode(const TelemetryFrame& frame,
                            const char* bootId,
                            bool replay,
                            size_t pending,
                            uint32_t dropped,
                            char* output,
                            size_t outputSize) {
  char epochText[16];
  char tempText[16];
  char voltsText[16];
  if (frame.capturedEpoch == 0) snprintf(epochText, sizeof(epochText), "null");
  else snprintf(epochText, sizeof(epochText), "%lu", static_cast<unsigned long>(frame.capturedEpoch));
  formatFixed(voltsText, sizeof(voltsText), lroundf(frame.temperature.volts * 100.0f), 2);
  if (frame.temperature.fault || isnan(frame.temperature.tempC)) {
    snprintf(tempText, sizeof(tempText), "null");
  } else {
    formatFixed(tempText, sizeof(tempText), lroundf(frame.temperature.tempC * 10.0f), 1);
  }

  const int written = snprintf(
      output, outputSize,
      "{\"schema\":%u,\"firmware\":\"%s\",\"farm_id\":\"%s\","
      "\"house_id\":\"%s\",\"device_id\":\"%s\",\"boot_id\":\"%s\","
      "\"seq\":%lu,\"captured_at\":%s,\"up_s\":%lu,\"rssi\":%ld,\"replay\":%d,"
      "\"buffer\":{\"pending\":%u,\"dropped\":%lu},"
      "\"outputs\":{\"D0\":%d,\"D1\":%d,\"D2\":%d,\"D3\":%d},"
      "\"leds\":{\"L0\":%d,\"L1\":%d,\"L2\":%d,\"L3\":%d},"
      "\"i1\":{\"volts\":%s,\"temp_c\":%s,\"fault\":%d},"
      "\"inputs\":{\"I2\":%d,\"I3\":%d,\"I4\":%d,\"I5\":%d,\"I6\":%d,\"I7\":%d,\"I8\":%d}}",
      Config::TELEMETRY_SCHEMA, Config::FIRMWARE_VERSION, Config::FARM_ID,
      Config::HOUSE_ID, Config::DEVICE_ID, bootId,
      static_cast<unsigned long>(frame.sequence), epochText,
      static_cast<unsigned long>(frame.capturedUpMs / 1000UL), static_cast<long>(frame.rssi), replay ? 1 : 0,
      static_cast<unsigned int>(pending), static_cast<unsigned long>(dropped),
      frame.outputs[0], frame.outputs[1], frame.outputs[2], frame.outputs[3],
      frame.leds[0], frame.leds[1], frame.leds[2], frame.leds[3],
      voltsText, tempText, frame.temperature.fault ? 1 : 0,
      frame.inputs[0], frame.inputs[1], frame.inputs[2], frame.inputs[3],
      frame.inputs[4], frame.inputs[5], frame.inputs[6]);
  return written > 0 && static_cast<size_t>(written) < outputSize;
}
