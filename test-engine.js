'use strict';
const assert=require('node:assert/strict');const E=require('./engine');
const s=E.lobby(123456),id=E.addPlayer(s,'Amir'),id2=E.addPlayer(s,'Brother');
assert.equal(id,1);assert.equal(id2,2);assert.equal(s.phase,'lobby');
assert.equal(E.start(s,7).ok,true);assert.equal(s.players.length,9);assert.equal(s.tiles.length,160*104);assert.equal(s.owners.length,160*104);
assert(s.landTotal>8000);assert.equal(s.players.filter(p=>p.bot).length,7);
let p=E.person(s,id);assert(p.land>40);const cap=s.buildings.find(b=>b.owner===id&&b.kind==='capital');assert(cap);
assert.equal(E.owner(s,cap.x,cap.y),id);assert(!E.action(s,id,{type:'build',kind:'city',x:1,y:1}).ok);
assert(E.action(s,id,{type:'upgrade',id:cap.id}).ok);assert.equal(cap.level,2);
assert(E.action(s,id,{type:'research',key:'economy'}).ok);assert.equal(p.tech.economy,1);
// Build a farm at valid tile.
let spot=null;for(let y=0;y<E.H;y++)for(let x=0;x<E.W;x++)if(E.owner(s,x,y)===id&&!E.buildingAt(s,x,y)&&E.tile(s,x,y)!==6){spot={x,y};break;}
assert(spot);assert(E.action(s,id,{type:'build',kind:'farm',...spot}).ok);
// Sending a force into nearby neutral space should capture tiles.
let target=null;let dist=1e9;for(let y=0;y<E.H;y++)for(let x=0;x<E.W;x++)if(E.tile(s,x,y)!==0&&E.owner(s,x,y)===0){let d=Math.abs(x-cap.x)+Math.abs(y-cap.y);if(d<dist){dist=d;target={x,y};}}
assert(target);let before=p.land;const send=E.action(s,id,{type:'send',...target,percent:65});assert(send.ok,JSON.stringify(send));assert(s.armies.some(a=>a.owner===id));
for(let i=0;i<6;i++)E.tick(s);assert(p.land>before,'territorial attack captures land');
const prevFood=p.res.food;for(let i=0;i<85;i++)E.tick(s);
assert(s.tick===91);assert(p.res.wood>=0);assert(p.res.stone>=0);assert(p.res.gold>=0);
for(const v of s.players){assert(v.land>=0,'no negative territories');assert(v.troops>=0,'troops nonnegative');}
const total=s.owners.filter(Boolean).length;assert.equal(E.landCount(s),total,'ownership counts consistent');
assert.equal(E.addPlayer(s,'Late'),null);
// Alliances require acceptance; exchange resources is gated.
assert(E.action(s,id,{type:'diplomacy',target:id2}).ok);assert(E.person(s,id).offers.includes(id2));assert(E.action(s,id2,{type:'diplomacy',target:id}).ok);assert(E.person(s,id).allies.includes(id2));
assert(E.action(s,id,{type:'donate',target:id2,amount:25,resource:'wood'}).ok);
assert(!E.action(s,id,{type:'research',key:'INVALID'}).ok);
for(let i=0;i<220;i++)E.tick(s);
assert.equal(E.landCount(s),s.owners.filter(Boolean).length);
console.log('PASS: 9-player seeded map, ownership, economy, buildings, technology, orders, expansion, alliances, donations, 311 ticks, invariants.');
