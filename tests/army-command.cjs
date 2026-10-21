'use strict';
const assert=require('node:assert/strict'),E=require('../engine.js');
function setup(){
 const s=E.lobby(13),id=E.addPlayer(s,'Commander'),enemy=E.addPlayer(s,'Enemy');assert(E.start(s,0).ok);
 s.tiles.fill(1);s.owners.fill(0);s.buildings=[];s.armies=[];s.attackPlans=[];s.recoveryPlans=[];
 for(let y=20;y<=60;y++)for(let x=20;x<=70;x++)s.owners[E.idx(x,y)]=id;
 const p=E.person(s,id);p.land=2091;p.troops=100000;p.troopCap=200000;p.capital={x:22,y:40};
 p.garrisons=[{id:'near',x:70,y:40,strength:60000},{id:'far',x:22,y:40,strength:40000}];
 s.buildings=[{id:'base',owner:id,kind:'capital',x:22,y:40,level:1}];E.person(s,enemy).troops=0;E.person(s,enemy).garrisons=[];
 const zone=[];for(let y=20;y<=60;y++)for(let x=71;x<=74;x++)zone.push(E.idx(x,y));
 assert(E.action(s,id,{type:'send',x:71,y:40,zone,percent:30}).ok);
 return {s,id,p,a:s.armies[0],plan:s.attackPlans[0]};
}
function assemble(t){for(let n=0;n<150&&t.a.columns.some(c=>c.route?.length);n++)E.combatStep(t.s);}
{
 const t=setup();
 assert(t.a.columns.every(c=>c.x===70),'Use sufficient nearby troops without drafting distant garrisons');
 assemble(t);E.combatStep(t.s);assert(t.a.captured>0);
 for(let y=20;y<=31;y++)t.s.tiles[E.idx(72,y)]=6;
 E.combatStep(t.s);
 assert(t.a.columns.every(c=>(c.route?.length||0)<=7),'A new layer must not reshuffle huge forces along the entire front');
 assert(Math.abs(t.a.columns.reduce((n,c)=>n+c.strength,0)-t.a.strength)<1e-5);
}
{
 const t=setup();assemble(t);t.a.strength=90;const before=t.p.land;
 E.combatStep(t.s);
 assert.equal(t.p.land,before,'No partial unfunded manual capture');
 assert(t.a.awaitingReinforcements,'Underfunded troops request support instead of walking home');
 const stationed=t.a.columns.map(c=>({x:c.x,y:c.y})),armyId=t.a.id;
 t.p.troops=100000;E.tick(t.s);
 assert(t.s.armies.some(a=>a.id===armyId),'Reinforce the same ongoing offensive');
 assert(t.a.reinforced>=35&&t.a.strength>90,'Large reserves actually reinforce an existing wave');
 assert(t.a.columns.some(c=>c.route?.length),'Reinforcements physically march; no teleport');
 assert(!t.p.garrisons.some(g=>g.returning),'Waiting front troops are not repeatedly recalled');
 for(let n=0;n<200&&t.p.land===before;n++)E.combatStep(t.s);
 assert(t.p.land>before,'The original order resumes after support arrives');
}
{
 const t=setup();assemble(t);
 const first=t.a.columns[0],last=t.a.columns[t.a.columns.length-1];last.strength+=first.strength;first.strength=0;
 const before=t.p.land;E.combatStep(t.s);
 assert.equal(t.p.land,before,'Remote reserves cannot instantly capture the empty sector');
 for(let n=0;n<60&&t.p.land===before;n++)E.combatStep(t.s);
 assert(t.p.land>before,'Existing front forces physically rebalance when a local sector becomes weak');
}
console.log('PASS command execution: 100k army, nearby dispatch, stable advancing sectors, active reinforcements and resumed orders');
