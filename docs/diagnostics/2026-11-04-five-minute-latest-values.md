# Five-minute latest-value history — 04 November 2026

## Requested behavior

Keep the latest temperature, voltage and digital sensor states in each five-minute interval, rather than calculating averages. This approved change supersedes the temperature min/max/average portion of DB-02 in specification v0.4. Production-rate calculations are unaffected.

## Deployed implementation

Migration `20261104195046_five_minute_latest_values.sql` was prepared with the installed Supabase CLI and applied to project `zlmaombpfdznambrgqiv` on the existing `Fix_Supabase_Telemetry_2026_11_04` branch. Its filename was aligned with the version assigned by the hosted migration tool. No merge or restart is required.

- The existing primary key keeps one row per farm, device and UTC five-minute interval.
- Each raw insert directly upserts its incoming values. The trigger contains no raw-history query and performs no temperature aggregation or sorting.
- `last_recorded_at` stores the selected source timestamp (device capture time, falling back to receipt time). `last_received_at` breaks equal-source-time ties. Frames with both timestamps equal retain the already selected point.
- Only a newer timestamp pair replaces the selected sample. Older frames still increment `sample_count`, a lightweight count of distinct raw inserts. Existing raw uniqueness prevents duplicate frames from incrementing it twice. Capture-bound metadata uses only comparisons against the incoming row.
- A null temperature/voltage in the selected sample is retained as null. A faulty latest sample therefore creates a graph gap rather than displaying an older valid reading.
- Existing intervals were initialized once using indexed, time-bounded lookups of their latest raw frame. This initialization also converts previously retained valid temperatures to null when the actual latest frame is faulty. The per-message path never repeats these lookups.
- Deprecated `temp_min`, `temp_max` and `temp_avg` columns remain for compatibility and are null for converted/new intervals. Raw measurements remain stored; live state and the alarm engine still process every accepted frame.
- Android `readHistory()` already selects `temp_last` and `i2_last`–`i7_last`, so APK 1.11.2 and existing firmware are compatible.

## Verification

Before deployment, the migration and fixtures ran together in one explicit transaction and rolled back. This included converting an existing interval whose actual latest frame had no capture timestamp and a null faulty temperature. The test passed in approximately two seconds. The regular history fixture also passed again after deployment, with all synthetic rows rolled back.

The assertions cover interval boundaries, legacy rows, out-of-order replay, duplicate suppression, latest null faults, equal-source-time receipt ordering, correct sample counts, receipt-time fallback, and protection of `device_latest` from old replay. Test source: `supabase/tests/telemetry_bucket_bounds.sql`.

At 19:51:24 UTC (20:51:24 Europe/Berlin), the 19:45 and 19:50 history rows exactly matched the latest raw sample's source/receipt timestamps, temperature, voltage and I2-I8 states. All three deprecated statistical fields were null. The current interval had 16 samples, while the completed interval had 60. Live telemetry continued advancing after migration.

RLS remained enabled. Authenticated clients retained SELECT but had no INSERT privilege. The trigger remained SECURITY INVOKER. The security advisor reported existing privileged business RPC warnings and an informational deny-by-default private table notice; this migration introduced no privileged function or access grant.

## Performance

The improvement is structural: the per-message path now consists of a primary-key upsert and comparisons against the existing interval row. It no longer scans, sorts or aggregates even the bounded five-minute raw samples. A short live timing comparison is recorded below; elapsed database times are not host CPU measurements and do not establish long-term service capacity.

From 19:48:20 to 19:50:43 UTC, before deployment, 28 ingestion RPC calls used approximately 237.52 ms total (8.48 ms/call). From 19:51:24 to 19:52:37 UTC, after deployment, 15 calls used approximately 91.46 ms total (6.10 ms/call). These are small, uncontrolled samples and must not be presented as a guaranteed percentage improvement. The mixed deployment window was excluded from this comparison. At the final check there were no active lock waits, telemetry was current, and Auth health returned 200.
