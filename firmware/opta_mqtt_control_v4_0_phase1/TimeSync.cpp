#include "TimeSync.h"

#include "Config.h"

namespace {
constexpr uint16_t LOCAL_NTP_PORT = 2390;
constexpr uint16_t NTP_PORT = 123;
constexpr uint32_t NTP_TO_UNIX = 2208988800UL;
constexpr uint32_t RESPONSE_TIMEOUT_MS = 2000;
}

void TimeSync::tick(bool networkAvailable) {
  const uint32_t now = millis();
  if (!networkAvailable) {
    awaitingResponse_ = false;
    return;
  }
  if (!udpStarted_) {
    udpStarted_ = udp_.begin(LOCAL_NTP_PORT) == 1;
    if (!udpStarted_) {
      nextAttemptAt_ = now + Config::NTP_RETRY_MS;
      return;
    }
  }
  if (awaitingResponse_) {
    receiveResponse();
    if (awaitingResponse_ && now - requestStartedAt_ >= RESPONSE_TIMEOUT_MS) {
      awaitingResponse_ = false;
      nextAttemptAt_ = now + Config::NTP_RETRY_MS;
    }
    return;
  }
  if (static_cast<int32_t>(now - nextAttemptAt_) >= 0) {
    sendRequest();
  }
}

uint32_t TimeSync::currentEpoch() const {
  if (!valid()) return 0;
  return epochAtSync_ + (millis() - millisAtSync_) / 1000UL;
}

void TimeSync::sendRequest() {
  uint8_t packet[48] = {0};
  packet[0] = 0b11100011;
  packet[1] = 0;
  packet[2] = 6;
  packet[3] = 0xEC;
  packet[12] = 49;
  packet[13] = 0x4E;
  packet[14] = 49;
  packet[15] = 52;

  if (udp_.beginPacket(Config::NTP_SERVER, NTP_PORT) != 1) {
    nextAttemptAt_ = millis() + Config::NTP_RETRY_MS;
    return;
  }
  udp_.write(packet, sizeof(packet));
  if (udp_.endPacket() != 1) {
    nextAttemptAt_ = millis() + Config::NTP_RETRY_MS;
    return;
  }
  awaitingResponse_ = true;
  requestStartedAt_ = millis();
}

void TimeSync::receiveResponse() {
  if (udp_.parsePacket() < 48) return;
  uint8_t packet[48] = {0};
  udp_.read(packet, sizeof(packet));
  const uint32_t secondsSince1900 =
      (static_cast<uint32_t>(packet[40]) << 24) |
      (static_cast<uint32_t>(packet[41]) << 16) |
      (static_cast<uint32_t>(packet[42]) << 8) |
      static_cast<uint32_t>(packet[43]);
  if (secondsSince1900 <= NTP_TO_UNIX) {
    awaitingResponse_ = false;
    nextAttemptAt_ = millis() + Config::NTP_RETRY_MS;
    return;
  }
  epochAtSync_ = secondsSince1900 - NTP_TO_UNIX;
  millisAtSync_ = millis();
  awaitingResponse_ = false;
  nextAttemptAt_ = millis() + Config::NTP_RESYNC_MS;
}
