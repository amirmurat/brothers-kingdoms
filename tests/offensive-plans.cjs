const assert=require('node:assert/strict'),E=require('../engine.js');
function setup(two=false){
 const s=E.lobby(57283),id=E.addPlayer(s,'Tester'),other=two?E.addPlayer(s,'Opponent'):null;
 assert(E.start(s,0).ok);
 let zone=null;
 for(let y=2;y<E.H-2&&!zone;y++)for(let x=2;x<E.W-2&&!zone;x++){
  const i=y*E.W+x,neighbors=[i-1,i+1,i-E.W,i+E.W];
  if(s.tiles[i]&&s.owners[i]===0&&neighbors.some(j=>s.owners[j]===id)){
   const next=neighbors.find(j=>s.tiles[j]&&s.owners[j]===0);
   if(next!==undefined)zone=[i,next];
  }
 }
 assert(zone,'Expected two adjacent neutral border tiles');
 if(two){const enemy=E.person(s,other);for(const i of zone){s.owners[i]=other;enemy.land++;}}
 const player=E.person(s,id);player.troops=1000;player.troopCap=1700;
 return{s,id,other,zone,player};
}
function attack(t){
 const i=t.zone[0];return E.action(t.s,t.id,{type:'send',x:i%E.W,y:(i/E.W)|0,percent:30,zone:t.zone});
}
{
 const t=setup();assert(attack(t).ok);
 assert.equal(t.s.attackPlans.length,1);
 assert.equal(t.s.armies[0].planId,t.s.attackPlans[0].id);
 assert.equal(JSON.parse(JSON.stringify(t.s)).attackPlans[0].id,t.s.attackPlans[0].id);
 t.s.armies[0].strength=1;t.player.troops=0;E.tick(t.s);
 assert.equal(t.s.armies.length,0);assert.equal(t.s.attackPlans.length,1);
 for(let i=0;i<5;i++)E.tick(t.s);
 assert.equal(t.s.armies.length,0,'Must wait for sufficient reserve');
 t.player.troops=900;E.tick(t.s);
 assert.equal(t.s.armies[0].planId,t.s.attackPlans[0].id,'Reinforcement reuses original zone');
 const planId=t.s.attackPlans[0].id;
 assert(E.action(t.s,t.id,{type:'cancelPlan',id:planId}).ok);
 assert.equal(t.s.attackPlans.length,0);assert.equal(t.s.armies.length,0);
 for(let i=0;i<8;i++)E.tick(t.s);
 assert.equal(t.s.armies.length,0,'Cancellation must prevent relaunch');
}
{
 const t=setup();assert(attack(t).ok);
 for(const i of t.zone){t.s.owners[i]=t.id;t.player.land++;}
 E.tick(t.s);assert.equal(t.s.attackPlans.length,0,'Fully captured zone retires');
}
{
 const t=setup(true);assert(attack(t).ok);
 assert.equal(t.s.wars.length,1);
 assert(E.action(t.s,t.id,{type:'peace',target:t.other}).ok);
 assert(E.action(t.s,t.other,{type:'peace',target:t.id}).ok);
 assert.equal(t.s.wars.length,0);
 assert.equal(t.s.attackPlans.length,1,'Peace preserves editable zone');
 assert.deepEqual(t.s.attackPlans[0].targets,[],'Peace revokes consent');
 assert.equal(t.s.armies.length,0);
 for(let i=0;i<6;i++)E.tick(t.s);
 assert.equal(t.s.armies.length,0,'Peace must prevent automatic renewed war');
}
{
 const t=setup();assert(attack(t).ok);
 t.s.attackPlans=[];t.s.armies[0].planId=null;
 E.tick(t.s);
 assert.equal(t.s.attackPlans.length,1,'v56 save must migrate');
 assert.equal(t.s.armies[0].planId,t.s.attackPlans[0].id);
}
{
 const t=setup(true),enemy=E.person(t.s,t.other),first=t.zone[0];
 t.s.owners[first]=0;enemy.land--;
 const order=E.action(t.s,t.id,{type:'send',x:first%E.W,y:(first/E.W)|0,percent:30,zone:t.zone,targets:[0]});
 assert(order.ok,order.error);const plan=t.s.attackPlans[0];
 assert.deepEqual(plan.targets,[0]);
 assert.equal(t.s.wars.length,0,'Excluded rival must not enter war');
 assert.equal(plan.zoneCells.length,2,'Preserve all colors in same painted region');
 assert.equal(t.s.armies[0].targetOwner,0);
 assert(E.action(t.s,t.id,{type:'updatePlan',id:plan.id,targets:[0,t.other],percent:40}).ok);
 assert.equal(t.s.wars.length,1,'Explicit inclusion declares war');
 assert(E.action(t.s,t.id,{type:'updatePlan',id:plan.id,targets:[0],percent:40}).ok);
 t.s.armies[0].strength=1;t.player.troops=0;E.tick(t.s);
 assert.equal(t.s.attackPlans.length,1);
 for(let k=0;k<5;k++)E.tick(t.s);
 assert.equal(t.s.armies.length,0,'No wave without reserves');
 t.s.owners[first]=t.other;enemy.land++;t.player.troops=900;
 for(let k=0;k<5;k++)E.tick(t.s);
 assert.equal(t.s.armies.length,0,'Unselected rival must never be attacked');
 assert.equal(t.s.wars.length,1,'War status is separate from plan permission');
 assert(E.action(t.s,t.id,{type:'updatePlan',id:plan.id,targets:[t.other],percent:40}).ok);
 let started=false;
 for(let k=0;k<3;k++){E.tick(t.s);if(plan.waves>1||t.s.armies.some(a=>a.planId===plan.id&&a.targetOwner===t.other)){started=true;break;}}
 assert(started,'New wave should follow edited permission and current owner');
}
{
 const t=setup();assert(attack(t).ok);
 const plan=t.s.attackPlans[0];
 assert.equal(E.action(t.s,t.id,{type:'updatePlan',id:plan.id,targets:[t.id,99999]}).ok,false);
 assert.equal(t.s.attackPlans.length,1,'Invalid edit must preserve the plan');
}
console.log('PASS: persistent waves, mixed nations, target permission, ownership changes, peace');
