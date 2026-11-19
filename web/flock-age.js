/* Confirmed pilot flock reference. Date arithmetic uses calendar days in fixed GMT+1. */
(function(root){
  const DAY=86400000,reference=Object.freeze({lastDay:'2026-10-24',week:29});
  const firstWeekStart=new Date(Date.parse(reference.lastDay+'T00:00:00Z')-(reference.week*7-1)*DAY).toISOString().slice(0,10);
  function valid(date){if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;const d=new Date(date+'T00:00:00Z');return Number.isFinite(+d)&&d.toISOString().slice(0,10)===date;}
  const stamp=date=>Date.parse(date+'T00:00:00Z'),iso=value=>new Date(value).toISOString().slice(0,10);
  const today=()=>new Date(Date.now()+3600000).toISOString().slice(0,10);
  function at(date=today()){
    if(!valid(date))return null;const days=Math.round((stamp(date)-stamp(firstWeekStart))/DAY);if(days<0)return null;
    const week=Math.floor(days/7)+1,day=days%7+1,start=stamp(firstWeekStart)+(week-1)*7*DAY;
    return {week,day,start:iso(start),end:iso(start+6*DAY)};
  }
  function weekly(rows,through=today()){
    const current=at(through);if(!current)return [];
    const groups=new Map();
    for(const row of rows){if(!valid(row.date)||row.date>through)continue;const age=at(row.date);if(!age)continue;
      if(!groups.has(age.week))groups.set(age.week,{date:age.start,end:age.end,ageWeek:age.week,days:0,rateDays:0,rate:null,eggs:null,mortality:null});
      const group=groups.get(age.week);group.days++;
      if(typeof row.rate==='number'&&Number.isFinite(row.rate)&&row.rate>=0&&row.rate<=100){group.rate=(group.rate??0)+row.rate;group.rateDays++;}
      for(const key of ['eggs','mortality'])if(Number.isSafeInteger(row[key])&&row[key]>=0)group[key]=(group[key]??0)+row[key];
    }
    return Array.from({length:Math.min(8,current.week)},(_,n)=>{
      const ageWeek=current.week-Math.min(8,current.week)+n+1,start=stamp(firstWeekStart)+(ageWeek-1)*7*DAY;
      const group=groups.get(ageWeek)||{date:iso(start),end:iso(start+6*DAY),ageWeek,days:0,rateDays:0,rate:null,eggs:null,mortality:null};
      return {...group,rate:group.rateDays?group.rate/group.rateDays:null,current:ageWeek===current.week};
    });
  }
  const api=Object.freeze({reference,today,at,weekly});root.FlockAge=api;if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
