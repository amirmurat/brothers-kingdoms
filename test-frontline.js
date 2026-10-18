'use strict';
const assert=require('node:assert/strict');
const E=require('./engine');
function arena(seed=123, troopBank=3300){
 const s=E.lobby(seed),id=E.addPlayer(s,'Player');
 assert(E.start(s,0).ok);
 s.tiles.fill(1);s.owners.fill(0);s.buildings=[];s.landTotal=E.W*E.H;
 const p=E.person(s,id);p.land=0;p.capital={x:80,y:52};p.troops=troopBank;p.troopCap=15000;
 for(let y=48;y<=56;y++)for(let x=76;x<=84;x++){
  if(Math.hypot(x-80,y-52)>4.25)continue;
  s.owners[E.idx(x,y)]=id;p.land++;
 }
 return {s,id,p};
}
function runAttack(s,id,tar,percent=30){
 const res=E.action(s,id,{type:'send',x:tar.x,y:tar.y,percent});
 assert(res.ok,res.error);
 for(let k=0;k<190&&s.armies.some(a=>a.owner===id);k++)E.combatStep(s);
 assert(!s.armies.some(a=>a.owner===id),'attack should finish');
}
function extensions(s,id){
 const pts=[];
 for(let i=0;i<s.owners.length;i++)if(s.owners[i]===id)pts.push([i%E.W,(i/E.W)|0]);
 const r={west:80-Math.min(...pts.map(([x])=>x)),east:Math.max(...pts.map(([x])=>x))-80,north:52-Math.min(...pts.map(([,y])=>y)),south:Math.max(...pts.map(([,y])=>y))-52};
 return r;
}
// Neutral conquest must sweep ALL connected exposed border layers; the tap is
// *not* a destination and must not produce a 1-tile corridor to that spot.
for(const seed of [11,42,782,42043,299999]){
 const {s,id,p}=arena(seed);
 const first=p.land;
 runAttack(s,id,{x:133,y:52},30);
 const gain=p.land-first,spans=extensions(s,id);
 assert(gain>200,`neutral expansion too small: ${gain}`);
 assert(spans.north>=8&&spans.south>=8&&spans.east>=8&&spans.west>=8,`expansion was not broad: ${JSON.stringify(spans)}`);
 const max=Math.max(...Object.values(spans)),min=Math.min(...Object.values(spans));
 assert(max/min<1.6,`corridor/tendril detected: ${JSON.stringify(spans)}`);
 // 4-connected islands are prohibited for land expansion.
 const seen=new Set([E.idx(80,52)]),queue=[E.idx(80,52)];
 for(let i=0;i<queue.length;i++){
  const c=queue[i],x=c%E.W,y=(c/E.W)|0;
  for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
   const nx=x+dx,ny=y+dy;if(!E.inside(nx,ny))continue;
   const j=E.idx(nx,ny);if(s.owners[j]===id&&!seen.has(j)){seen.add(j);queue.push(j);}
  }
 }
 assert.equal(seen.size,p.land,'newly conquered land must be connected');
 console.log('PASS neutral seed',seed,'land',gain,'radii',spans);
}
// Attacks into enemy territory must spread along the SHARED hostile border,
// without eating neighbouring neutral / third-party pixels.
{
 const {s,id,p}=arena(9,5500),foe=E.addPlayer; // setup enemy directly in running state
 const id2=2;
 s.players.push({id:id2,name:'Enemy',bot:false,color:'#f00',res:{food:999,wood:999,stone:999,gold:999},troops:100,troopCap:10000,land:0,ready:true,connected:true,spawnPreference:'auto',eliminated:false,tech:{economy:0,war:0,logistics:0,sailing:0},offers:[],allies:[],capital:{x:110,y:52},kills:0});
 for(let y=34;y<=70;y++)for(let x=85;x<=125;x++){s.owners[E.idx(x,y)]=id2;s.players[1].land++;}
 const untouched=E.owner(s,83,52),origEnemy=s.players[1].land;
 runAttack(s,id,{x:90,y:52},85);
 assert(s.players[1].land<origEnemy,'enemy must lose land');
 assert.equal(E.owner(s,83,52),untouched,'neutral side must not be captured by enemy-only order');
 assert.equal(s.players[1].land+ s.owners.filter(v=>v===id2).length,2*s.players[1].land,'enemy count metadata consistent');
 console.log('PASS hostile broad assault:',origEnemy,'->',s.players[1].land);
}
// A refund/retreat must stop new layers immediately.
{
 const {s,id,p}=arena(99);const before=p.land;
 const r=E.action(s,id,{type:'send',x:100,y:50,percent:50});assert(r.ok);
 E.combatStep(s);const post=p.land;
 assert(post>before);
 assert(E.action(s,id,{type:'return',id:s.armies[0].id}).ok);
 for(let i=0;i<8;i++)E.combatStep(s);
 assert.equal(p.land,post);
 console.log('PASS instant retreat');
}
console.log('ALL LAYERED CONQUEST TESTS PASS');
