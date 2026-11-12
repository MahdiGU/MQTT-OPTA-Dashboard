const assert = require('node:assert/strict');
const data = require('../app/src/main/assets/flow-data.js');
const row = (date, rate, eggs, mortality) => ({production_date:date, production_rate:rate, eggs, mortality});
const rows = [row('2026-11-09',80,800,2), row('2026-11-11',90,900,3), row('2026-11-08',60,600,1),
  row('2026-11-13',100,1000,9), row('2026-02-30',100,1000,9), row('2026-11-09',20,200,9)];
const daily = data.series(rows,'daily','2026-11-12');
assert.equal(daily.length,14);
assert.deepEqual(daily.find(r=>r.date==='2026-11-10'),{date:'2026-11-10',end:'2026-11-10',days:0,rateDays:0,rate:null,eggs:null,mortality:null});
assert.equal(daily.find(r=>r.date==='2026-11-09').rate,80,'first canonical record wins duplicate dates');
assert.equal(daily.at(-1).date,'2026-11-12');
const weeks = data.series(rows,'weekly','2026-11-12');
assert.equal(weeks.length,8);
assert.deepEqual(weeks.at(-1),{date:'2026-11-09',end:'2026-11-11',days:2,rateDays:2,rate:85,eggs:1700,mortality:5});
assert.equal(weeks.at(-2).date,'2026-11-02');
assert.equal(weeks.at(-2).mortality,1,'Sunday belongs to the preceding Monday week');
assert.equal(weeks[0].rate,null,'empty weeks remain gaps');
const mixed = data.normalize([row('2026-11-09',0,0,0),row('2026-11-10',null,null,null),row('2026-11-11',101,-1,1.5)],'2026-11-12');
assert.deepEqual(mixed[0],{date:'2026-11-09',rate:0,eggs:0,mortality:0});
assert.deepEqual(mixed[2],{date:'2026-11-11',rate:null,eggs:null,mortality:null});
assert.equal(data.weekly(mixed)[0].rate,0,'missing rates never count as zero in averages');
assert.equal(data.series([], 'daily', 'bad-date').length,0);
const original = Date.now;
try { Date.now=()=>Date.parse('2026-11-11T23:30:00Z');assert.equal(data.today(),'2026-11-12','fixed GMT+1 production day'); }
finally { Date.now=original; }
console.log('PASS: daily gaps, real zeros, calendar weeks, unweighted daily rate mean, totals, invalid/future records and GMT+1');
