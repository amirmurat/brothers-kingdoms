'use strict';
const assert=require('node:assert/strict'),E=require('../engine.js');
function fixture(){const s=E.lobby(41),id=E.addPlayer(s,'Builder'),enemy=E.addPlayer(s,'Neighbour');assert(E.start(s,0).ok);
 s.tiles.fill(1);s.owners.fill(0);s.buildings=[];s.armies=[];s.workZones=[];s.buildJobs=[];s.roads=[];s.territoryRevision++;
 for(let y=10;y<=30;y++)for(let x=10;x<=40;x++)s.owners[E.idx(x,y)]=id;
 const p=E.person(s,id),q=E.person(s,enemy);p.land=651;p.troops=500;p.garrisons=[{id:'g',x:10,y:20,strength:500}];p.capital={x:10,y:20};p.res={wood:5000,stone:5000,gold:5000,food:5000};
 q.land=1;q.troops=0;q.garrisons=[];s.owners[E.idx(41,20)]=enemy;
 s.buildings=[{id:'capital',owner:id,kind:'city',x:10,y:20,level:1}];return {s,id,enemy,p,q};}
{
 const {s,id,enemy,p}=fixture(),wood=E.idx(20,20),food=E.idx(20,21),stone=E.idx(20,22),gold=E.idx(20,23),foreign=E.idx(41,20);
 s.tiles[wood]=2;s.tiles[food]=4;s.tiles[stone]=3;s.tiles[gold]=5;s.tiles[foreign]=2;
 for(const [resource,i] of Object.entries({wood,food,stone,gold})){
  const result=E.action(s,id,{type:'workZone',resource,cells:[i,i,foreign,E.idx(10,20)]});assert(result.ok);assert.equal(result.cells,1);
 }
 assert.equal(s.workZones.length,4);assert.equal(s.wars.length,0,'Civilian paint cannot declare war');
 assert.equal(E.action(s,id,{type:'workZone',resource:'hack',cells:[]}).ok,false);
 assert.equal(E.action(s,id,{type:'workZone',resource:'wood',cells:[-1]}).ok,false);
 E.workforceStep(s);assert.equal(E.workforceStats(s,id).capacity,24);assert.equal(p.workers.length,4);
 assert.equal(p.workIncome.wood,0,'No remote extraction before arrival');
 for(let n=0;n<100;n++)E.workforceStep(s);
 assert(Object.values(p.workIncome).some(n=>n>0),'Arrived prepared groups produce resources');
 assert(s.roads.length>0&&s.roads.every(i=>s.owners[i]===id),'Workers pave only reached friendly cells');
 assert(p.workers.every(g=>s.owners[E.idx(g.x,g.y)]===id));
 const before=JSON.stringify(s.workZones.filter(z=>z.resource!=='wood'));
 E.action(s,id,{type:'workZone',resource:'wood',cells:[]});
 assert.equal(JSON.stringify(s.workZones),before,'Clear affects only the selected own resource');
 E.workforceStep(s);assert(E.automaticWorkSites(s,id).some(t=>t.i===wood),'Legacy paint removal cannot disable automatic extraction');
 // Lost resource land cannot produce for its old owner.
 s.owners[gold]=enemy;s.territoryRevision++;E.workforceStep(s);assert.equal(p.workIncome.gold,0);
 const packet=E.networkState(s);assert(!JSON.stringify(packet.players).includes('"route"'));
 assert(packet.roadRuns&&!packet.roads,'Roads use compact exact runs');
 const display=E.restoreNetworkState(JSON.parse(JSON.stringify(packet)));
 assert.deepEqual([...display.roads].sort((a,b)=>a-b),[...s.roads].sort((a,b)=>a-b));
 assert.deepEqual(display.workZones,s.workZones,'Paint survives wire round trip');
 assert.equal(display.players[0].workers.length,p.workers.length);
 const save=JSON.parse(JSON.stringify(s));E.workforceStep(save);assert.equal(E.workforceStats(save,id).capacity,24);
}
{
 const {s,id,p,enemy}=fixture(),x=13,y=20;
 const result=E.action(s,id,{type:'queueBuild',kind:'city',x,y});assert(result.ok);
 assert(!E.buildingAt(s,x,y),'Paid construction waits for workers');
 assert.equal(E.action(s,id,{type:'queueBuild',kind:'city',x,y}).ok,false,'No duplicate paid site');
 assert.equal(E.action(s,id,{type:'queueBuild',kind:'lumber',x:14,y}).ok,false,'Economic construction uses paint');
 for(let n=0;n<50&&!E.buildingAt(s,x,y);n++)E.workforceStep(s);
 assert.equal(E.buildingAt(s,x,y)?.kind,'city','Worker travels then completes construction');
 E.workforceStep(s);assert.equal(E.workforceStats(s,id).capacity,48,'City adds real workforce');
 assert.equal(p.workers.reduce((n,g)=>n+g.count,0),48);
 E.action(s,id,{type:'queueBuild',kind:'fort',x:38,y:20});const j=s.buildJobs[0],paid=p.res.wood;
 s.owners[E.idx(38,20)]=enemy;s.territoryRevision++;E.workforceStep(s);
 assert.equal(s.buildJobs.length,0);assert.equal(p.res.wood,paid+j.cost.wood,'Lost unbuilt site refunds materials once');
 E.workforceStep(s);assert(p.res.wood<=paid+j.cost.wood,'No repeated refund');
}
{
 const {s,id}=fixture();
 // An eight-cell road detour beats six open cells (18 travel cost).
 s.roads=[E.idx(10,20),...Array.from({length:7},(_,k)=>E.idx(10+k,19)),E.idx(16,20)];
 const route=E.roadRoute(s,id,E.idx(10,20),E.idx(16,20));
 assert(route.includes(E.idx(10,19)),'Routing chooses a faster road detour');
 const a={x:10,y:20,route:[E.idx(11,20)]},b={x:10,y:19,route:[E.idx(11,19)]};
 E.moveOnRoute(s,id,a);E.moveOnRoute(s,id,b);assert.equal(a.x,10);assert.equal(b.x,11);
 E.moveOnRoute(s,id,a);E.moveOnRoute(s,id,a);assert.equal(a.x,11,'Off-road travel takes three pulses');
 s.owners[E.idx(12,19)]=0;b.route=[E.idx(12,19)];assert.equal(E.moveOnRoute(s,id,b),false,'Roads cannot bypass ownership');
}
{
 const {s,id,p}=fixture();
 for(let n=0;n<120;n++)s.buildings.push({id:'city'+n,kind:'city',owner:id,x:11+n%20,y:11+Math.floor(n/20),level:3});
 E.workforceStep(s);assert.equal(p.workers.length,Math.ceil(E.workforceStats(s,id).capacity/6),'Builder crews scale with actual builders, not a fixed 24-group cap');
 assert.equal(p.workers.reduce((n,g)=>n+g.count,0),E.workforceStats(s,id).capacity,'Aggregation preserves workforce');
 const old=JSON.parse(JSON.stringify(s));delete old.players[0].workers;delete old.roads;delete old.workZones;delete old.buildJobs;
 E.workforceStep(old);assert(E.workforceStats(old,id).groups>0,'Old saves migrate without removing old buildings');
}
{
 const {s,id,p,enemy}=fixture();E.workforceStep(s);
 const g=p.workers[0];g.roadTask=true;g.tx=40;g.ty=20;g.route=[E.idx(11,20)];
 s.owners[E.idx(40,20)]=enemy;s.territoryRevision++;
 E.workforceStep(s);assert.equal(g.roadTask,false,'A captured road destination releases its workers');
 assert(g.tx!==40||g.ty!==20,'Workers can choose safe work or home after a route is cut');
}
{
 const {s,id,p,enemy}=fixture();const i=E.idx(12,20);s.tiles[i]=5;
 E.workforceStep(s);assert(E.automaticWorkSites(s,id).some(t=>t.i===i&&t.resource==='gold'),'Owned deposits are jobs without paint');
 assert(!E.workSuitable(s,id,'stone',i),'Gold veins cannot become quarries');assert(!E.workSuitable(s,id,'food',E.idx(13,20)),'Plains are not farmland');
 assert(E.action(s,id,{type:'setWorkPriority',priority:'gold'}).ok);
 for(let k=0;k<35;k++)E.workforceStep(s);assert(p.workIncome.gold>0,'Priority works without a painted zone');
 s.owners[i]=enemy;s.territoryRevision++;E.workforceStep(s);assert.equal(p.workIncome.gold,0);
 s.owners[i]=id;s.territoryRevision++;for(let k=0;k<35;k++)E.workforceStep(s);assert(p.workIncome.gold>0,'Reconquest automatically resumes extraction');
 assert.equal(E.action(s,id,{type:'setWorkPriority',priority:'invalid'}).ok,false);
}
{
 const {s,id,p}=fixture();s.buildings[0].level=6;
 for(let y=12;y<28;y++)for(const [x,type] of [[20,2],[21,3],[22,4],[23,5]])s.tiles[E.idx(x,y)]=type;
 assert(E.action(s,id,{type:'setWorkPriority',priority:'gold'}).ok);
 for(let n=0;n<45;n++)E.workforceStep(s);
 const assigned=r=>p.workers.filter(g=>g.resource===r).length;
 assert(assigned('gold')>assigned('stone'),'Priority allocates more groups to gold than comparable stone deposits');
}

{
 const {s,id,p}=fixture();
 // A settled worker must not abandon a productive site every eight ticks.
 const gold=E.idx(12,20),wood=E.idx(13,20);
 s.tiles[gold]=5;s.tiles[wood]=2;
 for(let n=0;n<30;n++){s.tick++;E.workforceStep(s);}
 const working=p.workers.filter(g=>g.resource&&g.x===g.tx&&g.y===g.ty&&g.progress>=3);
 assert(working.length>=1,'At least one civilian group reaches a productive deposit');
 const before=working.map(g=>({id:g.id,resource:g.resource,tx:g.tx,ty:g.ty}));
 for(let n=0;n<40;n++){s.tick++;E.workforceStep(s);}
 const after=before.filter(prev=>p.workers.some(g=>g.id===prev.id&&g.resource===prev.resource&&g.tx===prev.tx&&g.ty===prev.ty&&g.progress>=3));
 assert(after.length>=1,'No forced time-based reassignment of productive workers');
 const nearBuild=E.action(s,id,{type:'queueBuild',kind:'fort',x:14,y:20});
 const farBuild=E.action(s,id,{type:'queueBuild',kind:'fort',x:38,y:20});
 assert(nearBuild.ok&&farBuild.ok);
 E.workforceStep(s);
 const reservations=p.workers.map(g=>g.job).filter(Boolean);
 assert.equal(new Set(reservations).size,reservations.length,'A construction site reserves at most one worker group');
 assert(reservations.length>=2,'Separate sites get their own builders');
}

{
 const {s,id,p}=fixture();
 // Twelve worker crews permit any mix of construction AND upgrade, not 24
 // construction jobs plus an unrelated two-upgrade restriction.
 s.buildings[0].level=3;
 s.buildings.push({id:'own-fort-a',owner:id,kind:'fort',x:22,y:20,level:1},
                  {id:'own-fort-b',owner:id,kind:'fort',x:23,y:20,level:1});
 for(const r of ['wood','stone','gold','food'])p.res[r]=1_000_000;
 assert.equal(E.workforceStats(s,id).slots,12);
 assert(E.action(s,id,{type:'upgrade',id:'own-fort-a'}).ok);
 assert(E.action(s,id,{type:'upgrade',id:'own-fort-b'}).ok,
        'More than one upgrade is allowed when there are free crews');
 for(let x=12;x<22;x++){
  const build=E.action(s,id,{type:'queueBuild',kind:'fort',x,y:20});
  assert(build.ok,'Queued Fort '+x+': '+build.error);
 }
 const status=E.workforceStats(s,id);
 assert.equal(status.building,12,'Ten constructions and two upgrades occupy twelve crews');
 assert.equal(status.upgrading,2);
 assert.equal(E.action(s,id,{type:'queueBuild',kind:'fort',x:25,y:20}).ok,false,
              'All crews assigned, extra job is held back');
 E.workforceStep(s);
 assert.equal(p.workers.length,12,'Twelve actual work crews generated');
 const reserved=p.workers.filter(w=>w.job).length;
 assert(reserved>=2,'Builders can work on many independent jobs, not only two');
}
console.log('PASS workforce: painted resources, terrain/authority, real travel, local harvest, queued construction, city capacity, roads, crew-based concurrent jobs and wire/save migration');
