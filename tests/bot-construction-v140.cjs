'use strict';
// BK-02: bots scale construction with territory, without bypassing human costs or crew limits.
const assert=require('node:assert/strict'),E=require('../engine.js');
function fixture(seed,land,buildings){
 const s=E.lobby(seed),id=E.addPlayer(s,'Bot',true);
 assert(E.start(s,0).ok);
 s.tiles.fill(1);s.owners.fill(0);
 const width=Math.ceil(Math.sqrt(land*1.6)),height=Math.ceil(land/width);
 const left=42-Math.floor(width/2),top=35-Math.floor(height/2);
 for(let n=0;n<land;n++)s.owners[E.idx(left+n%width,top+Math.floor(n/width))]=id;
 const p=E.person(s,id);p.land=land;p.capital={x:42,y:35};p.troops=0;
 p.res={food:1000000,wood:1000000,stone:1000000,gold:1000000};
 s.buildings=[{id:'capital',owner:id,kind:'city',x:42,y:35,level:1}];
 for(let n=1;n<buildings;n++)s.buildings.push({id:'b'+n,owner:id,kind:n%3?'fort':'barracks',
  x:30+(n-1)%19,y:31+Math.floor((n-1)/19),level:1});
 s.buildJobs=[];return {s,id,p};
}
function attempt(f){
 for(let n=0;n<120;n++){f.s.tick=f.id%4+n*4;E.bot(f.s,f.id);}
 return f.s.buildJobs.filter(j=>j.owner===f.id&&!j.upgradeOf);
}
for(const seed of [88,7611,139]){
 assert.equal(attempt(fixture(seed,500,13)).length,1,'Original early-game cap still allows 14th');
 assert.equal(attempt(fixture(seed,500,14)).length,0,'Small kingdom does not spam buildings');
 const mid=fixture(seed,1800,14),before={...mid.p.res},jobs=attempt(mid);
 assert(jobs.length>0&&jobs.length<=4,'Expanded land permits building under crew-slot cap');
 for(const resource of ['wood','stone','gold'])
  assert.equal(before[resource]-mid.p.res[resource],
   jobs.reduce((sum,j)=>sum+(j.cost[resource]||0),0),'Bot pays full official prices');
 assert.equal(attempt(fixture(seed,3600,31)).length,1,'Count queued buildings against 32 cap');
 assert.equal(attempt(fixture(seed,3600,32)).length,0,'Hard cap remains bounded');
 const poor=fixture(seed,1800,14);poor.p.res={food:0,wood:0,stone:0,gold:0};
 assert.equal(attempt(poor).length,0,'Bot cannot buy free buildings');
 const occupied=fixture(seed,3600,31);
 occupied.s.buildJobs.push({id:'pending',owner:occupied.id,kind:'fort',x:50,y:35,progress:0,cost:{}});
 assert.equal(attempt(occupied).length,1,'Existing pending job counts toward limit');
 const saved=JSON.parse(JSON.stringify(mid.s));
 assert.deepEqual(saved.buildJobs,mid.s.buildJobs,'Construction uses existing save schema');
}
console.log('PASS v140: bot land-scaled construction, 14-to-32 cap, pending jobs, normal costs and slots on 3 seeds');
