'use strict';
const assert=require('node:assert/strict');const E=require('./engine.js');
function arena(seed=33){const s=E.lobby(seed),id=E.addPlayer(s,'Альфа');assert(E.start(s,0).ok);s.tiles.fill(1);s.owners.fill(0);s.buildings=[];s.armies=[];s.landTotal=E.W*E.H;const p=E.person(s,id);p.land=0;p.troops=1200;p.troopCap=12000;p.tech={economy:0,war:0,logistics:0,sailing:0};p.capital={x:80,y:52};for(let y=43;y<=61;y++)for(let x=71;x<=89;x++){s.owners[E.idx(x,y)]=id;p.land++;}return {s,id,p};}
function firstSamples(s,id,x,y){const r=E.previewFront(s,id,x,y);assert(r.cells.length>3,'front must have width');return r.cells;}
{
 const {s,id}=arena();const east=firstSamples(s,id,124,52),west=firstSamples(s,id,35,52);assert(east.every(i=>i%E.W>=89),'east border near target');assert(west.every(i=>i%E.W<=71),'west border near target');assert(!east.some(i=>west.includes(i)),'distant fronts must not overlap');console.log('PASS local border preview: east',east.length,'west',west.length);
}
for(const seed of [1,2,3,42,101]){
 const {s,id,p}=arena(seed),start=p.land,oldLeft=E.owner(s,69,52),oldRight=E.owner(s,91,52);
 assert.equal(oldLeft,0);assert.equal(oldRight,0);
 const r=E.action(s,id,{type:'send',x:124,y:52,percent:35});assert(r.ok,r.error);
 for(let t=0;t<10&&s.armies.length;t++)E.combatStep(s);
 assert(p.land>start,'capture must gain land');assert.equal(E.owner(s,69,52),0,'east command must not conquer far west immediately');assert.equal(E.owner(s,91,52),id,'east command should reach target side');
 const beforeRetreat=p.land;if(s.armies.length){assert(E.action(s,id,{type:'return',id:s.armies[0].id}).ok);for(let t=0;t<12;t++)E.combatStep(s);assert.equal(p.land,beforeRetreat,'retreat stops expanding immediately');}
 console.log('PASS directional assault/retreat seed',seed,'land',p.land-start);
}
function warfare(level){const {s,id,p}=arena(20);p.tech.logistics=level;p.troops=490;assert(E.action(s,id,{type:'send',x:122,y:52,percent:85}).ok);for(let i=0;i<110&&s.armies.length;i++)E.combatStep(s);return p.land;}
assert(warfare(3)>warfare(0),'logistics research must actually improve army efficiency');console.log('PASS logistics produces real value');
{
 const {s,id,p}=arena();let b={id:'b99',owner:id,kind:'farm',x:78,y:52,level:1};s.buildings.push(b);p.res={food:3000,wood:3000,stone:3000,gold:3000};let before=E.counts(s,id).farm;assert(E.action(s,id,{type:'upgrade',id:b.id}).ok);assert.equal(E.counts(s,id).farm,before+1);
 let px={...p.res};assert(E.action(s,id,{type:'research',key:'economy'}).ok);E.tick(s);assert(p.income.food>2+p.land/100+E.counts(s,id).farm*8,'income upgrade must be meaningful');console.log('PASS upgrade/research production');
}
console.log('PASS: all v9 engine gameplay tests');
