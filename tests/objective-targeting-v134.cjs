'use strict';
// v134: known objective, nation authorization, and variable generated terrain.
const assert=require('node:assert/strict'),E=require('../engine.js');
const seeds=[1,2,20,104,7611,2033,20261023];
function board(seed){
 const s=E.lobby(seed),id=E.addPlayer(s,'Human'),foe=E.addPlayer(s,'Rival');
 assert(E.start(s,0).ok);
 const y=Array.from({length:E.H-20},(_,i)=>i+10).find(y=>
  Array.from({length:31},(_,i)=>i+60).every(x=>E.tile(s,x,y)));
 assert(Number.isInteger(y),'Terrain needs a traversable contested corridor');
 s.owners=s.owners.map((_,i)=>s.tiles[i]?(i%E.W<70?id:foe):0);
 s.buildings=[];s.armies=[];s.attackPlans=[];s.recoveryPlans=[];s.wars=[];
 const p=E.person(s,id),q=E.person(s,foe);
 p.land=s.owners.filter(v=>v===id).length;q.land=s.owners.filter(v=>v===foe).length;
 p.troops=3000;p.troopCap=8000;p.garrisons=[{id:'home',x:68,y,strength:3000}];p.capital={x:68,y};
 q.troops=400;q.garrisons=[{id:'def',x:90,y,strength:400}];q.capital={x:82,y};
 s.buildings=[{id:'secret',owner:foe,kind:'city',level:2,x:82,y}];s.territoryRevision++;
 return {s,id,foe,y,p};
}
const rows=[];
for(const seed of seeds){
 const {s,id,foe,y,p}=board(seed),goal={type:'objectiveAttack',x:82,y,percent:30};
 const before=JSON.stringify(s.attackPlans);
 assert(!E.visibleBuilding(s,id,s.buildings[0]),'Enemy building is hidden before scout');
 assert(!E.networkState(s,id).buildings.some(b=>b.id==='secret'),'Server filters building from enemy snapshots');
 assert(!E.action(s,id,goal).ok,'Cannot attack invisible building');
 assert.equal(JSON.stringify(s.attackPlans),before,'Rejected orders cannot create plans');
 s.buildings.push({id:'scout',owner:id,kind:'fort',level:1,x:68,y});s.territoryRevision++;
 assert(E.visibleBuilding(s,id,s.buildings[0]),'Friendly fort reveals objective');
 assert(!E.action(s,id,goal).ok,'War must be enabled in Nations before objective attack');
 assert(E.action(s,id,{type:'setNationTarget',target:foe,enabled:true}).ok);
 assert(!E.action(s,foe,{type:'objectiveAttack',x:82,y,percent:30}).ok,'Attacker cannot submit own building');
 assert(!E.action(s,id,{type:'objectiveAttack',x:-1,y,percent:30}).ok,'Invalid coordinates rejected');
 const r=E.action(s,id,goal);assert(r.ok,r.error);
 const z=s.attackPlans[0].zoneCells,actual=s.armies.reduce((n,a)=>n+(a.owner===id?a.strength:0),0);
 assert(z.length<E.planCellLimit(s,id),'Objective route stays small');
 assert(z.includes(E.idx(82,y)),'Goal is included in plan');
 assert(z.some(i=>i%E.W===70),'Area touches existing hostile border');
 assert(z.every(i=>s.tiles[i]&&s.owners[i]===foe),'No ally, neutral or own cells leaked into hostile corridor');
 assert.equal(s.attackPlans[0].allocationValue,30,'Troop commitment carries to objective plan');
 assert(actual>0&&actual<=3000*(1-E.reserveShare(p))+1e-6,'Combat deployment and reserve remain bounded');
 const wire=E.restoreNetworkState(JSON.parse(JSON.stringify(E.networkState(s,id))));
 assert(wire.attackPlans[0].zoneCells.includes(E.idx(82,y)),'Objective geometry survives multiplayer snapshot');
 rows.push({seed,area:z.length,deployed:Math.round(actual)});
}
{
 const {s,id,foe,y,p}=board(7611);
 s.buildings.push({id:'scout',owner:id,kind:'fort',level:1,x:68,y});s.territoryRevision++;
 assert(E.action(s,id,{type:'setNationTarget',target:foe,enabled:true}).ok);
 p.allies.push(foe);
 assert(!E.action(s,id,{type:'objectiveAttack',x:82,y,percent:95}).ok,'Cannot send objective order against ally');
}
console.log('PASS v134: scouted objective, authorization, ally protection, 7 generated maps, budget and network: '+JSON.stringify(rows));
