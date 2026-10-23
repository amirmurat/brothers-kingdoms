'use strict';
// v139: fog-of-war must protect each kingdom's painted offense and recovery orders.
const assert=require('node:assert/strict'),E=require('../engine.js');
const s=E.lobby(139),a=E.addPlayer(s,'Blue'),b=E.addPlayer(s,'Red');
assert(E.start(s,0).ok);
const cells=[E.idx(72,41),E.idx(72,42),E.idx(73,42)];
s.attackPlans=[
 {id:'blue-secret',owner:a,targetOwner:b,targets:[b],zoneCells:cells,allocationMode:'percent',allocationValue:95,focus:true},
 {id:'red-secret',owner:b,targetOwner:a,targets:[a],zoneCells:[E.idx(81,50)],allocationMode:'troops',allocationValue:420,focus:false}
];
s.recoveryPlans=[
 {id:'blue-recovery',owner:a,targetOwner:b,zoneCells:[cells[0]],autoRecovery:true},
 {id:'red-recovery',owner:b,targetOwner:a,zoneCells:[E.idx(81,50)],autoRecovery:true}
];
function snapshot(viewer){return E.restoreNetworkState(JSON.parse(JSON.stringify(E.networkState(s,viewer))));}
const blue=snapshot(a),red=snapshot(b),authority=snapshot(null);
assert.deepEqual(blue.attackPlans.map(p=>p.id),['blue-secret'],'Blue has only own offense');
assert.deepEqual(blue.recoveryPlans.map(p=>p.id),['blue-recovery'],'Blue has only own recovery');
assert.deepEqual(red.attackPlans.map(p=>p.id),['red-secret'],'Red has only own offense');
assert.deepEqual(red.recoveryPlans.map(p=>p.id),['red-recovery'],'Red has only own recovery');
assert.deepEqual(blue.attackPlans[0].zoneCells,cells,'Friendly geometry intact after wire serialization');
assert.equal(blue.attackPlans[0].allocationValue,95,'Friendly strength priority intact');
assert.equal(red.attackPlans[0].allocationValue,420,'Other side sees own fixed budget');
assert.equal(authority.attackPlans.length,2,'Host and saved authoritative snapshots remain full');
assert.equal(authority.recoveryPlans.length,2,'Host keeps all recovery orders');
assert.equal(s.attackPlans.length,2,'Serializing viewer state does not mutate engine state');
// Unauthorised stale-client metadata must not be able to overwrite authoritative state.
const oldSave=JSON.parse(JSON.stringify(s));assert.equal(oldSave.attackPlans.length,2,'Historical saves remain complete');
console.log('PASS v139: rival attack plans and recovery orders hidden from each player, own orders and host remain intact');
