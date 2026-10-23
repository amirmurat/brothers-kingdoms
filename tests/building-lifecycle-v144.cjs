'use strict';
const assert=require('node:assert/strict'),E=require('../engine.js');
function fixture(){const s=E.lobby(88),id=E.addPlayer(s,'Builder'),foe=E.addPlayer(s,'Other');assert(E.start(s,0).ok);
 s.tiles.fill(1);s.owners.fill(id);s.buildings=[{id:'city',owner:id,kind:'city',level:1,x:30,y:40}];s.buildJobs=[];
 const p=E.person(s,id);p.land=1000;p.res={food:10000,wood:10000,stone:10000,gold:10000};s.territoryRevision++;
 return {s,id,foe,p};}
{
 const {s,id,foe,p}=fixture(),before={...p.res};
 const cost=E.costBuilding(s,id,'barracks');
 assert(!E.action(s,id,{type:'queueBuild',kind:'barracks',x:31,y:40,expectedCost:{wood:1}}).ok);
 assert.deepEqual(p.res,before,'Stale quoted price cannot silently charge');
 assert(E.action(s,id,{type:'queueBuild',kind:'barracks',x:31,y:40,expectedCost:cost}).ok);
 const job=s.buildJobs[0];assert(!E.action(s,foe,{type:'cancelBuild',id:job.id}).ok);
 assert(E.action(s,id,{type:'cancelBuild',id:job.id}).ok);assert.deepEqual(p.res,before,'Untouched work refunds its exact price');
 assert(!E.action(s,id,{type:'cancelBuild',id:job.id}).ok);assert.deepEqual(p.res,before,'No duplicate refund');
}
{
 const {s,id,p}=fixture();E.action(s,id,{type:'queueBuild',kind:'barracks',x:31,y:40});
 const job=s.buildJobs[0];job.progress=15;
 p.workers=[{id:'crew',x:31,y:40,count:6,job:job.id}];
 const before={...p.res},result=E.action(s,id,{type:'cancelBuild',id:job.id});
 assert(result.ok);for(const [r,c] of Object.entries(job.cost))assert.equal(p.res[r]-before[r],Math.floor(c/2));
 assert.equal(p.workers[0].job,null);assert.equal(s.buildJobs.length,0);
}
{
 const {s,id,foe,p}=fixture();E.action(s,id,{type:'upgrade',id:'city'});
 const job=s.buildJobs[0];assert(job);job.progress=10;
 assert(E.action(s,id,{type:'cancelBuild',id:job.id}).ok);assert(!s.buildings[0].upgrade);assert.equal(s.buildings[0].level,1);
 const before={...p.res};assert(!E.action(s,foe,{type:'removeBuilding',id:'city'}).ok);
 assert(E.action(s,id,{type:'removeBuilding',id:'city'}).ok);assert.equal(s.buildings.length,0);assert.deepEqual(p.res,before,'Finished buildings are not a refund exploit');
 assert(!E.action(s,id,{type:'removeBuilding',id:'city'}).ok);
}
{
 const {s,id,p}=fixture();E.action(s,id,{type:'queueBuild',kind:'fort',x:32,y:40});const job=s.buildJobs[0],before={...p.res};
 s.owners[E.idx(32,40)]=2;s.territoryRevision++;
 assert(!E.action(s,id,{type:'cancelBuild',id:job.id}).ok);assert.deepEqual(p.res,before,'Stale captured site cannot be cancelled by former owner');
}
console.log('PASS v144 building lifecycle: quoted prices, authority, stale sites, proportional single refunds, crew release, upgrade cancellation and demolition');
