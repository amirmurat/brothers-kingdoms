'use strict';
const assert=require('node:assert/strict'),E=require('../engine.js');
const s=E.lobby(57283),id=E.addPlayer(s,'Commander');assert(E.start(s,0).ok);
const p=E.person(s,id);s.tiles.fill(1);s.owners.fill(0);s.buildings=[];
s.owners[E.idx(80,50)]=id;p.land=1;p.troops=1000;
const make=(name,x)=>({id:name,owner:id,targets:[0],zoneCells:[E.idx(x,50)],percent:60,waves:0,nextWaveTick:0});
const a=make('east',81),b=make('west',79);s.attackPlans=[a,b];
assert.equal(E.planAllocation(s,a),300);assert.equal(E.planAllocation(s,b),300);
s.armies=[{owner:id,planId:a.id,strength:300}];p.troops=700;
assert.equal(E.planAllocation(s,a),0,'Active wave already uses its share');
assert.equal(E.planAllocation(s,b),300,'Second front gets the same share regardless of launch order');
s.armies.push({owner:id,planId:b.id,strength:300});p.troops=400;
assert.equal(E.planAllocation(s,a),0);assert.equal(E.militaryStrength(s,id).total,1000);
s.attackPlans=[a];s.armies=[];p.troops=1000;
assert.equal(E.planAllocation(s,a),600,'Concentrating on one front doubles its strength');
// Deployed soldiers still occupy capacity; frozen armies isolate recruitment.
s.attackPlans=[];s.armies=[{owner:id,strength:903}];p.troops=0;
E.tick(s);assert.equal(p.troopIncome,0,'Deployment cannot create extra recruitment slots');
console.log('PASS shared army: equal fronts, concentration, committed budget and deployed capacity');
