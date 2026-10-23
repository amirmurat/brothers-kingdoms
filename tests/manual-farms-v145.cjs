'use strict';
const assert=require('node:assert/strict'),E=require('../engine.js');
function fixture(){const s=E.lobby(88),id=E.addPlayer(s,'Farmer'),foe=E.addPlayer(s,'Other');assert(E.start(s,0).ok);
 s.tiles.fill(4);s.owners.fill(0);for(let y=25;y<55;y++)for(let x=20;x<55;x++)s.owners[E.idx(x,y)]=id;
 s.owners[E.idx(100,50)]=foe;s.buildings=[{id:'city',kind:'city',owner:id,x:30,y:40,level:1}];s.buildJobs=[];s.armies=[];s.attackPlans=[];s.recoveryPlans=[];s.roads=[];
 const p=E.person(s,id);p.land=1050;p.troops=0;p.garrisons=[];p.workers=[];p.capital={x:30,y:40};p.res={food:10000,wood:10000,stone:10000,gold:10000};s.territoryRevision++;return {s,id,foe,p};}
{
 const {s,id,foe,p}=fixture();for(let t=0;t<10;t++)E.tick(s);
 assert.equal(p.income.food,2,'Fertile terrain never becomes an automatic farm');
 assert(!E.automaticWorkSites(s,id).some(v=>v.resource==='food'));
 s.tiles[E.idx(32,40)]=3;s.territoryRevision++;
 assert(!E.action(s,id,{type:'queueBuild',kind:'farm',x:32,y:40}).ok,'Cannot farm rocky terrain');
 assert(!E.action(s,foe,{type:'queueBuild',kind:'farm',x:31,y:40}).ok,'Cannot build on foreign land');
 const wood=p.res.wood,price=E.costBuilding(s,id,'farm');
 assert(E.action(s,id,{type:'build',kind:'farm',x:31,y:40}).ok);
 assert.equal(wood-p.res.wood,price.wood);assert(!E.buildingAt(s,31,40),'Even legacy build command uses paid construction');
 assert.equal(s.buildJobs[0].kind,'farm');
 for(let t=0;t<60&&!E.buildingAt(s,31,40);t++){assert.equal(p.income.food,2);E.tick(s);}
 assert.equal(E.buildingAt(s,31,40)?.kind,'farm');
 for(let t=0;t<15;t++)E.tick(s);
 assert.equal(p.income.food,10,'Full six-person crew produces 8 food plus the baseline');
 assert(p.workers.some(g=>g.resource==='food'&&g.x===31&&g.y===40&&g.progress===3));
 const farm=E.buildingAt(s,31,40);assert(E.action(s,id,{type:'upgrade',id:farm.id}).ok);
 for(let t=0;t<100&&farm.level===1;t++)E.tick(s);
 assert.equal(farm.level,2);E.tick(s);assert.equal(p.income.food,18,'Upgraded production still requires real staffing');
 const restored=JSON.parse(JSON.stringify(s));E.tick(restored);assert.equal(E.person(restored,id).income.food,18,'Farm staff and production survive saves');
 assert(E.action(s,id,{type:'removeBuilding',id:farm.id}).ok);E.tick(s);assert.equal(p.income.food,2,'Demolition immediately ends the farm job next economy tick');
}
{
 const {s,id,p}=fixture();p.bot=true;p.res.food=0;s.tick=id%4;E.bot(s,id);
 assert(s.buildJobs.some(j=>j.owner===id&&j.kind==='farm'),'Food-poor AI buys a farm using the same construction command');
 assert.equal(s.buildJobs.filter(j=>j.kind==='farm').length,1);
 s.tick+=4;E.bot(s,id);assert.equal(s.buildJobs.filter(j=>j.kind==='farm').length,1,'AI counts pending food infrastructure');
}
console.log('PASS v145 manual farms: no automatic food fields, owned terrain, paid delayed build, physical staffing, upgrades, saves, demolition and bot adaptation');
