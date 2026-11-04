-- One authenticated webhook request performs registration/topic checks and
-- the existing replay-safe write inside the database. This removes two
-- PostgREST round trips per MQTT frame without caching device permissions.
create or replace function public.ingest_mqtt_message(
  target_farm_slug text,
  target_device text,
  target_topic text,
  normalized jsonb,
  target_status text,
  status_received_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  registered_farm_id uuid;
  registered_telemetry_topic text;
  registered_status_topic text;
  stored jsonb;
begin
  select f.id, d.telemetry_topic, d.status_topic
    into registered_farm_id, registered_telemetry_topic, registered_status_topic
  from public.farms f
  join public.devices d on d.farm_id = f.id
  where f.slug = target_farm_slug
    and d.mqtt_client_id = target_device
    and d.enabled;

  if not found then
    return jsonb_build_object('accepted', false, 'error', 'Unknown or disabled MQTT device');
  end if;

  if target_topic = registered_status_topic then
    stored := public.update_device_mqtt_status(
      registered_farm_id, target_device, target_status, status_received_at
    );
    return jsonb_build_object('accepted', true, 'kind', 'status', 'result', stored);
  end if;

  if target_topic = registered_telemetry_topic then
    if normalized is null or jsonb_typeof(normalized) <> 'object' then
      return jsonb_build_object('accepted', false, 'error', 'Invalid telemetry payload');
    end if;
    stored := public.ingest_device_telemetry(
      registered_farm_id, target_device, normalized
    );
    return jsonb_build_object('accepted', true, 'kind', 'telemetry', 'result', stored);
  end if;

  return jsonb_build_object('accepted', false, 'error', 'Topic is not registered for this device');
end
$$;

revoke all on function public.ingest_mqtt_message(text, text, text, jsonb, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.ingest_mqtt_message(text, text, text, jsonb, text, timestamptz)
  to service_role;

notify pgrst, 'reload schema';
