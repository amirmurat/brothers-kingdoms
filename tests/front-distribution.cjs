'use strict';
const assert=require('node:assert/strict'),E=require('../engine.js');
function setup(){
 const s=E.lobby(13),id=E.addPlayer(s,'Commander'),enemy=E.addPlayer(s,'Enemy');assert(E.start(s,0).ok);
 s.tiles.fill(1);s.owners.fill(0);s.buildings=[];s.armies=[];s.attackPlans=[];s.recoveryPlans=[];
 for(let y=20;y<=60;y++)for(let x=20;x<=70;x++)s.owners[E.idx(x,y)]=id;
 const p=E.person(s,id),foe=E.person(s,enemy);p.land=2091;p.troops=2000;p.troopCap=10000;p.capital={x:22,y:40};
 p.garrisons=[{id:'home',x:22,y:40,strength:2000}];foe.troops=0;foe.garrisons=[];
 s.buildings=[{id:'base',owner:id,kind:'capital',x:22,y:40,level:1}];
 const zone=[];for(let y=20;y<=60;y++)for(let x=71;x<=73;x++)zone.push(E.idx(x,y));
 assert(E.action(s,id,{type:'send',x:71,y:40,zone,percent:60}).ok);
 return {s,id,p,zone,a:s.armies[0]};
}
function assemble(t){
 for(let n=0;n<150&&t.a.columns.some(c=>c.route?.length);n++){
  const land=t.p.land;E.combatStep(t.s);assert.equal(t.p.land,land,'Whole manual line waits for every local deployment');
 }
 assert(t.a.columns.every(c=>!c.route?.length),'Every sector receives troops');
}
{
 const t=setup();assert(t.a.sectors.length>5,'Wide front has several local sectors');
 const ys=t.a.columns.map(c=>c.ty);assert(Math.max(...ys)-Math.min(...ys)>30,'Troops deploy along entire front, not its midpoint');
 assemble(t);const before=t.p.land;E.combatStep(t.s);
 assert.equal(t.p.land-before,41,'Full line advances atomically only after all sectors arrive');
 assert(t.a.columns.length>5,'Physical front troops survive a successful capture');
 assert(Math.abs(t.a.columns.reduce((n,c)=>n+c.strength,0)-t.a.strength)<1e-6,'Casualties are charged to those same columns');
 const land=t.p.land;E.combatStep(t.s);assert.equal(t.p.land,land,'New frontier requires physical movement before another capture');
 const positions=t.a.columns.map(c=>({x:c.x,y:c.y}));
 const saved=JSON.parse(JSON.stringify(t.s)),copy=saved.armies.find(a=>a.id===t.a.id);
 assert.equal(copy.columns.length,t.a.columns.length,'Save/rejoin preserves actual distributed troops');
 E.action(t.s,t.id,{type:'cancelPlan',id:t.s.attackPlans[0].id});
 for(const g of t.p.garrisons.filter(g=>g.returning))assert(positions.some(c=>c.x===g.x&&c.y===g.y),'Recall starts from each actual sector');
}
{
 const t=setup();assemble(t);
 const first=t.a.columns[0],last=t.a.columns[t.a.columns.length-1];
 last.strength+=first.strength;first.strength=0;
 const before=t.p.land;E.combatStep(t.s);
 assert.equal(t.p.land,before,'A rich remote sector cannot fund an undefended sector');
 assert.equal(t.s.attackPlans.length,1,'Unfunded line keeps its drawn plan');
}
{
 const t=setup();
 // The legacy bot path uses the exact same local deployment, not the old pool.
 E.action(t.s,t.id,{type:'cancelPlan',id:t.s.attackPlans[0].id});
 t.s.armies=[];t.s.attackPlans=[];t.p.troops=2000;t.p.garrisons=[{id:'home2',x:22,y:40,strength:2000}];t.p.bot=true;
 assert(E.action(t.s,t.id,{type:'send',x:71,y:40,percent:60}).ok);
 const a=t.s.armies[0];assert(a.columns.length>1);
 E.combatStep(t.s);assert.equal(a.captured,0,'Bot armies must physically arrive too');
}
{
 const t=setup();t.s.attackPlans[0].autoRecovery=true;
 const before=t.p.land;
 for(let n=0;n<100&&t.p.land===before;n++)E.combatStep(t.s);
 assert(t.p.land>before,'Recovery advances where its own troops have arrived');
 assert(t.a.columns.some(c=>c.route?.length),'Local recovery need not wait for distant marching sectors');
 for(const i of t.zone.filter(i=>t.s.owners[i]===t.id))assert(E.localAttackStrength(t.a,i)>0,'Every recovered cell has actual nearby assigned troops');
 assert.equal(t.s.owners[E.idx(71,20)],0,'Unreached distant frontier cannot capture remotely');
}
console.log('PASS distributed front: distinct destinations, all-sector readiness, local losses, movement after capture, no remote funding, real recall/save and bot parity');
