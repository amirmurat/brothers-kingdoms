'use strict';
const assert=require('node:assert/strict'),E=require('../engine.js');
const s=E.lobby(84712),defender=E.addPlayer(s,'Defender'),attacker=E.addPlayer(s,'Aggressor');
assert(E.start(s,0).ok);
s.tiles.fill(1);s.owners.fill(0);
const p=E.person(s,defender),foe=E.person(s,attacker);
p.land=0;foe.land=0;
const lost=[];
for(let y=12;y<93;y++)for(let x=20;x<=25;x++){
 const i=E.idx(x,y);s.owners[i]=defender;p.land++;
}
for(let y=12;y<93;y++){
 const i=E.idx(26,y);s.owners[i]=attacker;foe.land++;lost.push(i);
}
s.wars=[Math.min(defender,attacker)+':'+Math.max(defender,attacker)];
p.attackTargets=[];p.troops=220;p.troopCap=1000;foe.troops=0;
const recovery={id:'rtest',owner:defender,targetOwner:attacker,targets:[attacker],autoRecovery:true,
 zoneCells:lost,percent:30,waves:0,initialStrength:35,nextWaveTick:0};
s.recoveryPlans=[recovery];
p.garrisons=[{id:'guard-fixture',x:25,y:52,strength:220}];foe.garrisons=[];
const estimate=E.estimatePlanFront(s,recovery);
assert.equal(estimate.cells,81);
assert(estimate.required>90,'Whole front must cost more than the committed 90 troops');
E.tick(s);
const wave=s.armies.find(a=>a.planId===recovery.id);
assert(wave,'Automatic defense must launch despite insufficient whole-front budget');
const before=p.land;
for(let k=0;k<150&&wave.columns?.some(c=>c.route?.length);k++)E.combatStep(s);
E.combatStep(s);const gained=p.land-before;
assert(gained>0&&gained<estimate.cells,'Automatic recovery must capture an affordable subset');
assert.equal(p.attackTargets.length,0,'Defensive recovery does not require Attack in Nations');
console.log('PASS: automatic recovery on an 81-cell frontier advances '+gained+
 ' cells; Nations Attack remains disabled');

// Ordinary offensives can consume their entire 75% pool. Defensive recovery
// must still mobilize the home reserve without opting into offensive Attack.
{
 const t=E.lobby(42),id=E.addPlayer(t,'Defender'),enemy=E.addPlayer(t,'Invader');assert(E.start(t,0).ok);
 t.tiles.fill(1);t.owners.fill(0);t.buildings=[];t.armies=[];t.attackPlans=[];
 for(let y=20;y<30;y++)for(let x=20;x<30;x++)t.owners[E.idx(x,y)]=id;
 const lost=E.idx(30,25);t.owners[lost]=enemy;t.wars=[id+':'+enemy];
 const p=E.person(t,id),q=E.person(t,enemy);p.land=100;p.troops=250;p.attackTargets=[];
 p.garrisons=[{id:'home',x:29,y:25,strength:250}];q.land=1;q.troops=0;q.garrisons=[];
 // Deployed troops are committed elsewhere, not available as remote payment.
 t.armies=[{id:'busy',owner:id,strength:750,x:20,y:20,tx:20,ty:20,planId:'busy-plan',
  columns:[{x:20,y:20,tx:20,ty:20,strength:750,route:[]}]}];
 const recovery={id:'defend',owner:id,targetOwner:enemy,targets:[enemy],autoRecovery:true,zoneCells:[lost],waves:0,nextWaveTick:0};
 t.recoveryPlans=[recovery];
 assert(E.automaticAllocation(t,recovery).available>=35,'Recovery can use defensive reserve when the offensive pool is full');
 // An ordinary plan retains the original shared offensive limit.
 const ordinary={...recovery,id:'ordinary',autoRecovery:false};t.attackPlans=[ordinary];
 assert.equal(E.automaticAllocation(t,ordinary).available,0,'Emergency funds cannot fund ordinary aggression');
 assert.deepEqual(p.attackTargets,[],'No implied permission to invade the aggressor');
 const busy={id:'busy-plan',owner:id,targetOwner:0,targets:[0],zoneCells:[E.idx(20,19)],waves:1};
 t.attackPlans.push(busy);t.armies[0].columns[0].y=29;
 E.tick(t);
 assert(t.armies.some(a=>a.planId===recovery.id&&a.strength>=35),'A real defensive column launches while the ordinary army is marching');
 assert.deepEqual(p.attackTargets,[],'Automatic launch leaves Attack disabled');
 recovery.targets=[];
 assert(E.estimatePlanFront(t,recovery).cells>0,'Legacy empty target metadata cannot revoke defensive permission');
}
