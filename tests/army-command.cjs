'use strict';
const assert=require('node:assert/strict'),E=require('../engine.js');
function setup(percent=30){
 const s=E.lobby(13),id=E.addPlayer(s,'Commander'),foe=E.addPlayer(s,'Enemy');assert(E.start(s,0).ok);
 s.tiles.fill(1);s.owners.fill(0);s.territoryRevision++;s.buildings=[];s.armies=[];s.attackPlans=[];s.recoveryPlans=[];
 for(let y=20;y<=60;y++)for(let x=20;x<=70;x++)s.owners[E.idx(x,y)]=id;
 const p=E.person(s,id);p.land=2091;p.troops=100000;p.troopCap=200000;p.capital={x:22,y:40};
 p.garrisons=[{id:'near',x:70,y:40,strength:60000},{id:'far',x:22,y:40,strength:40000}];
 s.buildings=[{id:'base',owner:id,kind:'capital',x:22,y:40,level:1}];E.person(s,foe).troops=0;E.person(s,foe).garrisons=[];
 const zone=[];for(let y=20;y<=60;y++)for(let x=71;x<=100;x++)zone.push(E.idx(x,y));
 assert(E.action(s,id,{type:'send',x:71,y:40,zone,percent}).ok);return{s,id,p,a:s.armies[0]};
}
{
 const t=setup(5),other=setup(95);assert.equal(t.a.strength,other.a.strength,'Old troop sliders do not affect automatic orders');
 assert(t.a.columns.every(c=>c.x===70),'Sufficient nearby troops take priority over distant bases');
 assert(t.p.troops>=25000,'The director retains a defensive reserve');
 const before=t.p.land;for(let n=0;n<50&&t.p.land===before;n++)E.combatStep(t.s);
 assert(t.p.land>before&&t.a.columns.some(c=>c.route?.length),'A 100k army advances locally while remote deployment continues');
}
{
 const t=setup(),sector=t.a.sectors.find(s=>s.required>8);
 t.a.columns=[{x:sector.anchor%E.W,y:(sector.anchor/E.W)|0,tx:sector.anchor%E.W,ty:(sector.anchor/E.W)|0,strength:8,sector:sector.key,route:[]}];t.a.strength=8;
 const before=t.p.land;E.combatStep(t.s);assert(t.a.awaitingReinforcements);
 t.p.troops=100000;const id=t.a.id;E.tick(t.s);
 assert(t.s.armies.some(a=>a.id===id)&&t.a.reinforced>=35,'Automatic director supplies an existing weak wave');
 for(let n=0;n<100&&t.p.land===before;n++)E.combatStep(t.s);
 assert(t.p.land>before,'The original order resumes with physical reinforcements');
}
console.log('PASS autonomous commands: old slider ignored, nearby force, 100k reserves, local advancement and active support');
