'use strict';
const assert=require('node:assert/strict'),E=require('../engine.js');
function game(){
 const s=E.lobby(99175),a=E.addPlayer(s,'Defender'),b=E.addPlayer(s,'Attacker');
 assert(E.start(s,0).ok);
 const x=71,y=52,i=E.idx(x,y);
 for(const [j,owner] of [[i,a],[E.idx(x-1,y),a],[E.idx(x+1,y),b],[E.idx(x,y-1),a],[E.idx(x,y+1),a]]){
  s.tiles[j]=1;const old=s.owners[j];if(old)E.person(s,old).land--;
  s.owners[j]=owner;E.person(s,owner).land++;
 }
 E.person(s,a).troops=2200;E.person(s,b).troops=2200;
 E.person(s,a).troopCap=5000;E.person(s,b).troopCap=5000;
 E.person(s,a).garrisons=[{id:'ga',x:x-1,y,strength:2200}];
 E.person(s,b).garrisons=[{id:'gb',x:x+1,y,strength:2200}];
 return {s,a,b,x,y,i};
}
function lose(t){
 assert(E.action(t.s,t.b,{type:'setNationTarget',target:t.a,enabled:true}).ok);
 const result=E.action(t.s,t.b,{type:'send',x:t.x,y:t.y,zone:[t.i],targets:[t.a],percent:50});
 assert(result.ok,result.error);E.combatStep(t.s);
 assert.equal(t.s.owners[t.i],t.b,'Attacker captured tile');
 assert.equal(t.s.recoveryPlans.length,1,'Defender receives automatic recovery plan');
 assert.equal(t.s.recoveryPlans[0].owner,t.a);
}
{
 const t=game();lose(t);let launched=false;
 for(let n=0;n<12;n++){
  E.tick(t.s);
  if(t.s.armies.some(v=>v.planId?.startsWith('r')&&v.owner===t.a))launched=true;
  if(t.s.owners[t.i]===t.a)break;
 }
 assert(launched,'Recovery wave must deploy');
 assert.equal(t.s.owners[t.i],t.a,'Territory must be recovered');
}
{
 const t=game();lose(t);
 assert(E.action(t.s,t.a,{type:'peace',target:t.b}).ok);
 const res=E.action(t.s,t.b,{type:'peace',target:t.a});assert(res.ok&&res.peace);
 assert.equal(t.s.recoveryPlans.length,0);
 for(let n=0;n<12;n++)E.tick(t.s);
 assert.equal(t.s.owners[t.i],t.b,'Treaty stops recapture');
 assert(!t.s.armies.some(v=>v.planId?.startsWith('r')));
}
{
 const t=game(),sea=E.idx(0,0);t.s.tiles[sea]=0;
 const result=E.action(t.s,t.a,{type:'send',x:t.x,y:t.y,
  zone:[t.i,E.idx(t.x,t.y+1),sea,t.i,-2],targets:[0],percent:5});
 assert(result.ok,result.error);
 assert.equal(t.s.attackPlans.length,1);
 assert.equal(t.s.attackPlans[0].zoneCells.length,2,'Bad cells are filtered and duplicates merged');
 assert.equal(t.s.wars.length,0,'Neutral-only selection cannot trigger war');
}
console.log('PASS: wartime recovery until peace and self-correcting painted plans');
