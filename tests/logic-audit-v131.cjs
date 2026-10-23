'use strict';
// v131: game-logic audit invariants on the actual deterministic engine.
const assert=require('node:assert/strict'),E=require('../engine.js');
function scenario(){
 const s=E.lobby(19),id=E.addPlayer(s,'Human'),enemy=E.addPlayer(s,'Rival');
 assert(E.start(s,0).ok);
 s.tiles.fill(1);s.owners.fill(0);s.buildings=[];s.armies=[];s.attackPlans=[];s.recoveryPlans=[];
 for(let y=20;y<60;y++)for(let x=20;x<70;x++)s.owners[E.idx(x,y)]=id;
 const p=E.person(s,id),foe=E.person(s,enemy);
 p.land=2000;p.troops=10000;p.garrisons=[{id:'home',x:65,y:40,strength:10000}];
 p.capital={x:30,y:40};foe.land=1;
 s.buildings=[{id:'capital',owner:id,kind:'city',level:1,x:30,y:40}];
 s.owners[E.idx(70,25)]=enemy;s.territoryRevision++;
 return {s,id,enemy,p};
}
{
 const {s,id,enemy,p}=scenario();
 assert(E.action(s,id,{type:'armyFocus',x:68,y:40}).ok);
 assert.equal(E.focusStatus(s,id),'defend');
 const previous=JSON.stringify(p.armyFocus);
 for(const invalid of [{x:76,y:40},{x:70,y:25},{x:-1,y:10},{x:1.2,y:40}]){
  const result=E.action(s,id,{type:'armyFocus',...invalid});
  assert.equal(result.ok,false,'Unplanned/invalid point must be rejected: '+JSON.stringify(invalid));
  assert.equal(JSON.stringify(p.armyFocus),previous,'Rejected input must preserve active focus');
 }
 E.spatialArmyStep(s,false);
 assert(p.garrisons.some(g=>g.role==='Priority defense'&&g.tx===68&&g.ty===40),'Defensive focus creates physical assignment');
 assert(E.action(s,id,{type:'armyFocus',clear:true}).ok);
 assert.equal(E.focusStatus(s,id),'invalid');
 s.owners[E.idx(70,25)]=0;s.territoryRevision++;
 s.attackPlans=[{id:'east',owner:id,targetOwner:0,targets:[0],zoneCells:[E.idx(70,25)],waves:0},
  {id:'south',owner:id,targetOwner:0,targets:[0],zoneCells:[E.idx(70,50)],waves:0}];
 const plan=s.attackPlans[0],without=E.automaticAllocation(s,plan).target;
 assert(E.action(s,id,{type:'armyFocus',x:70,y:25}).ok);
 assert.equal(E.focusStatus(s,id),'attack');
 assert(E.automaticAllocation(s,plan).target>without,'Valid offensive focus increases target troop budget');
 s.owners[E.idx(70,25)]=enemy;s.territoryRevision++;
 p.allies.push(enemy);
 assert.equal(E.focusStatus(s,id),'invalid','Alliance invalidates attack focus');
 const former=JSON.stringify(p.armyFocus);
 assert(!E.action(s,id,{type:'armyFocus',x:70,y:25}).ok);
 assert.equal(JSON.stringify(p.armyFocus),former);
}
{
 const {s,id,enemy}=scenario(),hidden={id:'enemy-city',owner:enemy,kind:'city',level:3,x:84,y:40};
 s.buildings.push(hidden);
 assert(!E.visibleBuilding(s,id,hidden));
 assert(!E.networkState(s,id).buildings.some(b=>b.id===hidden.id));
 assert.equal(E.strategicWeight(s,id,84,40),1,'Unknown enemy city cannot influence AI priorities');
 const fort={id:'scout',owner:id,kind:'fort',level:1,x:68,y:40};
 s.buildings.push(fort);
 assert(!E.visibleBuilding(s,id,hidden),'Basic fort cannot scout beyond radius 14');
 const nearDefense=E.tileDefense(s,id,68,40),farDefense=E.tileDefense(s,id,50,40);
 assert(nearDefense>farDefense,'Fort reinforces nearby positions, not all owned cells');
 fort.level=2;s.tick++;
 assert(E.visibleBuilding(s,id,hidden),'Upgraded fort scouts at range 20');
 assert(E.strategicWeight(s,id,84,40)>1,'Only visible city contributes priority');
 assert(E.networkState(s,id).buildings.some(b=>b.id===hidden.id));
 const tier2=E.tileDefense(s,id,68,40);fort.level=3;
 assert(E.tileDefense(s,id,68,40)>tier2,'Fort defense grows with level');
 s.owners[E.idx(fort.x,fort.y)]=enemy;s.territoryRevision++;
 assert(!E.visibleBuilding(s,id,hidden),'Captured fort no longer scouts for former owner');
}
console.log('PASS v131 logic audit: invalid focus rejected, current focus preserved, valid focus effective, fort scouting/intel and local defense');
