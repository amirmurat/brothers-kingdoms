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
p.attackTargets=[];p.troops=300;p.troopCap=1000;foe.troops=0;
const recovery={id:'rtest',owner:defender,targetOwner:attacker,targets:[attacker],autoRecovery:true,
 zoneCells:lost,percent:30,waves:0,initialStrength:35,nextWaveTick:0};
s.recoveryPlans=[recovery];
p.garrisons=[{id:'guard-fixture',x:25,y:52,strength:300}];foe.garrisons=[];
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
