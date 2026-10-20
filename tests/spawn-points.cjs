'use strict';
const assert=require('node:assert/strict'),E=require('../engine.js');
const s=E.lobby(894),a=E.addPlayer(s,'First'),b=E.addPlayer(s,'Second');
const terrain=E.previewTerrain(s);
assert.deepEqual(terrain,E.previewTerrain(s),'preview stays deterministic');
terrain.fill(0);assert(E.previewTerrain(s).some(Boolean),'preview cannot mutate cached terrain');
function point(id,minX=5){for(let y=5;y<E.H-5;y++)for(let x=minX;x<E.W-5;x++)if(!E.spawnError(s,id,x,y))return {x,y};throw Error('No legal point');}
const first=point(a);assert(E.setSpawn(s,a,first).ok);
assert.equal(E.setSpawn(s,b,first).ok,false,'same capital is rejected');
assert.equal(E.setSpawn(s,b,{x:first.x+1,y:first.y}).ok,false,'overlapping countries rejected');
assert.equal(E.setSpawn(s,b,{x:NaN,y:4}).ok,false);
assert.equal(E.setSpawn(s,b,{x:3.5,y:6}).ok,false);
assert.equal(E.setSpawn(s,b,{x:-1,y:999}).ok,false);
const water=E.previewTerrain(s).findIndex(t=>!t);
assert.equal(E.setSpawn(s,b,{x:water%E.W,y:Math.floor(water/E.W)}).ok,false,'sea rejected');
const second=point(b);assert(E.setSpawn(s,b,second).ok);
const map=E.previewTerrain(s);
assert(E.start(s,4).ok);
assert.deepEqual(E.person(s,a).capital,first,'selected point used exactly');
assert.deepEqual(E.person(s,b).capital,second,'second selected point used exactly');
assert.deepEqual(s.tiles,map,'match uses exactly previewed mainland');
for(const p of s.players)for(const q of s.players)if(p.id!==q.id)assert(Math.hypot(p.capital.x-q.capital.x,p.capital.y-q.capital.y)>=14,'automatic and bot capitals avoid manual selections');
assert.equal(E.setSpawn(s,a,null).ok,false,'cannot move capital after start');
const reset=E.lobby(12),id=E.addPlayer(reset,'Reset');
const p={x:40,y:40}; // find valid point without relying on a fixed biome
let chosen;for(let y=5;y<E.H-5&&!chosen;y++)for(let x=5;x<E.W-5;x++)if(!E.spawnError(reset,id,x,y)){chosen={x,y};break;}
assert(E.setSpawn(reset,id,chosen).ok);assert(E.setSpawn(reset,id,null).ok);
assert.equal(E.person(reset,id).spawnPoint,null);
assert(E.start(reset,1).ok,'automatic fallback remains available');
const conflict=E.lobby(894);const one=E.addPlayer(conflict,'One'),two=E.addPlayer(conflict,'Two');
E.person(conflict,one).spawnPoint=first;E.person(conflict,two).spawnPoint=first;
assert.equal(E.start(conflict,2).ok,false,'start revalidates saved selections before mutating state');
assert.equal(conflict.phase,'lobby');assert.equal(conflict.players.length,2);
console.log('PASS starting points: shared preview, exact capitals, conflicts, sea, malicious coordinates, bots, reset and start preflight');
