'use strict';
// v137: small, predictable food/gold supply cost only for armies in the field.
const assert=require('node:assert/strict'),E=require('../engine.js');
function fixture(land,cities,barracks,active=true){
 const s=E.lobby(714),id=E.addPlayer(s,'Player'),foe=E.addPlayer(s,'Enemy');assert(E.start(s,0).ok);
 s.tiles.fill(1);s.owners.fill(0);s.buildings=[];s.armies=[];s.attackPlans=[];s.recoveryPlans=[];s.workZones=[];s.buildJobs=[];s.roads=[];
 for(let i=0;i<land;i++)s.owners[E.idx(10+i%100,2+Math.floor(i/100))]=id;
 s.owners[E.idx(130,40)]=foe;
 const p=E.person(s,id),q=E.person(s,foe);p.land=land;q.land=1;q.troops=0;q.garrisons=[];
 const y=land===100?2:land===2000?10:40;
 p.capital={x:109,y};p.res={food:land===100?300:land===2000?1000:4000,gold:land===100?200:land===2000?1000:3000,wood:10000,stone:10000};
 for(let i=0;i<cities+barracks;i++)s.buildings.push({id:'b'+i,owner:id,kind:i<cities?'city':'barracks',level:1,x:10+i%100,y:2+Math.floor(i/100)});
 const cap=Math.floor(900+land*2.4+cities*260+barracks*430);
 p.troops=cap;p.garrisons=[{id:'front',x:109,y,strength:cap}];s.territoryRevision++;
 if(active){
  const cells=[];for(let yy=y;yy<=y+2;yy++)for(let x=110;x<=118;x++)cells.push(E.idx(x,yy));
  const response=E.action(s,id,{type:'send',x:110,y,zone:cells,targets:[0],percent:50});
  assert(response.ok,response.error);
 }
 return {s,id,p};
}
for(const [label,land,cities,barracks] of [['early',100,1,1],['mid',2000,10,10],['late',10000,50,50]]){
 for(const active of [false,true]){
  const {s,id,p}=fixture(land,cities,barracks,active);
  const deployed=E.militaryStrength(s,id).deployed,before={...p.res},total=E.militaryStrength(s,id).total;
  E.tick(s);
  assert.deepEqual(p.upkeep,{food:Math.floor(deployed*.005),gold:Math.floor(deployed*.003)},label+' expected bounded field costs');
  assert.equal(p.res.food-before.food,p.income.food-p.upkeep.food-Math.ceil(p.troopIncome*.2),label+' actual food arithmetic');
  assert.equal(p.res.gold-before.gold,p.income.gold-p.upkeep.gold,label+' actual gold arithmetic');
  assert.equal(p.troopIncome,0,label+' full troop capacity never duplicates recruits');
  assert(p.res.food>=0&&p.res.gold>=0&&p.res.food<=E.resourceCapacity(s,id),label+' resources bounded');
  assert(E.militaryStrength(s,id).total<=total+1e-6,label+' supply cannot create troops');
  const wire=E.restoreNetworkState(JSON.parse(JSON.stringify(E.networkState(s,id))));
  assert.deepEqual(wire.players.find(v=>v.id===id).upkeep,p.upkeep,label+' clients receive supply data');
 }
}
{
 const {s,id,p}=fixture(100,1,1,true);
 p.res.food=0;p.res.gold=0;E.tick(s);
 assert(p.res.food>=0&&p.res.gold>=0,'Shortage never creates debt or negative holdings');
 assert(p.upkeep.food>0&&p.upkeep.gold>0,'Shortage reports the nominal deployed supply needs');
}
console.log('PASS v137 field supplies: peace unchanged, scale across 3 stages, bounded shortages, multiplayer snapshot');
