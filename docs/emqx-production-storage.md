# EMQX cloud storage for production records

The Android app publishes daily production records to `opta/production`. MQTT delivery alone is not permanent storage. Use an EMQX PostgreSQL connector and rule to write each record to a cloud PostgreSQL or Supabase database.

## 1. Create the database table

Run [`production-storage.sql`](production-storage.sql) in the target PostgreSQL database.

## 2. Allow the application topic

Update the MQTT authorization rules so authenticated ElMajd Android clients can publish to `opta/production`. The Arduino Opta does not need permission to publish this topic unless it will also create production records.

## 3. Create the EMQX rule

Create a rule with this SQL:

```sql
SELECT
  username AS farm_id,
  payload.device_id AS device_id,
  payload.date AS production_date,
  payload.eggs AS eggs,
  payload.mortality AS mortality,
  payload.production_rate AS production_rate,
  payload.submitted_at AS submitted_at
FROM "opta/production"
```

Attach a PostgreSQL action using this SQL template:

```sql
INSERT INTO daily_production (
  farm_id,
  device_id,
  production_date,
  eggs,
  mortality,
  production_rate,
  submitted_at
)
VALUES (
  ${farm_id},
  ${device_id},
  ${production_date},
  ${eggs},
  ${mortality},
  ${production_rate},
  to_timestamp(${submitted_at} / 1000.0)
)
ON CONFLICT (farm_id, production_date)
DO UPDATE SET
  device_id = EXCLUDED.device_id,
  eggs = EXCLUDED.eggs,
  mortality = EXCLUDED.mortality,
  production_rate = EXCLUDED.production_rate,
  submitted_at = EXCLUDED.submitted_at,
  received_at = NOW()
```

Test the rule with a payload such as:

```json
{
  "device_id": "elmajd-android-a1b2c3d4",
  "date": "2026-10-24",
  "eggs": 1250,
  "mortality": 2,
  "production_rate": 88.4,
  "submitted_at": 1792843200000
}
```

The rule uses the authenticated MQTT `username` as `farm_id`. This lets two authorized phones update the same farm/day record while retaining `device_id` for submission auditing.

## Delivery behavior

Production messages use QoS 0 and retain disabled to match the project's publishing policy. The app confirmation means the MQTT client accepted the publication; it does not prove that PostgreSQL committed it. For audit-grade records, add a backend acknowledgement topic or change production submissions to QoS 1 after updating the project requirement.
