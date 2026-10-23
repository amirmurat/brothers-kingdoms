'use strict';
// v136 diagnostic: measured building roles and long-term resource pressure.
// No balancing constants are frozen; results should inform future choices.
const assert=require('node:assert/strict'),E=require('../engine.js');
function stage(land,cities,barracks,forts,full=false){
 const s=E.lobby(88),id=E.addPlayer(s,'Economy'),foe=E.addPlayer(s,'Observer');
 assert(E.start(s,0).ok);
 s.tiles.fill(1);s.owners.fill(0);s.buildings=[];s.armies=[];s.attackPlans=[];
 s.recoveryPlans=[];s.buildJobs=[];s.workZones=[];s.roads=[];
 for(let i=0;i<land;i++)s.owners[E.idx(10+i%100,2+Math.floor(i/100))]=id;
 s.owners[E.idx(155,96)]=foe;
 const p=E.person(s,id),q=E.person(s,foe);
 p.land=land;q.land=1;q.troops=0;q.garrisons=[];
 p.res={food:Math.min(120000,land*10),wood:1000,stone:1000,gold:Math.min(120000,land*10)};
 p.capital={x:10,y:2};
 let n=0;for(const [kind,count] of [['city',cities],['barracks',barracks],['fort',forts]]){
  for(let j=0;j<count;j++){const x=10+n%100,y=2+Math.floor(n/100);s.buildings.push({id:'a'+n++,owner:id,kind,level:1,x,y});}
 }
 p.troops=full?barracks*430:0;
 p.garrisons=full?[{id:'reserve',x:10,y:2,strength:p.troops}]:[];
 s.territoryRevision++;return {s,id,p};
}
function measure(label,land,cities,barracks,forts,full=false){
 const {s,id,p}=stage(land,cities,barracks,forts,full),start={...p.res};
 for(let t=0;t<20;t++)E.tick(s);
 const result={label,land,cities,barracks,forts,atCap:full,
  foodIncome:p.income.food,goldIncome:p.income.gold,stoneIncome:p.income.stone,woodIncome:p.income.wood,
  recruits:p.troopIncome,workers:E.workforceStats(s,id).capacity,
  armyCap:p.troopCap,foodDelta:p.res.food-start.food,goldDelta:p.res.gold-start.gold,
  foodNetPerTick:p.income.food-Math.ceil(p.troopIncome*.2),storageCap:E.resourceCapacity(s,id)};
 for(const [resource,amount] of Object.entries(p.res)){
  assert(Number.isFinite(amount)&&amount>=0&&amount<=result.storageCap,'Valid bounded '+resource);
 }
 assert(E.militaryStrength(s,id).total<=p.troopCap+1e-6,'Never recruit past capacity');
 return result;
}
const stages=[
 ['early',100,1,1,0],['middle',2000,10,10,5],['late',10000,50,50,25]
];
const rows=[];
for(const [name,land,city,barracks,forts] of stages){
 rows.push(measure(name,land,city,barracks,forts));
 rows.push(measure(name+'-more-city',land,city+1,barracks,forts));
 rows.push(measure(name+'-more-barracks',land,city,barracks+1,forts));
 rows.push(measure(name+'-army-capped',land,city,barracks,forts,true));
}
for(let i=0;i<rows.length;i+=4){
 const [base,city,barracks,capped]=rows.slice(i,i+4);
 assert(city.workers>base.workers,'City must grant workforce under current roles');
 assert(barracks.armyCap>base.armyCap,'Barracks must expand military capacity');
 assert.equal(capped.recruits,0,'Full army does not recruit additional soldiers');
}
// Fort is defensive, not an economic extractor. Verify local protection without price nerfs.
{
 const {s,id,p}=stage(500,1,1,0);
 const x=30,y=2,before=E.tileDefense(s,id,x,y);
 s.buildings.push({id:'newFort',owner:id,kind:'fort',level:1,x,y});s.territoryRevision++;
 assert(E.tileDefense(s,id,x,y)>before,'Fort reinforces the cell where it stands');
}
console.log('PASS v136 economy role diagnostic: '+JSON.stringify(rows));
