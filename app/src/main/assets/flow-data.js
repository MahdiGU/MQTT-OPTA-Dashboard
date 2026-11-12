/* Date-only calculations for the authenticated production records already loaded by the app. */
(function(root){
  const day=86400000;
  const number=value=>value===null||value===undefined||value===''?null:Number.isFinite(Number(value))?Number(value):null;
  function validDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const date=new Date(value+'T00:00:00Z');return Number.isFinite(+date)&&date.toISOString().slice(0,10)===value;}
  function today(){return new Date(Date.now()+3600000).toISOString().slice(0,10);}
  function normalize(rows,through=today()){
    const unique=new Map();
    for(const row of Array.isArray(rows)?rows:[]){const date=row.production_date;if(!validDate(date)||date>through||unique.has(date))continue;
      const rate=number(row.production_rate),eggs=number(row.eggs),mortality=number(row.mortality);
      unique.set(date,{date,rate:rate!==null&&rate>=0&&rate<=100?rate:null,eggs:eggs!==null&&Number.isSafeInteger(eggs)&&eggs>=0?eggs:null,mortality:mortality!==null&&Number.isSafeInteger(mortality)&&mortality>=0?mortality:null});
    }
    return [...unique.values()].sort((a,b)=>a.date.localeCompare(b.date));
  }
  function weekly(rows){
    const groups=new Map();
    for(const row of rows){const date=new Date(row.date+'T00:00:00Z');date.setUTCDate(date.getUTCDate()-(date.getUTCDay()+6)%7);const key=date.toISOString().slice(0,10);
      if(!groups.has(key))groups.set(key,{date:key,end:row.date,days:0,eggs:null,mortality:null,rate:null,rateDays:0});
      const group=groups.get(key);group.days++;group.end=row.date;
      if(row.rate!==null){group.rate=(group.rate??0)+row.rate;group.rateDays++;}
      for(const metric of ['eggs','mortality'])if(row[metric]!==null)group[metric]=(group[metric]??0)+row[metric];
    }
    return [...groups.values()].map(group=>({...group,rate:group.rateDays?group.rate/group.rateDays:null}));
  }
  function series(rows,period='daily',through=today()){
    if(!validDate(through))return [];
    const normalized=normalize(rows,through),base=Date.parse(through+'T00:00:00Z');
    if(period==='weekly'){
      const monday=base-(new Date(base).getUTCDay()+6)%7*day,known=new Map(weekly(normalized).map(row=>[row.date,row]));
      return Array.from({length:8},(_,n)=>{const date=new Date(monday-(7-n)*7*day).toISOString().slice(0,10);return known.get(date)||{date,end:date,days:0,rateDays:0,rate:null,eggs:null,mortality:null};});
    }
    const known=new Map(normalized.map(row=>[row.date,row]));
    return Array.from({length:14},(_,n)=>{const date=new Date(base-(13-n)*day).toISOString().slice(0,10),row=known.get(date);return row?{...row,end:date,days:1,rateDays:row.rate===null?0:1}:{date,end:date,days:0,rateDays:0,rate:null,eggs:null,mortality:null};});
  }
  const api={today,normalize,weekly,series};root.FlowData=Object.freeze(api);if(typeof module==='object')module.exports=api;
})(typeof window==='object'?window:globalThis);
