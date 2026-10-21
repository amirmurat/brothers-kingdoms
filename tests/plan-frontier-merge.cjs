'use strict';
const assert=require('node:assert/strict'),E=require('../engine.js');
const tiles=(xs,ys)=>xs.flatMap(x=>ys.map(y=>E.idx(x,y)));
const span=(a,b)=>Array.from({length:b-a+1},(_,i)=>a+i);
function setup(){
 const s=E.lobby(7611),id=E.addPlayer(s,'Commander'),foe=E.addPlayer(s,'Rival');
 assert(E.start(s,0).ok);
 s.tiles.fill(1);s.owners.fill(0);s.armies=[];s.attackPlans=[];s.buildings=[];s.wars=[];
 s.landTotal=E.W*E.H;
 const p=E.person(s,id);p.land=0;p.troops=1600;p.troopCap=10000;
 p.capital={x:52,y:42};p.garrisons=[{id:'gfixture',x:54,y:42,strength:1600}];
 for(const i of tiles(span(50,54),span(40,45))){s.owners[i]=id;p.land++;}
 return {s,id,foe,p};
}
function attack(t,cells,targets=[0],percent=30,extras={}){
 const i=cells[0];return E.action(t.s,t.id,{type:'send',x:i%E.W,y:(i/E.W)|0,zone:cells,targets,percent,...extras});
}
function testFullFront(){
 const t=setup(),zone=tiles(span(55,63),span(40,45));
 assert(attack(t,zone).ok);
 const plan=t.s.attackPlans[0],wave=t.s.armies[0],info=E.estimatePlanFront(t.s,plan);
 assert.equal(info.cells,6,'Entire six-cell frontline must be included');
 assert(info.required>0);
 wave.strength=info.required-.1;
 const initial=t.p.land;
 for(let k=0;k<20&&wave.columns?.some(c=>c.route?.length);k++)E.combatStep(t.s);
 E.combatStep(t.s);
 assert.equal(t.p.land,initial,'Not one tile may be taken by an underfunded wave');
 assert.equal(t.s.armies.length,1);
 assert(wave.awaitingReinforcements,'Underfunded front waits in place for support');
 assert.equal(t.s.attackPlans.length,1,'Plan persists with its waiting wave');
 t.p.troops=0;
 for(let j=0;j<4;j++)E.tick(t.s);
 assert.equal(plan.waves,1,'No second wave below required reserve');
 t.p.troops=1800;
 for(let j=0;j<6&&!wave.reinforced;j++)E.tick(t.s);
 assert(wave.reinforced>=35,'Reserve reinforces the existing wave');
 assert.equal(plan.waves,1,'Support does not discard and relaunch the front');
 const count=E.estimatePlanFront(t.s,plan).cells,land=t.p.land;
 assert.equal(count,6);
 const next=t.s.armies.find(a=>a.planId===plan.id);
 for(let k=0;k<20&&next?.columns?.some(c=>c.route?.length);k++)E.combatStep(t.s);
 E.combatStep(t.s);
 assert.equal(t.p.land-land,count,'All six cells must expand on same tick');
}
function testNoTroops(){
 const t=setup();t.p.troops=0;
 const zone=tiles([55,56],[42,43]);
 const order=attack(t,zone);
 assert(order.ok,order.error);
 assert.equal(t.s.armies.length,0);
 assert.equal(t.s.attackPlans.length,1,'No troops cannot erase or reject the plan');
}
function testMergingAndEraser(){
 const t=setup();
 const a=tiles(span(55,57),span(40,41));
 const b=tiles(span(55,57),span(44,45));
 assert(attack(t,a).ok);const first=t.s.attackPlans[0].id;
 assert(attack(t,b).ok);assert.equal(t.s.attackPlans.length,2);
 const join=tiles(span(57,59),span(40,45)),expected=new Set([...a,...b,...join]);
 const result=attack(t,join);
 assert(result.ok,result.error);
 assert(result.merged);
 assert.equal(t.s.attackPlans.length,1,'Overlapping groups become one');
 assert.equal(t.s.attackPlans[0].id,first,'Older plan identity is retained');
 assert.deepEqual(new Set(t.s.attackPlans[0].zoneCells),expected);
 const chosen=[a[0],a[1]];
 const edit=E.action(t.s,t.id,{type:'updatePlan',id:first,zone:chosen,targets:[0],percent:40});
 assert(edit.ok,edit.error);
 assert.deepEqual(t.s.attackPlans[0].zoneCells,chosen.sort((x,y)=>x-y),'Erase edits only individual cells');
 const single=E.action(t.s,t.id,{type:'updatePlan',id:first,zone:[a[0]],targets:[0],percent:40});
 assert(single.ok,single.error);assert.equal(t.s.attackPlans[0].zoneCells.length,1);
 const forbidden=E.action(t.s,t.id,{type:'updatePlan',id:first,zone:[],targets:[0],percent:40});
 assert(!forbidden.ok);
 assert.equal(t.s.attackPlans[0].zoneCells.length,1,'Erasing every cell must not silently delete a plan');
}
function testConsentAndOverlap(){
 const t=setup(),i=E.idx(55,42),j=E.idx(55,43);
 t.s.owners[j]=t.foe;E.person(t.s,t.foe).land++;
 assert(E.action(t.s,t.id,{type:'setNationTarget',target:t.foe,enabled:true}).ok);
 assert(attack(t,[i,j],[0,t.foe]).ok);
 assert.equal(t.s.wars.length,1);
 assert(E.action(t.s,t.id,{type:'setNationTarget',target:t.foe,enabled:false}).ok);
 const merged=attack(t,[i,j],[0],30,{excludeTargets:[t.foe]});
 assert(merged.ok,merged.error);
 assert.equal(t.s.attackPlans.length,1);
 assert.deepEqual(t.s.attackPlans[0].targets,[0],'Merge must use nation-wide attack preferences');
 assert.equal(E.estimatePlanFront(t.s,t.s.attackPlans[0]).cells,1,'Front must ignore protected enemy tile');
}
testFullFront();testNoTroops();testMergingAndEraser();testConsentAndOverlap();
console.log('PASS: atomic frontier, reserve wait, overlap union, partial eraser, no troops, consent');
