'use strict';
const assert=require('node:assert/strict'),E=require('../engine.js');
function world(){
 const s=E.lobby(8014),a=E.addPlayer(s,'A'),b=E.addPlayer(s,'B'),c=E.addPlayer(s,'C');
 assert(E.start(s,0).ok);
 const p=E.person(s,a);p.troops=1400;p.troopCap=2500;
 const border=[];
 for(let i=2;i<s.tiles.length-3;i++)if(s.tiles[i]&&s.owners[i]===0&&[i-1,i+1,i-E.W,i+E.W].some(k=>s.owners[k]===a)){
  border.push(i);if(border.length===3)break;
 }
 assert.equal(border.length,3);
 s.owners[border[1]]=b;E.person(s,b).land++;
 s.owners[border[2]]=c;E.person(s,c).land++;
 const order=E.action(s,a,{type:'send',x:border[0]%E.W,y:(border[0]/E.W)|0,zone:border,percent:40,targets:[b,c]});
 assert(order.ok,order.error);
 return {s,a,b,c,plan:s.attackPlans[0],border};
}
{
 const t=world();
 assert.equal(t.s.wars.length,0,'Painting never declares war');
 assert.deepEqual(t.plan.targets,[0],'New plan uses Nations targeting only');
 assert(E.action(t.s,t.a,{type:'setNationTarget',target:t.b,enabled:true}).ok);
 assert(t.plan.targets.includes(t.b),'Nations updates saved plan');
 assert(!t.plan.targets.includes(t.c),'Unselected target remains protected');
 assert.equal(t.s.wars.length,1);
 assert(E.action(t.s,t.a,{type:'setNationTarget',target:t.b,enabled:false}).ok);
 assert.deepEqual(t.plan.targets,[0]);
 assert.equal(t.s.wars.length,1,'Stop attacks is not a peace treaty');
 assert(E.action(t.s,t.a,{type:'peace',target:t.b}).ok);
 assert(E.action(t.s,t.b,{type:'peace',target:t.a}).peace);
 assert.equal(t.s.wars.length,0);
 assert.deepEqual(E.person(t.s,t.a).attackTargets,[]);
 assert(E.action(t.s,t.a,{type:'updatePlan',id:t.plan.id,zone:t.border,targets:[t.b]}).ok);
 assert.deepEqual(t.plan.targets,[0],'After peace editing cannot secretly restart war');
 assert.equal(t.s.wars.length,0);
}
{
 const t=world();
 assert(E.action(t.s,t.a,{type:'diplomacy',target:t.b}).ok);
 assert(E.action(t.s,t.b,{type:'diplomacy',target:t.a}).ok);
 assert(E.person(t.s,t.a).allies.includes(t.b));
 assert.equal(E.action(t.s,t.a,{type:'setNationTarget',target:t.b,enabled:true}).ok,false,'Cannot attack an ally');
 assert(E.action(t.s,t.a,{type:'diplomacy',target:t.b}).ok);
 assert(E.action(t.s,t.a,{type:'setNationTarget',target:t.b,enabled:true}).ok);
}
{
 const t=world();
 const manuallySet=E.action(t.s,t.a,{type:'setNationTarget',target:t.b,enabled:true});
 assert(manuallySet.ok);t.plan.targets=[0]; // Ensure recovery remains independent of plan permissions.
 assert(E.action(t.s,t.a,{type:'setNationTarget',target:t.b,enabled:false}).ok);
 // Being at war is enough for recovery: it does not consult attackTargets.
 const attackerPlan=t.s.attackPlans.find(p=>p.owner===t.a);
 assert.deepEqual(attackerPlan.targets,[0]);
 assert.equal(t.s.wars.length,1);
}
{
 const s=E.lobby(76544),human=E.addPlayer(s,'Human'),bot=E.addPlayer(s,'Bot negotiator',true);
 assert(E.start(s,0).ok);
 const p=E.person(s,human),ai=E.person(s,bot);
 p.troops=2200;ai.troops=150;
 assert(E.action(s,human,{type:'diplomacy',target:bot}).ok,'Bots evaluate alliance offers');
 assert(p.allies.includes(bot)&&ai.allies.includes(human),'Alliance with a bot is possible');
 assert(E.action(s,human,{type:'diplomacy',target:bot}).ok,'An alliance can be ended normally');
 assert(E.action(s,human,{type:'setNationTarget',target:bot,enabled:true}).ok);
 assert(E.action(s,human,{type:'peace',target:bot}).peace,'Bot should sign peace with a stronger neighbor');
 assert(!s.wars.length,'Peace must actually end the war');
 assert(!p.attackTargets.includes(bot),'Peace revokes offensive authorization');
}
console.log('PASS: Nations is sole attack authority, no surprise war, peace, alliances and synced plans');
