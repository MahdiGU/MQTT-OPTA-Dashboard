export const bit = value => value === true || value === 1 ? 1 : value === false || value === 0 ? 0 : null;
export const businessDate = () => new Date(Date.now() + 3600000).toISOString().slice(0, 10);
export function telemetry(row) {
  const raw = row.raw_payload || {};
  return {
    device_id: row.device_id, mqtt_status: row.mqtt_status, received_at: row.received_at,
    captured_at: row.captured_at, firmware: row.firmware_version, replay: row.replay,
    seq: row.seq, up_s: row.up_s, rssi: row.rssi,
    feed_chains: raw.feed_chains ?? row.feed_chains ?? null,
    feed_chains_received_at: raw.feed_chains_received_at ?? row.feed_chains_received_at ?? null,
    outputs: Object.fromEntries([0,1,2,3].map(n => ['D'+n, bit(row['d'+n])])),
    leds: Object.fromEntries([0,1,2,3].map(n => ['L'+n, bit(row['l'+n])])),
    inputs: Object.fromEntries([2,3,4,5,6,7,8].map(n => ['I'+n, bit(row['i'+n])])),
    i1: {volts: row.volts, temp_c: row.temp_c, fault: bit(row.sensor_fault)},
  };
}
export function history(rows) {
  return rows.map(row => ({t: Date.parse(row.bucket_start), temp: row.temp_last,
    ...Object.fromEntries([2,3,4,5,6,7].map(n => ['I'+n, bit(row['i'+n+'_last'])]))
  })).filter(row => Number.isFinite(row.t));
}
export function operation(action, input, farm) {
  const body = {target_farm: farm};
  const quantity = key => {
    const value = input[key];
    if (!Number.isSafeInteger(value) || value < 0 || value > 2147483647) throw Error('Enter valid whole numbers between 0 and 2147483647.');
    return value;
  };
  const production = () => ({...body, stock_count: quantity('stock'), sortie_count: quantity('sortie'), mortality_count: quantity('mortality')});
  switch(action) {
    case 'create': return ['record_daily_production', {...production(), target_date: input.date}];
    case 'delete': return ['delete_daily_production', {...body, production_id: input.id}];
    case 'edit': return ['edit_daily_production', {...production(), production_id: input.id}];
    case 'production_preview': return ['preview_daily_production', {...production(), target_date: input.date, production_id: input.id ?? null}];
    case 'flock_adjust': return ['record_flock_adjustment', {...body, target_date: input.date, target_count: quantity('count'), adjustment_category: input.category, adjustment_note: input.note || '', request_key: input.request_id}];
    case 'receipt': return ['record_carton_receipt', {...body, target_date: input.date, carton_count: quantity('quantity'), receipt_note: input.note || '', request_key: input.request_id}];
    case 'receipt_edit': return ['edit_carton_receipt', {...body, receipt_id: input.id, target_date: input.date, carton_count: quantity('quantity'), receipt_note: input.note || ''}];
    case 'receipt_delete': return ['delete_carton_receipt', {...body, receipt_id: input.id}];
    case 'ack': return ['acknowledge_alarm', {target_event: input.id}];
    case 'thresholds': return ['configure_alarm_temperature', {target_house: input.house_id, warning: input.warning, critical: input.critical}];
    default: throw Error('Unknown application operation.');
  }
}
