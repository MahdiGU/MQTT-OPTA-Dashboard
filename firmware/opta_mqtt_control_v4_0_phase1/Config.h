#pragma once

#include <Arduino.h>

namespace Config {

constexpr char FIRMWARE_VERSION[] = "4.0.2-phase2-ntpfix";
constexpr uint16_t TELEMETRY_SCHEMA = 2;

// Public/scoped device identity. Adjust only when commissioning a different controller.
constexpr char FARM_ID[] = "elmajd-poultry";
constexpr char HOUSE_ID[] = "house-01";
constexpr char DEVICE_ID[] = "opta-control-01";

// Secrets are placeholders in Git. Populate a private working copy before upload.
constexpr char WIFI_SSID[] = "CHANGE_ME";
constexpr char WIFI_PASSWORD[] = "CHANGE_ME";
constexpr char MQTT_HOST[] = "CHANGE_ME";
constexpr uint16_t MQTT_PORT = 8883;
constexpr char MQTT_USERNAME[] = "CHANGE_ME";
constexpr char MQTT_PASSWORD[] = "CHANGE_ME";
constexpr char MQTT_CLIENT_ID[] = "opta-control-01";

constexpr char TOPIC_TELEMETRY[] = "opta/outputs";
constexpr char TOPIC_STATUS[] = "opta/status";
constexpr char TOPIC_COMMAND[] = "opta/cmd";

constexpr uint32_t SAMPLE_INTERVAL_MS = 5000;
constexpr uint32_t WIFI_RETRY_MS = 20000;
constexpr uint32_t MQTT_RETRY_MS = 5000;
constexpr uint32_t MQTT_KEEPALIVE_S = 60;
constexpr uint32_t NTP_RETRY_MS = 60000;
constexpr uint32_t NTP_RESYNC_MS = 6UL * 60UL * 60UL * 1000UL;
constexpr char NTP_SERVER[] = "pool.ntp.org";
constexpr bool NTP_DIAGNOSTICS = true;

// Ten minutes at the five-second sample interval. Oldest-first drop on overflow.
constexpr size_t TELEMETRY_BUFFER_CAPACITY = 120;
constexpr size_t MQTT_PAYLOAD_CAPACITY = 768;

// Approved PT100 transmitter baseline: 0-10 V maps linearly to -50..100 C.
constexpr float TEMP_MIN_C = -50.0f;
constexpr float TEMP_MAX_C = 100.0f;
constexpr float SIGNAL_V_MIN = 0.0f;
constexpr float SIGNAL_V_MAX = 10.0f;
constexpr float FAULT_MARGIN_V = 0.5f;
constexpr uint8_t RTD_SAMPLES = 16;
constexpr float RTD_ADC_VREF = 3.3f;
constexpr float RTD_ADC_RESOLUTION = 4095.0f;
constexpr float RTD_INPUT_DIVIDER = 0.3034f;

}  // namespace Config
