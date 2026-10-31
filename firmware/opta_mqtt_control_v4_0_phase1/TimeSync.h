#pragma once

#include <Arduino.h>
#include <WiFiUdp.h>

class TimeSync {
 public:
  void tick(bool networkAvailable);
  uint32_t currentEpoch() const;
  bool valid() const { return epochAtSync_ >= 1700000000UL; }

 private:
  void sendRequest();
  void receiveResponse();

  WiFiUDP udp_;
  bool udpStarted_ = false;
  bool awaitingResponse_ = false;
  bool responseErrorReported_ = false;
  uint32_t attemptCount_ = 0;
  uint32_t requestStartedAt_ = 0;
  uint32_t nextAttemptAt_ = 0;
  uint32_t epochAtSync_ = 0;
  uint32_t millisAtSync_ = 0;
};
