/* Brothers Kingdoms: original territory strategy engine. Deterministic, host-authoritative. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;root.BKEngine=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const W=160,H=104,MAX=4,LAND=[1,2,3,4,5,6];
const COLORS=['#39D5FF','#B6F36A','#FFAE57','#FF5D80','#B38CFF','#59E2C5','#FFE66B','#88A4FF','#EF96E6','#FF885D','#8CE3A1','#C3B5FF','#F8B9CA','#B7CCD9'];
const KINDS={farm:{name:'Ферма',cost:{wood:45,stone:10},income:'food'},lumber:{name:'Лесопилка',cost:{wood:40,stone:15},income:'wood'},quarry:{name:'Каменоломня',cost:{wood:45,stone:20},income:'stone'},mine:{name:'Шахта',cost:{wood:55,stone:55},income:'gold'},barracks:{name:'Казармы',cost:{wood:100,stone:65,gold:35}},fort:{name:'Крепость',cost:{wood:105,stone:130,gold:55}},city:{name:'Город',cost:{wood:165,stone:150,gold:100}}};
const TECH={economy:{name:'Экономика',base:{gold:120,wood:80}},war:{name:'Военное дело',base:{gold:135,stone:75}},logistics:{name:'Логистика',base:{gold:100,wood:80}}};
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
 if(!best)throw new Error('Нет подходящего места появления на материке.');
 return best;
}
const alive=p=>p&&!p.eliminated;
function person(s,id){return s.players.find(p=>p.id===id);}
const available=(p,c)=>Object.entries(c||{}).every(([k,v])=>(p.res[k]||0)>=v);
const charge=(p,c)=>Object.entries(c).forEach(([k,v])=>p.res[k]-=v);
function log(s,msg){s.log.unshift(msg);if(s.log.length>8)s.log.length=8;}
function lobby(seed=57283){return {version:14,settings:{bots:0},phase:'lobby',seed:Math.floor(seed),tick:0,tiles:[],owners:[],players:[],buildings:[],armies:[],log:['Захватывайте земли, улучшайте экономику и защищайте столицу.'],winner:null,mode:'conquest',duration:null,nonce:0,landTotal:0,territoryRevision:0};}
function addPlayer(s,name,isBot=false){if(s.phase!=='lobby'||s.players.filter(p=>!p.bot).length>=MAX&&!isBot||s.players.length>=COLORS.length)return null;
 let id=1;while(s.players.some(p=>p.id===id))id++;let safe=String(name||('Королевство '+id)).trim().slice(0,18)||('Игрок '+id);
 s.players.push({id,name:safe,bot:!!isBot,color:COLORS[(id-1)%COLORS.length],res:{food:650,wood:390,stone:310,gold:260},troops:450,troopCap:1700,land:0,ready:!!isBot,connected:true,spawnPreference:'auto',eliminated:false,tech:{economy:0,war:0,logistics:0},offers:[],allies:[],capital:null,kills:0});
 log(s,safe+' вступил в борьбу.');return id;
}
function tile(s,x,y){return inside(x,y)?s.tiles[idx(x,y)]:0;}
function owner(s,x,y){return inside(x,y)?s.owners[idx(x,y)]:0;}
function buildingAt(s,x,y){return s.buildings.find(b=>b.x===x&&b.y===y)||null;}
function armiesAt(s,x,y){return s.armies.filter(a=>a.x===x&&a.y===y&&a.strength>0);}
function building(s,id,kind,x,y){const b={id:'b'+(++s.nonce),owner:id,kind,x,y,level:1,hp:100};s.buildings.push(b);return b;}
function landCount(s){return s.players.filter(p=>!p.eliminated).reduce((n,p)=>n+p.land,0);}
function gainTile(s,x,y,id){if(!inside(x,y)||tile(s,x,y)===0)return false;const i=idx(x,y),old=s.owners[i];if(old===id)return false;
 if(old){const p=person(s,old);if(p)p.land=Math.max(0,p.land-1);}
 s.owners[i]=id;s.territoryRevision=(s.territoryRevision||0)+1;if(id){const p=person(s,id);if(p)p.land++;}return true;
}
function claim(s,x,y,id,r){for(let yy=y-r;yy<=y+r;yy++)for(let xx=x-r;xx<=x+r;xx++)if(inside(xx,yy)&&Math.hypot(xx-x,yy-y)<=r+0.25){s.tiles[idx(xx,yy)] ||=1;gainTile(s,xx,yy,id);}}

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
function start(s,bots=0){if(s.phase!=='lobby'||!s.players.length)return {ok:false,error:'Нет игроков.'};
 s.tiles=singleContinent(generate(s.seed));s.owners=new Array(W*H).fill(0);s.armies=[];s.buildings=[];s.territoryRevision=0;
 const botsCount=clamp(Math.floor(bots),0,COLORS.length-s.players.length);for(let i=0;i<botsCount;i++)addPlayer(s,['Алые пики','Северная корона','Железный союз','Вольные города','Янтарная орда','Золотые поля','Синяя стража','Каменный трон','Зеленые земли','Облачный народ'][i]||'Империя '+(i+1),true);
 let positions=sites(s,s.players.length);
 const targets={northwest:{x:Math.round(W*.16),y:Math.round(H*.23)},northeast:{x:Math.round(W*.82),y:Math.round(H*.22)},southwest:{x:Math.round(W*.17),y:Math.round(H*.78)},southeast:{x:Math.round(W*.82),y:Math.round(H*.76)}};
 const taken=new Set();const placement=[];
 for(const p of s.players){const wish=targets[p.spawnPreference];let best=-1,score=Infinity;
  if(wish){for(let i=0;i<positions.length;i++)if(!taken.has(i)){const d=Math.abs(positions[i].x-wish.x)+Math.abs(positions[i].y-wish.y);if(d<score){score=d;best=i;}}}
  if(best<0)best=positions.findIndex((_,i)=>!taken.has(i));taken.add(best);placement.push(safeSpawn(s,positions[best],placement));}
 placement.forEach((pos,i)=>{const p=s.players[i];claim(s,pos.x,pos.y,p.id,4);p.capital={x:pos.x,y:pos.y};building(s,p.id,'capital',pos.x,pos.y);
 const farmX=pos.x+2,farmY=pos.y+1;if(owner(s,farmX,farmY)===p.id)building(s,p.id,'farm',farmX,farmY);
 });
 for(let i=0;i<2;i++)sealTerritories(s);
 s.landTotal=s.tiles.filter(Boolean).length;s.duration=null;s.rules={victory:100,timeLimit:false,naval:false,continent:true};s.phase='playing';log(s,'Матч начался. Победа — 100% суши. Временного ограничения нет.');return {ok:true};
}

function costUpgrade(b){return {wood:50*b.level+25,stone:50*b.level+20,gold:35*b.level};}
function costTech(key,l){const base=TECH[key].base;return Object.fromEntries(Object.entries(base).map(([k,v])=>[k,Math.round(v*(l+1)*1.4)]));}
function isCoast(s,x,y){return [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>tile(s,x+dx,y+dy)===0);}
function canBuild(s,id,kind,x,y){if(!KINDS[kind])return 'Нет такого здания.';if(!inside(x,y)||owner(s,x,y)!==id)return 'Нужна собственная территория.';
 if(buildingAt(s,x,y))return 'Клетка занята другим зданием.';
 if(kind==='lumber'&&tile(s,x,y)!==2)return 'Лесопилку нужно строить в лесу.';
 if(kind==='quarry'&&![3,6].includes(tile(s,x,y)))return 'Каменоломне нужны холмы или горы.';
 if(kind==='mine'&&![3,5,6].includes(tile(s,x,y)))return 'Шахте нужны горы, холмы или месторождения.';
 if(tile(s,x,y)===6&&kind!=='quarry'&&kind!=='mine'&&kind!=='fort')return 'На вершине нельзя строить это здание.';
 return null;
}
// Border lists are reused across AI candidate queries for the same simulation tick.
// This removes tens of thousands of repeated tile reads per bot order.
const borderCache=new WeakMap();
const attackFronts=new WeakMap();
function borders(s,id){
 let cache=borderCache.get(s);
 if(!cache||cache.tick!==s.tick){cache={tick:s.tick,lists:new Map()};borderCache.set(s,cache);}
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
function takeCapital(s,attacker,defender){
 const p=person(s,defender);if(!p||p.eliminated)return;
 // Losing the capital is a major setback, but never teleports distant provinces.
 const lost=Math.min(p.troops,Math.max(90,Math.floor(p.troops*.25)));
 p.troops-=lost;
 log(s,'Столица '+p.name+' захвачена! Остальные земли продолжают сопротивление.');
}
function action(s,id,a){if(s.phase!=='playing')return {ok:false,error:'Матч не активен.'};const p=person(s,id);
 if(!alive(p)||!a||typeof a!=='object')return {ok:false,error:'Команда недоступна.'};
 if(a.type==='send'){
  let tx=Math.floor(a.x),ty=Math.floor(a.y);const percent=clamp(Number(a.percent)||30,5,95);
  if(!inside(tx,ty))return {ok:false,error:'Укажи цель на карте.'};
  if(s.armies.filter(u=>u.owner===id).length>=12)return {ok:false,error:'Не более 12 активных наступлений.'};
  if(owner(s,tx,ty)===id)return {ok:false,error:'Выбери нейтральную или чужую территорию.'};
  if(p.allies.includes(owner(s,tx,ty)))return {ok:false,error:'Нельзя атаковать союзника. Сначала разорви союз в меню дипломатии.'};
  if(tile(s,tx,ty)===0)return {ok:false,error:'Море не захватывается. Выбери клетку суши.'};
  const strength=Math.floor(p.troops*percent/100);if(strength<35)return {ok:false,error:'Для наступления нужно минимум 35 солдат.'};
  const src=nearestBorderLand(s,id,tx,ty);
  if(!src)return {ok:false,error:'Нет сухопутного пути к этой территории.'};
  // A land assault must begin on an existing shared border. Neutral attacks
  // automatically expand the whole accessible neutral perimeter (layer by layer).
  // Hostile attacks expand only into the clicked opponent, never across bystanders.
  const targetOwner=owner(s,tx,ty);
  if(!borderCandidates(s,id,targetOwner).length){
   return {ok:false,error:targetOwner?'Сначала выйди к границе этого противника.':'Нет общей границы с доступной нейтральной землёй.'};
  }
  p.troops-=strength;
  s.armies.push({id:'a'+(++s.nonce),owner:id,x:src.x,y:src.y,ox:src.x,oy:src.y,tx,ty,targetOwner,frontCells:initialFront(s,id,tx,ty,targetOwner),strength,initialStrength:strength,captured:0,turns:0,stuck:0});
  return {ok:true};
 }
 if(a.type==='redirect'){
  const army=s.armies.find(v=>v.id===a.id&&v.owner===id);if(!army||!inside(a.x,a.y))return {ok:false,error:'Армия не найдена.'};
  const tx=Math.floor(a.x),ty=Math.floor(a.y),targetOwner=owner(s,tx,ty);
  if(!tile(s,tx,ty)||targetOwner===id||p.allies.includes(targetOwner))return {ok:false,error:'Выбери нейтральную или вражескую землю.'};
  if(!borderCandidates(s,id,targetOwner).length)return {ok:false,error:'Нужна общая граница для смены направления.'};
  army.tx=tx;army.ty=ty;army.targetOwner=targetOwner;army.frontCells=initialFront(s,id,tx,ty,targetOwner);army.stuck=0;attackFronts.delete(army);return {ok:true};
 }
 if(a.type==='return'){
  const army=s.armies.find(v=>v.id===a.id&&v.owner===id);if(!army)return {ok:false,error:'Армия не найдена.'};
  // A recall stops conquest immediately. Returning survivors pay 4% for withdrawal.
  finishWave(s,army,p);s.armies=s.armies.filter(v=>v!==army);
  return {ok:true};
 }
 if(a.type==='build'){
  const kind=String(a.kind),x=Math.floor(a.x),y=Math.floor(a.y),fail=canBuild(s,id,kind,x,y);if(fail)return {ok:false,error:fail};
  if(!available(p,KINDS[kind].cost))return {ok:false,error:'Недостаточно ресурсов.'};charge(p,KINDS[kind].cost);building(s,id,kind,x,y);return {ok:true};
 }
 if(a.type==='upgrade'){
  const b=s.buildings.find(v=>v.id===a.id&&v.owner===id);if(!b||b.level>=4)return {ok:false,error:'Достигнут максимальный уровень.'};const price=costUpgrade(b);
  if(!available(p,price))return {ok:false,error:'Недостаточно ресурсов.'};charge(p,price);b.level++;log(s,p.name+' улучшил '+(KINDS[b.kind]?.name||'столицу')+' до '+b.level+' ур.');return {ok:true};
 }
 if(a.type==='research'){
  const key=String(a.key);if(!TECH[key])return {ok:false,error:'Нет такого исследования.'};const l=p.tech[key];if(l>=3)return {ok:false,error:'Исследование завершено.'};const c=costTech(key,l);
  if(!available(p,c))return {ok:false,error:'Недостаточно ресурсов.'};charge(p,c);p.tech[key]++;log(s,p.name+' изучил '+TECH[key].name+' ('+p.tech[key]+').');return {ok:true};
 }
 if(a.type==='diplomacy'){
  const target=person(s,Number(a.target));if(!alive(target)||target.id===id)return {ok:false,error:'Выбери другое королевство.'};
  if(p.allies.includes(target.id)){
   p.allies=p.allies.filter(v=>v!==target.id);target.allies=target.allies.filter(v=>v!==id);log(s,p.name+' разорвал союз с '+target.name);return {ok:true};
  }
  if(target.offers.includes(id)){
   p.allies.push(target.id);target.allies.push(id);target.offers=target.offers.filter(v=>v!==id);p.offers=p.offers.filter(v=>v!==target.id);log(s,p.name+' и '+target.name+' заключили союз.');return {ok:true};
  }
  if(!p.offers.includes(target.id)){p.offers.push(target.id);log(s,p.name+' предлагает союз '+target.name+'.');}return {ok:true};
 }
 if(a.type==='donate'){
  const target=person(s,Number(a.target)),resource=String(a.resource),amount=clamp(Math.floor(a.amount||100),1,10000);
  if(!alive(target)||!p.allies.includes(target.id)||!['food','gold','wood','stone'].includes(resource)||p.res[resource]<amount)return {ok:false,error:'Можно помогать только союзнику при наличии ресурсов.'};
  p.res[resource]-=amount;target.res[resource]+=amount;return {ok:true};
 }
 return {ok:false,error:'Неизвестная команда.'};
}
function tileDefense(s,id,x,y){let n=3;const defender=person(s,id);if(!defender)return n;
 n+=defender.troops/Math.max(60,defender.land)*2.6;
 n+=defender.tech.war*1.9;
 for(const b of s.buildings){if(b.owner!==id)continue;const d=Math.abs(b.x-x)+Math.abs(b.y-y);
  if(b.kind==='capital'&&d<=3)n+=(d===0?90:11)*Math.sqrt(b.level);
  if(b.kind==='fort'&&d<=4)n+=Math.max(0,5-d)*b.level*3.7;
  if(b.kind==='city'&&d<=2)n+=b.level*4;
 }
 return n;
}
function capture(s,a,x,y){const old=owner(s,x,y),p=person(s,a.owner);if(old===a.owner)return true;if(tile(s,x,y)===0||tile(s,x,y)===6&&a.strength<10)return false;
 if(old&&p.allies.includes(old))return false;
 let cost=old?tileDefense(s,old,x,y)/(.95+.19*p.tech.war):tile(s,x,y)===6?8:tile(s,x,y)===3?4:2.8;
 cost*=1-.08*p.tech.logistics;
 if(a.strength<cost)return false;a.strength-=cost;
 if(old){const def=person(s,old);def.troops=Math.max(0,def.troops-Math.max(0.8,cost*.43));}
 gainTile(s,x,y,p.id);a.captured=(a.captured||0)+1;
 const b=buildingAt(s,x,y);
 if(b&&b.owner!==p.id){if(b.kind==='capital'){takeCapital(s,p.id,b.owner);b.kind='city';}b.owner=p.id;b.level=Math.max(1,b.level-1);}
 return true;
}
// Territorial-style front propagation: conquer COMPLETE BORDER LAYERS, not the
// single pixel that is nearest to the pointer. The tapped tile chooses which
// A chosen target selects a LOCAL theatre along the common border. The old
// algorithm enrolled every border cell nationwide, making one tap produce
// unrelated simultaneous captures far from the indicated location.
const SIDE=[1,-1,W,-W];
function borderCandidates(s,id,targetOwner){
 const found=[];
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){
  const i=idx(x,y);
  if(s.owners[i]!==id)continue;
  for(const d of SIDE){
   const j=i+d;
   if(s.tiles[j]!==0&&s.owners[j]===targetOwner)found.push(j);
  }
 }
 return [...new Set(found)];
}
function initialFront(s,id,tx,ty,targetOwner){
 const border=borderCandidates(s,id,targetOwner);
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
 f={targetOwner,candidates:new Set(initialFront(s,a.owner,a.tx,a.ty,targetOwner)),layers:0};
 attackFronts.set(a,f);return f;
}
function finishWave(s,a,p){
 if(p&&!p.eliminated&&a.strength>0)p.troops=Math.min(p.troopCap,p.troops+Math.floor(a.strength*.96));
 a.strength=0;a.frontCells=[];attackFronts.delete(a);
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
 const p=person(s,a.owner);if(!alive(p)){a.strength=0;a.frontCells=[];attackFronts.delete(a);return;}
 const f=waveFront(s,a);
 // Alliances or a completed conquest can invalidate a target while in flight.
 if(f.targetOwner&&p.allies.includes(f.targetOwner)){finishWave(s,a,p);return;}
 const layer=[...f.candidates].filter(i=>s.tiles[i]&&s.owners[i]===f.targetOwner);
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
   if(s.tiles[j]&&s.owners[j]===f.targetOwner)f.candidates.add(j);
  }
 }
 if(point){a.x=point.x;a.y=point.y;}
 a.frontCells=[...f.candidates].filter(i=>s.tiles[i]&&s.owners[i]===f.targetOwner);
 // After a finished complete layer, remaining candidates form the NEXT layer.
 // An attack continues while its committed troops can pay for that next layer.
 a.turns++;a.stuck=gained?0:a.stuck+1;
 if(a.strength<3||a.stuck>=3||a.turns>140||!f.candidates.size)finishWave(s,a,p);
}
function counts(s,id){const stats={farm:0,lumber:0,quarry:0,mine:0,barracks:0,fort:0,city:0};for(const b of s.buildings)if(b.owner===id&&stats[b.kind]!==undefined)stats[b.kind]+=b.level;return stats;}
function income(s,p){const c=counts(s,p.id),l=p.land,e=1+p.tech.economy*.25;
 const income={food:Math.round((2+l/100+c.farm*8+c.city*5)*e),wood:Math.round((1+l/180+c.lumber*7)*e),stone:Math.round((1+l/200+c.quarry*7)*e),gold:Math.round((1+l/220+c.mine*7+c.city*5)*e)};
 for(const k of Object.keys(income))p.res[k]=Math.min(250000,p.res[k]+income[k]);
 p.troopCap=Math.floor(900+l*2.4+c.barracks*430+c.city*260);
 const newTroops=Math.max(0,Math.min(p.troopCap-p.troops,Math.round(4+l/100+p.troops*.018+c.barracks*5+c.city*3+p.tech.war*2)));const supply=Math.max(0,Math.min(newTroops,Math.floor(p.res.food/0.20)));
 p.troopIncome=supply;p.troops+=supply;p.res.food=Math.max(0,p.res.food-Math.ceil(supply*.20));p.income=income;
}
function bot(s,id){const p=person(s,id);if(!alive(p)||s.phase!=='playing')return;
 if(s.tick%4===id%4){
  const bases=s.buildings.filter(b=>b.owner===id);if(bases.length<14){
    const preferences=['farm','lumber','quarry','mine','barracks','farm','city','fort'];const kind=preferences[Math.floor((s.tick/4+id)%preferences.length)];
    const cx=p.capital.x,cy=p.capital.y;for(let n=0;n<35;n++){
      const x=clamp(cx+Math.round((hash(n,s.tick,id)-.5)*30),0,W-1),y=clamp(cy+Math.round((hash(s.tick,n,id)-.5)*27),0,H-1);
      if(!canBuild(s,id,kind,x,y)){action(s,id,{type:'build',kind,x,y});break;}
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
     const score=foe===0?0:12+(person(s,foe)?.troops||0)/Math.max(1,p.troops)*30;
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
 if(winner){s.phase='ended';s.winner=winner.id;log(s,winner.name+' контролирует 100% суши и победил!');}
}
function combatStep(s){if(s.phase!=='playing')return;
 for(const a of [...s.armies])if(a.strength>0)advance(s,a);
 s.armies=s.armies.filter(a=>a.strength>=8);
}
function tick(s){if(s.phase!=='playing')return;s.tick++;
 for(const p of s.players){if(!alive(p))continue;income(s,p);}
 combatStep(s);
 for(const p of s.players){if(!p.eliminated&&p.land<=0){p.eliminated=true;p.troops=0;s.armies=s.armies.filter(a=>a.owner!==p.id);log(s,p.name+' потерял все земли.');}}
 for(const p of s.players)if(p.bot&&alive(p))bot(s,p.id);
 // Capturing land always costs troops; do not award free cells at every tick.
 checkWin(s);
}

return{W,H,MAX,COLORS,KINDS,TECH,previewFront,canBuild,tileDefense,lobby,addPlayer,start,action,tick,bot,owner,tile,buildingAt,armiesAt,person,counts,costUpgrade,costTech,landCount,inside,idx,sealTerritories,nearestBorderLand,combatStep};
});
