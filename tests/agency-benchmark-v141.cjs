'use strict';
// BK-03 research: scripted legal player policies, not human play or win-rate estimates.
const assert=require('node:assert/strict'),E=require('../engine.js');
const seeds=[88,7611,139],horizon=Number(process.env.BK_TICKS||240),close=process.env.BK_CLOSE==='1';
function neighbors(i){const x=i%E.W,y=Math.floor(i/E.W);return [[x-1,y],[x+1,y],[x,y-1],[x,y+1]].filter(([x,y])=>E.inside(x,y)).map(([x,y])=>E.idx(x,y));}
function economy(s,id){
 if(s.tick%4!==id%4)return;
 const p=E.person(s,id),kinds=['barracks','city','fort'];
 const kind=kinds[Math.floor(s.tick/4)%3];
 for(let r=1;r<=15;r++){
  let done=false;
  for(let dx=-r;dx<=r&&!done;dx++)for(const dy of [-r,r]){
   const x=p.capital.x+dx,y=p.capital.y+dy;
   if(!E.canBuild(s,id,kind,x,y)&&E.action(s,id,{type:'queueBuild',kind,x,y}).ok){done=true;break;}
  }
  if(done)break;
 }
 if(s.tick%38===id%38)E.action(s,id,{type:'research',key:['economy','war','logistics'][Math.floor(s.tick/38)%3]});
}
function order(s,id,policy){
 if(policy==='idle'||s.tick%8!==id%8||s.attackPlans.some(p=>p.owner===id))return;
 const p=E.person(s,id),foe=s.players.find(p=>p.id!==id);
 if(p.troops<130)return;
 const candidates=new Map();
 for(let i=0;i<s.owners.length;i++)if(s.owners[i]===id)for(const j of neighbors(i))
  if(s.tiles[j]&&s.owners[j]!==id&&!candidates.has(s.owners[j]))candidates.set(s.owners[j],j);
 const target=candidates.has(foe.id)?foe.id:0,start=candidates.get(target);
 if(start===undefined)return;
 const limit=Math.min(E.planCellLimit(s,id),policy==='narrow'?40:400),zone=[start],seen=new Set(zone);
 for(let n=0;n<zone.length&&zone.length<limit;n++)for(const j of neighbors(zone[n]))
  if(s.tiles[j]&&s.owners[j]===target&&!seen.has(j)&&zone.length<limit){seen.add(j);zone.push(j);}
 if(zone.length<2)return;
 if(target)assert(E.action(s,id,{type:'setNationTarget',target,enabled:true}).ok);
 // Both policies commit the same fraction; geometry is the experimental variable.
 const result=E.action(s,id,{type:'send',x:start%E.W,y:Math.floor(start/E.W),zone,percent:70,targets:[target]});
 return result.ok;
}
function run(seed,seat,policy){
 const s=E.lobby(seed);let id,bot;
 if(seat===1){id=E.addPlayer(s,'Scripted player');bot=E.addPlayer(s,'Bot',true);}
 else{bot=E.addPlayer(s,'Bot',true);id=E.addPlayer(s,'Scripted player');}
 if(close){
  // Legal manual spawns on the generated mainland; no synthetic terrain or extra resources.
  for(const p of s.players){let placed=false;
   for(let y=40;y<80&&!placed;y++)for(let x=60;x<110;x++)if(!E.spawnError(s,p.id,x,y)){
    assert(E.setSpawn(s,p.id,{x,y}).ok);placed=true;break;
   }
   assert(placed,'Generated seed supports both manual spawn positions');
  }
 }
 assert(E.start(s,0).ok);let orders=0,firstContact=null;
 const initial=s.players.map(p=>({id:p.id,capital:p.capital,land:p.land}));
 for(let t=0;t<horizon&&s.phase==='playing';t++){
  economy(s,id);if(order(s,id,policy))orders++;
  E.tick(s);for(let n=0;n<3;n++)E.combatStep(s);
  if(firstContact===null&&s.wars.length)firstContact=s.tick;
 }
 const metrics=id=>{const p=E.person(s,id);assert(p.land>=0);for(const v of Object.values(p.res))assert(Number.isFinite(v)&&v>=0);
  assert.equal(p.land,s.owners.filter(v=>v===id).length,'Reported land matches authority');
  return {land:p.land,troops:Math.round(E.militaryStrength(s,id).total),buildings:s.buildings.filter(b=>b.owner===id).length,resources:p.res,eliminated:!!p.eliminated};};
 const plans=s.attackPlans.filter(p=>p.owner===id).map(p=>({remaining:p.zoneCells.filter(i=>s.owners[i]!==id).length,front:E.estimatePlanFront(s,p)}));
 return {seed,seat,policy,close,ticks:s.tick,orders,firstContact,winner:s.winner,initial,plans,player:metrics(id),bot:metrics(bot)};
}
let replay;
for(const seed of seeds)for(const seat of [1,2])for(const policy of ['idle','narrow','wide']){
 const result=run(seed,seat,policy);if(seed===88&&seat===1&&policy==='narrow')replay=result;
 console.log(JSON.stringify(result));
}
assert.deepEqual(run(88,1,'narrow'),replay,'Same seed, seat, clock and policy replay exactly');
