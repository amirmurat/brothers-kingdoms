'use strict';
const assert=require('node:assert/strict'),E=require('../engine.js');
function fixture(){const s=E.lobby(7),id=E.addPlayer(s,'Builder'),foe=E.addPlayer(s,'Other');E.start(s,0);s.tiles.fill(1);s.owners.fill(0);for(let y=10;y<80;y++)for(let x=10;x<80;x++)s.owners[E.idx(x,y)]=id;s.territoryRevision++;s.armies=[];s.attackPlans=[];s.recoveryPlans=[];s.buildings=[];s.buildJobs=[];const p=E.person(s,id);p.land=4900;p.res={food:10000,wood:10000,stone:10000,gold:10000};p.capital={x:20,y:20};return {s,id,foe,p};}
{
 const {s,id,foe,p}=fixture(),fort={id:'fort',owner:id,kind:'fort',level:1,x:70,y:40},diagonal={id:'secret',owner:foe,kind:'city',level:1,x:79,y:49};s.buildings=[fort,diagonal];
 assert(E.visibleBuilding(s,id,diagonal),'Circular sight includes diagonal inside actual radius');
 const far={...diagonal,id:'far',x:90,y:40};s.buildings.push(far);assert(!E.visibleBuilding(s,id,far));
 assert.equal(E.fortRadius(fort,s),14);s.tiles[E.idx(fort.x,fort.y)]=3;assert.equal(E.fortRadius(fort,s),18);s.tiles[E.idx(fort.x,fort.y)]=6;assert.equal(E.fortRadius(fort,s),21);assert(E.visibleBuilding(s,id,far),'Mountain height extends authoritative visibility');
 p.allies=[foe];s.buildings=s.buildings.filter(b=>b!==fort);assert(E.visibleBuilding(s,id,far),'Allied buildings visible without a fort');assert(E.networkState(s,id).buildings.some(b=>b.id==='far'));
 p.allies=[];assert(!E.visibleBuilding(s,id,far),'Ending alliance removes unscouted structures');
 assert(E.action(s,id,{type:'armyFocus',x:95,y:40}).ok);assert.equal(E.focusStatus(s,id),'invalid');
 const before=E.strategicWeight(s,id,95,40);assert.equal(before,1,'Invalid focus gives no army weight');
 s.attackPlans=[{id:'p',owner:id,targets:[0],zoneCells:[E.idx(95,40)]}];assert.equal(E.focusStatus(s,id),'attack');s.attackPlans=[];assert.equal(E.focusStatus(s,id),'invalid');
 assert(E.action(s,id,{type:'armyFocus',x:30,y:40}).ok);assert.equal(E.focusStatus(s,id),'defend');
}
{
 const {s,id,p}=fixture();const base={id:'b',owner:id,kind:'city',level:1,x:20,y:20};s.buildings=[base];
 const cost=E.costUpgrade(base),old=p.res.wood;assert(E.action(s,id,{type:'upgrade',id:base.id}).ok);assert.equal(p.res.wood,old-cost.wood);assert.equal(base.level,1,'Upgrade gives no instant output');assert.equal(base.upgrade.total,30);
 const paid=p.res.wood;assert(!E.action(s,id,{type:'upgrade',id:base.id}).ok);assert.equal(p.res.wood,paid,'Duplicate upgrade cannot charge twice');
 assert.equal(s.buildJobs[0].upgradeOf,base.id,'Upgrade uses a physical worker job');
 for(let n=0;n<29;n++){s.tick++;E.workforceStep(s);}
 assert.equal(base.level,1,'No automatic upgrade completion by the clock');
 assert(base.upgrade.progress>0,'Workers must make actual progress');
 for(let n=0;n<100&&base.level===1;n++){s.tick++;E.workforceStep(s);}
 assert.equal(base.level,2);assert(!base.upgrade);assert.equal(E.upgradeTime(base),60);
 assert(E.action(s,id,{type:'upgrade',id:base.id}).ok);
 for(let n=0;n<120&&base.level===2;n++){s.tick++;E.workforceStep(s);}
 assert.equal(base.level,3);assert.equal(E.upgradeTime(base),120);
 const saved=JSON.parse(JSON.stringify(s));assert.equal(saved.buildings[0].level,3);
 assert(E.action(s,id,{type:'build',kind:'barracks',x:21,y:20}).ok);assert(!E.buildingAt(s,21,20),'Legacy strategic build cannot bypass worker construction');
 assert.equal(s.buildJobs[0].progress,0);assert(E.constructionTime('barracks')>=25);
 assert(E.costBuilding(s,id,'city').wood>=495,'Development uses meaningful capital costs');
}
console.log('PASS v102: circular terrain scouting, allied visibility, invalid focus safety, worker-built upgrades, duplicate charge prevention and physical construction');

{
 const {s,id,foe,p}=fixture();s.buildings=[...Array.from({length:5},(_,n)=>({id:'u'+n,owner:id,kind:'fort',level:1,x:20+n,y:20})),{id:'base',owner:id,kind:'city',level:1,x:19,y:20}];
 // One level-1 city supplies 24 workers / four real 6-worker groups.
 const capacity=E.workforceStats(s,id).slots;assert.equal(capacity,4,'Concurrent jobs scale with the city's workforce');
 for(let n=0;n<capacity;n++)assert(E.action(s,id,{type:'upgrade',id:'u'+n}).ok,'Every available worker crew can take a job');
 const paid=p.res.gold;assert(!E.action(s,id,{type:'upgrade',id:'u4'}).ok);assert.equal(p.res.gold,paid,'Only a genuinely unavailable crew blocks additional work, without charging');
 s.buildings[0].owner=foe;s.owners[E.idx(20,20)]=foe;s.territoryRevision++;s.tick++;E.workforceStep(s);assert(!s.buildings[0].upgrade,'Captured building cannot inherit a paid upgrade');assert.equal(s.buildings[0].level,1);
 const save=JSON.parse(JSON.stringify(s));assert(save.buildings[1].upgrade);
 for(let n=0;n<100&&save.buildings[1].level===1;n++){save.tick++;E.workforceStep(save);}
 assert.equal(save.buildings[1].level,2,'Workers complete in-progress upgrade after save/restore');
}


{
 const {s,id}=fixture(),fort={id:'travel-fort',owner:id,kind:'fort',level:1,x:35,y:20};
 s.buildings=[fort,{id:'home',owner:id,kind:'city',level:1,x:20,y:20}];
 assert(E.action(s,id,{type:'upgrade',id:fort.id}).ok);
 s.tick+=200;E.workforceStep(s);
 assert.equal(fort.level,1,'Advancing the clock cannot instantly finish an upgrade');
 assert.equal(fort.upgrade.progress,0,'Building work waits for workers to reach a distant site');
 for(let n=0;n<140&&fort.level===1;n++){s.tick++;E.workforceStep(s);}
 assert.equal(fort.level,2,'Builder travels the existing roads and actually upgrades the fort');
 assert(!fort.upgrade,'Finished work clears paid job metadata');
}
{
 const {s,id}=fixture(),fort={id:'isolated',owner:id,kind:'fort',level:1,x:30,y:20};
 s.buildings=[fort];
 assert(E.action(s,id,{type:'upgrade',id:fort.id}).ok);
 s.tick+=300;E.workforceStep(s);
 assert.equal(fort.level,1,'No builders means no upgrade progress despite elapsed time');
 assert.equal(fort.upgrade.progress,0);
 s.buildings.push({id:'base',owner:id,kind:'city',level:1,x:20,y:20});
 for(let n=0;n<140&&fort.level===1;n++){s.tick++;E.workforceStep(s);}
 assert.equal(fort.level,2,'Building a worker base resumes previously queued upgrade');
}
{
 const {s,id}=fixture(),fort={id:'legacy',owner:id,kind:'fort',level:1,x:20,y:20};
 s.buildings=[fort,{id:'base',owner:id,kind:'city',level:1,x:19,y:20}];
 fort.upgrade={owner:id,level:2,readyTick:30};
 s.tick=20;E.workforceStep(s);
 assert(fort.upgrade.jobId,'Existing paid timed upgrades migrate to physical jobs');
 assert(fort.upgrade.progress>=10,'Historical progress is preserved as completed work');
 assert.equal(fort.level,1,'Migration cannot grant instant upgrade');
}
