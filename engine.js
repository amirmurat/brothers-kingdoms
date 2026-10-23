/* Brothers Kingdoms: original territory strategy engine. Deterministic, host-authoritative. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;root.BKEngine=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const TROOPS_PER_PLAN_CELL=10,STORAGE_PER_CELL=50;
function planCellLimit(s,id){return Math.min(W*H,Math.max(0,Math.floor(militaryStrength(s,id).total/TROOPS_PER_PLAN_CELL)));}
const W=160,H=104,MAX=4,MAX_BUILDING_LEVEL=3,LAND=[1,2,3,4,5,6];
const COLORS=['#39D5FF','#B6F36A','#FFAE57','#FF5D80','#B38CFF','#59E2C5','#FFE66B','#88A4FF','#EF96E6','#FF885D','#8CE3A1','#C3B5FF','#F8B9CA','#B7CCD9'];
const KINDS={farm:{name:'Farm',cost:{wood:45,stone:10},income:'food'},lumber:{name:'Lumber Mill',cost:{wood:40,stone:15},income:'wood'},quarry:{name:'Quarry',cost:{wood:45,stone:20},income:'stone'},mine:{name:'Mine',cost:{wood:55,stone:55},income:'gold'},barracks:{name:'Barracks',cost:{wood:300,stone:195,gold:105}},fort:{name:'Fort',cost:{wood:315,stone:390,gold:165}},city:{name:'City',cost:{wood:495,stone:450,gold:300}}};
const TECH={economy:{name:'Economy',base:{gold:120,wood:80}},war:{name:'Warfare',base:{gold:135,stone:75}},logistics:{name:'Logistics',base:{gold:100,wood:80}}};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const idx=(x,y)=>y*W+x;
const inside=(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&x<W&&y>=0&&y<H;
const near=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
function random(seed){let a=(seed>>>0)||1;return ()=>{a^=a<<13;a^=a>>>17;a^=a<<5;return (a>>>0)/4294967296;};}
function hash(x,y,seed){let v=Math.imul(x+seed,374761393)+Math.imul(y+29,668265263);v=Math.imul(v^(v>>>13),1274126177);return((v^(v>>>16))>>>0)/4294967295;}
function generate(seed){const t=new Array(W*H);const base=(seed%611)/611;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const nx=x/W,ny=y/H;const n= Math.sin(nx*11.2+base*5)*0.22+Math.cos(ny*14.3+base*7)*0.15+Math.sin(nx*21+ny*8+base*9)*0.1+Math.cos(nx*32-ny*25)*0.08+hash(Math.floor(x/5),Math.floor(y/5),seed)*0.21;
  const edge=Math.min(x,W-1-x,y,H-1-y);const height=n+(edge<5?-0.6+edge*0.09:0)+(Math.cos(nx*6.4-ny*4.8)*0.09);
  if(height<-.22){t[idx(x,y)]=0;continue;}
  // Broad biomes instead of random terrain per cell: readable contiguous regions.
  const r=Math.sin(nx*15.9+base*9)*.24+Math.cos(ny*21.3+base*6)*.21+Math.sin(nx*33-ny*13)*.09+(hash(Math.floor(x/10),Math.floor(y/10),seed+53)-.5)*.13;
  t[idx(x,y)]=height>.61?6:height>.39?3:r<-.22?2:r>.27?4:(r>.23&&height>.15)?5:1;
 }
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)if(t[idx(x,y)]===3&&hash(Math.floor(x/7),Math.floor(y/7),seed+71)>.9)t[idx(x,y)]=5;
 return t;
}
// Mainland-only ruleset: every conquerable tile can be reached from every other one on foot.
// Delete detached islands instead of making players research a navy for a few pixels.
function singleContinent(t){
 const seen=new Uint8Array(W*H);let largest=[];
 for(let i=0;i<t.length;i++){
  if(!t[i]||seen[i])continue;
  const queue=[i];seen[i]=1;
  for(let k=0;k<queue.length;k++){
   const pos=queue[k],x=pos%W,y=(pos/W)|0;
   for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const nx=x+dx,ny=y+dy;
    if(!inside(nx,ny))continue;
    const next=idx(nx,ny);
    if(t[next]&&!seen[next]){seen[next]=1;queue.push(next);}
   }
  }
  if(queue.length>largest.length)largest=queue;
 }
 const mainland=new Uint8Array(t.length);
 for(const i of largest)mainland[i]=1;
 for(let i=0;i<t.length;i++)if(t[i]&&!mainland[i])t[i]=0;
 return t;
}
// Place capitals on the main landmass, including when the preferred anchor falls in the sea.
function safeSpawn(s,anchor,used){
 let best=null,bestScore=Infinity;
 for(let y=5;y<H-5;y++)for(let x=5;x<W-5;x++){
  if(!tile(s,x,y)||tile(s,x,y)===6)continue;
  if(used.some(p=>(p.x-x)**2+(p.y-y)**2<14*14))continue;
  const coast=(tile(s,x-1,y)===0||tile(s,x+1,y)===0||tile(s,x,y-1)===0||tile(s,x,y+1)===0)?14:0;
  const score=(x-anchor.x)**2+(y-anchor.y)**2+coast;
  if(score<bestScore){bestScore=score;best={x,y};}
 }
 if(!best)throw new Error('No suitable spawn location on the continent.');
 return best;
}
const alive=p=>p&&!p.eliminated;
function person(s,id){return s.players.find(p=>p.id===id);}
const available=(p,c)=>Object.entries(c||{}).every(([k,v])=>(p.res[k]||0)>=v);
const charge=(p,c)=>Object.entries(c).forEach(([k,v])=>p.res[k]-=v);
function log(s,msg){s.log.unshift(msg);if(s.log.length>8)s.log.length=8;}
function lobby(seed=57283){return {version:14,settings:{bots:0},phase:'lobby',seed:Math.floor(seed),tick:0,tiles:[],owners:[],players:[],buildings:[],armies:[],attackPlans:[],recoveryPlans:[],workZones:[],buildJobs:[],roads:[],workRevision:0,roadRevision:0,log:['Conquer land, develop your economy, and defend your territory.'],winner:null,mode:'conquest',duration:null,nonce:0,landTotal:0,territoryRevision:0,wars:[],peaceOffers:[]};}
function addPlayer(s,name,isBot=false){if(s.phase!=='lobby'||s.players.filter(p=>!p.bot).length>=MAX&&!isBot||s.players.length>=COLORS.length)return null;
 let id=1;while(s.players.some(p=>p.id===id))id++;let safe=String(name||('Kingdom '+id)).trim().slice(0,18)||('Player '+id);
 s.players.push({id,name:safe,bot:!!isBot,color:COLORS[(id-1)%COLORS.length],res:{food:650,wood:390,stone:310,gold:260},troops:450,troopCap:1700,land:0,ready:!!isBot,connected:true,spawnPreference:'auto',eliminated:false,attackTargets:[],tech:{economy:0,war:0,logistics:0},offers:[],allies:[],capital:null,kills:0});
 log(s,safe+' entered the battle.');return id;
}
function tile(s,x,y){return inside(x,y)?s.tiles[idx(x,y)]:0;}
function owner(s,x,y){return inside(x,y)?s.owners[idx(x,y)]:0;}
function buildingAt(s,x,y){return s.buildings.find(b=>b.x===x&&b.y===y)||null;}
function armiesAt(s,x,y){return s.armies.filter(a=>a.x===x&&a.y===y&&a.strength>0);}
function building(s,id,kind,x,y){const b={id:'b'+(++s.nonce),owner:id,kind,x,y,level:1,hp:100};s.buildings.push(b);return b;}
function landCount(s){return s.players.filter(p=>!p.eliminated).reduce((n,p)=>n+p.land,0);}
function gainTile(s,x,y,id){if(!inside(x,y)||tile(s,x,y)===0)return false;const i=idx(x,y),old=s.owners[i];if(old===id)return false;
 if(old){const p=person(s,old);if(p)p.land=Math.max(0,p.land-1);}
  s.owners[i]=id;s.territoryRevision=(s.territoryRevision||0)+1;if(id){const p=person(s,id);if(p)p.land++;}
 if(s.phase==='playing'){if(old&&person(s,old))clampStorage(s,person(s,old));}
 if(s.phase==='playing'&&old&&id&&(s.wars||[]).includes(warKey(old,id))){
  s.recoveryPlans??=[];
  let recovery=s.recoveryPlans.find(q=>q.owner===old&&q.targetOwner===id);
  if(!recovery){recovery={id:'r'+(++s.nonce),owner:old,targetOwner:id,targets:[id],autoRecovery:true,zoneCells:[],percent:30,waves:0,initialStrength:35,nextWaveTick:s.tick+1};s.recoveryPlans.push(recovery);}
  if(!recovery.zoneCells.includes(i))recovery.zoneCells.push(i);
 }
 return true;
}
function claim(s,x,y,id,r){for(let yy=y-r;yy<=y+r;yy++)for(let xx=x-r;xx<=x+r;xx++)if(inside(xx,yy)&&tile(s,xx,yy)&&Math.hypot(xx-x,yy-y)<=r+0.25){gainTile(s,xx,yy,id);}}

function sealTerritories(s){
 const changes=[];
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
  const i=idx(x,y);if(s.tiles[i]===0||s.owners[i])continue;
  const around=[s.owners[i-1],s.owners[i+1],s.owners[i-W],s.owners[i+W],s.owners[i-W-1],s.owners[i-W+1],s.owners[i+W-1],s.owners[i+W+1]].filter(Boolean);
  if(!around.length)continue;
  const counts=new Map();
  for(const id of around)counts.set(id,(counts.get(id)||0)+1);
  let best=0,bestCount=0;
  for(const [id,count] of counts){if(count>bestCount){best=id;bestCount=count;}}
  const orth=(s.owners[i-1]===best)+(s.owners[i+1]===best)+(s.owners[i-W]===best)+(s.owners[i+W]===best);
  if(best&&((bestCount>=5)||(orth>=3)))changes.push([x,y,best]);
 }
 for(const [x,y,id] of changes)gainTile(s,x,y,id);
 return changes.length;
}

function sites(s,n){const anchors=[[.16,.23],[.82,.76],[.82,.22],[.17,.78],[.48,.17],[.5,.83],[.27,.48],[.75,.5],[.34,.12],[.65,.9],[.91,.48],[.08,.52],[.47,.49],[.55,.48]];
 return anchors.slice(0,n).map(([fx,fy])=>({x:Math.round(fx*(W-1)),y:Math.round(fy*(H-1))}));
}
const spawnTerrainCache=new Map();
function previewTerrain(s){
 if(!spawnTerrainCache.has(s.seed)){
  if(spawnTerrainCache.size>=8)spawnTerrainCache.delete(spawnTerrainCache.keys().next().value);
  spawnTerrainCache.set(s.seed,singleContinent(generate(s.seed)));
 }
 return spawnTerrainCache.get(s.seed).slice();
}
function spawnError(s,id,x,y){
 if(s.phase!=='lobby'||!person(s,id))return 'Starting positions can only change in the room.';
 if(!inside(x,y)||x<5||y<5||x>=W-5||y>=H-5)return 'Choose a point away from the map edge.';
 const terrain=previewTerrain(s);
 if(!terrain[idx(x,y)]||terrain[idx(x,y)]===6)return 'Choose land outside mountain peaks.';
 for(const p of s.players){
  if(p.id===id||!p.spawnPoint)continue;
  if((p.spawnPoint.x-x)**2+(p.spawnPoint.y-y)**2<14*14)return 'Choose a point farther from another starting position.';
 }
 return null;
}
function setSpawn(s,id,point){
 if(s.phase!=='lobby'||!person(s,id))return {ok:false,error:'Starting positions can only change in the room.'};
 const p=person(s,id);
 if(point===null){p.spawnPoint=null;p.spawnPreference='auto';return {ok:true};}
 if(!point||typeof point!=='object')return {ok:false,error:'Choose a point on the map.'};
 const error=spawnError(s,id,point.x,point.y);if(error)return {ok:false,error};
 p.spawnPoint={x:point.x,y:point.y};p.spawnPreference='auto';return {ok:true};
}
function start(s,bots=0){if(s.phase!=='lobby'||!s.players.length)return {ok:false,error:'No players.'};
 for(const p of s.players)if(p.spawnPoint){const fail=spawnError(s,p.id,p.spawnPoint.x,p.spawnPoint.y);if(fail)return {ok:false,error:p.name+': '+fail};}
 s.tiles=previewTerrain(s);s.owners=new Array(W*H).fill(0);s.armies=[];s.attackPlans=[];s.recoveryPlans=[];s.buildings=[];s.territoryRevision=0;
 const botsCount=clamp(Math.floor(bots),0,COLORS.length-s.players.length);for(let i=0;i<botsCount;i++)addPlayer(s,['Crimson Peaks','Northern Crown','Iron Pact','Free Cities','Amber Horde','Golden Plains','Blue Guard','Stone Throne','Greenlands','Cloud Folk'][i]||'Empire '+(i+1),true);
 let positions=sites(s,s.players.length);
 const targets={northwest:{x:Math.round(W*.16),y:Math.round(H*.23)},northeast:{x:Math.round(W*.82),y:Math.round(H*.22)},southwest:{x:Math.round(W*.17),y:Math.round(H*.78)},southeast:{x:Math.round(W*.82),y:Math.round(H*.76)}};
 const taken=new Set(),placement=[],used=s.players.filter(p=>p.spawnPoint).map(p=>({...p.spawnPoint}));
 // Reserve manual capitals before placing any automatic players or bots.
 for(const p of s.players){
  const wish=p.spawnPoint||targets[p.spawnPreference];let best=-1,score=Infinity;
  if(wish)for(let i=0;i<positions.length;i++)if(!taken.has(i)){
   const d=Math.abs(positions[i].x-wish.x)+Math.abs(positions[i].y-wish.y);
   if(d<score){score=d;best=i;}
  }
  if(best<0)best=positions.findIndex((_,i)=>!taken.has(i));
  taken.add(best);
  if(p.spawnPoint)placement.push({...p.spawnPoint});
  else{const pos=safeSpawn(s,positions[best],used);used.push(pos);placement.push(pos);}
 }
 placement.forEach((pos,i)=>{const p=s.players[i];claim(s,pos.x,pos.y,p.id,4);p.capital={x:pos.x,y:pos.y};building(s,p.id,'city',pos.x,pos.y);

 });
 for(let i=0;i<2;i++)sealTerritories(s);
 s.landTotal=s.tiles.filter(Boolean).length;s.duration=null;s.rules={victory:100,timeLimit:false,naval:false,continent:true};s.phase='playing';for(const p of s.players)syncGarrisons(s,p);log(s,'Match started. Conquer 100% of the land. There is no time limit.');return {ok:true};
}

// Price is based on current owned structures of this type, not their levels.
function buildingCount(s,id,kind){return s.buildings.filter(b=>b.owner===id&&b.kind===kind).length;}
function costBuilding(s,id,kind){
 const base=KINDS[kind]?.cost;if(!base)return null;
 const count=buildingCount(s,id,kind)+(s.buildJobs||[]).filter(j=>j.owner===id&&!j.upgradeOf&&j.kind===kind).length;
 return Object.fromEntries(Object.entries(base).map(([resource,value])=>[resource,Math.ceil(value*(100+5*count)/100)]));
}
function costUpgrade(b){
 const base=KINDS[b.kind]?.cost||KINDS.city.cost,factor=1.8+1.2*(b.level-1);
 return Object.fromEntries(Object.entries(base).map(([k,v])=>[k,Math.ceil(v*factor)]));
}
function costTech(key,l){const base=TECH[key].base;return Object.fromEntries(Object.entries(base).map(([k,v])=>[k,Math.round(v*(l+1)*1.4)]));}
function isCoast(s,x,y){return [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>tile(s,x+dx,y+dy)===0);}
function canBuild(s,id,kind,x,y){if(!KINDS[kind])return 'Unknown building.';if(!inside(x,y)||owner(s,x,y)!==id)return 'Build on your own territory.';
 if(buildingAt(s,x,y))return 'Tile already has a building.';
 if((s.buildJobs||[]).some(j=>j.x===x&&j.y===y))return 'Construction already queued here.';
 if(kind==='lumber'&&tile(s,x,y)!==2)return 'Lumber mills require forests.';
 if(kind==='quarry'&&![3,6].includes(tile(s,x,y)))return 'Quarries require hills or mountains.';
 if(kind==='mine'&&![3,5,6].includes(tile(s,x,y)))return 'Mines require mountains, hills, or ore deposits.';
 if(tile(s,x,y)===6&&kind!=='quarry'&&kind!=='mine'&&kind!=='fort')return 'This building cannot be placed on a summit.';
 return null;
}
// Border lists are reused across AI candidate queries for the same simulation tick.
// This removes tens of thousands of repeated tile reads per bot order.
const borderCache=new WeakMap();
const attackFronts=new WeakMap();
function borders(s,id){
 let cache=borderCache.get(s);
 if(!cache||cache.revision!==s.territoryRevision){cache={tick:s.tick,revision:s.territoryRevision,lists:new Map()};borderCache.set(s,cache);}
 if(cache.lists.has(id))return cache.lists.get(id);
 const list=[];
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
  const i=idx(x,y);if(s.owners[i]!==id)continue;
  if(s.owners[i+1]!==id||s.owners[i-1]!==id||s.owners[i+W]!==id||s.owners[i-W]!==id)list.push({x,y});
 }
 cache.lists.set(id,list);return list;
}
function nearestBorder(s,id,tx,ty){
 let best=null,score=Infinity;
 for(const p of borders(s,id)){const d=Math.abs(p.x-tx)+Math.abs(p.y-ty);if(d<score){best=p;score=d;}}
 return best;
}
function nearestBorderLand(s,id,tx,ty){
 if(!inside(tx,ty)||!tile(s,tx,ty))return null;
 const seen=new Uint8Array(W*H),queue=[idx(tx,ty)];seen[queue[0]]=1;
 for(let i=0;i<queue.length;i++){
  const cell=queue[i],x=cell%W,y=Math.floor(cell/W);
  if(s.owners[cell]===id)return {x,y};
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=x+dx,ny=y+dy;if(!inside(nx,ny))continue;
   const j=idx(nx,ny);if(seen[j]||!s.tiles[j])continue;
   seen[j]=1;queue.push(j);
  }
 }
 return null;
}
function parseTargets(s,id,values){
 if(!Array.isArray(values))return [];
 const p=person(s,id),targets=new Set();
 for(const v of values){
  if(!Number.isInteger(v)||v===id)continue;
  if(v===0){targets.add(0);continue;}
  const rival=person(s,v);
  if(alive(rival)&&!p.allies.includes(v))targets.add(v);
 }
 return [...targets];
}
function validatePaintedRegion(s,request,min=1){
 if(!Array.isArray(request))return {error:'Paint an area first.'};
 const cells=new Set();
 for(const i of request)if(Number.isInteger(i)&&i>=0&&i<W*H&&s.tiles[i])cells.add(i);
 if(cells.size<min)return {error:'Paint at least one land cell.'};
 return {cells:[...cells].sort((a,b)=>a-b)};
}
function nationTargets(s,id){
 const p=person(s,id);if(!p)return [];
 if(!Array.isArray(p.attackTargets)){
  // Preserve user-selected opponents from saves created before Nations.
  p.attackTargets=[...new Set((s.attackPlans||[]).filter(plan=>plan.owner===id)
   .flatMap(plan=>plan.targets??[plan.targetOwner]).filter(t=>t>0&&alive(person(s,t))&&!p.allies.includes(t)))];
 }
 return p.attackTargets;
}
function syncNationPlans(s,id){
 const targets=[0,...nationTargets(s,id)];
 for(const plan of s.attackPlans||[]){
  if(plan.owner!==id)continue;
  plan.targets=targets.slice();plan.targetOwner=targets[0];plan.nextWaveTick=Math.max(s.tick+1,plan.nextWaveTick||0);
  for(const wave of s.armies.filter(a=>a.planId===plan.id&&!targets.includes(a.targetOwner)))
   finishWave(s,wave,person(s,id));
 }
 s.armies=s.armies.filter(w=>w.strength>=8);
}
function declareApprovedWars(s,id,targets){
 s.wars??=[];s.peaceOffers??=[];
 for(const target of targets){
  if(!target)continue;
  const key=warKey(id,target);
  if(s.wars.includes(key))continue;
  s.wars.push(key);
  s.peaceOffers=s.peaceOffers.filter(o=>warKey(o.from,o.to)!==key);
  log(s,person(s,id).name+' declared war on '+person(s,target)?.name);
 }
}

function paintedComponents(cells){
 const pending=new Set(cells),parts=[];
 while(pending.size){
  const first=pending.values().next().value,stack=[first],part=[];pending.delete(first);
  while(stack.length){
   const i=stack.pop();part.push(i);
   const x=i%W,y=(i/W)|0;
   for(const j of [x>0?i-1:-1,x<W-1?i+1:-1,y>0?i-W:-1,y<H-1?i+W:-1]){
    if(pending.delete(j))stack.push(j);
   }
  }
  parts.push(part.sort((a,b)=>a-b));
 }
 return parts.sort((a,b)=>b.length-a.length||a[0]-b[0]);
}
function upsertPaintedPlan(s,id,request,rawTargets,percent,editId=null,excludeTargets=[]){
 const p=person(s,id),checked=validatePaintedRegion(s,request,1);
 if(checked.error)return {ok:false,error:checked.error};
 checked.cells=checked.cells.filter(i=>!p.allies.includes(s.owners[i]));
 if(!checked.cells.length)return {ok:false,error:"Allied territory cannot be planned."};
 const own=(s.attackPlans||[]).filter(plan=>plan.owner===id);
 const original=editId?own.find(plan=>plan.id===editId):null;
 if(editId&&!original)return {ok:false,error:'Offensive plan no longer exists.'};
 const limit=Math.max(planCellLimit(s,id),original?.zoneCells.length||0);
 const selected=new Set(checked.cells.slice(0,limit)),merged=new Set(original?[original]:[]);
 // Transitive union: if this stroke bridges two active plans, absorb both.
 let found=true;
 while(found){
  found=false;
  for(const plan of own){
   if(merged.has(plan))continue;
   if(plan.zoneCells.some(i=>selected.has(i))&&new Set([...selected,...plan.zoneCells]).size<=limit){
    merged.add(plan);for(const i of plan.zoneCells)selected.add(i);found=true;
   }
  }
 }
 if(original){
  const keep=new Set(checked.cells);
  for(const i of original.zoneCells)if(!keep.has(i))selected.delete(i);
  for(const pl of merged)if(pl!==original)for(const i of pl.zoneCells)selected.add(i);
 }
 // Preserve the full union instead of rejecting larger combined plans.
 if(!selected.size)return {ok:true,cells:0};
 // A painted region specifies geography only. Nations manages all hostility.
 const targets=[0,...nationTargets(s,id)],parts=paintedComponents(selected);
 const plan=original||[...merged][0]||{id:'p'+(++s.nonce),owner:id,waves:0,initialStrength:Math.max(35,Math.floor(p.troops*percent/100))};
 if(merged.size){
  const removedIds=new Set([...merged].map(pl=>pl.id));
  for(const wave of s.armies.filter(w=>removedIds.has(w.planId)))finishWave(s,wave,person(s,wave.owner));
  s.armies=s.armies.filter(w=>!removedIds.has(w.planId));
  s.attackPlans=s.attackPlans.filter(pl=>!removedIds.has(pl.id));
 }
 const strategy={focus:plan.focus,allocationMode:plan.allocationMode,allocationValue:plan.allocationValue};
 const partTotal=parts.reduce((n,c)=>n+c.length,0);
 const plans=parts.map((zoneCells,i)=>{
  const item=i===0?plan:{id:'p'+(++s.nonce),owner:id,waves:0,initialStrength:Math.max(35,Math.floor(p.troops*percent/100))};
  if(strategy.allocationMode&&strategy.allocationMode!=='auto'){item.allocationMode=strategy.allocationMode;item.allocationValue=strategy.allocationValue*zoneCells.length/partTotal;}
  item.focus=i===0&&!!strategy.focus;
  item.zoneCells=zoneCells;item.targets=targets.slice();item.targetOwner=targets[0]??0;item.percent=percent;
  item.nextWaveTick=merged.size?s.tick+1:s.tick;
  s.attackPlans??=[];s.attackPlans.push(item);
  if(!merged.size)sendNextPlannedWave(s,item);
  return item;
 });
 return {ok:true,merged:merged.size>0,planId:plans[0].id,planIds:plans.map(q=>q.id),
  separated:plans.length,waiting:plans.every(q=>!s.armies.some(a=>a.planId===q.id))};
}
function createPaintedPlan(s,id,a,percent){
 return upsertPaintedPlan(s,id,a.zone,a.targets??[s.owners[a.zone[0]]],percent,null,a.excludeTargets);
}
function changePaintedPlan(s,id,a){
 const plan=(s.attackPlans||[]).find(p=>p.id===a.id&&p.owner===id);
 if(!plan)return {ok:false,error:'Offensive plan not found.'};
 return upsertPaintedPlan(s,id,a.zone??plan.zoneCells,a.targets??plan.targets??[plan.targetOwner],
  clamp(Number(a.percent)||plan.percent,5,95),plan.id,a.excludeTargets);
}
function action(s,id,a){if(s.phase!=='playing')return {ok:false,error:'Match is not active.'};normalizeBuildingRules(s);const p=person(s,id);
 if(!alive(p)||!a||typeof a!=='object')return {ok:false,error:'Command unavailable.'};
 if(a.type==='armyPosture'){
  if(!['aggressive','balanced','defensive'].includes(a.value))return {ok:false,error:'Choose an army posture.'};
  p.armyPosture=a.value;
  const force=militaryStrength(s,id),surplus=Math.max(0,force.deployed-force.total*(1-reserveShare(p))),fraction=force.deployed?surplus/force.deployed:0;
  if(fraction)for(const wave of s.armies.filter(w=>w.owner===id)){
   const columns=wave.columns?.length?wave.columns:[{x:wave.x,y:wave.y,strength:wave.strength}];
   for(const c of columns){const released=c.strength*fraction;if(released>1e-7){reserveSquad(s,p,c.x,c.y,released,true);p.troops+=released;c.strength-=released;wave.strength=Math.max(0,wave.strength-released);}}
   wave.columns=columns;localStrengthCache.delete(wave);
  }
  autoDemandCache.delete(s);return {ok:true};
 }
 if(a.type==='armyFocus'){
  if(a.clear){p.armyFocus=null;autoDemandCache.delete(s);return {ok:true};}
  if(!Number.isInteger(a.x)||!Number.isInteger(a.y)||!inside(a.x,a.y))return {ok:false,error:'Choose a point on your land or inside an active offensive plan.'};
  const focus={x:a.x,y:a.y};
  if(focusStatus(s,id,focus)==='invalid')return {ok:false,error:'Focus must be on your land or inside an active offensive plan.'};
  p.defendPriority=null;p.armyFocus=focus;autoDemandCache.delete(s);return {ok:true};
 }
 if(a.type==='planStrategy'){
  const q=(s.attackPlans||[]).find(q=>q.id===a.id&&q.owner===id);
  if(!q)return {ok:false,error:'Offensive plan not found.'};
  const mode=a.mode??q.allocationMode??'auto';
  if(!['auto','troops','percent'].includes(mode))return {ok:false,error:'Choose Auto, troops or percent.'};
  const value=Number(a.value??q.allocationValue??0);
  if(mode!=='auto'&&(!Number.isFinite(value)||value<0||value>(mode==='percent'?100:1e9)))return {ok:false,error:'Invalid allocation.'};
  q.allocationMode=mode;q.allocationValue=value;
  if(a.focus!==undefined)q.focus=a.focus===true;
  autoDemandCache.delete(s);
  // A reduced manual budget releases surplus at its real position. Returning
  // troops remain unavailable until they physically reach a friendly base.
  if(a.mode!==undefined){let keep=automaticAllocation(s,q).target;
   for(const wave of s.armies.filter(w=>w.planId===q.id))for(const c of wave.columns||[]){
    const retained=Math.min(keep,c.strength),released=c.strength-retained;keep-=retained;
    if(released>1e-7){reserveSquad(s,p,c.x,c.y,released,true);p.troops+=released;c.strength=retained;wave.strength=Math.max(0,wave.strength-released);localStrengthCache.delete(wave);}
   }
  }
  return {ok:true};
 }
 if(a.type==='defendPriority'){
  if(a.clear){p.defendPriority=null;return {ok:true};}
  if(!inside(a.x,a.y)||owner(s,a.x,a.y)!==id)return {ok:false,error:'Choose your own territory.'};
  p.defendPriority={x:a.x,y:a.y};return {ok:true};
 }
 if(a.type==='setWorkPriority'){const priority=String(a.priority);if(!['balanced',...Object.keys(WORK_RESOURCES)].includes(priority))return {ok:false,error:'Choose a production priority.'};p.workPriority=priority;for(const g of p.workers||[])if(g.resource){g.resource=null;g.route=null;g.progress=0;}return {ok:true};}
 if(a.type==='workZone')return paintWorkZone(s,p,a);
 if(a.type==='queueBuild'){
  const kind=String(a.kind),x=Math.floor(a.x),y=Math.floor(a.y),fail=canBuild(s,id,kind,x,y);
  if(fail)return {ok:false,error:fail};
  if(!['city','barracks','fort'].includes(kind))return {ok:false,error:'Use a resource zone for production.'};
  s.buildJobs??=[];if(s.buildJobs.some(j=>j.x===x&&j.y===y))return {ok:false,error:'Construction already queued here.'};
  if(s.buildJobs.filter(j=>j.owner===id).length>=workforceStats(s,id).slots)return {ok:false,error:'All builder crews are assigned. Expand your cities or finish existing jobs.'};
  const count=s.buildJobs.filter(j=>j.owner===id&&!j.upgradeOf&&j.kind===kind).length;
  const cost=Object.fromEntries(Object.entries(KINDS[kind].cost).map(([k,v])=>[k,Math.ceil(v*(1+.05*(buildingCount(s,id,kind)+count)))]));
  if(!available(p,cost))return {ok:false,error:'Not enough resources.'};
  charge(p,cost);s.buildJobs.push({id:'j'+(++s.nonce),owner:id,kind,x,y,cost,progress:0});return {ok:true};
 }
 if(a.type==='send'){
  let tx=Math.floor(a.x),ty=Math.floor(a.y);const percent=clamp(Number(a.percent)||30,5,95);
  if(!inside(tx,ty))return {ok:false,error:'Choose a target on the map.'};
  if(p.bot&&s.armies.filter(u=>u.owner===id).length>=12)return {ok:false,error:'You can have at most 12 active offensives.'};
  if(!p.bot&&Array.isArray(a.zone))return createPaintedPlan(s,id,a,percent);
  // Queued drawn plans are unlimited; simultaneous army waves remain capped.

  if(owner(s,tx,ty)===id)return {ok:false,error:'Choose neutral or enemy territory.'};
  if(p.allies.includes(owner(s,tx,ty)))return {ok:false,error:'Cannot attack an ally. End the alliance first.'};
  if(tile(s,tx,ty)===0)return {ok:false,error:'You cannot conquer the sea. Choose land.'};
  const force=militaryStrength(s,id);
  const strength=Math.max(0,Math.floor(Math.min(p.troops,force.total*Math.min(percent/100,1-reserveShare(p))-force.deployed)));if(strength<35)return {ok:false,error:'An offensive requires at least 35 troops.'};
  const src=nearestBorderLand(s,id,tx,ty);
  if(!src)return {ok:false,error:'There is no land route to this territory.'};
  // A land assault must begin on an existing shared border. Neutral attacks
  // automatically expand the whole accessible neutral perimeter (layer by layer).
  // Hostile attacks expand only into the clicked opponent, never across bystanders.
  const targetOwner=owner(s,tx,ty);
  if(!p.bot&&a.zone==null)return {ok:false,error:'Use Attack to paint an offensive zone.'};
  const zoneResult=validateZone(s,id,targetOwner,a.zone);
  if(zoneResult.error)return {ok:false,error:zoneResult.error};
  const zoneCells=zoneResult.cells;
  if(zoneCells&&!zoneCells.includes(idx(tx,ty)))return {ok:false,error:'Starting point must be in the painted area.'};
  if(!p.bot&&zoneCells&&(s.attackPlans||[]).some(plan=>plan.owner===id&&plan.zoneCells.some(i=>zoneCells.includes(i))))return {ok:false,error:'This area already belongs to an active plan.'};
  if(!initialFront(s,id,tx,ty,targetOwner,zoneCells?new Set(zoneCells):null).length){
   return {ok:false,error:targetOwner?'Reach the enemy border first.':'No shared border with available neutral land.'};
  }
  const deployment=mobilize(s,p,strength,src,initialFront(s,id,tx,ty,targetOwner,zoneCells?new Set(zoneCells):null));if(!deployment)return {ok:false,error:'Troops are returning or have no friendly route.'};
  const {columns,sectors,frontSignature}=deployment;
  if(targetOwner){s.wars??=[];const key=warKey(id,targetOwner);if(!s.wars.includes(key)){s.wars.push(key);s.peaceOffers=(s.peaceOffers||[]).filter(o=>warKey(o.from,o.to)!==key);log(s,p.name+' declared war on '+person(s,targetOwner)?.name);}}
  let planId=null;
  if(!p.bot&&zoneCells){
   s.attackPlans??=[];
   const plan={id:'p'+(++s.nonce),owner:id,targetOwner,zoneCells,percent,initialStrength:strength,waves:1,nextWaveTick:s.tick+4};
   s.attackPlans.push(plan);planId=plan.id;
  }
  s.armies.push({id:'a'+(++s.nonce),owner:id,x:columns[0].x,y:columns[0].y,ox:columns[0].x,oy:columns[0].y,tx,ty,targetOwner,planId,zoneCells,columns,sectors,frontSignature,marching:columns.some(c=>c.route.length),frontCells:initialFront(s,id,tx,ty,targetOwner,zoneCells?new Set(zoneCells):null),strength,initialStrength:strength,captured:0,turns:0,stuck:0});
  return {ok:true};
 }
 if(a.type==='redirect'){
  const army=s.armies.find(v=>v.id===a.id&&v.owner===id);if(!army||!inside(a.x,a.y))return {ok:false,error:'Army not found.'};
  if(Array.isArray(army.zoneCells))return {ok:false,error:'Cancel and redraw to change an outlined attack.'};
  const tx=Math.floor(a.x),ty=Math.floor(a.y),targetOwner=owner(s,tx,ty);
  if(!tile(s,tx,ty)||targetOwner===id||p.allies.includes(targetOwner))return {ok:false,error:'Choose neutral or enemy land.'};
  if(targetOwner!==army.targetOwner)return {ok:false,error:'Draw a new attack to target another kingdom.'};
  if(!borderCandidates(s,id,targetOwner).length)return {ok:false,error:'A shared border is required to redirect.'};
  if(targetOwner){s.wars??=[];const key=warKey(id,targetOwner);if(!s.wars.includes(key)){s.wars.push(key);log(s,p.name+' declared war on '+person(s,targetOwner)?.name);}}
  army.tx=tx;army.ty=ty;army.targetOwner=targetOwner;army.zoneCells=null;army.frontCells=initialFront(s,id,tx,ty,targetOwner);army.stuck=0;attackFronts.delete(army);return {ok:true};
 }
 if(a.type==='setNationTarget'){
  const other=person(s,Number(a.target));
  if(!alive(other)||other.id===id)return {ok:false,error:'Choose another living nation.'};
  if(p.allies.includes(other.id))return {ok:false,error:'End the alliance before attacking this nation.'};
  const targets=nationTargets(s,id),enable=a.enabled===true,has=targets.includes(other.id);
  if(enable&&!has){
   targets.push(other.id);
   declareApprovedWars(s,id,[other.id]);
  }else if(!enable&&has){
   p.attackTargets=targets.filter(t=>t!==other.id);
  }
  syncNationPlans(s,id);
  return {ok:true,enabled:p.attackTargets.includes(other.id)};
 }
 if(a.type==='updatePlan')return changePaintedPlan(s,id,a);
 if(a.type==='erasePlanCells'){
  // Only the owner can trim their own saved geometry. Other kingdoms' plans,
  // troop reserves and ownership of already captured cells remain untouched.
  if(!Array.isArray(a.cells)||a.cells.length<1||a.cells.length>W*H||
    a.cells.some(i=>!Number.isInteger(i)||i<0||i>=W*H))
   return {ok:false,error:'Choose cells within the map to erase.'};
  const erased=new Set(a.cells),owned=[...(s.attackPlans||[]),...(s.recoveryPlans||[])].filter(plan=>plan.owner===id);
  let changed=0,affected=0,deleted=0;
  for(const plan of owned){
   const remainder=plan.zoneCells.filter(i=>!erased.has(i));
   if(remainder.length===plan.zoneCells.length)continue;
   changed+=plan.zoneCells.length-remainder.length;affected++;
   if(!remainder.length){cancelOffensivePlan(s,plan);deleted++;continue;}
   // A modified front must be recalculated as a single full-width layer.
   // Withdraw its active wave before changing zone geometry.
   for(const army of s.armies.filter(w=>w.planId===plan.id))finishWave(s,army,p);
   s.armies=s.armies.filter(w=>w.planId!==plan.id);
   const parts=paintedComponents(remainder);
   const value=plan.allocationValue,manual=plan.allocationMode&&plan.allocationMode!=='auto',total=parts.reduce((n,c)=>n+c.length,0);
   plan.zoneCells=parts[0];plan.nextWaveTick=Math.max(plan.nextWaveTick||0,s.tick+1);
   if(manual)plan.allocationValue=value*parts[0].length/total;
   for(const cells of parts.slice(1))(plan.autoRecovery?s.recoveryPlans:s.attackPlans).push({...plan,id:'p'+(++s.nonce),zoneCells:cells,focus:false,
    ...(manual?{allocationValue:value*cells.length/total}:{}),waves:0,nextWaveTick:s.tick+1});
  }
  return {ok:true,erased:changed,affected,deleted};
 }
 if(a.type==='cancelPlan'){
  const plan=(s.attackPlans||[]).find(v=>v.id===a.id&&v.owner===id);
  if(!plan)return {ok:false,error:'Offensive plan not found.'};
  cancelOffensivePlan(s,plan);return {ok:true};
 }
 if(a.type==='return'){
  const army=s.armies.find(v=>v.id===a.id&&v.owner===id);if(!army)return {ok:false,error:'Army not found.'};
  const plan=(s.attackPlans||[]).find(v=>v.id===army.planId&&v.owner===id);
  if(plan){cancelOffensivePlan(s,plan);return {ok:true};}
  finishWave(s,army,p);s.armies=s.armies.filter(v=>v!==army);return {ok:true};
 }
 if(a.type==='build'&&['city','barracks','fort'].includes(a.kind))return action(s,id,{...a,type:'queueBuild'});
 if(a.type==='build'){
  const kind=String(a.kind),x=Math.floor(a.x),y=Math.floor(a.y),fail=canBuild(s,id,kind,x,y);if(fail)return {ok:false,error:fail};
  const price=costBuilding(s,id,kind);
  if(!available(p,price))return {ok:false,error:'Not enough resources.'};charge(p,price);building(s,id,kind,x,y);return {ok:true,cost:price};
 }
 if(a.type==='upgrade'){
  const b=s.buildings.find(v=>v.id===a.id&&v.owner===id);if(b?.upgrade)return {ok:false,error:'Upgrade already in progress.'};if((s.buildJobs||[]).filter(j=>j.owner===id).length>=workforceStats(s,id).slots)return {ok:false,error:'All builder crews are assigned. Expand your cities or finish existing jobs.'};if(!b||b.level>=MAX_BUILDING_LEVEL)return {ok:false,error:'Maximum level reached.'};const price=costUpgrade(b);
  if(!available(p,price))return {ok:false,error:'Not enough resources.'};
  charge(p,price);s.buildJobs??=[];
  const job={id:'j'+(++s.nonce),owner:id,kind:b.kind,x:b.x,y:b.y,upgradeOf:b.id,targetLevel:b.level+1,progress:0,cost:price};
  b.upgrade={owner:id,level:b.level+1,jobId:job.id,progress:0,total:upgradeTime(b)};
  s.buildJobs.push(job);return {ok:true};
 }
 if(a.type==='research'){
  const key=String(a.key);if(!TECH[key])return {ok:false,error:'Unknown research.'};const l=p.tech[key];if(l>=3)return {ok:false,error:'Research complete.'};const c=costTech(key,l);
  if(!available(p,c))return {ok:false,error:'Not enough resources.'};charge(p,c);p.tech[key]++;log(s,p.name+' researched '+TECH[key].name+' ('+p.tech[key]+').');return {ok:true};
 }
 if(a.type==='peace'){
  const other=person(s,Number(a.target));if(!alive(other)||other.id===id)return {ok:false,error:'Choose another living kingdom.'};
  const key=warKey(id,other.id);if(!(s.wars||[]).includes(key))return {ok:false,error:'These kingdoms are not at war.'};
  s.peaceOffers??=[];
  // AI negotiates immediately according to current military and territorial balance.
  if(other.bot&&!s.peaceOffers.some(o=>o.from===other.id&&o.to===id)){
   const theirs=militaryStrength(s,other.id).total,ours=militaryStrength(s,id).total;
   if(ours<theirs*.75&&p.land>other.land*.65)return {ok:false,error:other.name+' rejects peace while holding a military advantage.'};
   s.peaceOffers.push({from:other.id,to:id});
  }
  if(s.peaceOffers.some(o=>o.from===other.id&&o.to===id)){
   s.wars=s.wars.filter(k=>k!==key);s.peaceOffers=s.peaceOffers.filter(o=>warKey(o.from,o.to)!==key);
   p.attackTargets=nationTargets(s,id).filter(t=>t!==other.id);
   other.attackTargets=nationTargets(s,other.id).filter(t=>t!==id);
   for(const wave of s.armies){if((wave.owner===id&&wave.targetOwner===other.id)||(wave.owner===other.id&&wave.targetOwner===id))finishWave(s,wave,person(s,wave.owner));}
   s.armies=s.armies.filter(w=>w.strength>=8);
   // Peace revokes permission for this opponent, but preserves the painted zone
   // and any neutral/other-country targets. It cannot silently restart a war.
   for(const plan of s.attackPlans||[]){
    if((plan.owner===id||plan.owner===other.id)&&(plan.targets??[plan.targetOwner]).includes(plan.owner===id?other.id:id)){
     plan.targets=(plan.targets??[plan.targetOwner]).filter(t=>t!==(plan.owner===id?other.id:id));
     plan.nextWaveTick=s.tick+4;
    }
   }
   syncNationPlans(s,id);syncNationPlans(s,other.id);
   for(const recovery of [...(s.recoveryPlans||[])])
    if(warKey(recovery.owner,recovery.targetOwner)===key)cancelRecoveryPlan(s,recovery);
   log(s,p.name+' and '+other.name+' signed a peace treaty.');return {ok:true,peace:true};
  }
  if(!s.peaceOffers.some(o=>o.from===id&&o.to===other.id)){s.peaceOffers.push({from:id,to:other.id});log(s,p.name+' proposed peace to '+other.name+'.');}return {ok:true};
 }
 if(a.type==='diplomacy'){
  const target=person(s,Number(a.target));if(!alive(target)||target.id===id)return {ok:false,error:'Choose a different kingdom.'};
  if((s.wars||[]).includes(warKey(id,target.id)))return {ok:false,error:'Agree on peace before an alliance.'};
  if(p.allies.includes(target.id)){
   p.allies=p.allies.filter(v=>v!==target.id);target.allies=target.allies.filter(v=>v!==id);log(s,p.name+' ended the alliance with '+target.name);return {ok:true};
  }
  if(target.bot&&!target.offers.includes(id)){
   const ours=militaryStrength(s,id).total,theirs=militaryStrength(s,target.id).total;
   if(ours<theirs*.6&&p.land<target.land*.6)return {ok:false,error:target.name+' declines the alliance for now.'};
   target.offers.push(id);
  }
  if(target.offers.includes(id)){
   p.allies.push(target.id);target.allies.push(id);
   p.attackTargets=nationTargets(s,id).filter(v=>v!==target.id);
   target.attackTargets=nationTargets(s,target.id).filter(v=>v!==id);
   syncNationPlans(s,id);syncNationPlans(s,target.id);
   target.offers=target.offers.filter(v=>v!==id);p.offers=p.offers.filter(v=>v!==target.id);log(s,p.name+' and '+target.name+' formed an alliance.');return {ok:true};
  }
  if(!p.offers.includes(target.id)){p.offers.push(target.id);log(s,p.name+' offered an alliance to '+target.name+'.');}return {ok:true};
 }
 if(a.type==='donate'){
  const target=person(s,Number(a.target)),resource=String(a.resource),amount=clamp(Math.floor(a.amount||100),1,10000);
  if(!alive(target)||!p.allies.includes(target.id)||!['food','gold','wood','stone'].includes(resource)||p.res[resource]<amount)return {ok:false,error:'You can only donate resources to an ally.'};
  const transferred=Math.min(amount,Math.max(0,resourceCapacity(s,target.id)-target.res[resource]));p.res[resource]-=transferred;target.res[resource]+=transferred;return {ok:true};
 }
 return {ok:false,error:'Unknown command.'};
}
// Spatial home army. p.troops remains the authoritative sum for old saves and
// the HUD; squads represent those same soldiers, never an additional resource.
// Civilian work is simulated in bounded groups, never one agent per person.
const WORK_RESOURCES={food:[4],wood:[2],stone:[3,6],gold:[5]};
const RESOURCE_TERRAIN={2:"wood",3:"stone",4:"food",5:"gold",6:"stone"};
const autoSitesCache=new WeakMap();
function automaticWorkSites(s,id){
 let cache=autoSitesCache.get(s);if(!cache||cache.revision!==s.territoryRevision||cache.buildings!==s.buildings.length||cache.jobs!==s.buildJobs||cache.jobCount!==(s.buildJobs||[]).length){
  const blocked=new Set([...s.buildings,...(s.buildJobs||[])].map(b=>idx(b.x,b.y))),byOwner=new Map();
  for(let i=0;i<s.tiles.length;i++){const owner=s.owners[i],resource=RESOURCE_TERRAIN[s.tiles[i]];if(!owner||!resource||blocked.has(i))continue;
   if(!byOwner.has(owner))byOwner.set(owner,[]);byOwner.get(owner).push({i,resource});}
  cache={revision:s.territoryRevision,buildings:s.buildings.length,jobs:s.buildJobs,jobCount:(s.buildJobs||[]).length,byOwner};autoSitesCache.set(s,cache);
 }return cache.byOwner.get(id)||[];
}
const roadSets=new WeakMap();
function roadSet(s){
 const roads=s.roads||[];let c=roadSets.get(s);
 if(!c||c.roads!==roads||c.length!==roads.length){c={roads,length:roads.length,set:new Set(roads)};roadSets.set(s,c);}
 return c.set;
}
function layRoad(s,p,i){
 const roads=roadSet(s);if(roads.has(i)||p.res.wood<1)return;
 p.res.wood--;s.roads.push(i);roads.add(i);roadSets.get(s).length=s.roads.length;s.roadRevision=(s.roadRevision||0)+1;
}
function workSuitable(s,id,resource,i){return Number.isInteger(i)&&i>=0&&i<W*H&&s.owners[i]===id&&WORK_RESOURCES[resource]?.includes(s.tiles[i]);}
function workforceStats(s,id){
 const bases=s.buildings.filter(b=>b.owner===id&&b.kind==='city');
 const capacity=bases.reduce((n,b)=>n+24*b.level,0),groups=person(s,id)?.workers||[];
 const working=groups.filter(g=>g.resource&&g.progress>=3&&g.x===g.tx&&g.y===g.ty);
 return {capacity,slots:Math.ceil(capacity/6),groups:groups.length,working:working.reduce((n,g)=>n+g.count,0),
  building:(s.buildJobs||[]).filter(j=>j.owner===id).length,
  upgrading:(s.buildJobs||[]).filter(j=>j.owner===id&&j.upgradeOf).length};
}
function paintWorkZone(s,p,a){
 const resource=String(a.resource);if(!WORK_RESOURCES[resource])return {ok:false,error:'Choose a resource.'};
 if(!Array.isArray(a.cells)||a.cells.length>W*H||a.cells.some(i=>!Number.isInteger(i)||i<0||i>=W*H))return {ok:false,error:'Paint cells within the map.'};
 // Filter foreign land and unsuitable terrain rather than rejecting the brush.
 const built=new Set([...s.buildings,...(s.buildJobs||[])].map(b=>idx(b.x,b.y)));
 const cells=[...new Set(a.cells.filter(i=>workSuitable(s,p.id,resource,i)&&!built.has(i)))].sort((a,b)=>a-b);
 s.workZones??=[];
 const old=s.workZones.find(z=>z.owner===p.id&&z.resource===resource);
 const selected=new Set(cells);
 s.workZones=s.workZones.filter(z=>z!==old).map(z=>z.owner===p.id?{...z,zoneCells:z.zoneCells.filter(i=>!selected.has(i))}:z).filter(z=>z.zoneCells.length);
 if(cells.length)s.workZones.push({id:old?.id||'w'+(++s.nonce),owner:p.id,resource,zoneCells:cells});
 s.workRevision=(s.workRevision||0)+1;
 return {ok:true,cells:cells.length};
}
// A* favours existing roads (cost 1) over open terrain (cost 3).
// Called only when a group gets a new destination or loses its friendly path.
const roadSearchMemory=new WeakMap();
function roadRoute(s,id,source,destination){
 if(source===destination)return [];
 if(s.owners[source]!==id||s.owners[destination]!==id)return null;
 let memory=roadSearchMemory.get(s);
 if(!memory){memory={dist:new Float64Array(W*H),prev:new Int32Array(W*H),seen:new Uint32Array(W*H),stamp:0,heap:[]};roadSearchMemory.set(s,memory);}
 const roads=roadSet(s),{dist,prev,seen,heap}=memory,stamp=++memory.stamp;heap.length=0;
 if(stamp>=4294967295){seen.fill(0);memory.stamp=0;return roadRoute(s,id,source,destination);}
 const h=i=>Math.abs(i%W-destination%W)+Math.abs(((i/W)|0)-((destination/W)|0));
 // Interleaved numeric heap avoids an object allocation per visited tile.
 const push=(i,g)=>{const f=g+h(i);let k=heap.length/3;heap.push(i,g,f);while(k){const p=(k-1)>>1;if(heap[p*3+2]<=f)break;heap[k*3]=heap[p*3];heap[k*3+1]=heap[p*3+1];heap[k*3+2]=heap[p*3+2];k=p;}heap[k*3]=i;heap[k*3+1]=g;heap[k*3+2]=f;};
 let poppedI=0,poppedG=0;
 const pop=()=>{poppedI=heap[0];poppedG=heap[1];const f=heap.pop(),g=heap.pop(),i=heap.pop();if(heap.length){let k=0;while(k*2+1<heap.length/3){let c=k*2+1;if(c+1<heap.length/3&&heap[(c+1)*3+2]<heap[c*3+2])c++;if(heap[c*3+2]>=f)break;heap[k*3]=heap[c*3];heap[k*3+1]=heap[c*3+1];heap[k*3+2]=heap[c*3+2];k=c;}heap[k*3]=i;heap[k*3+1]=g;heap[k*3+2]=f;}};
 dist[source]=0;seen[source]=stamp;prev[source]=-1;push(source,0);
 while(heap.length){pop();const v=poppedI,vg=poppedG;if(vg!==dist[v])continue;if(v===destination)break;
  const x=v%W;
  for(let d=0;d<4;d++){const j=d===0?(x<W-1?v+1:-1):d===1?(x?v-1:-1):d===2?v+W:v-W;
   if(j<0||j>=W*H||!s.tiles[j]||s.owners[j]!==id)continue;
   const g=vg+(roads.has(j)?1:3);
   if(seen[j]!==stamp||g<dist[j]){seen[j]=stamp;dist[j]=g;prev[j]=v;push(j,g);}
  }
 }

 if(seen[destination]!==stamp||prev[destination]<0)return null;
 const route=[];for(let i=destination;i!==source;i=prev[i])route.push(i);return route.reverse();
}
function moveOnRoute(s,id,g){
 const next=g.route?.[0];if(next===undefined)return false;
 if(s.owners[idx(g.x,g.y)]!==id||s.owners[next]!==id||near(g,{x:next%W,y:(next/W)|0})!==1){g.route=null;return false;}
 // One road cell per combat pulse; open land takes three pulses.
 g.moveCredit=(g.moveCredit||0)+1;const cost=roadSet(s).has(next)?1:3;
 if(g.moveCredit<cost)return false;g.moveCredit=0;g.route.shift();g.x=next%W;g.y=(next/W)|0;return true;
}
function workforceStep(s){
 s.workZones??=[];s.buildJobs??=[];s.roads??=[];
 // Migrate already-paid v102 timers into real builder tasks on old saves.
 // Progress remains earned, but cannot continue before a worker arrives.
 for(const b of s.buildings)if(b.upgrade){
  if(b.upgrade.owner!==b.owner||owner(s,b.x,b.y)!==b.owner){delete b.upgrade;continue;}
  if(!b.upgrade.jobId){
   const total=upgradeTime(b),remaining=Math.max(1,(b.upgrade.readyTick||s.tick+total)-s.tick);
   const progress=Math.max(0,Math.min(total-1,total-remaining));
   const job={id:'j'+(++s.nonce),owner:b.owner,kind:b.kind,x:b.x,y:b.y,upgradeOf:b.id,targetLevel:b.upgrade.level,progress,cost:{}};
   b.upgrade={owner:b.owner,level:job.targetLevel,jobId:job.id,progress,total};
   s.buildJobs.push(job);
  }
 }
 // Cancel invalid work. An upgrade is on an existing building, unlike a new build.
 for(const j of [...s.buildJobs]){
  const target=j.upgradeOf?s.buildings.find(b=>b.id===j.upgradeOf):null;
  const invalid=j.upgradeOf?(!target||target.owner!==j.owner||owner(s,j.x,j.y)!==j.owner||target.upgrade?.jobId!==j.id):
   (owner(s,j.x,j.y)!==j.owner||!!buildingAt(s,j.x,j.y));
  if(!invalid)continue;
  if(!j.upgradeOf){const p=person(s,j.owner);if(p)for(const [k,n] of Object.entries(j.cost||{}))p.res[k]=Math.min(resourceCapacity(s,p.id),p.res[k]+n);}
  if(target?.upgrade?.jobId===j.id)delete target.upgrade;
  s.buildJobs=s.buildJobs.filter(q=>q!==j);
 }
 for(const p of s.players){if(!alive(p))continue;
  const bases=s.buildings.filter(b=>b.owner===p.id&&b.kind==='city'),capacity=bases.reduce((n,b)=>n+b.level*24,0);
  p.workers??=[];
  // Overrun civilians retreat locally; they never cross enemy land.
  p.workers=p.workers.filter(g=>{if(s.owners[idx(g.x,g.y)]===p.id)return true;
   const exit=adjacentCells(idx(g.x,g.y)).find(i=>s.owners[i]===p.id&&s.tiles[i]);
   if(exit===undefined)return false;g.x=exit%W;g.y=(exit/W)|0;g.route=null;g.job=null;g.resource=null;return true;});
  const count=Math.ceil(capacity/6);
  while(p.workers.length<count){const b=bases[p.workers.length%bases.length];p.workers.push({id:'c'+(++s.nonce),x:b.x,y:b.y,count:6,progress:0});}
  if(p.workers.length>count)p.workers.length=count;
  for(const g of p.workers)g.count=capacity/Math.max(1,count);
  p.workIncome={food:0,wood:0,stone:0,gold:0};
  if(!count)continue;
  const components=ownedComponents(s,p.id),occupied=new Set(),roads=roadSet(s);
  const sites=automaticWorkSites(s,p.id),siteMap=new Map(sites.map(t=>[t.i,t.resource]));
  // Preserve productive assignments. The former forced reassignment every
  // eight ticks made workers abandon deposits despite no better available job.
  // New owned deposits are considered when a group actually becomes free.
  // Assign construction jobs globally, not in worker array order. Compare
  // all reachable worker/job pairs and reserve the shortest useful trip first.
  // Already dispatched workers keep their commitment unless the site is lost.
  const localJobs=s.buildJobs.filter(j=>j.owner===p.id);
  const jobById=new Map(localJobs.map(j=>[j.id,j]));
  for(const g of p.workers)if(g.job){
   const j=jobById.get(g.job);
   if(!j||components[idx(j.x,j.y)]!==components[idx(g.x,g.y)]){
    g.job=null;g.route=null;
   }
  }
  const reservedJobs=new Set(p.workers.map(g=>g.job).filter(Boolean));
  const openJobs=localJobs.filter(j=>!reservedJobs.has(j.id));
  const freeGroups=p.workers.filter(g=>!g.job);
  while(openJobs.length&&freeGroups.length){
   let best=null,score=Infinity;
   for(let j=0;j<openJobs.length;j++)for(let k=0;k<freeGroups.length;k++){
    const job=openJobs[j],g=freeGroups[k];
    if(components[idx(job.x,job.y)]!==components[idx(g.x,g.y)])continue;
    const value=near(g,job)*2+(g.resource?8:0)-(job.upgradeOf?6:0)-Math.min(12,(job.progress||0)/8);
    if(value<score){score=value;best={j,k};}
   }
   if(!best)break;
   const [job]=openJobs.splice(best.j,1),[g]=freeGroups.splice(best.k,1);
   g.job=job.id;g.resource=null;g.roadTask=false;
   g.tx=job.x;g.ty=job.y;g.route=null;g.progress=0;
  }
  const assigned={food:0,wood:0,stone:0,gold:0},availableResources=new Set(sites.map(t=>t.resource));
  for(const g of p.workers)if(g.resource)assigned[g.resource]++;
  const resourceWeight=r=>r===p.workPriority?4:1;
  const totalWeight=[...availableResources].reduce((n,r)=>n+resourceWeight(r),0);
  for(const g of p.workers)if(g.resource)occupied.add(idx(g.tx,g.ty));
  const roadEnds=[...s.buildings.filter(b=>b.owner===p.id&&['city','barracks'].includes(b.kind)),
   ...s.armies.filter(a=>a.owner===p.id).flatMap(a=>(a.columns||[]).map(c=>({x:c.tx,y:c.ty})))];
  let routes=0;
  for(let n=0;n<p.workers.length;n++){
   const g=p.workers[n],current=idx(g.x,g.y),component=components[current];
   let job=s.buildJobs.find(j=>j.id===g.job&&j.owner===p.id);
   if(job&&components[idx(job.x,job.y)]!==component){g.job=null;g.route=null;job=null;}
   if(g.roadTask&&(!inside(g.tx,g.ty)||components[idx(g.tx,g.ty)]!==component)){g.roadTask=false;g.route=null;}
   if(g.resource&&siteMap.get(idx(g.tx,g.ty))!==g.resource){occupied.delete(idx(g.tx,g.ty));g.resource=null;g.route=null;}
   if(g.job&&!job){g.job=null;g.route=null;}
   // Roadwork is opportunistic: never interrupt productive harvesting simply
   // because a distant base is missing a road. Workers lay roads while moving.
   if(!job&&!g.resource&&!(g.roadTask&&current!==idx(g.tx,g.ty))&&routes<2){
    g.roadTask=false;
    // One group connects bases and active front supply endpoints. Other groups
    // keep producing; road tasks cannot take over the whole workforce.
    const ends=n===0?roadEnds:[];
    const end=ends.filter(b=>inside(b.x,b.y)&&components[idx(b.x,b.y)]===component&&!roads.has(idx(b.x,b.y))&&near(g,b)>0).sort((a,b)=>near(g,a)-near(g,b))[0];
    if(end){g.tx=end.x;g.ty=end.y;g.roadTask=true;g.progress=0;g.route=null;}
    else{
     let best=null,score=Infinity;
     for(const t of sites)if(!occupied.has(t.i)&&components[t.i]===component){
      const d=Math.abs(g.x-t.i%W)+Math.abs(g.y-((t.i/W)|0));
      // A scarce resource gets preference; distance still favours local jobs.
      const desired=count*resourceWeight(t.resource)/Math.max(1,totalWeight);
      const value=d*.22+assigned[t.resource]/Math.max(.25,desired)*4+Math.min(1,(p.res[t.resource]||0)/10000);
      if(value<score){score=value;best=t;}
     }
     if(best){g.tx=best.i%W;g.ty=(best.i/W)|0;g.resource=best.resource;assigned[best.resource]++;g.progress=0;g.route=null;occupied.add(best.i);}
     else{const home=[...bases].filter(b=>components[idx(b.x,b.y)]===component).sort((a,b)=>near(g,a)-near(g,b))[0];if(home){g.tx=home.x;g.ty=home.y;}g.progress=0;}
    }
   }
   if(!inside(g.tx,g.ty)){g.status='Idle';continue;}
   const destination=idx(g.tx,g.ty);
   if(current!==destination){
    if(!g.route?.length||g.route[g.route.length-1]!==destination||s.owners[g.route[0]]!==p.id){
     if(routes>=2){g.status='Planning';continue;}routes++;g.route=localRoute(s,p.id,current,destination);
    }
    // Workers lay a cheap road where they physically walk, reusing routes.
    layRoad(s,p,current);
    const next=g.route?.[0];if(next===undefined){g.status='No route';continue;}
    g.moveCredit=(g.moveCredit||0)+1;
    if(g.moveCredit>=(roads.has(next)?1:2)){g.moveCredit=0;g.route.shift();g.x=next%W;g.y=(next/W)|0;}
    g.status=g.job?'Building route':g.roadTask?'Road work':'Travelling';continue;
   }
   g.route=[];
   layRoad(s,p,current);
   if(job){
    job.progress=(job.progress||0)+1;g.status=job.upgradeOf?'Upgrading':'Building';
    const target=job.upgradeOf?s.buildings.find(b=>b.id===job.upgradeOf):null;
    if(target?.upgrade)target.upgrade.progress=job.progress;
    const required=job.upgradeOf?upgradeTime({level:job.targetLevel-1}):constructionTime(job.kind);
    if(job.progress>=required){
     if(job.upgradeOf){if(target&&target.owner===p.id&&target.upgrade?.jobId===job.id){target.level=job.targetLevel;delete target.upgrade;}}
     else building(s,p.id,job.kind,job.x,job.y);
     s.buildJobs=s.buildJobs.filter(j=>j!==job);g.job=null;g.progress=0;
    }
   }
   else if(g.resource){g.progress=Math.min(3,(g.progress||0)+1);g.status=g.progress<3?'Preparing':'Harvesting';if(g.progress>=3)p.workIncome[g.resource]+=g.count*.8;}
   else{g.status=g.roadTask?'Road complete':'Home';g.roadTask=false;}
  }
 }
}

function homeSites(s,id){
 const bases=s.buildings.filter(b=>b.owner===id&&owner(s,b.x,b.y)===id&&['barracks','city'].includes(b.kind));
 if(bases.length)return bases.sort((a,b)=>(a.kind==='barracks'?0:1)-(b.kind==='barracks'?0:1)||a.y-b.y||a.x-b.x);
 const i=s.owners.findIndex(v=>v===id);return i<0?[]:[{x:i%W,y:(i/W)|0,kind:'camp'}];
}
function reserveSquad(s,p,x,y,strength,returning=false){
 p.garrisons??=[];
 const same=p.garrisons.find(g=>g.x===x&&g.y===y&&g.camp===undefined&&!!g.returning===returning);
 if(same){same.strength+=strength;return same;}
 const g={id:'g'+(++s.nonce),x,y,strength,returning};p.garrisons.push(g);return g;
}
function coalesceGarrisons(p){
 const groups=new Map(),squads=[],limit=Math.max(35,p.troops/8)*1.5;
 for(const g of p.garrisons||[]){
  if(g.strength<=1e-7)continue;
  const key=[g.x,g.y,!!g.returning,g.role||'',g.tx??'',g.ty??'',g.camp??''].join(':');
  const first=groups.get(key);
  if(first&&first.strength+g.strength<limit-1e-7){first.strength+=g.strength;first.moveCredit=Math.min(first.moveCredit||0,g.moveCredit||0);}
  else{groups.set(key,g);squads.push(g);}
 }
 p.garrisons=squads;
}
function recruitmentBase(s,p){
 const bases=homeSites(s,p.id);if(!bases.length)return null;
 // Migration keeps the historical start. New recruits rotate across actual
 // production bases, weighted by their contribution, never appearing at a front.
 if(!s.tick)return bases[0];
 const weight=b=>b.kind==='barracks'?5*(b.level||1):b.kind==='city'?3*(b.level||1):4+p.land/100+p.tech.war*2;
 let ticket=hash(s.tick,p.id,s.seed+197)*bases.reduce((n,b)=>n+weight(b),0);
 for(const b of bases){ticket-=weight(b);if(ticket<0)return b;}return bases[bases.length-1];
}
function syncGarrisons(s,p){
 p.garrisons??=[];p.garrisons=p.garrisons.filter(g=>g.strength>1e-7&&inside(g.x,g.y));
 const sum=p.garrisons.reduce((n,g)=>n+g.strength,0),delta=p.troops-sum;
 if(delta>1e-7){const base=recruitmentBase(s,p);if(base)reserveSquad(s,p,base.x,base.y,delta);}
 else if(delta< -1e-7){const factor=Math.max(0,p.troops)/Math.max(1e-7,sum);for(const g of p.garrisons)g.strength*=factor;}
}
function loseReserve(s,p,amount,x,y){
 syncGarrisons(s,p);let left=Math.max(0,amount);
 const squads=p.garrisons.filter(g=>near(g,{x,y})<7).sort((a,b)=>near(a,{x,y})-near(b,{x,y}));
 for(const g of squads){const n=Math.min(left,g.strength);g.strength-=n;p.troops-=n;left-=n;if(left<=1e-7)break;}
 for(const a of s.armies)if(a.owner===p.id&&left>1e-7){
  for(const c of (a.columns||[]).filter(c=>near(c,{x,y})<7).sort((a,b)=>near(a,{x,y})-near(b,{x,y}))){const n=Math.min(left,c.strength);c.strength-=n;a.strength-=n;left-=n;if(left<=1e-7)break;}
  localStrengthCache.delete(a);
 }
 p.troops=Math.max(0,p.troops);
}
function adjacentCells(i){
 const x=i%W,y=(i/W)|0;
 return [x>0?i-1:-1,x<W-1?i+1:-1,y>0?i-W:-1,y<H-1?i+W:-1].filter(j=>j>=0);
}
// Reverse breadth-first field: routes stay on owned land and never cross water,
// neutral land, allies or an enemy enclave. No path means wait, not teleport.
function marchField(s,id,destination){
 const field=new Int32Array(W*H).fill(-1),queue=[];
 if(s.owners[destination]!==id||!s.tiles[destination])return field;
 field[destination]=destination;queue.push(destination);
 for(let k=0;k<queue.length;k++)for(const j of adjacentCells(queue[k])){
  if(field[j]<0&&s.tiles[j]&&s.owners[j]===id){field[j]=queue[k];queue.push(j);}
 }
 return field;
}
function fieldRoute(field,start,destination){
 if(field[start]<0)return null;
 const route=[];let i=start;
 while(i!==destination&&route.length<W*H){i=field[i];route.push(i);}
 return route;
}
// Fort intelligence is current visibility, never knowledge of hidden enemy bases.
function fortRadius(b,s=null){const terrain=s?tile(s,b.x,b.y):1;return Math.round((8+6*Math.max(1,b.level||1))*(terrain===6?1.5:terrain===3?1.25:1));}
function fortSees(s,f,b){const r=fortRadius(f,s);return (f.x-b.x)**2+(f.y-b.y)**2<=r*r;}
function focusStatus(s,id,f=person(s,id)?.armyFocus){if(!f||!inside(f.x,f.y)||!tile(s,f.x,f.y))return 'invalid';const p=person(s,id),i=idx(f.x,f.y);if(s.owners[i]===id)return 'defend';if(p?.allies.includes(s.owners[i]))return 'invalid';return [...(s.attackPlans||[]),...(s.recoveryPlans||[])].some(q=>q.owner===id&&q.zoneCells?.includes(i))?'attack':'invalid';}
function constructionTime(kind){return {city:35,barracks:30,fort:25}[kind]||20;}
function upgradeTime(b){return 30*2**Math.max(0,b.level-1);}
const fortIntel=new WeakMap();
function visibleBuilding(s,id,b){
 if(b.owner===id||person(s,id)?.allies.includes(b.owner))return true;
 let cache=fortIntel.get(s);if(!cache||cache.source!==s.buildings||cache.length!==s.buildings.length||cache.revision!==s.territoryRevision){cache={source:s.buildings,length:s.buildings.length,revision:s.territoryRevision,players:new Map()};fortIntel.set(s,cache);}
 let forts=cache.players.get(id);if(!forts){forts=s.buildings.filter(f=>f.owner===id&&f.kind==='fort'&&owner(s,f.x,f.y)===id);cache.players.set(id,forts);}
 return forts.some(f=>fortSees(s,f,b));
}
const strategyMaps=new WeakMap();
function strategicWeight(s,id,x,y){
 const p=person(s,id),key=[s.tick,s.territoryRevision,s.buildings.length,JSON.stringify(p?.armyFocus)].join(':');
 let cache=strategyMaps.get(s);if(!cache){cache=new Map();strategyMaps.set(s,cache);}
 let entry=cache.get(id);
 if(entry?.key!==key){const forts=s.buildings.filter(b=>b.owner===id&&b.kind==='fort'&&owner(s,b.x,b.y)===id);entry={key,buildings:s.buildings.filter(b=>(b.owner===id||p?.allies.includes(b.owner))||forts.some(f=>fortSees(s,f,b))),values:new Map(),focusValid:focusStatus(s,id)!=='invalid'};cache.set(id,entry);}
 const cell=idx(x,y);if(entry.values.has(cell))return entry.values.get(cell);
 let weight=1;
 for(const b of entry.buildings){const d=Math.abs(b.x-x)+Math.abs(b.y-y);
  if(d<=12)weight+=({city:5,barracks:4,fort:3}[b.kind]||2)*(b.level||1)*(1-d/13);
 }
 const f=p?.armyFocus;if(f&&entry.focusValid){const d=Math.abs(f.x-x)+Math.abs(f.y-y);weight+=1000/(1+d/5);}
 entry.values.set(cell,weight);return weight;
}
function reserveShare(p){return p?.armyPosture==='aggressive'?.2:p?.armyPosture==='defensive'?.6:.35;}
function defensePosts(s,p){
 const bases=homeSites(s,p.id),posts=[];
 // Keep a real home reserve even during war. Safe neighbours are not threats.
 if(bases[0])posts.push({x:bases[0].x,y:bases[0].y,weight:3,role:'Reserve'});
 const candidates=[];
 if(p.armyFocus&&owner(s,p.armyFocus.x,p.armyFocus.y)===p.id)posts.push({...p.armyFocus,weight:30,role:'Priority defense'});
 if(p.defendPriority&&owner(s,p.defendPriority.x,p.defendPriority.y)===p.id)posts.push({...p.defendPriority,weight:8,role:'Priority defense'});
 // A painted wave's midpoint may be on the other side of the country.
 // Track physical hostile columns once per deployment update instead.
 const threats=[];
 for(const a of s.armies){
  if(a.owner===p.id||p.allies.includes(a.owner)||!(s.wars||[]).includes(warKey(p.id,a.owner)))continue;
  for(const c of a.columns?.length?a.columns:[{x:a.x??a.tx,y:a.y??a.ty,strength:a.strength}])
   if(c.strength>0&&Number.isFinite(c.x)&&Number.isFinite(c.y))threats.push(c);
 }
 for(const b of borders(s,p.id)){
  const i=idx(b.x,b.y),enemies=adjacentCells(i).map(j=>s.owners[j]).filter(id=>id&&id!==p.id&&!p.allies.includes(id)&&(s.wars||[]).includes(warKey(p.id,id)));
  if(!enemies.length)continue;
  let weight=2+strategicWeight(s,p.id,b.x,b.y)*.25;
  for(const c of threats){const d=near(b,c);
   if(d<=12)weight+=Math.min(40,Math.sqrt(c.strength/25))*Math.pow(1-d/13,2);
  }
  if(s.buildings.some(base=>base.owner===p.id&&base.kind==='city'&&near(base,b)<=8))weight+=2;
  if(s.buildings.some(base=>base.owner===p.id&&base.kind==='fort'&&near(base,b)<=4))weight+=1;
  candidates.push({...b,weight,role:'Guard'});
 }
 if(candidates.length&&bases.length){
  const distances=new Map(bases.map(b=>[b,candidates.reduce((n,t)=>Math.min(n,near(b,t)),Infinity)]));
  const safe=[...bases].sort((a,b)=>distances.get(b)-distances.get(a)||a.y-b.y||a.x-b.x)[0];
  posts[0]={x:safe.x,y:safe.y,weight:3,role:'Reserve'};
 }
 candidates.sort((a,b)=>b.weight-a.weight||a.y-b.y||a.x-b.x);
 for(const c of candidates){if(posts.filter(p=>p.role==='Guard').length>=5)break;
  if(posts.some(p=>p.role==='Guard'&&near(p,c)<10))continue;
  posts.push(c);
 }
 const important=bases.map(b=>({...b,weight:strategicWeight(s,p.id,b.x,b.y),role:'Garrison'})).sort((a,b)=>b.weight-a.weight);
 for(const b of important){if(posts.length>=10)break;if(!posts.some(t=>near(t,b)<5))posts.push(b);}
 const priority=posts.find(t=>t.role==='Priority defense');if(priority)priority.weight=Math.max(priority.weight,posts.filter(t=>t!==priority).reduce((n,t)=>n+t.weight,0)*2);
 return posts;
}
function spatialArmyStep(s,move=true){
 for(const p of s.players){
  if(!alive(p))continue;coalesceGarrisons(p);syncGarrisons(s,p);
  // A captured position retreats one adjacent friendly tile; encircled squads
  // are lost. This cannot jump across hostile territory to another province.
  for(const g of p.garrisons)if(s.owners[idx(g.x,g.y)]!==p.id){
   const exit=adjacentCells(idx(g.x,g.y)).find(i=>s.tiles[i]&&s.owners[i]===p.id);
   if(exit===undefined){p.troops=Math.max(0,p.troops-g.strength);g.strength=0;}
   else{g.x=exit%W;g.y=(exit/W)|0;delete g.route;}
  }
  p.garrisons=p.garrisons.filter(g=>g.strength>1e-7);
  const camps=s.buildings.filter(b=>b.owner===p.id&&b.kind==='barracks'&&owner(s,b.x,b.y)===p.id);
  const campSize=Math.min(35,p.troops*.08/Math.max(1,camps.length));
  const campComponents=ownedComponents(s,p.id);
  for(const b of camps){
   if(p.garrisons.some(g=>g.camp===idx(b.x,b.y)))continue;
   const source=p.garrisons.filter(g=>g.camp===undefined&&!g.returning&&g.strength>campSize*2&&campComponents[idx(g.x,g.y)]===campComponents[idx(b.x,b.y)]).sort((u,v)=>near(u,b)-near(v,b))[0];
   if(source&&campSize>1){source.strength-=campSize;p.garrisons.push({id:'g'+(++s.nonce),x:source.x,y:source.y,strength:campSize,returning:false,camp:idx(b.x,b.y)});}
  }
  for(const g of p.garrisons)if(g.camp!==undefined&&!camps.some(b=>idx(b.x,b.y)===g.camp))delete g.camp;
  const posts=defensePosts(s,p),weight=posts.reduce((n,t)=>n+t.weight,0);if(!posts.length)continue;
  // Bounded groups, not hundreds of individual pathfinders. Split in place.
  const chunk=Math.max(35,p.troops/8);
  for(const g of [...p.garrisons])while(!g.returning&&g.strength>chunk*1.5&&p.garrisons.length<12){
   g.strength-=chunk;p.garrisons.push({id:'g'+(++s.nonce),x:g.x,y:g.y,strength:chunk,returning:false});
  }
  const assigned=new Array(posts.length).fill(0),components=ownedComponents(s,p.id);
  const bases=homeSites(s,p.id);
  for(const g of [...p.garrisons].sort((a,b)=>b.strength-a.strength||a.id.localeCompare(b.id))){
   let target=null;
   if(g.camp!==undefined){target={x:g.camp%W,y:(g.camp/W)|0,role:'Camp guard'};}else if(g.returning){
    const component=components[idx(g.x,g.y)];
    target=bases.filter(b=>component&&components[idx(b.x,b.y)]===component).sort((a,b)=>near(g,a)-near(g,b))[0];
   }else{
    const choices=posts.map((t,i)=>({t,i,score:(assigned[i]+g.strength*.5)/Math.max(1,p.troops*t.weight/weight)+near(g,t)*.002})).sort((a,b)=>a.score-b.score||a.i-b.i);
    const component=components[idx(g.x,g.y)];
    const choice=choices.find(c=>component&&components[idx(c.t.x,c.t.y)]===component);
    if(choice){target=choice.t;assigned[choice.i]+=g.strength;}
   }
   if(!target){g.role=g.returning?'Returning · blocked':'Isolated';continue;}
   g.role=g.returning?'Returning':target.role;g.tx=target.x;g.ty=target.y;
   const destination=idx(target.x,target.y),current=idx(g.x,g.y);
   if(current===destination)g.route=[];
   else{
    if(!g.route?.length||g.route[g.route.length-1]!==destination||s.owners[g.route[0]]!==p.id)
     g.route=localRoute(s,p.id,current,destination);
    const next=move?g.route?.shift():undefined;if(next!==undefined){g.x=next%W;g.y=(next/W)|0;}
   }
   if(g.returning&&g.x===target.x&&g.y===target.y){g.returning=false;g.role='Garrison';}
  }
  // Keep squad identities stable. Merging and re-splitting every tick would
  // continually reassign destinations and make troops oscillate in place.
  p.garrisons=p.garrisons.filter(g=>g.strength>1e-7);
 }
}

const sectorMaps=new WeakMap();
// A small sector is a local piece of frontier, not a country-wide army pool.

const armyComponents=new WeakMap();
function ownedComponents(s,id){
 let cache=armyComponents.get(s);
 if(cache?.revision===s.territoryRevision)return cache.labels;
 const labels=new Int32Array(W*H),queue=new Int32Array(W*H);let component=0;
 for(let i=0;i<labels.length;i++)if(!labels[i]&&s.tiles[i]&&s.owners[i]){
  let head=0,tail=1;queue[0]=i;labels[i]=++component;const nation=s.owners[i];
  while(head<tail){const v=queue[head++],x=v%W;
   for(let d=0;d<4;d++){const j=d===0?(x?v-1:-1):d===1?(x<W-1?v+1:-1):d===2?v-W:v+W;
    if(j>=0&&j<W*H&&!labels[j]&&s.tiles[j]&&s.owners[j]===nation){labels[j]=component;queue[tail++]=j;}
   }
  }
 }
 armyComponents.set(s,{revision:s.territoryRevision,labels});return labels;
}

function frontSectors(s,id,front){
 const components=ownedComponents(s,id),groups=new Map();
 for(const i of front){
  const anchor=adjacentCells(i).find(j=>s.tiles[j]&&s.owners[j]===id);
  if(anchor===undefined)continue;
  const key=Math.floor((i%W)/4)+':'+Math.floor(((i/W)|0)/4)+':'+components[anchor];
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push({i,anchor});
 }
 const result=[];
 for(const [key,members] of groups){
  const mx=members.reduce((n,e)=>n+e.i%W,0)/members.length,my=members.reduce((n,e)=>n+((e.i/W)|0),0)/members.length;
  members.sort((a,b)=>Math.abs(a.anchor%W-mx)+Math.abs(((a.anchor/W)|0)-my)-Math.abs(b.anchor%W-mx)-Math.abs(((b.anchor/W)|0)-my)||a.i-b.i);
  const anchor=members[0].anchor,cells=members.map(e=>e.i),plan={owner:id};
  const cost=cells.reduce((n,i)=>n+planTileCost(s,plan,i),0);
  result.push({key,anchor,cells,required:Math.max(cells.some(i=>s.tiles[i]===6)?10:0,Math.ceil(cost*1000)/1000)});
 }
 return result;
}
const localRouteCache=new WeakMap();
function localRoute(s,id,source,destination){
 if(source===destination)return [];
 const distance=Math.abs(source%W-destination%W)+Math.abs(((source/W)|0)-((destination/W)|0));
 if(distance===1&&s.owners[source]===id&&s.owners[destination]===id&&s.tiles[destination])return [destination];
 if((s.roads?.length||0)>=4){
  let cache=localRouteCache.get(s);
  if(!cache||cache.revision!==s.territoryRevision||cache.roads!==s.roads||cache.count!==s.roads.length){cache={revision:s.territoryRevision,roads:s.roads,count:s.roads.length,paths:new Map()};localRouteCache.set(s,cache);}
  const key=id+':'+source+':'+destination;
  if(!cache.paths.has(key)){if(cache.paths.size>=256)cache.paths.clear();cache.paths.set(key,roadRoute(s,id,source,destination));}
  const route=cache.paths.get(key);return route?route.slice():null;
 }
 // Most front movement is a few friendly cells; avoid a whole-map flood for it.
 for(const horizontalFirst of [true,false]){
  let x=source%W,y=(source/W)|0;const tx=destination%W,ty=(destination/W)|0,route=[];let valid=true;
  while(x!==tx||y!==ty){
   if(horizontalFirst?x!==tx:y===ty)x+=Math.sign(tx-x);else y+=Math.sign(ty-y);
   const i=idx(x,y);if(!s.tiles[i]||s.owners[i]!==id){valid=false;break;}route.push(i);
  }
  if(valid)return route;
 }
 return fieldRoute(marchField(s,id,destination),source,destination);
}
function attackSector(a,i){
 let cache=sectorMaps.get(a);
 if(!cache||cache.sectors!==a.sectors){
  cache={sectors:a.sectors,map:new Map()};
  for(const sector of a.sectors||[])for(const cell of sector.cells)cache.map.set(cell,sector);
  sectorMaps.set(a,cache);
 }
 return cache.map.get(i);
}
const localStrengthCache=new WeakMap();
function localAttackStrength(a,i){
 const sector=attackSector(a,i);if(!sector||near({x:sector.anchor%W,y:(sector.anchor/W)|0},{x:i%W,y:(i/W)|0})>7)return 0;
 let cache=localStrengthCache.get(a);
 if(!cache||cache.columns!==a.columns){
  const strengths=new Map();
  for(const c of a.columns||[])if(!c.route?.length&&c.x===c.tx&&c.y===c.ty)
   strengths.set(c.sector,(strengths.get(c.sector)||0)+Math.max(0,c.strength));
  cache={columns:a.columns,strengths};localStrengthCache.set(a,cache);
 }
 return cache.strengths.get(sector.key)||0;
}
function spendAttack(a,i,amount){
 const sector=attackSector(a,i);let left=amount;
 for(const c of a.columns||[]){
  if(c.sector!==sector?.key||c.route?.length||near(c,{x:i%W,y:(i/W)|0})>7)continue;
  const n=Math.min(left,c.strength);c.strength-=n;left-=n;if(left<1e-7)break;
 }
 a.strength=Math.max(0,a.strength-amount);localStrengthCache.delete(a);
}
function frontDeployment(a){
 const sectors=a.sectors||[];
 return {sectors:sectors.length,ready:sectors.filter(t=>localAttackStrength(a,t.cells[0])+1e-7>=t.required).length};
}

function positionAttack(s,a,front,partial=false){
 let units=(a.columns?.length?a.columns:[{x:a.x,y:a.y,strength:a.strength}]).filter(c=>c.strength>1e-7);
 const sum=units.reduce((n,c)=>n+c.strength,0);
 if(Math.abs(sum-a.strength)>1e-7)units=units.map(c=>({...c,strength:c.strength*a.strength/Math.max(1e-7,sum)}));
 const signature=front.join(',')+':'+JSON.stringify(person(s,a.owner)?.armyFocus);
 if(a.frontSignature===signature&&a.columns?.length){a.columns=units;return true;}
 const established=!!a.sectors?.length,committed=new Set((a.columns||[]).filter(c=>c.strength>0).map(c=>c.sector)),combined=new Map();
 for(const c of units){const key=idx(c.x,c.y),g=combined.get(key);if(g)g.strength+=c.strength;else combined.set(key,{x:c.x,y:c.y,strength:c.strength});}
 units=[...combined.values()];
 const sectors=frontSectors(s,a.owner,front),components=ownedComponents(s,a.owner);
 const distances=new Map();
 const distance=t=>{if(!distances.has(t)){let best=Infinity;for(const c of units)if(components[idx(c.x,c.y)]===components[t.anchor])best=Math.min(best,Math.abs(c.x-t.anchor%W)+Math.abs(c.y-((t.anchor/W)|0)));distances.set(t,best);}return distances.get(t);};
 const reachable=sectors.filter(t=>units.some(c=>components[idx(c.x,c.y)]&&components[idx(c.x,c.y)]===components[t.anchor]))
  .sort((u,v)=>distance(u)+Math.log2(1+u.required)*2-Math.log2(strategicWeight(s,a.owner,u.anchor%W,(u.anchor/W)|0))*3-distance(v)-Math.log2(1+v.required)*2+Math.log2(strategicWeight(s,a.owner,v.anchor%W,(v.anchor/W)|0))*3);
 if(!reachable.length||!partial&&reachable.length!==sectors.length)return false;
 const sources=units.map(c=>({...c})),columns=[],componentStrength=new Map(),componentNeed=new Map();
 for(const c of sources){const k=components[idx(c.x,c.y)];componentStrength.set(k,(componentStrength.get(k)||0)+c.strength);}
 for(const t of reachable){const k=components[t.anchor];componentNeed.set(k,(componentNeed.get(k)||0)+t.required);}
 const candidatesFor=t=>sources.filter(c=>c.strength>1e-7&&components[idx(c.x,c.y)]===components[t.anchor])
  .sort((a,b)=>near(a,{x:t.anchor%W,y:(t.anchor/W)|0})-near(b,{x:t.anchor%W,y:(t.anchor/W)|0}));
 const assign=(c,t,n)=>{
  if(n<=1e-7)return;
  const route=localRoute(s,a.owner,idx(c.x,c.y),t.anchor);if(!route)return;
  columns.push({x:c.x,y:c.y,strength:n,sector:t.key,tx:t.anchor%W,ty:(t.anchor/W)|0,route});c.strength-=n;
 };
 for(const sector of reachable){
  const component=components[sector.anchor],total=componentStrength.get(component)||0,need=componentNeed.get(component)||1;
  // First deployment spreads the committed force. Later layers only cover
  // local minimums; the rest stays near its existing position.
  if(established&&distance(sector)>8&&!committed.has(sector.key))continue;
  let left=sector.required*(established?1:3);
  for(const c of candidatesFor(sector)){const n=Math.min(left,c.strength);assign(c,sector,n);left-=n;if(left<1e-7)break;}
 }
 for(const c of sources)if(c.strength>1e-7){
  const closest=reachable.filter(t=>components[t.anchor]===components[idx(c.x,c.y)])
   .sort((u,v)=>near(c,{x:u.anchor%W,y:(u.anchor/W)|0})-Math.log2(strategicWeight(s,a.owner,u.anchor%W,(u.anchor/W)|0))*8-near(c,{x:v.anchor%W,y:(v.anchor/W)|0})+Math.log2(strategicWeight(s,a.owner,v.anchor%W,(v.anchor/W)|0))*8)[0];
  if(closest)assign(c,closest,c.strength);
 }
 a.columns=columns;a.sectors=reachable;a.frontSignature=signature;sectorMaps.delete(a);return !!columns.length;
}
function mobilize(s,p,strength,src,front,partial=false){
 syncGarrisons(s,p);
 const sectors=frontSectors(s,p.id,front),components=ownedComponents(s,p.id),connected=new Set(sectors.map(t=>components[t.anchor]));
 const eligible=p.garrisons.filter(g=>!g.returning&&g.strength>1e-7&&components[idx(g.x,g.y)]&&connected.has(components[idx(g.x,g.y)]));
 const protectedSquads=p.garrisons.filter(g=>!g.returning&&g.role==='Priority defense'),protectedTotal=protectedSquads.reduce((n,g)=>n+g.strength,0),protectedBudget=Math.min(protectedTotal,militaryStrength(s,p.id).total*.15);
 const camps=s.buildings.filter(b=>b.owner===p.id&&b.kind==='barracks'&&owner(s,b.x,b.y)===p.id);
 const campFloor=Math.min(militaryStrength(s,p.id).total*.1/Math.max(1,camps.length),100);
 const campProtected=new Map();
 for(const b of camps){let left=campFloor;for(const g of p.garrisons)if(g.x===b.x&&g.y===b.y){const n=Math.min(g.strength,left);campProtected.set(g,(campProtected.get(g)||0)+n);left-=n;if(left<=0)break;}}
 const usable=g=>g.camp!==undefined?0:Math.max(0,g.strength-(campProtected.get(g)||0)-(protectedTotal&&g.role==='Priority defense'?protectedBudget*g.strength/protectedTotal:0));

 // Take nearby available soldiers first instead of requiring a small
 // contribution from every distant squad before the whole line can attack.
 const distance=g=>Math.min(...sectors.map(t=>near(g,{x:t.anchor%W,y:(t.anchor/W)|0})));
 eligible.sort((a,b)=>distance(a)-distance(b)||a.id.localeCompare(b.id));
 const accessible=eligible.reduce((n,g)=>n+usable(g),0);
 if(partial)strength=Math.min(strength,accessible);
 if(strength<35||accessible+1e-7<strength)return null;
 const drawn=[];let left=strength;
 for(const g of eligible){const n=Math.min(left,usable(g));if(n>1e-7)drawn.push({g,n});left-=n;if(left<1e-7)break;}
 const wave={owner:p.id,strength,columns:drawn.map(({g,n})=>({x:g.x,y:g.y,strength:n}))};
 if(!positionAttack(s,wave,front,partial))return null;
 for(const {g,n} of drawn)g.strength-=n;
 p.troops=Math.max(0,p.troops-strength);return wave;
}
function marchWave(s,a,p,front,partial=false){
 localStrengthCache.delete(a);
 for(const c of a.columns||[])if(c.strength>0&&s.owners[idx(c.x,c.y)]!==a.owner){
  const retreat=adjacentCells(idx(c.x,c.y)).find(i=>s.tiles[i]&&s.owners[i]===a.owner);
  if(retreat===undefined){a.strength=Math.max(0,a.strength-c.strength);c.strength=0;}
  else{c.x=retreat%W;c.y=(retreat/W)|0;}
  a.frontSignature=null;
 }
 if(!positionAttack(s,a,front,partial)){a.waitingForRoute=true;return true;}
 a.waitingForRoute=false;
 let moving=false;
 for(const c of a.columns){
  const destination=idx(c.tx,c.ty),current=idx(c.x,c.y);
  if(current===destination){c.route=[];continue;}
  if(!c.route?.length||s.owners[c.route[0]]!==a.owner){
   c.route=localRoute(s,a.owner,current,destination);
  }
  if(!c.route){c.blocked=true;a.waitingForRoute=true;moving=true;continue;}
  c.blocked=false;
  moveOnRoute(s,a.owner,c);moving=true;
 }
 const lead=a.columns.find(c=>c.strength>0);if(lead){a.x=lead.x;a.y=lead.y;}
 a.marching=moving;return moving&&!partial;
}
function tileDefense(s,id,x,y){let n=3;const defender=person(s,id);if(!defender)return n;
 // Defence comes from soldiers actually nearby, including moving reserves.
 const local=(defender.garrisons||[]).reduce((n,g)=>n+g.strength*Math.max(0,1-near(g,{x,y})/7),0);
 const deployed=s.armies.filter(a=>a.owner===id).reduce((n,a)=>n+(a.columns||[]).reduce((m,c)=>m+c.strength*Math.max(0,1-near(c,{x,y})/7),0),0);
 n+=(local+deployed)/25;
 n+=defender.tech.war*1.9;
 for(const b of s.buildings){if(b.owner!==id)continue;const d=Math.abs(b.x-x)+Math.abs(b.y-y);
  // No special capital-defense bonus.
  if(b.kind==='fort'&&d<=4)n+=Math.max(0,5-d)*b.level*3.7;
  if(b.kind==='city'&&d<=2)n+=b.level*4;
 }
 return n;
}
function capture(s,a,x,y){const old=owner(s,x,y),p=person(s,a.owner);if(old===a.owner)return true;if(tile(s,x,y)===0||tile(s,x,y)===6&&a.strength<10)return false;
 if(old&&p.allies.includes(old))return false;
 let cost=old?tileDefense(s,old,x,y)/(.95+.19*p.tech.war):tile(s,x,y)===6?8:tile(s,x,y)===3?4:2.8;
 cost*=1-.08*p.tech.logistics;
 if(localAttackStrength(a,idx(x,y))+1e-7<Math.max(tile(s,x,y)===6?10:0,cost))return false;spendAttack(a,idx(x,y),cost);
 if(old){const def=person(s,old);loseReserve(s,def,Math.max(0.8,cost*.43),x,y);}
 gainTile(s,x,y,p.id);a.captured=(a.captured||0)+1;
 const b=buildingAt(s,x,y);
 if(b&&b.owner!==p.id){b.owner=p.id;b.level=Math.max(1,b.level-1);}
 return true;
}
// Territorial-style front propagation: conquer COMPLETE BORDER LAYERS, not the
// single pixel that is nearest to the pointer. The tapped tile chooses which
// A chosen target selects a LOCAL theatre along the common border. The old
// algorithm enrolled every border cell nationwide, making one tap produce
// unrelated simultaneous captures far from the indicated location.
const SIDE=[1,-1,W,-W];
const warKey=(a,b)=>Math.min(a,b)+':'+Math.max(a,b);
function validateZone(s,id,targetOwner,request){
 if(request==null)return {cells:null}; // Legacy/AI commands can use border targeting.
 if(!Array.isArray(request)||request.length<2||request.length>W*H)return {error:'Paint a valid land area.'};
 const zone=new Set();for(const i of request){if(!Number.isInteger(i)||i<0||i>=W*H||!s.tiles[i]||s.owners[i]!==targetOwner||targetOwner===id)return {error:'The planned area must belong to one kingdom and be on land.'};zone.add(i);}
 if(zone.size<2)return {error:'Draw a larger area.'};
 const seeds=[];for(const i of zone){const x=i%W,y=(i/W)|0;for(const j of [x>0?i-1:-1,x<W-1?i+1:-1,y>0?i-W:-1,y<H-1?i+W:-1])if(j>=0&&s.owners[j]===id){seeds.push(i);break;}}
 if(!seeds.length)return {error:'The planned area must touch your border.'};
 const seen=new Set(seeds),queue=seeds.slice();for(let q=0;q<queue.length;q++){const i=queue[q],x=i%W,y=(i/W)|0;for(const j of [x>0?i-1:-1,x<W-1?i+1:-1,y>0?i-W:-1,y<H-1?i+W:-1])if(zone.has(j)&&!seen.has(j)){seen.add(j);queue.push(j);}}
 if(seen.size!==zone.size)return {error:'The attack zone must be connected to your border.'};
 return {cells:[...zone].sort((a,b)=>a-b)};
}
function borderCandidates(s,id,targetOwner){
 const found=new Set();
 for(const b of borders(s,id))for(const j of adjacentCells(idx(b.x,b.y)))if(s.tiles[j]&&s.owners[j]===targetOwner)found.add(j);
 return [...found];
}

function initialFront(s,id,tx,ty,targetOwner,allowed=null){
 const border=borderCandidates(s,id,targetOwner).filter(i=>!allowed||allowed.has(i));
 if(!border.length)return [];
 let center=border[0],best=Infinity;
 for(const i of border){const x=i%W,y=Math.floor(i/W);const d=(x-tx)*(x-tx)+(y-ty)*(y-ty);if(d<best){best=d;center=i;}}
 const cx=center%W,cy=Math.floor(center/W);
 // Ten cells of frontage (diameter), rather than a 1-cell snake or the entire map.
 const result=border.filter(i=>{const x=i%W,y=Math.floor(i/W);return(x-cx)*(x-cx)+(y-cy)*(y-cy)<=36;});
 return result.length?result:[center];
}
function previewFront(s,id,tx,ty){
 if(!inside(tx,ty)||!s.owners?.length)return {cells:[],targetOwner:0,kind:'none'};
 const targetOwner=owner(s,tx,ty);
 if(targetOwner===id)return {cells:[],targetOwner,kind:'own'};
 const cells=initialFront(s,id,tx,ty,targetOwner);
 return {cells,targetOwner,kind:targetOwner?'enemy':'neutral'};
}
function waveFront(s,a){
 let f=attackFronts.get(a);if(f)return f;
 const targetOwner=Number.isInteger(a.targetOwner)?a.targetOwner:owner(s,a.tx,a.ty);
 const allowed=Array.isArray(a.zoneCells)?new Set(a.zoneCells):null;
 f={targetOwner,allowed,candidates:new Set(initialFront(s,a.owner,a.tx,a.ty,targetOwner,allowed)),layers:0};
 attackFronts.set(a,f);return f;
}
function getOffensivePlan(s,id){
 return (s.attackPlans||[]).find(p=>p.id===id)||(s.recoveryPlans||[]).find(p=>p.id===id);
}
function cancelRecoveryPlan(s,plan){
 for(const wave of s.armies.filter(a=>a.planId===plan.id))finishWave(s,wave,person(s,wave.owner));
 s.armies=s.armies.filter(a=>a.planId!==plan.id);
 s.recoveryPlans=(s.recoveryPlans||[]).filter(p=>p!==plan);
}
function cancelOffensivePlan(s,plan){
 for(const a of s.armies)if(a.planId===plan.id)finishWave(s,a,person(s,a.owner));
 s.armies=s.armies.filter(a=>a.planId!==plan.id);
 s.attackPlans=(s.attackPlans||[]).filter(v=>v.id!==plan.id);
 s.recoveryPlans=(s.recoveryPlans||[]).filter(v=>v.id!==plan.id);
}

function planFrontier(s,plan){
 const p=person(s,plan.owner);if(!p)return [];
 const enabled=new Set((plan.autoRecovery?[plan.targetOwner]:(plan.targets??[plan.targetOwner])).filter(t=>t===0||!p.allies.includes(t)&&(s.wars||[]).includes(warKey(plan.owner,t))));
 if(!enabled.size)return [];
 const front=[];
 for(const i of plan.zoneCells){
  if(!s.tiles[i]||s.owners[i]===plan.owner||!enabled.has(s.owners[i]))continue;
  const x=i%W,y=(i/W)|0;
  if((x>0&&s.owners[i-1]===plan.owner)||(x<W-1&&s.owners[i+1]===plan.owner)||
    (y>0&&s.owners[i-W]===plan.owner)||(y<H-1&&s.owners[i+W]===plan.owner))front.push(i);
 }
 return front.sort((a,b)=>a-b);
}
function planTileCost(s,plan,i){
 const p=person(s,plan.owner),def=s.owners[i],kind=s.tiles[i];
 const raw=def?tileDefense(s,def,i%W,(i/W)|0)/(.95+.19*p.tech.war):kind===6?8:kind===3?4:2.8;
 return raw*(1-.08*p.tech.logistics);
}
// A soldier belongs to either the home reserve or one deployed wave.
function militaryStrength(s,id){
 const reserve=Math.max(0,person(s,id)?.troops||0);
 const deployed=s.armies.reduce((n,a)=>n+(a.owner===id?Math.max(0,a.strength):0),0);
 return {reserve,deployed,total:reserve+deployed};
}

const autoDemandCache=new WeakMap();
function automaticAllocation(s,plan){
 const p=person(s,plan.owner),force=militaryStrength(s,plan.owner);
 const plans=[...(s.attackPlans||[]),...(s.recoveryPlans||[])].filter(q=>q.owner===plan.owner);
 if(!plans.some(q=>q.id===plan.id))plans.push(plan);
 const home=(p?.garrisons||[]).filter(g=>!g.returning&&g.strength>0);
 const metadata=plans.map(q=>q.id+':'+!!q.autoRecovery+':'+!!q.focus+':'+q.allocationMode+':'+q.allocationValue+':'+(q.targets??[q.targetOwner]).join(',')).join('|')+'@'+(s.wars||[]).join(',')+'@'+(p?.allies||[]).join(',')+'@'+p?.tech.war+':'+p?.tech.logistics+':'+p?.armyPosture+':'+JSON.stringify(p?.armyFocus);
 let cache=autoDemandCache.get(s);if(!cache){cache=new Map();autoDemandCache.set(s,cache);}
 const saved=cache.get(plan.owner),valid=saved&&saved.tick===s.tick&&saved.revision===s.territoryRevision&&saved.home===p?.garrisons&&saved.metadata===metadata&&saved.zones.length===plans.length&&plans.every((q,i)=>q.zoneCells===saved.zones[i]);
 const demands=valid?saved.demands:[];
 if(!valid)for(const q of plans){
  const front=planFrontier(s,q);if(!front.length)continue;
  const sectors=frontSectors(s,q.owner,front),required=sectors.reduce((n,t)=>n+t.required,0);
  let distance=80;
  for(const g of home)for(const t of sectors)distance=Math.min(distance,near(g,{x:t.anchor%W,y:(t.anchor/W)|0}));
  const importance=Math.max(...sectors.map(t=>strategicWeight(s,q.owner,t.anchor%W,(t.anchor/W)|0)));
  const focusWeight=1+Math.log2(importance);
  const demand=q.allocationMode==='troops'?q.allocationValue:q.allocationMode==='percent'?force.total*q.allocationValue/100:Math.max(80,required*(6+Math.min(12,distance/3)))*focusWeight;
  demands.push({plan:q,required,distance,demand,weight:q.allocationMode&&q.allocationMode!=='auto'?demand:Math.sqrt(Math.max(1,required))*(q.autoRecovery?1:1.5)*focusWeight/(1+distance/60)});
 }
 if(!valid)cache.set(plan.owner,{tick:s.tick,revision:s.territoryRevision,home:p?.garrisons,metadata,zones:plans.map(q=>q.zoneCells),demands});
 const item=demands.find(d=>d.plan.id===plan.id);
 if(!item)return {available:0,target:0,required:0};
 const incoming=s.armies.filter(a=>a.owner!==plan.owner&&(s.wars||[]).includes(warKey(plan.owner,a.owner))&&a.targetOwner===plan.owner).reduce((n,a)=>n+a.strength,0);
 const reserveGoal=Math.min(force.total*.8,Math.max(force.total*reserveShare(p),incoming*.6));
 // Home reserve exists to answer an invasion. Ordinary offensives cannot
 // spend it, but recovery of recorded lost cells may use it, keeping 10% home.
 // Separate recovery shares prevent many painted orders starving defense.
 const pool=Math.max(0,force.total-(plan.autoRecovery?Math.min(reserveGoal,force.total*(reserveShare(p)/2)):reserveGoal));
 const competing=plan.autoRecovery?demands.filter(d=>d.plan.autoRecovery):demands;
 // Capped weighted sharing redistributes unused small-front shares. Explicit
 // requests use requested strength as weight, so oversubscription scales fairly.
 let remaining=pool,pending=competing.slice();const targets=new Map();
 while(pending.length){const weights=pending.reduce((n,d)=>n+d.weight,0),satisfied=pending.filter(d=>d.demand<=remaining*d.weight/Math.max(1e-7,weights));
  if(!satisfied.length){for(const d of pending)targets.set(d.plan.id,remaining*d.weight/Math.max(1e-7,weights));break;}
  for(const d of satisfied){targets.set(d.plan.id,d.demand);remaining=Math.max(0,remaining-d.demand);}
  pending=pending.filter(d=>!targets.has(d.plan.id));
 }
 const target=targets.get(plan.id)||0;
 const assigned=s.armies.reduce((n,a)=>n+(a.planId===plan.id?Math.max(0,a.strength):0),0);
 const squads=p?.garrisons||[],stationed=squads.reduce((n,g)=>n+g.strength,0),returning=squads.filter(g=>g.returning).reduce((n,g)=>n+g.strength,0);
 const available=force.reserve*(stationed?1-returning/stationed:1);
 return {available:Math.max(0,Math.floor(Math.min(available,pool-force.deployed,target-assigned))),target,required:item.required,distance:item.distance,reserveGoal};
}
function planAllocation(s,plan){return automaticAllocation(s,plan).available;}
function estimatePlanFront(s,plan){
 const cells=planFrontier(s,plan),sectors=frontSectors(s,plan.owner,cells);
 return {cells:cells.length,sectors:sectors.length,required:sectors.reduce((n,t)=>n+t.required,0),committed:planAllocation(s,plan)};
}
function advancePlannedWave(s,a,plan){
 const p=person(s,a.owner),front=planFrontier(s,plan);
 if(!front.length){finishWave(s,a,p);return;}
 a.awaitingReinforcements=false;
 if(marchWave(s,a,p,front,true))return;
 // Price the whole frontier against one snapshot, then capture all its tiles
 // as one atomic logical turn. Never accept a partially funded layer.
 const receipt=front.map(i=>({i,former:s.owners[i],cost:planTileCost(s,plan,i)}));
 let selected=receipt;
 let sum=receipt.reduce((t,c)=>t+c.cost,0);
 let required=Math.max(receipt.some(c=>s.tiles[c.i]===6)?10:0,Math.ceil(sum*1000)/1000);
 const sectorCosts=new Map();for(const r of receipt){const key=attackSector(a,r.i)?.key;sectorCosts.set(key,(sectorCosts.get(key)||0)+r.cost);}
 const unfunded=(a.sectors||[]).some(t=>localAttackStrength(a,t.cells[0])+1e-7<Math.max(t.cells.some(i=>s.tiles[i]===6)?10:0,sectorCosts.get(t.key)||0));
 {
  // Every drawn plan advances locally. Distant arrivals never gate ready sectors.
  // Defensive recovery may reclaim affordable portions. The normal offensive
  // still requires its complete frontier to expand atomically.
  const byCell=new Map(receipt.map(r=>[r.i,r]));
  const ordered=balancedLayer(front,s,s.tick).map(i=>byCell.get(i));
  selected=[];const budgets=new Map((a.sectors||[]).map(t=>[t.key,localAttackStrength(a,t.cells[0])]));
  for(const r of ordered){
   const price=Math.max(s.tiles[r.i]===6?10:0,Math.ceil(r.cost*1000)/1000);
   const sector=attackSector(a,r.i),key=sector?.key,budget=budgets.get(key)||0;
   if(!sector)continue;
   const sectorNeed=Math.max(sector?.cells.some(i=>s.tiles[i]===6)?10:0,sectorCosts.get(key)||0);
   if(!plan.autoRecovery&&(localAttackStrength(a,sector.cells[0])+1e-7<sectorNeed))continue;
   if(price>budget+1e-7)continue;
   selected.push(r);budgets.set(key,budget-r.cost);
  }
  if(!selected.length){if(a.marching)return;a.awaitingReinforcements=true;return;}
  sum=selected.reduce((t,c)=>t+c.cost,0);
  required=sum;
 }
 if(a.strength+1e-7<required){
  a.awaitingReinforcements=true;
  const attempt=front.join(',')+'@'+Math.ceil(required);
  if(a.strength>=required&&a.rebalanceAttempt!==attempt){a.frontSignature=null;a.rebalanceAttempt=attempt;}
  return;
 }
 for(const item of selected){
  spendAttack(a,item.i,item.cost);
  const x=item.i%W,y=(item.i/W)|0;
  if(item.former){
   const defender=person(s,item.former);
   if(defender)loseReserve(s,defender,Math.max(.8,item.cost*.43),x,y);
  }
  gainTile(s,x,y,p.id);a.captured=(a.captured||0)+1;
  const b=buildingAt(s,x,y);
  if(b&&b.owner!==p.id){b.owner=p.id;b.level=Math.max(1,b.level-1);}
 }
 const next=planFrontier(s,plan);
 a.frontCells=next;a.turns++;a.stuck=0;a.rebalanceAttempt=null;
 const lead=a.columns.find(c=>c.strength>0);if(lead){a.x=lead.x;a.y=lead.y;}
 if(!next.length||a.strength<3)finishWave(s,a,p);
}
function sendNextPlannedWave(s,plan){
 const p=person(s,plan.owner);if(!alive(p)||!p.land)return false;
 const front=planFrontier(s,plan);
 if(!front.length||s.armies.filter(a=>a.owner===plan.owner).length>=12)return false;
 const estimated=estimatePlanFront(s,plan);
 let strength=estimated.committed;
 const minimum=35;
 if(strength<minimum)return false;
 const first=front[(front.length/2)|0],tx=first%W,ty=(first/W)|0;
 const src=nearestBorderLand(s,plan.owner,tx,ty);if(!src)return false;
 const deployment=mobilize(s,p,strength,src,front,true);if(!deployment)return false;
 const {columns,sectors,frontSignature}=deployment;strength=deployment.strength;
 s.armies.push({id:'a'+(++s.nonce),owner:plan.owner,x:columns[0].x,y:columns[0].y,ox:columns[0].x,oy:columns[0].y,tx,ty,
  targetOwner:s.owners[first],planId:plan.id,zoneCells:plan.zoneCells,frontCells:front,columns,sectors,frontSignature,marching:columns.some(c=>c.route.length),
  strength,initialStrength:strength,captured:0,turns:0,stuck:0});
 plan.waves++;plan.nextWaveTick=s.tick+4;
 log(s,'Full-front reinforcements launched for '+p.name+' offensive.');
 return true;
}
// Existing v56 solo saves stored painted zones only on their current army.
function adoptLegacyOffensives(s){
 s.attackPlans??=[];
 for(const a of s.armies){
  if(!Array.isArray(a.zoneCells)||a.planId||a.strength<=0||person(s,a.owner)?.bot)continue;
  const p=person(s,a.owner);if(!alive(p))continue;
  const original=a.initialStrength||a.strength;
  const estimated=clamp(Math.round(original/Math.max(1,original+p.troops)*100),5,95);
  const plan={id:'p'+(++s.nonce),owner:a.owner,targetOwner:a.targetOwner,targets:[a.targetOwner],zoneCells:a.zoneCells,percent:estimated,initialStrength:original,waves:1,nextWaveTick:s.tick+4};
  a.planId=plan.id;s.attackPlans.push(plan);
 }
}

function reinforcePlannedWave(s,plan,a){
 const front=planFrontier(s,plan);if(!front.length)return false;
 const allocation=automaticAllocation(s,plan),amount=allocation.available;
 if(!a.awaitingReinforcements&&!a.waitingForRoute&&a.strength>=allocation.target*.65)return false;
 if(amount<35)return false;
 const p=person(s,plan.owner),i=front[(front.length/2)|0],src=nearestBorderLand(s,plan.owner,i%W,(i/W)|0);
 if(!src)return false;
 const extra=mobilize(s,p,amount,src,front,true);if(!extra)return false;
 a.columns??=[];a.columns.push(...extra.columns);a.strength+=extra.strength;
 a.initialStrength=(a.initialStrength||0)+extra.strength;a.reinforced=(a.reinforced||0)+extra.strength;
 a.frontSignature=null;localStrengthCache.delete(a);return true;
}
function advanceOffensivePlans(s){
 for(const plan of [...(s.attackPlans||[]),...(s.recoveryPlans||[])]){
  const recovering=!!plan.autoRecovery;
  if(recovering&&(!(s.wars||[]).includes(warKey(plan.owner,plan.targetOwner))||
     person(s,plan.owner)?.allies.includes(plan.targetOwner))){cancelRecoveryPlan(s,plan);continue;}
  if(recovering){
   plan.zoneCells=plan.zoneCells.filter(i=>s.tiles[i]&&s.owners[i]===plan.targetOwner);
   if(!plan.zoneCells.length){cancelRecoveryPlan(s,plan);continue;}
  }
  const p=person(s,plan.owner);
  if(!alive(p)||!p.land){if(recovering)cancelRecoveryPlan(s,plan);else cancelOffensivePlan(s,plan);continue;}
  plan.targets??=[plan.targetOwner];
  // Revoked alliance/peace targets cannot be attacked by future waves.
  plan.targets=plan.targets.filter(t=>t===0||!p.allies.includes(t)&&(s.wars||[]).includes(warKey(plan.owner,t)));
  if(plan.zoneCells.every(i=>s.tiles[i]&&s.owners[i]===plan.owner)){if(recovering)cancelRecoveryPlan(s,plan);else cancelOffensivePlan(s,plan);continue;}
  const active=s.armies.find(a=>a.planId===plan.id&&(a.strength>=8||a.awaitingReinforcements||a.waitingForRoute));
  if(active){reinforcePlannedWave(s,plan,active);continue;}
  if(s.tick<(plan.nextWaveTick||0))continue;
  sendNextPlannedWave(s,plan);
 }
}
function finishWave(s,a,p){
 if(p&&!p.eliminated&&a.strength>0){
  syncGarrisons(s,p);const refund=Math.floor(a.strength*.96);
  const columns=a.columns?.length?a.columns:[{x:a.x,y:a.y,strength:a.strength}];
  const total=columns.reduce((n,c)=>n+c.strength,0);
  for(const c of columns)reserveSquad(s,p,c.x,c.y,refund*c.strength/Math.max(1e-7,total),true);
  p.troops+=refund;
 }
 a.strength=0;a.frontCells=[];a.awaitingReinforcements=false;a.waitingForRoute=false;attackFronts.delete(a);
 const plan=getOffensivePlan(s,a.planId);
 if(plan)plan.nextWaveTick=Math.max(plan.nextWaveTick||0,s.tick+4);
}
// Distribute any *partially funded* final layer across the whole frontage, not
// in a sequential snake at one end. Ordered buckets cover 16 angular sectors.
function balancedLayer(cells,s,step){
 let sx=0,sy=0;
 for(const i of cells){sx+=i%W;sy+=Math.floor(i/W);}
 const cx=sx/Math.max(1,cells.length),cy=sy/Math.max(1,cells.length);
 const buckets=Array.from({length:16},()=>[]);
 for(const i of cells){
  const x=i%W,y=Math.floor(i/W),ang=Math.atan2(y-cy,x-cx);
  const sector=Math.min(15,Math.floor((ang+Math.PI)/(Math.PI*2)*16));
  buckets[sector].push(i);
 }
 for(const b of buckets)b.sort((a,b)=>hash(a%W,Math.floor(a/W),s.seed+step)-hash(b%W,Math.floor(b/W),s.seed+step));
 const order=[],cursor=new Array(16).fill(0);
 let left=cells.length;
 while(left){for(let k=0;k<16;k++){
  const b=buckets[(k+step)%16],i=cursor[(k+step)%16]++;
  if(i<b.length){order.push(b[i]);left--;}
 }}
 return order;
}
function advance(s,a){
 const p=person(s,a.owner);if(a.strength<8){finishWave(s,a,p);return;}if(!alive(p)){a.strength=0;a.frontCells=[];attackFronts.delete(a);return;}
 const f=waveFront(s,a);
 const plan=getOffensivePlan(s,a.planId);
 if(plan){advancePlannedWave(s,a,plan);return;}
 // Alliances or a completed conquest can invalidate a target while in flight.
 if(f.targetOwner&&p.allies.includes(f.targetOwner)){finishWave(s,a,p);return;}
 const layer=[...f.candidates].filter(i=>s.tiles[i]&&s.owners[i]===f.targetOwner&&(!f.allowed||f.allowed.has(i)));
 if(layer.length&&marchWave(s,a,p,layer))return;
 f.candidates.clear();
 if(!layer.length||a.strength<3){finishWave(s,a,p);return;}
 let gained=0,point=null,pointDist=Infinity;
 for(const i of balancedLayer(layer,s,f.layers++)){
  if(s.owners[i]!==f.targetOwner)continue;
  const x=i%W,y=Math.floor(i/W);
  if(!capture(s,a,x,y)){
   // An expensive stronghold can be attempted next layer if enough troops remain.
   f.candidates.add(i);
   continue;
  }
  gained++;
  const dist=Math.hypot(x-a.tx,y-a.ty);
  if(dist<pointDist){pointDist=dist;point={x,y};}
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
   const nx=x+dx,ny=y+dy;if(!inside(nx,ny))continue;
   const j=idx(nx,ny);
   if(s.tiles[j]&&s.owners[j]===f.targetOwner&&(!f.allowed||f.allowed.has(j)))f.candidates.add(j);
  }
 }
 const lead=a.columns?.find(c=>c.strength>0);if(lead){a.x=lead.x;a.y=lead.y;}
 a.frontCells=[...f.candidates].filter(i=>s.tiles[i]&&s.owners[i]===f.targetOwner&&(!f.allowed||f.allowed.has(i)));
 // After a finished complete layer, remaining candidates form the NEXT layer.
 // An attack continues while its committed troops can pay for that next layer.
 a.turns++;a.stuck=gained?0:a.stuck+1;
 if(a.strength<3||a.stuck>=3||a.turns>140||!f.candidates.size)finishWave(s,a,p);
}
function counts(s,id){const stats={farm:0,lumber:0,quarry:0,mine:0,barracks:0,fort:0,city:0};for(const b of s.buildings)if(b.owner===id&&stats[b.kind]!==undefined)stats[b.kind]+=b.level;return stats;}
function resourceCapacity(s,id){return Math.max(0,Math.floor((person(s,id)?.land||0)*STORAGE_PER_CELL));}
function clampStorage(s,p){const cap=resourceCapacity(s,p.id);for(const k of Object.keys(p.res))p.res[k]=Math.min(cap,p.res[k]);}
function income(s,p){const c=counts(s,p.id),l=p.land,e=1+p.tech.economy*.25;
 const income={food:Math.round((2+l/100+c.farm*8+c.city*5+(p.workIncome?.food||0))*e),wood:Math.round((1+l/180+c.lumber*7+(p.workIncome?.wood||0))*e),stone:Math.round((1+l/200+c.quarry*7+(p.workIncome?.stone||0))*e),gold:Math.round((1+l/220+c.mine*7+c.city*5+(p.workIncome?.gold||0))*e)};
 for(const k of Object.keys(income))p.res[k]=Math.min(resourceCapacity(s,p.id),p.res[k]+income[k]);
 p.troopCap=Math.floor(900+l*2.4+c.barracks*430+c.city*260);
 const potential=Math.round(4+l/100+c.barracks*5+c.city*3+p.tech.war*2),room=Math.max(0,p.troopCap-militaryStrength(s,p.id).total),newTroops=Math.max(0,Math.min(room,potential));const supply=Math.max(0,Math.min(newTroops,Math.floor(p.res.food/0.20)));
 p.recruitment={potential,actual:supply,reason:room===0?'Army capacity reached':supply<newTroops?'Food limits recruitment':room<potential?'Army capacity limits recruitment':'Recruiting',foodPerTroop:.2};p.troopIncome=supply;p.troops+=supply;p.res.food=Math.max(0,p.res.food-Math.ceil(supply*.20));p.income=income;
}
function bot(s,id){const p=person(s,id);if(!alive(p)||s.phase!=='playing')return;
 if(s.tick%4===id%4){
  const bases=s.buildings.filter(b=>b.owner===id);if(bases.length<14){
    const preferences=['barracks','city','fort'];const kind=preferences[Math.floor((s.tick/4+id)%preferences.length)];
    const cx=p.capital.x,cy=p.capital.y;for(let n=0;n<35;n++){
      const x=clamp(cx+Math.round((hash(n,s.tick,id)-.5)*30),0,W-1),y=clamp(cy+Math.round((hash(s.tick,n,id)-.5)*27),0,H-1);
      if(!KINDS[kind].income&&!canBuild(s,id,kind,x,y)){action(s,id,{type:'queueBuild',kind,x,y});break;}
    }
  }
  if(p.troops>130&&s.armies.filter(a=>a.owner===id).length<5){
   // Bot attacks must follow actual shared borders. Sampling distant map points
   // frequently produced illegal orders after the layer-based engine rewrite.
   const active=new Set(s.armies.filter(a=>a.owner===id).map(a=>a.targetOwner));
   const targets=new Map();
   for(const b of borders(s,id)){
    const i=idx(b.x,b.y);
    for(const d of SIDE){
     const j=i+d,x=j%W,y=(j/W)|0,foe=s.owners[j];
     if(!s.tiles[j]||foe===id||p.allies.includes(foe)||active.has(foe))continue;
     const score=(foe===0?0:12+(person(s,foe)?.troops||0)/Math.max(1,p.troops)*30)-Math.log2(strategicWeight(s,id,x,y))*4;
     if(!targets.has(foe)||score+hash(x,y,s.seed)*.05<targets.get(foe).score){
      targets.set(foe,{x,y,score:score+hash(x,y,s.seed)*.05});
     }
    }
   }
   const options=[...targets.values()].sort((a,b)=>a.score-b.score);
   if(options.length)action(s,id,{type:'send',x:options[0].x,y:options[0].y,percent:clamp(23+hash(id,s.tick,s.seed)*25,15,55)});

  }
 }
 if(s.tick%38===id%38){const choices=['economy','war','logistics'];action(s,id,{type:'research',key:choices[(Math.floor(s.tick/38)+id)%3]});}
}
function checkWin(s){
 if(s.phase!=='playing')return;
 // Only full ownership wins. No time-based leader, and the last survivor still
 // has to settle all remaining neutral territory.
 const winner=s.players.find(p=>alive(p)&&p.land===s.landTotal);
 if(winner){s.phase='ended';s.winner=winner.id;log(s,winner.name+' controls 100% of the land and wins!');}
}
function combatStep(s){if(s.phase!=='playing')return;
 // Reserves travel on the same combat clock as attacking columns. Reuse
 // routes computed by spatialArmyStep; no new pathfinding in substeps.
 for(const p of s.players)for(const g of p.garrisons||[]){
  moveOnRoute(s,p.id,g);
 }

 for(const p of s.players)if(alive(p))syncGarrisons(s,p);
 for(const a of [...s.armies])if(a.strength>0)advance(s,a);
 s.armies=s.armies.filter(a=>a.strength>=8||a.awaitingReinforcements||a.waitingForRoute);
}
// Upgrade old saved matches without deleting the player's spawn anchor.
function normalizeBuildingRules(s){
 if(!s?.buildings)return;
 for(const b of s.buildings){
  if(b.kind==='capital')b.kind='city';
  b.level=clamp(Math.floor(b.level||1),1,MAX_BUILDING_LEVEL);
  if(b.upgrade?.level>MAX_BUILDING_LEVEL)delete b.upgrade;
 }
 s.buildJobs=(s.buildJobs||[]).filter(j=>!j.upgradeOf||j.targetLevel<=MAX_BUILDING_LEVEL);
}
function tick(s){if(s.phase!=='playing')return;normalizeBuildingRules(s);s.tick++;
 adoptLegacyOffensives(s);
 workforceStep(s);
 for(const p of s.players){if(!alive(p))continue;income(s,p);}
 spatialArmyStep(s,false);
 combatStep(s);
 for(const p of s.players){if(!p.eliminated&&p.land<=0){p.eliminated=true;p.troops=0;p.garrisons=[];s.armies=s.armies.filter(a=>a.owner!==p.id);log(s,p.name+' lost all territory.');}}
 advanceOffensivePlans(s);
 // Elimination retires war status, rather than leaving a growing badge of dead enemies.
 if(s.wars?.length){
  s.wars=s.wars.filter(key=>key.split(':').every(raw=>alive(person(s,Number(raw)))));
  s.peaceOffers=(s.peaceOffers||[]).filter(o=>alive(person(s,o.from))&&alive(person(s,o.to)));
 }
 for(const p of s.players)if(p.bot&&alive(p))bot(s,p.id);
 // Capturing land always costs troops; do not award free cells at every tick.
 checkWin(s);
}

// Only public simulation data is sent to displays. Path arrays and duplicate
// planned geometry remain in authoritative saves, not every network frame.
const zoneRunCache=new WeakMap(),displayZoneCache=new Map(),displayRoadCache=new Map();
function zoneRuns(cells){
 let cached=zoneRunCache.get(cells);if(cached?.length===cells.length)return cached.runs;
 const sorted=[...cells].sort((a,b)=>a-b),runs=[];
 for(const i of sorted){const n=runs.length;if(n&&runs[n-2]+runs[n-1]===i)runs[n-1]++;else runs.push(i,1);}
 zoneRunCache.set(cells,{length:cells.length,runs});return runs;
}
function networkState(s,viewerId=null){
 const geometry=p=>{const {zoneCells,...rest}=p;return {...rest,...(zoneCells?{zoneRuns:zoneRuns(zoneCells)}:{})};};
 const {roads,...base}=s;
 return {...base,...(viewerId!==null&&s.phase==='playing'?{
   buildings:s.buildings.filter(b=>visibleBuilding(s,viewerId,b)),
   buildJobs:s.buildJobs?.filter(b=>b.owner===viewerId),
   workZones:s.workZones?.filter(b=>b.owner===viewerId)
  }:{}),roadRuns:zoneRuns(roads||[]),armyPacked:true,
  workZones:s.workZones?.filter(z=>viewerId===null||s.phase!=='playing'||z.owner===viewerId).map(geometry),
  attackPlans:s.attackPlans?.map(geometry),recoveryPlans:s.recoveryPlans?.map(geometry),
  players:s.players.map(p=>({...p,...(viewerId!==null&&s.phase==='playing'&&p.id!==viewerId?{capital:null,workers:[]}:{}),garrisons:p.garrisons?.map(({route,...g})=>g),workers:viewerId!==null&&s.phase==='playing'&&p.id!==viewerId?[]:p.workers?.map(({route,...g})=>g)})),
  armies:s.armies.map(a=>{
   const {frontSignature,zoneCells,...wave}=a;
   return {...wave,...(!a.planId&&zoneCells?{zoneRuns:zoneRuns(zoneCells)}:{}),
    columns:a.columns?.map(({route,...c})=>c)};
  })};
}
function restoreNetworkState(s){
 if(!s?.armyPacked)return s;const active=new Set();
 if(s.roadRuns){const signature=s.roadRuns.join(','),cached=displayRoadCache.get(s.seed);if(cached?.signature===signature)s.roads=cached.roads;else{const roads=[];for(let n=0;n<s.roadRuns.length;n+=2)for(let k=0;k<s.roadRuns[n+1];k++)roads.push(s.roadRuns[n]+k);s.roads=roads;if(displayRoadCache.size>8)displayRoadCache.clear();displayRoadCache.set(s.seed,{signature,roads});}delete s.roadRuns;}
 for(const p of [...(s.attackPlans||[]),...(s.recoveryPlans||[]),...(s.armies||[]),...(s.workZones||[])]){
  if(!p.zoneRuns)continue;active.add(p.id);
  const signature=p.zoneRuns.join(','),cached=displayZoneCache.get(p.id);
  if(cached?.signature===signature)p.zoneCells=cached.cells;
  else{
   const cells=[];for(let n=0;n<p.zoneRuns.length;n+=2)for(let k=0;k<p.zoneRuns[n+1];k++)cells.push(p.zoneRuns[n]+k);
   p.zoneCells=cells;displayZoneCache.set(p.id,{signature,cells});
  }
  delete p.zoneRuns;
 }
 for(const id of displayZoneCache.keys())if(!active.has(id))displayZoneCache.delete(id);
 const plans=new Map([...(s.attackPlans||[]),...(s.recoveryPlans||[])].map(p=>[p.id,p]));
 for(const a of s.armies||[])if(a.planId&&plans.has(a.planId))a.zoneCells=plans.get(a.planId).zoneCells;
 delete s.armyPacked;return s;
}

return{BUILD:'v104',focusStatus,constructionTime,upgradeTime,fortRadius,visibleBuilding,strategicWeight,reserveShare,TROOPS_PER_PLAN_CELL,planCellLimit,STORAGE_PER_CELL,resourceCapacity,automaticWorkSites,WORK_RESOURCES,workforceStats,workSuitable,workforceStep,roadRoute,moveOnRoute,automaticAllocation,networkState,restoreNetworkState,frontDeployment,localAttackStrength,spatialArmyStep,homeSites,militaryStrength,planAllocation,W,H,MAX,COLORS,KINDS,TECH,previewFront,canBuild,tileDefense,estimatePlanFront,lobby,addPlayer,start,previewTerrain,spawnError,setSpawn,action,tick,bot,owner,tile,buildingAt,armiesAt,person,counts,buildingCount,costBuilding,costUpgrade,costTech,landCount,inside,idx,sealTerritories,nearestBorderLand,combatStep};
});
