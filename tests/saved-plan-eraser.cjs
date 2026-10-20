'use strict';
const assert=require('node:assert/strict'),E=require('../engine.js');
function run(){
 const s=E.lobby(125992),user=E.addPlayer(s,'Commander'),other=E.addPlayer(s,'Opponent');
 assert(E.start(s,0).ok);
 const a=E.idx(51,41),b=E.idx(52,41),c=E.idx(53,41),d=E.idx(54,41),e=E.idx(55,41);
 for(const i of [a,b,c,d,e])s.tiles[i]=1;
 s.attackPlans=[
  {id:'p100',owner:user,targetOwner:0,targets:[0],zoneCells:[a,b],percent:30,initialStrength:150,waves:0,nextWaveTick:s.tick},
  {id:'p101',owner:user,targetOwner:0,targets:[0],zoneCells:[c,d],percent:30,initialStrength:150,waves:0,nextWaveTick:s.tick},
  {id:'p102',owner:other,targetOwner:0,targets:[0],zoneCells:[b,c,e],percent:30,initialStrength:150,waves:0,nextWaveTick:s.tick}
 ];
 const beforeOwners=[a,b,c,d,e].map(i=>s.owners[i]);
 const forbidden=E.action(s,other,{type:'erasePlanCells',cells:[a,d]});
 assert(forbidden.ok);
 assert.equal(forbidden.erased,0,'Cannot alter someone else\'s plans');
 const trimmed=E.action(s,user,{type:'erasePlanCells',cells:[b,c]});
 assert(trimmed.ok,trimmed.error);assert.equal(trimmed.erased,2);assert.equal(trimmed.affected,2);
 assert.deepEqual(s.attackPlans.find(p=>p.id==='p100').zoneCells,[a]);
 assert.deepEqual(s.attackPlans.find(p=>p.id==='p101').zoneCells,[d]);
 assert.deepEqual(s.attackPlans.find(p=>p.id==='p102').zoneCells,[b,c,e],'Opponent plan preserved');
 assert.deepEqual([a,b,c,d,e].map(i=>s.owners[i]),beforeOwners,'Territory unaffected');
 const removal=E.action(s,user,{type:'erasePlanCells',cells:[a,d]});
 assert(removal.ok);assert.equal(removal.deleted,2);
 assert.equal(s.attackPlans.length,1);assert.equal(s.attackPlans[0].owner,other);
 for(const cells of [[],[-1],[E.W*E.H],[2.5],Array(E.W*E.H+1).fill(a)]){
  assert.equal(E.action(s,user,{type:'erasePlanCells',cells}).ok,false);
 }
}
run();
console.log('PASS: saved-plan eraser across plans, owner isolation, partial and full strokes, unchanged territory, validation');
