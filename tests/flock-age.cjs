const assert=require('node:assert/strict'),age=require('../web/flock-age.js'),data=require('../app/src/main/assets/flow-data.js');
assert.deepEqual(age.at('2026-10-24'),{week:29,day:7,start:'2026-10-18',end:'2026-10-24'});
assert.deepEqual(age.at('2026-10-25'),{week:30,day:1,start:'2026-10-25',end:'2026-10-31'});
assert.equal(age.at('2026-11-19').week,33);assert.equal(age.at('2026-11-19').day,5);
assert.equal(age.at('2026-10-31').week,30);assert.equal(age.at('2026-11-01').week,31);
assert.equal(age.at('2027-01-03').week,40,'flock age never resets at New Year');
assert.equal(age.at('2026-04-04'),null);assert.equal(age.at('2026-02-30'),null);
const row=(production_date,production_rate,eggs,mortality)=>({production_date,production_rate,eggs,mortality});
const rows=data.normalize([row('2026-10-24',80,800,2),row('2026-10-25',90,900,3),row('2026-10-26',0,0,0),row('2026-10-27',null,null,null),row('2026-10-28',100,1000,7)],'2026-10-27');
const weeks=age.weekly(rows,'2026-10-27'),w29=weeks.find(r=>r.ageWeek===29),w30=weeks.find(r=>r.ageWeek===30);
assert.equal(w29.mortality,2);assert.equal(w29.rate,80);
assert.equal(w30.date,'2026-10-25');assert.equal(w30.rate,45,'average uses recorded daily rates, including zero');
assert.equal(w30.mortality,3,'mortality totals Sunday through Saturday; future days excluded');
assert.equal(w30.eggs,900);assert.equal(w30.days,3);assert.equal(w30.rateDays,2);assert.equal(w30.current,true);
assert.equal(weeks[0].mortality,null,'empty age weeks remain gaps');
const original=Date.now;try{Date.now=()=>Date.parse('2026-10-24T22:59:59Z');assert.equal(age.at().week,29);Date.now=()=>Date.parse('2026-10-24T23:00:00Z');assert.equal(age.at().week,30);assert.equal(age.at().day,1);}finally{Date.now=original;}
console.log('PASS: confirmed age boundary, fixed GMT+1 midnight, year continuity, partial weeks, real zeroes, missing/future values and age-week rate/mortality totals');
