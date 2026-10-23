'use strict';
// v132: painted troop commitment is meaningful, bounded, and save compatible.
const assert=require('node:assert/strict'),E=require('../engine.js');
function region(x1,x2,y1,y2){const z=[];for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)z.push(E.idx(x,y));return z;}
function scenario(force=3000){
 const s=E.lobby(104),id=E.addPlayer(s,'Human');assert(E.start(s,0).ok);
 s.tiles.fill(1);s.owners.fill(0);s.armies=[];s.attackPlans=[];s.recoveryPlans=[];s.buildings=[];s.landTotal=E.W*E.H;
 const p=E.person(s,id);p.land=0;
 for(let y=20;y<60;y++)for(let x=20;x<70;x++){s.owners[E.idx(x,y)]=id;p.land++;}
 p.troops=force;p.troopCap=force*2;p.garrisons=[{id:'front',x:69,y:39,strength:force}];
 p.capital={x:69,y:39};s.territoryRevision++;return {s,id,p};
}
const cells=region(70,78,33,44),waves=[];
for(const percent of [5,30,95]){
 const {s,id,p}=scenario(),order=E.action(s,id,{type:'send',x:70,y:39,zone:cells,percent,targets:[0]});
 assert(order.ok,order.error);
 assert.equal(s.attackPlans.length,1);
 const plan=s.attackPlans[0],wave=s.armies.reduce((n,a)=>n+(a.owner===id?a.strength:0),0);
 assert.equal(plan.allocationMode,'percent');assert.equal(plan.allocationValue,percent);
 assert(wave<=3000*(1-E.reserveShare(p))+1e-6,'Defense reserve cannot be spent');
 assert(Math.abs(p.troops+wave-3000)<1e-6,'Sending soldiers cannot create units');
 waves.push(wave);
 const wire=E.restoreNetworkState(JSON.parse(JSON.stringify(E.networkState(s))));
 assert.equal(wire.attackPlans[0].allocationValue,percent,'Player budget survives network serialization');
}
assert(waves[0]<waves[1]&&waves[1]<waves[2],'Slider must affect sent troops: '+waves.join(','));
{
 const {s,id,p}=scenario();
 const split=[...region(70,74,33,36),...region(70,74,44,47)];
 const order=E.action(s,id,{type:'send',x:70,y:35,zone:split,percent:60,targets:[0]});
 assert(order.ok,order.error);
 assert.equal(s.attackPlans.length,2,'Disconnected fronts remain separate plans');
 const total=s.attackPlans.reduce((n,p)=>n+p.allocationValue,0);
 assert(Math.abs(total-60)<1e-7,'Split plans must share requested percentage rather than duplicating it');
 assert(s.armies.reduce((n,a)=>n+a.strength,0)<=3000*(1-E.reserveShare(p))+1e-6);
}
{
 const {s,id}=scenario();
 assert(E.action(s,id,{type:'send',x:70,y:39,zone:cells,percent:30,targets:[0]}).ok);
 const plan=s.attackPlans[0],edited=E.action(s,id,{type:'updatePlan',id:plan.id,zone:cells,percent:15});
 assert(edited.ok,edited.error);
 assert.equal(s.attackPlans[0].allocationValue,15,'Editing the slider changes the plan budget');
}
{
 const {s,id}=scenario(),legacy={id:'legacy-auto',owner:id,targetOwner:0,targets:[0],zoneCells:cells,percent:30};
 s.attackPlans=[legacy];
 assert(E.automaticAllocation(s,legacy).target>0);
 assert.equal(legacy.allocationMode,undefined,'Old saved automatic orders retain behavior until edited');
}
console.log('PASS v132 painted commitment: real slider control, military reserve, split budgets, edits, network, legacy AUTO');
