'use strict';
const assert=require('node:assert/strict'),E=require('../engine.js');
for(const [kind,resource,terrain,rate] of [['farm','food',4,8],['lumber','wood',2,7],['quarry','stone',3,7],['mine','gold',5,7]]){
 const s=E.lobby(88),id=E.addPlayer(s,'Builder'),enemy=E.addPlayer(s,'Other');assert(E.start(s,0).ok);
 s.tiles.fill(1);s.owners.fill(0);for(let y=25;y<55;y++)for(let x=20;x<55;x++)s.owners[E.idx(x,y)]=id;
 s.owners[E.idx(100,50)]=enemy;s.buildings=[{id:'city',kind:'city',owner:id,x:30,y:40,level:1}];s.buildJobs=[];s.armies=[];s.roads=[];
 const p=E.person(s,id);Object.assign(p,{land:1050,troops:0,garrisons:[],workers:[],capital:{x:30,y:40},res:{food:10000,wood:10000,stone:10000,gold:10000}});
 s.tiles[E.idx(31,40)]=terrain;s.territoryRevision++;
 for(let t=0;t<10;t++)E.tick(s);
 assert.equal(p.income[resource],resource==='food'?2:1,'Unbuilt terrain has only recovery baseline: '+kind);
 assert(!E.action(s,enemy,{type:'queueBuild',kind,x:31,y:40}).ok);
 const before={...p.res},cost=E.costBuilding(s,id,kind);
 assert(E.action(s,id,{type:'build',kind,x:31,y:40}).ok);
 for(const [r,n] of Object.entries(cost))assert.equal(before[r]-p.res[r],n);
 assert(!E.buildingAt(s,31,40),'Legacy command cannot bypass construction');
 for(let t=0;t<90;t++)E.tick(s);
 const building=E.buildingAt(s,31,40);assert.equal(building?.kind,kind);
 assert.equal(p.income[resource],rate+(resource==='food'?2:1),'Only physical six-person crew produces: '+kind);
 assert(E.action(s,id,{type:'upgrade',id:building.id}).ok);for(let t=0;t<100;t++)E.tick(s);
 assert.equal(building.level,2);assert.equal(p.income[resource],rate*2+(resource==='food'?2:1));
 const save=JSON.parse(JSON.stringify(s));E.tick(save);assert.equal(E.person(save,id).income[resource],p.income[resource]);
 assert(E.action(s,id,{type:'removeBuilding',id:building.id}).ok);E.tick(s);assert.equal(p.income[resource],resource==='food'?2:1);
 // A legacy saved building without a staffed crew cannot keep passive income.
 s.buildings.push({...building,id:'legacy',x:50,y:50});s.territoryRevision++;p.workers=[];
 E.tick(s);assert.equal(p.income[resource],resource==='food'?2:1);
 s.buildings=s.buildings.filter(b=>b.kind==='city');s.territoryRevision++;p.bot=true;p.res={food:10000,wood:10000,stone:10000,gold:10000};p.res[resource]=60;s.tick=id%4;
 E.bot(s,id);assert(s.buildJobs.some(j=>j.kind===kind&&j.owner===id),'AI pays for its scarce '+resource+' infrastructure');
 s.tick+=4;E.bot(s,id);assert.equal(s.buildJobs.filter(j=>j.kind===kind).length,1,'AI does not duplicate pending '+kind);
}
console.log('PASS v146 all resource buildings: paid delayed build, no terrain/passive income, real staffing, upgrades, saves, demolition and ownership');
