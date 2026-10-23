'use strict';
const assert=require('node:assert/strict'),E=require('../engine.js');
function fixture(){
 const s=E.lobby(88),id=E.addPlayer(s,'Player'),foe=E.addPlayer(s,'Neighbour');assert(E.start(s,0).ok);
 s.tiles.fill(1);s.owners.fill(0);s.buildings=[];s.armies=[];s.attackPlans=[];s.recoveryPlans=[];s.buildJobs=[];s.roads=[];
 for(let y=20;y<60;y++)for(let x=20;x<100;x++)s.owners[E.idx(x,y)]=id;
 for(let y=20;y<60;y++)for(let x=100;x<110;x++)s.owners[E.idx(x,y)]=foe;
 const p=E.person(s,id),q=E.person(s,foe);p.land=3200;q.land=400;p.troops=0;q.troops=0;p.garrisons=[];q.garrisons=[];
 p.capital={x:30,y:40};p.res={food:10000,wood:10000,stone:10000,gold:10000};
 s.buildings=[{id:'city',kind:'city',owner:id,x:30,y:40,level:1}];s.territoryRevision++;
 return {s,id,foe,p,q};
}
{
 const {s,id,p}=fixture();E.tick(s);assert.equal(p.troopCap,0);assert.equal(p.troopIncome,0);
 assert.deepEqual(p.income,{food:2,wood:0,stone:0,gold:0},'City and empty land cannot mint resources');
 assert.equal(E.workforceStats(s,id).capacity,24);
 s.buildings[0].level=3;E.tick(s);assert.equal(E.workforceStats(s,id).capacity,72);
 assert.equal(p.income.gold,0);assert.equal(p.income.food,2);assert.equal(p.troopCap,0);
 s.buildings.push({id:'barracks',kind:'barracks',owner:id,x:35,y:40,level:2});E.tick(s);
 assert.equal(p.troopCap,860);assert.equal(p.troopIncome,10);
 assert(p.garrisons.filter(g=>g.strength>0).every(g=>g.x===35&&g.y===40),'Actual new troops appear at barracks');
 const total=E.militaryStrength(s,id).total;s.buildings.pop();s.territoryRevision++;E.tick(s);
 assert.equal(p.troopCap,0);assert.equal(p.troopIncome,0);assert.equal(E.militaryStrength(s,id).total,total,'Losing capacity does not delete existing soldiers');
}
{
 const {s,id,p}=fixture();E.workforceStep(s);
 const home=p.workers.find(g=>g.homeCity==='city');assert(home&&home.count===6&&home.x===30&&home.y===40);
 const near=E.constructionSupport(s,id,32,40),far=E.constructionSupport(s,id,80,40);
 assert(near.travelTicks<far.travelTicks,'Nearby construction has a shorter real friendly route');
 assert.equal(near.cityId,'city');
 assert(E.action(s,id,{type:'queueBuild',kind:'barracks',x:32,y:40}).ok);
 E.workforceStep(s);assert(!E.buildingAt(s,32,40),'No instant construction before physical travel');
 for(let t=0;t<65;t++)E.workforceStep(s);
 assert.equal(E.buildingAt(s,32,40)?.kind,'barracks');
 assert.equal(home.x,30);assert.equal(home.y,40);assert(!home.job,'Local builder returns to visible city');
 // Existing civilians survive a lost city and can build a replacement, without spawning free workers.
 s.buildings=s.buildings.filter(b=>b.kind!=='city');s.territoryRevision++;
 const groups=p.workers.length;E.workforceStep(s);assert.equal(p.workers.length,groups);
 assert(E.action(s,id,{type:'queueBuild',kind:'city',x:31,y:40}).ok);
 for(let t=0;t<100;t++)E.workforceStep(s);
 assert.equal(E.buildingAt(s,31,40)?.kind,'city');
 const saved=JSON.parse(JSON.stringify(s));for(const g of saved.players[0].workers)delete g.homeCity;
 E.workforceStep(saved);assert(saved.players[0].workers.some(g=>g.homeCity),'Legacy workers acquire a home crew lazily');
 const packet=E.restoreNetworkState(JSON.parse(JSON.stringify(E.networkState(s,id))));
 assert(packet.players.find(p=>p.id===id).workers.some(g=>g.homeCity),'Home crew survives network transport');
}
{
 const {s,id,p}=fixture();const resources={food:[4,36,40],wood:[2,37,40],stone:[3,38,40],gold:[5,39,40]};
 for(const [resource,[terrain,x,y]] of Object.entries(resources)){
  s.tiles[E.idx(x,y)]=terrain;
  s.territoryRevision++;
  E.action(s,id,{type:'setWorkPriority',priority:resource});
  for(let t=0;t<70;t++)E.tick(s);
  assert(p.income[resource]>(resource==='food'?2:0),'Worked '+resource+' cells produce real income');
 }
}
function deployment(allied=false,invasion=false){
 const {s,id,foe,p,q}=fixture();
 s.buildings.push({id:'rear',kind:'barracks',owner:id,x:40,y:40,level:1},{id:'front',kind:'barracks',owner:id,x:96,y:40,level:1});
 p.troops=6000;p.garrisons=[{id:'reserve',x:60,y:40,strength:6000}];
 if(allied){p.allies=[foe];q.allies=[id];}
 if(invasion){s.wars=[id+':'+foe];s.armies=[{id:'enemy',owner:foe,targetOwner:id,strength:2000,x:100,y:40,columns:[{x:100,y:40,strength:2000}]}];}
 E.spatialArmyStep(s,false);
 assert.equal(E.militaryStrength(s,id).total,6000,'Automatic defense only redistributes real reserves');
 assert(p.garrisons.every(g=>g.x===60&&g.y===40),'Assignment does not teleport troops');
 return p.garrisons.filter(g=>g.tx>=90).reduce((n,g)=>n+g.strength,0);
}
assert(deployment()>deployment(true),'Non-allied border gets more defense than allied border');
assert(deployment(false,true)>deployment(),'Actual invasion outweighs potential border threat');
console.log('PASS v142: separated economic/military roles, worked resources, local builders, reconstruction, old saves and threat-weighted reserves');
