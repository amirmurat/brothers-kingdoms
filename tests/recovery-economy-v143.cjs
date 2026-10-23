'use strict';
const assert=require('node:assert/strict'),E=require('../engine.js');
function fixture(bot=false){
 const s=E.lobby(88),id=E.addPlayer(s,'Survivor',bot);E.addPlayer(s,'Other');assert(E.start(s,0).ok);
 s.tiles.fill(1);s.owners.fill(0);s.buildings=[];s.buildJobs=[];s.armies=[];s.attackPlans=[];s.recoveryPlans=[];s.roads=[];
 const p=E.person(s,id),q=s.players.find(v=>v.id!==id);
 s.owners[E.idx(30,40)]=s.owners[E.idx(31,40)]=id;s.owners[E.idx(100,40)]=q.id;
 p.land=2;q.land=1;p.capital={x:30,y:40};
 for(const n of s.players){n.troops=0;n.garrisons=[];n.workers=[];n.res={food:0,wood:0,stone:0,gold:0};}
 s.territoryRevision++;return {s,id,p};
}
{
 const {s,id,p}=fixture();
 for(let t=1;t<=10;t++){
  E.tick(s);assert.equal(p.workers.reduce((n,g)=>n+g.count,0),Math.min(6,t),'One civilian per tick, capped at one crew');
  assert.deepEqual(p.income,{food:2,wood:1,stone:1,gold:1});
  assert.equal(p.troopIncome,0,'No free army while recovering');
 }
 for(let t=0;t<530;t++)E.tick(s);
 assert.equal(E.resourceCapacity(s,id),500,'Tiny survivors can afford a city');
 assert(E.action(s,id,{type:'queueBuild',kind:'city',x:30,y:40}).ok,'From zero resources and people to a paid city');
 for(let t=0;t<310;t++)E.tick(s);
 assert.equal(E.buildingAt(s,30,40)?.kind,'city');assert.equal(E.workforceStats(s,id).capacity,24);
 assert(E.action(s,id,{type:'queueBuild',kind:'barracks',x:31,y:40}).ok);
 for(let t=0;t<100;t++)E.tick(s);
 assert.equal(E.buildingAt(s,31,40)?.kind,'barracks');assert(E.militaryStrength(s,id).total>0,'Can restore recruitment after rebuilding');
}
{
 const {s,id,p}=fixture();p.tech.economy=5;E.tick(s);
 assert.deepEqual(p.income,{food:2,wood:1,stone:1,gold:1},'Research never multiplies the free baseline');
 const restored=JSON.parse(JSON.stringify(s));delete restored.players[0].workers;E.tick(restored);
 assert.equal(restored.players[0].workers.reduce((n,g)=>n+g.count,0),1,'Missing workers migrate without new save fields');
 assert(E.networkState(s,id).players.find(v=>v.id===id).workers.length===1);
}
{
 const {s,id,p}=fixture();s.owners.fill(0);p.land=0;s.territoryRevision++;
 E.tick(s);assert(p.eliminated);assert.equal(p.workers.length,0);assert.equal(E.resourceCapacity(s,id),0);
 const before=JSON.stringify(p.res);for(let t=0;t<10;t++)E.tick(s);assert.equal(JSON.stringify(p.res),before,'Eliminated players receive no ongoing income or revival');
}
console.log('PASS v143: bounded recovery people/income, tiny-land storage, paid city and barracks from zero, no research exploit, migration and elimination');
