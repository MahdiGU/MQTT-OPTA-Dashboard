#include "TelemetryBuffer.h"

void TelemetryBuffer::push(const TelemetryFrame& frame) {
  if (count_ == Config::TELEMETRY_BUFFER_CAPACITY) {
    head_ = (head_ + 1) % Config::TELEMETRY_BUFFER_CAPACITY;
    --count_;
    ++dropped_;
  }
  const size_t index = (head_ + count_) % Config::TELEMETRY_BUFFER_CAPACITY;
  frames_[index] = frame;
  ++count_;
}

const TelemetryFrame* TelemetryBuffer::front() const {
  return count_ == 0 ? nullptr : &frames_[head_];
}

void TelemetryBuffer::pop() {
  if (count_ == 0) return;
  head_ = (head_ + 1) % Config::TELEMETRY_BUFFER_CAPACITY;
  --count_;
}
