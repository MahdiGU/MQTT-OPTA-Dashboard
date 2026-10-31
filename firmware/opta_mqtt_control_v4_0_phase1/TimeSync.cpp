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
    if (udpStarted_) {
      udp_.stop();
      udpStarted_ = false;
      if (Config::NTP_DIAGNOSTICS && Serial) {
        Serial.println("NTP: Wi-Fi lost; UDP socket reset");
      }
    }
    awaitingResponse_ = false;
    responseErrorReported_ = false;
    nextAttemptAt_ = now;
    return;
  }
  if (!udpStarted_) {
    // A failed Mbed UDP open/bind can leave a partial socket behind. Always
    // close it before retrying so reconnection starts with a clean socket.
    udp_.stop();
    udpStarted_ = udp_.begin(LOCAL_NTP_PORT) == 1;
    if (!udpStarted_) {
      udp_.stop();
      if (Config::NTP_DIAGNOSTICS && Serial) {
        Serial.println("NTP: UDP socket open/bind failed; retry in 60 s");
      }
      nextAttemptAt_ = now + Config::NTP_RETRY_MS;
      return;
    }
    if (Config::NTP_DIAGNOSTICS && Serial) {
      Serial.print("NTP: UDP socket ready on local port ");
      Serial.println(LOCAL_NTP_PORT);
    }
  }
  if (awaitingResponse_) {
    receiveResponse();
    if (awaitingResponse_ && now - requestStartedAt_ >= RESPONSE_TIMEOUT_MS) {
      awaitingResponse_ = false;
      responseErrorReported_ = false;
      if (Config::NTP_DIAGNOSTICS && Serial) {
        Serial.println("NTP: reply timeout; check UDP port 123/firewall");
      }
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

  ++attemptCount_;
  if (Config::NTP_DIAGNOSTICS && Serial) {
    Serial.print("NTP: attempt ");
    Serial.print(attemptCount_);
    Serial.print(" resolving ");
    Serial.println(Config::NTP_SERVER);
  }

  IPAddress serverAddress;
  if (WiFi.hostByName(Config::NTP_SERVER, serverAddress) != 1 ||
      serverAddress == IPAddress(0, 0, 0, 0)) {
    if (Config::NTP_DIAGNOSTICS && Serial) {
      Serial.println("NTP: DNS resolution failed; retry in 60 s");
    }
    nextAttemptAt_ = millis() + Config::NTP_RETRY_MS;
    return;
  }
  if (Config::NTP_DIAGNOSTICS && Serial) {
    Serial.print("NTP: resolved server IP ");
    Serial.println(serverAddress);
  }

  if (udp_.beginPacket(serverAddress, NTP_PORT) != 1) {
    if (Config::NTP_DIAGNOSTICS && Serial) {
      Serial.println("NTP: UDP packet initialization failed; retry in 60 s");
    }
    nextAttemptAt_ = millis() + Config::NTP_RETRY_MS;
    return;
  }
  udp_.write(packet, sizeof(packet));
  if (udp_.endPacket() != 1) {
    if (Config::NTP_DIAGNOSTICS && Serial) {
      Serial.println("NTP: UDP send failed; retry in 60 s");
    }
    nextAttemptAt_ = millis() + Config::NTP_RETRY_MS;
    return;
  }
  awaitingResponse_ = true;
  responseErrorReported_ = false;
  requestStartedAt_ = millis();
  if (Config::NTP_DIAGNOSTICS && Serial) {
    Serial.println("NTP: request sent; awaiting reply");
  }
}

void TimeSync::receiveResponse() {
  const int packetSize = udp_.parsePacket();
  if (packetSize == 0) return;
  if (packetSize < 0) {
    if (!responseErrorReported_ && Config::NTP_DIAGNOSTICS && Serial) {
      Serial.println("NTP: UDP receive/socket error");
    }
    responseErrorReported_ = true;
    return;
  }
  if (packetSize < 48) {
    if (Config::NTP_DIAGNOSTICS && Serial) {
      Serial.print("NTP: malformed short reply, bytes=");
      Serial.println(packetSize);
    }
    return;
  }
  uint8_t packet[48] = {0};
  const int bytesRead = udp_.read(packet, sizeof(packet));
  if (bytesRead != static_cast<int>(sizeof(packet))) {
    awaitingResponse_ = false;
    if (Config::NTP_DIAGNOSTICS && Serial) {
      Serial.print("NTP: reply read failed, bytes=");
      Serial.println(bytesRead);
    }
    nextAttemptAt_ = millis() + Config::NTP_RETRY_MS;
    return;
  }
  const uint32_t secondsSince1900 =
      (static_cast<uint32_t>(packet[40]) << 24) |
      (static_cast<uint32_t>(packet[41]) << 16) |
      (static_cast<uint32_t>(packet[42]) << 8) |
      static_cast<uint32_t>(packet[43]);
  if (secondsSince1900 <= NTP_TO_UNIX) {
    awaitingResponse_ = false;
    if (Config::NTP_DIAGNOSTICS && Serial) {
      Serial.println("NTP: reply timestamp invalid; retry in 60 s");
    }
    nextAttemptAt_ = millis() + Config::NTP_RETRY_MS;
    return;
  }
  epochAtSync_ = secondsSince1900 - NTP_TO_UNIX;
  millisAtSync_ = millis();
  awaitingResponse_ = false;
  responseErrorReported_ = false;
  nextAttemptAt_ = millis() + Config::NTP_RESYNC_MS;
  if (Config::NTP_DIAGNOSTICS && Serial) {
    Serial.print("NTP: synchronized, Unix epoch=");
    Serial.println(epochAtSync_);
  }
}
