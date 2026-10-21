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

function firstAdvance(t){const before=t.p.land;for(let n=0;n<150&&t.p.land===before;n++)E.combatStep(t.s);return before;}
{
 const t=setup(),before=firstAdvance(t);
 assert(t.p.land>before&&t.p.land-before<41,'Ready local sectors advance without waiting for the complete long frontier');
 assert(t.a.columns.some(c=>c.route?.length),'Distant sectors are still receiving troops');
 assert(t.a.columns.length>1,'Deployed soldiers remain distributed and physical');
 for(const i of t.zone.filter(i=>t.s.owners[i]===t.id))assert(E.localAttackStrength(t.a,i)>0,'Only locally manned cells are captured');
 assert(Math.abs(t.a.columns.reduce((n,c)=>n+c.strength,0)-t.a.strength)<1e-5,'Local payments match total strength');
 const positions=t.a.columns.map(c=>({x:c.x,y:c.y})),saved=JSON.parse(JSON.stringify(t.s));
 assert.equal(saved.armies[0].columns.length,t.a.columns.length);
 E.action(t.s,t.id,{type:'cancelPlan',id:t.s.attackPlans[0].id});
 for(const g of t.p.garrisons.filter(g=>g.returning))assert(positions.some(c=>c.x===g.x&&c.y===g.y),'Recall preserves real locations');
}
{
 const t=setup();for(const c of t.a.columns){c.x=c.tx;c.y=c.ty;c.route=[];}
 const weak=t.a.sectors[0],other=t.a.columns.find(c=>c.sector!==weak.key);
 for(const c of t.a.columns)if(c.sector===weak.key){other.strength+=c.strength;c.strength=0;}
 const before=t.p.land;E.combatStep(t.s);
 assert(t.p.land>before,'A weak sector does not block healthy parts of the plan');
 for(const i of weak.cells)assert.equal(t.s.owners[i],0,'A remote force cannot pay for the empty sector');
 assert.equal(t.s.attackPlans.length,1,'The uncompleted plan remains active');
}
{
 const t=setup();E.action(t.s,t.id,{type:'cancelPlan',id:t.s.attackPlans[0].id});
 t.s.armies=[];t.s.attackPlans=[];t.p.troops=2000;t.p.garrisons=[{id:'home2',x:22,y:40,strength:2000}];t.p.bot=true;
 assert(E.action(t.s,t.id,{type:'send',x:71,y:40,percent:60}).ok);
 const a=t.s.armies[0];E.combatStep(t.s);assert.equal(a.captured,0,'Bot troops must also arrive physically');
}
console.log('PASS distributed front: independent ready sectors, no remote payment, save/recall positions and physical bot travel');
