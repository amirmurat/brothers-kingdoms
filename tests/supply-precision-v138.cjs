'use strict';
// v138: tiny field armies pay the same proportional rates over time, not a free rounded-to-zero rate.
const assert=require('node:assert/strict'),E=require('../engine.js');
function fixture(seed=15){
 const s=E.lobby(seed),id=E.addPlayer(s,'Human'),rival=E.addPlayer(s,'Rival');
 assert(E.start(s,0).ok);
 s.tiles.fill(1);s.owners.fill(0);s.armies=[];s.attackPlans=[];s.recoveryPlans=[];s.buildings=[];s.workZones=[];s.buildJobs=[];
 for(let y=20;y<60;y++)for(let x=20;x<70;x++)s.owners[E.idx(x,y)]=id;
 const p=E.person(s,id),q=E.person(s,rival);
 p.land=2000;q.land=1;p.troops=1000;p.troopCap=3000;p.capital={x:69,y:39};
 p.garrisons=[{id:'reserve',x:69,y:39,strength:1000}];
 p.res={food:200,gold:100,wood:2000,stone:2000};
 q.troops=0;q.garrisons=[];
 s.buildings=[{id:'capital',owner:id,kind:'city',level:1,x:69,y:39}];s.territoryRevision++;
 const area=[];for(let y=30;y<50;y++)for(let x=70;x<85;x++)area.push(E.idx(x,y));
 const cmd=E.action(s,id,{type:'send',x:70,y:39,zone:area,targets:[0],percent:15});
 assert(cmd.ok,cmd.error);
 return {s,id,p};
}
for(const seed of [15,71]){
 const {s,id,p}=fixture(seed);
 let goldBilled=0,foodBilled=0,subOneGoldTicks=0;
 for(let t=0;t<15;t++){
  const deployed=E.militaryStrength(s,id).deployed,old={...(p.supplyCarry||{food:0,gold:0})};
  const due={food:Math.floor(deployed*.005+old.food+1e-9),gold:Math.floor(deployed*.003+old.gold+1e-9)};
  if(deployed>0&&deployed*.003<1)subOneGoldTicks++;
  E.tick(s);
  assert.deepEqual(p.upkeep,due,'One-tick real charge matches accumulated proportional cost');
  for(const kind of ['food','gold'])assert(p.supplyCarry[kind]>=0&&p.supplyCarry[kind]<1,'Carry is fractional');
  goldBilled+=p.upkeep.gold;foodBilled+=p.upkeep.food;
 }
 assert(subOneGoldTicks>0,'Small deployment is exercised');
 assert(goldBilled>0&&foodBilled>0,'No permanent free supply for small fronts');
 const carry={...p.supplyCarry};
 const wire=E.restoreNetworkState(JSON.parse(JSON.stringify(E.networkState(s,id))));
 assert.deepEqual(wire.players.find(v=>v.id===id).supplyCarry,p.supplyCarry,'Save/network snapshot preserves fractional carry');
 s.attackPlans=[];s.armies=[];E.tick(s);
 assert.equal(p.upkeep.food,0);assert.equal(p.upkeep.gold,0);
 assert.deepEqual(p.supplyCarry,carry,'Peace has no upkeep and keeps earned fractional remainder');
}
{
 const {s,p}=fixture(20);
 delete p.supplyCarry;E.tick(s);
 assert(Number.isFinite(p.supplyCarry.food)&&Number.isFinite(p.supplyCarry.gold),'Old saves migrate silently');
}
for(const seed of [88,7611]){
 const s=E.lobby(seed),human=E.addPlayer(s,'Human'),bot=E.addPlayer(s,'Bot',true);
 assert(E.start(s,0).ok);
 for(let t=0;t<120;t++)E.tick(s);
 const p=E.person(s,bot);
 assert(p.land>0&&p.troops>0,'Bot remains active through longer test');
 assert(p.res.food>=0&&p.res.gold>=0,'Bot is not bankrupted by small supply rounding');
}
console.log('PASS v138: proportional tiny-army supplies, diplomacy-free rest, old saves, network state and seeded bots');
