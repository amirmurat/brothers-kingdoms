/* Brothers Kingdoms: original territory strategy engine. Deterministic, host-authoritative. */
(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;root.BKEngine=api;})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const W=160,H=104,MAX=4,LIMIT=16*60,LAND=[1,2,3,4,5,6];
const COLORS=['#43d9bd','#fbab5c','#a89dff','#fd7595','#d7e76c','#74b2fa','#f58fd7','#f1cd76','#64e0e8','#d69f76','#86dd8a','#b8aeed','#e79ba0','#b6c874'];
const KINDS={farm:{name:'Ферма',cost:{wood:45,stone:10},income:'food'},lumber:{name:'Лесопилка',cost:{wood:40,stone:15},income:'wood'},quarry:{name:'Каменоломня',cost:{wood:45,stone:20},income:'stone'},mine:{name:'Шахта',cost:{wood:55,stone:55},income:'gold'},barracks:{name:'Казармы',cost:{wood:100,stone:65,gold:35}},fort:{name:'Крепость',cost:{wood:105,stone:130,gold:55}},port:{name:'Порт',cost:{wood:130,stone:85,gold:60}},city:{name:'Город',cost:{wood:165,stone:150,gold:100}}};
const TECH={economy:{name:'Экономика',base:{gold:120,wood:80}},war:{name:'Военное дело',base:{gold:135,stone:75}},logistics:{name:'Логистика',base:{gold:100,wood:80}},sailing:{name:'Флот',base:{gold:170,wood:105,stone:90}}};
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
  const r=hash(x,y,seed+53);t[idx(x,y)]=height>.65?6:r<.24?2:r<.36?3:r<.49?4:r<.57?5:1;
 }
 return t;
}
const alive=p=>p&&!p.eliminated;
function person(s,id){return s.players.find(p=>p.id===id);}
const available=(p,c)=>Object.entries(c||{}).every(([k,v])=>(p.res[k]||0)>=v);
const charge=(p,c)=>Object.entries(c).forEach(([k,v])=>p.res[k]-=v);
function log(s,msg){s.log.unshift(msg);if(s.log.length>8)s.log.length=8;}
function lobby(seed=57283){return {version:2,phase:'lobby',seed:Math.floor(seed),tick:0,tiles:[],owners:[],players:[],buildings:[],armies:[],log:['Захватывайте земли, улучшайте экономику и защищайте столицу.'],winner:null,mode:'conquest',duration:LIMIT,nonce:0,landTotal:0};}
function addPlayer(s,name,isBot=false){if(s.phase!=='lobby'||s.players.filter(p=>!p.bot).length>=MAX&&!isBot||s.players.length>=COLORS.length)return null;
 const id=s.players.length+1;let safe=String(name||('Королевство '+id)).trim().slice(0,18)||('Игрок '+id);
 s.players.push({id,name:safe,bot:!!isBot,color:COLORS[(id-1)%COLORS.length],res:{food:650,wood:390,stone:310,gold:260},troops:370,troopCap:1400,land:0,eliminated:false,tech:{economy:0,war:0,logistics:0,sailing:0},offers:[],allies:[],capital:null,kills:0});
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
 s.owners[i]=id;if(id){const p=person(s,id);if(p)p.land++;}return true;
}
function claim(s,x,y,id,r){for(let yy=y-r;yy<=y+r;yy++)for(let xx=x-r;xx<=x+r;xx++)if(inside(xx,yy)&&Math.hypot(xx-x,yy-y)<=r+0.25){s.tiles[idx(xx,yy)] ||=1;gainTile(s,xx,yy,id);}}
function sites(s,n){const anchors=[[.16,.23],[.82,.76],[.82,.22],[.17,.78],[.48,.17],[.5,.83],[.27,.48],[.75,.5],[.34,.12],[.65,.9],[.91,.48],[.08,.52],[.47,.49],[.55,.48]];
 return anchors.slice(0,n).map(([fx,fy])=>({x:Math.round(fx*(W-1)),y:Math.round(fy*(H-1))}));
}
function start(s,bots=7){if(s.phase!=='lobby'||!s.players.length)return {ok:false,error:'Нет игроков.'};
 s.tiles=generate(s.seed);s.owners=new Array(W*H).fill(0);s.armies=[];s.buildings=[];
 const botsCount=clamp(Math.floor(bots),0,COLORS.length-s.players.length);for(let i=0;i<botsCount;i++)addPlayer(s,['Алые пики','Северная корона','Железный союз','Вольные города','Янтарная орда','Золотые поля','Синяя стража','Каменный трон','Зеленые земли','Облачный народ'][i]||'Империя '+(i+1),true);
 sites(s,s.players.length).forEach((pos,i)=>{const p=s.players[i];claim(s,pos.x,pos.y,p.id,4);p.capital={x:pos.x,y:pos.y};building(s,p.id,'capital',pos.x,pos.y);
 const farmX=pos.x+2,farmY=pos.y+1;if(owner(s,farmX,farmY)===p.id)building(s,p.id,'farm',farmX,farmY);
 });s.landTotal=s.tiles.filter(Boolean).length;s.phase='playing';log(s,'Война началась. Карта: '+W+' × '+H+'.');return {ok:true};
}
function costUpgrade(b){return {wood:50*b.level+25,stone:50*b.level+20,gold:35*b.level};}
function costTech(key,l){const base=TECH[key].base;return Object.fromEntries(Object.entries(base).map(([k,v])=>[k,Math.round(v*(l+1)*1.4)]));}
function isCoast(s,x,y){return [[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>tile(s,x+dx,y+dy)===0);}
function canBuild(s,id,kind,x,y){if(!KINDS[kind])return 'Нет такого здания.';if(!inside(x,y)||owner(s,x,y)!==id)return 'Нужна собственная территория.';
 if(buildingAt(s,x,y))return 'Клетка занята другим зданием.';
 if(kind==='lumber'&&tile(s,x,y)!==2)return 'Лесопилку нужно строить в лесу.';
 if(kind==='quarry'&&![3,6].includes(tile(s,x,y)))return 'Каменоломне нужны холмы или горы.';
 if(kind==='mine'&&![3,5,6].includes(tile(s,x,y)))return 'Шахте нужны горы, холмы или месторождения.';
 if(kind==='port'&&!isCoast(s,x,y))return 'Порт строится только на побережье.';
 if(tile(s,x,y)===6&&kind!=='quarry'&&kind!=='mine'&&kind!=='fort')return 'На вершине нельзя строить это здание.';
 return null;
}
function nearestBorder(s,id,tx,ty,sea=false){let best=null,score=Infinity;
 // Use entire ownership grid, so orders are possible at any distance.
 for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++){if(owner(s,x,y)!==id)continue;
 const boundary=owner(s,x+1,y)!==id||owner(s,x-1,y)!==id||owner(s,x,y+1)!==id||owner(s,x,y-1)!==id;
 if(!boundary)continue;
 const d=Math.abs(x-tx)+Math.abs(y-ty);if(d<score){score=d;best={x,y};}
 }return best;
}
function takeCapital(s,attacker,defender){const p=person(s,defender);if(!p||p.eliminated)return;p.eliminated=true;
 for(let i=0;i<s.owners.length;i++)if(s.owners[i]===defender){s.owners[i]=attacker;person(s,attacker).land++;}
 p.land=0;p.troops=0;s.armies=s.armies.filter(a=>a.owner!==defender);s.buildings=s.buildings.filter(b=>b.owner!==defender);person(s,attacker).kills++;
 log(s,'⚔ '+person(s,attacker).name+' захватил столицу '+p.name+'!');
}
function action(s,id,a){if(s.phase!=='playing')return {ok:false,error:'Матч не активен.'};const p=person(s,id);
 if(!alive(p)||!a||typeof a!=='object')return {ok:false,error:'Команда недоступна.'};
 if(a.type==='send'){
  const tx=Math.floor(a.x),ty=Math.floor(a.y),percent=clamp(Number(a.percent)||30,5,95);
  if(!inside(tx,ty))return {ok:false,error:'Укажите цель на карте.'};
  if(s.armies.filter(u=>u.owner===id).length>=12)return {ok:false,error:'Не больше 12 действующих походов.'};
  const strength=Math.floor(p.troops*percent/100);if(strength<35)return {ok:false,error:'Нужно накопить хотя бы 35 солдат для похода.'};
  const naval=tile(s,tx,ty)===0;
  if(naval&&(p.tech.sailing<1||!s.buildings.some(b=>b.owner===id&&b.kind==='port')))return {ok:false,error:'Для морского похода нужен порт и исследование флота.'};
  const src=nearestBorder(s,id,tx,ty);if(!src)return {ok:false,error:'У тебя пока нет пограничной территории.'};
  p.troops-=strength;
  s.armies.push({id:'a'+(++s.nonce),owner:id,x:src.x,y:src.y,tx,ty,strength,naval:false,turns:0,stuck:0});
  return {ok:true};
 }
 if(a.type==='redirect'){
  const army=s.armies.find(v=>v.id===a.id&&v.owner===id);if(!army||!inside(a.x,a.y))return {ok:false,error:'Армия не найдена.'};army.tx=a.x;army.ty=a.y;army.stuck=0;return {ok:true};
 }
 if(a.type==='return'){
  const army=s.armies.find(v=>v.id===a.id&&v.owner===id);if(!army)return {ok:false,error:'Армия не найдена.'};
  army.tx=p.capital.x;army.ty=p.capital.y;return {ok:true};
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
  if(b.kind==='capital'&&d<=3)n+=d===0?90:11;
  if(b.kind==='fort'&&d<=4)n+=Math.max(0,5-d)*b.level*3.7;
  if(b.kind==='city'&&d<=2)n+=b.level*4;
 }
 return n;
}
function capture(s,a,x,y){const old=owner(s,x,y),p=person(s,a.owner);if(old===a.owner)return true;if(tile(s,x,y)===0||tile(s,x,y)===6&&a.strength<10)return false;
 if(old&&p.allies.includes(old))return false;
 const cost=old?tileDefense(s,old,x,y)/(.95+.19*p.tech.war):tile(s,x,y)===6?8:tile(s,x,y)===3?4:2.8;
 if(a.strength<cost)return false;a.strength-=cost;
 if(old){const def=person(s,old);def.troops=Math.max(0,def.troops-Math.max(0.8,cost*.43));}
 gainTile(s,x,y,p.id);
 const b=buildingAt(s,x,y);
 if(b&&b.owner!==p.id){if(b.kind==='capital'){takeCapital(s,p.id,b.owner);}else{b.owner=p.id;b.level=Math.max(1,b.level-1);}}
 return true;
}
function surrounding(s,a){for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;if(Math.abs(dx)+Math.abs(dy)>1&&a.strength<85)continue;
 const x=a.x+dx,y=a.y+dy;if(inside(x,y)&&tile(s,x,y)!==0&&owner(s,x,y)!==a.owner){if(a.strength>15)capture(s,a,x,y);}}
}
function advance(s,a){const p=person(s,a.owner);if(!alive(p)){a.strength=0;return;}
 const speed=2+p.tech.logistics;
 for(let step=0;step<speed;step++){
  if(a.strength<8){a.strength=0;return;}
  if(a.x===a.tx&&a.y===a.ty){a.strength=0;return;}
  const opts=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>({x:a.x+dx,y:a.y+dy})).filter(v=>inside(v.x,v.y));
  opts.sort((v,w)=>{
   const score=q=>Math.abs(q.x-a.tx)+Math.abs(q.y-a.ty)+(tile(s,q.x,q.y)===0?4:0)+(tile(s,q.x,q.y)===6?2:0)+(owner(s,q.x,q.y)&&p.allies.includes(owner(s,q.x,q.y))?30:0);
   return score(v)-score(w);
  });
  let moved=false;
  for(const next of opts){
   const water=tile(s,next.x,next.y)===0;
   if(water&&(p.tech.sailing<1||!s.buildings.some(b=>b.owner===p.id&&b.kind==='port')))continue;
   if(owner(s,next.x,next.y)&&p.allies.includes(owner(s,next.x,next.y)))continue;
   if(water){if(a.strength<5)continue;a.strength-=1.5;a.naval=true;}
   else if(owner(s,next.x,next.y)!==p.id&&!capture(s,a,next.x,next.y))continue;
   a.x=next.x;a.y=next.y;moved=true;break;
  }
  if(!moved){a.stuck++;if(a.stuck>2){a.strength=0;return;}break;}
  a.stuck=0;if(!a.naval)surrounding(s,a);
  for(const other of s.armies){if(other===a||other.owner===a.owner||p.allies.includes(other.owner)||other.strength<=0)continue;
   if(near(a,other)<=1){const damage=Math.min(a.strength,other.strength)*.12+12;a.strength-=damage/(1+.15*p.tech.war);other.strength-=damage/(1+.15*person(s,other.owner).tech.war);}
  }
 }
 a.turns++;
 if(a.turns>160)a.strength=0;
}
function counts(s,id){const stats={farm:0,lumber:0,quarry:0,mine:0,barracks:0,fort:0,city:0,port:0};for(const b of s.buildings)if(b.owner===id&&stats[b.kind]!==undefined)stats[b.kind]+=b.level;return stats;}
function income(s,p){const c=counts(s,p.id),l=p.land,e=1+p.tech.economy*.25;
 const income={food:Math.round((2+l/100+c.farm*8+c.city*5)*e),wood:Math.round((1+l/180+c.lumber*7)*e),stone:Math.round((1+l/200+c.quarry*7)*e),gold:Math.round((1+l/220+c.mine*7+c.city*5)*e)};
 for(const k of Object.keys(income))p.res[k]=Math.min(250000,p.res[k]+income[k]);
 p.troopCap=Math.floor(900+l*2.4+c.barracks*430+c.city*260);
 const newTroops=Math.min(p.troopCap-p.troops,Math.round(10+l/70+c.barracks*7+c.city*3+p.tech.war*2));const supply=Math.max(0,Math.min(newTroops,Math.floor(p.res.food/0.20)));
 p.troops+=supply;p.res.food=Math.max(0,p.res.food-Math.ceil(supply*.20));p.income=income;
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
   const targets=[];for(let n=0;n<35;n++){
     const ox=Math.floor(hash(n,s.tick,id*43)*W),oy=Math.floor(hash(s.tick,n,id*19)*H);
     if(tile(s,ox,oy)===0||owner(s,ox,oy)===id||p.allies.includes(owner(s,ox,oy)))continue;
     const b=nearestBorder(s,id,ox,oy);if(!b)continue;
     const d=near(b,{x:ox,y:oy});if(d>24)continue;
     const foe=owner(s,ox,oy);targets.push({x:ox,y:oy,score:d+(foe?9:0)+hash(ox,oy,s.tick)*8});
   }
   targets.sort((a,b)=>a.score-b.score);
   if(targets.length)action(s,id,{type:'send',x:targets[0].x,y:targets[0].y,percent:clamp(23+hash(id,s.tick,s.seed)*25,15,55)});
  }
 }
 if(s.tick%38===id%38){const choices=['economy','war','logistics'];action(s,id,{type:'research',key:choices[(Math.floor(s.tick/38)+id)%3]});}
}
function checkWin(s){const live=s.players.filter(alive);if(live.length<=1){s.phase='ended';s.winner=live[0]?.id||null;return;}
 const current=live.sort((a,b)=>b.land-a.land);
 if(current[0]&&current[0].land>s.landTotal*.70){s.phase='ended';s.winner=current[0].id;return;}
 if(s.tick>=s.duration){s.phase='ended';s.winner=current[0]?.id||null;}
 if(s.phase==='ended'){const p=person(s,s.winner);log(s,p?p.name+' выиграл войну!':'Война окончена.');}
}
function tick(s){if(s.phase!=='playing')return;s.tick++;
 for(const p of s.players){if(!alive(p))continue;income(s,p);}
 for(const a of [...s.armies])if(a.strength>0)advance(s,a);
 s.armies=s.armies.filter(a=>a.strength>=8);
 for(const p of s.players)if(p.bot&&alive(p))bot(s,p.id);
 checkWin(s);
}
return{W,H,MAX,LIMIT,COLORS,KINDS,TECH,lobby,addPlayer,start,action,tick,bot,owner,tile,buildingAt,armiesAt,person,counts,costUpgrade,costTech,landCount,inside,idx};
});
