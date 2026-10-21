'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),E=require('../engine.js');
// Count whole-map path floods rather than relying on noisy wall-clock limits.
const source=fs.readFileSync('engine.js','utf8').replace('function marchField(s,id,destination){','function marchField(s,id,destination){s.testFloods=(s.testFloods||0)+1;');
const mod={exports:{}};new Function('module',source)(mod);const F=mod.exports;
const s=F.lobby(7),id=F.addPlayer(s,'A'),enemy=F.addPlayer(s,'B');assert(F.start(s,0).ok);
s.tiles.fill(1);s.owners.fill(id);s.territoryRevision++;s.buildings=[{id:'home',owner:id,kind:'capital',x:20,y:30,level:1}];
const p=F.person(s,id);p.troops=1200;p.garrisons=[{id:'g',x:70,y:30,strength:1200,returning:true}];p.land=F.W*F.H;
for(let k=0;k<20;k++)F.spatialArmyStep(s);
assert.equal(s.testFloods||0,0,'Open friendly routes must reuse paths without whole-map floods');
assert(p.garrisons.every(g=>g.x>=50),'Optimization must not teleport returning soldiers');
const zone=[];for(let y=5;y<95;y++)for(let x=80;x<150;x++){const i=F.idx(x,y);s.owners[i]=enemy;zone.push(i);}
s.territoryRevision++;F.person(s,enemy).troops=0;F.person(s,enemy).garrisons=[];
s.attackPlans=[{id:'p-test',owner:id,targets:[enemy],zoneCells:zone,percent:30}];
s.wars=[id+':'+enemy];
s.armies=[{id:'a-test',owner:id,planId:'p-test',strength:100,frontSignature:zone.join(','),zoneCells:zone,frontCells:[F.idx(80,30)],
 sectors:[{key:'test',anchor:F.idx(79,30),cells:[F.idx(80,30)],required:3}],
 columns:[{x:79,y:30,tx:79,ty:30,strength:100,sector:'test',route:[]}]}];
const raw=JSON.stringify(s),packet=F.networkState(s),encoded=JSON.stringify(packet);
assert(encoded.length<raw.length*.65,'Wire state removes duplicate zones/routes and compresses plan geometry');
assert(!encoded.includes('frontSignature'),'Server-only front keys stay off the wire');
assert(packet.players.every(p=>(p.garrisons||[]).every(g=>!('route' in g))));
assert(packet.armies.every(a=>(a.columns||[]).every(c=>!('route' in c))));
const display=F.restoreNetworkState(JSON.parse(encoded));
assert.deepEqual(display.attackPlans[0].zoneCells,zone,'Exact paint geometry survives compression');
assert.equal(display.armies[0].zoneCells,display.attackPlans[0].zoneCells,'One shared geometry array serves the plan and army');
assert.equal(F.localAttackStrength(display.armies[0],F.idx(80,30)),100,'Compact snapshots preserve actual local combat presence');
const next=F.restoreNetworkState(JSON.parse(JSON.stringify(F.networkState(s))));
assert.equal(next.attackPlans[0].zoneCells,display.attackPlans[0].zoneCells,'Unchanged network geometry reuses the display array');
s.armies[0].columns[0].x=70;s.armies[0].columns[0].route=[F.idx(71,30),F.idx(79,30)];
const moving=F.restoreNetworkState(JSON.parse(JSON.stringify(F.networkState(s))));
assert.equal(F.localAttackStrength(moving.armies[0],F.idx(80,30)),0,'A moving column cannot appear as arrived after route stripping');
assert(s.armies[0].columns[0].route.length,'Full routes remain in authoritative state/saves');
console.log('PASS army performance: bounded pathfinding, real movement, compact exact snapshots, reused geometry and correct arrived/marching presence');
// Large path buffers belong to the simulation, not each A* request.
{
 let allocations=0;const mod={exports:{}};
 class CountedDistances extends Float64Array{constructor(...a){super(...a);allocations++;}}
 new Function('module','Float64Array',fs.readFileSync('engine.js','utf8'))(mod,CountedDistances);
 const R=mod.exports,t=R.lobby(1),id=R.addPlayer(t,'Routes');R.start(t,0);t.tiles.fill(1);t.owners.fill(id);t.roads=[];
 for(let n=0;n<30;n++){const route=R.roadRoute(t,id,R.idx(20,20),R.idx(25+n%5,25));assert(route?.length,'Independent queries find real friendly routes');}
 assert.equal(allocations,1,'Repeated road queries reuse the same full-map distance buffer');
 t.owners[R.idx(29,25)]=0;assert.equal(R.roadRoute(t,id,R.idx(20,20),R.idx(29,25)),null,'Scratch reuse cannot leak an earlier reachable result');
}
