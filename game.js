/* Brothers Kingdoms Frontier — canvas world, realtime multiplayer and responsive command UI. */
(()=>{
'use strict';
const ART_ASSETS={"building-farm.svg":"assets/pixel-ui/building-farm.png","building-lumber.svg":"assets/pixel-ui/building-lumber.png","building-quarry.svg":"assets/pixel-ui/building-quarry.png","building-mine.svg":"assets/pixel-ui/building-mine.png","building-barracks.svg":"assets/pixel-ui/building-barracks.png","building-fort.svg":"assets/pixel-ui/building-fort.png","building-city.svg":"assets/pixel-ui/building-city.png","building-capital.svg":"assets/pixel-ui/building-capital.png","building-port.svg":"assets/pixel-ui/building-city.png","food.svg":"assets/pixel-ui/resource-food.png","wood.svg":"assets/pixel-ui/resource-wood.png","stone.svg":"assets/pixel-ui/resource-stone.png","gold.svg":"assets/pixel-ui/resource-gold.png","army.svg":"assets/pixel-ui/building-barracks.png","hammer.svg":"assets/pixel-ui/action-build.png","swords.svg":"assets/pixel-ui/action-attack.png","crown.svg":"assets/pixel-ui/icon-leaderboardsSimple.png"};const artSrc=name=>ART_ASSETS[name]||'';
const E=window.BKEngine,$=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Verified Phosphor MIT icon family for game UI; canvas buildings remain separate assets.
const UI_ICON_NAMES={food:'grains',wood:'tree',stone:'mountains',gold:'coins',farm:'grains',lumber:'tree',quarry:'mountains',mine:'coins',barracks:'sword',fort:'shield',city:'buildings',capital:'castle-turret',economy:'coins',war:'sword',logistics:'flag-banner'};
const uiIcon=name=>{
 const id=UI_ICON_NAMES[name]||name;
 const set=id==='flag-banner'?'controls':'game';
 return `<svg class="ui-icon" viewBox="0 0 256 256" aria-hidden="true"><use href="assets/icons/${set}.svg#${id}"></use></svg>`;
};
const view=$('mapView'),canvas=$('mapCanvas'),ctx=canvas.getContext('2d',{alpha:false}),mini=$('minimap'),mctx=mini.getContext('2d');
const terrainNames=['Море','Равнина','Лес','Холмы','Плодородная земля','Рудное месторождение','Горы'];
/* v25: assemble complete Tiny Town buildings from original CC0 16px tiles. */
const iconImages=Object.fromEntries(['capital','farm','lumber','quarry','mine','barracks','fort','city'].map(id=>{const im=new Image();im.src=artSrc('building-'+id+'.svg');im.onload=()=>queueDraw();return [id,im];}));
const townTileIds=[48,49,50,52,53,54,57,60,61,62,64,65,66,72,74,75,76,78,79,83,92,94,96,97,98,104,105,106,107,108,109,110,115,119,120,121,122];
const townTiles=Object.create(null),townSprites=Object.create(null);
const blueRoof=[48,49,50,60,61,62],redRoof=[52,53,54,64,65,66],woodFront=[72,74,75],stoneFront=[76,78,79],stoneTop=[96,97,98,108,109,110],stoneBase=[120,121,122];
const townRecipes={
 farm:{parts:[...redRoof,...woodFront],deco:94},
 lumber:{parts:[...blueRoof,...woodFront],deco:106},
 quarry:{parts:[...stoneTop,...stoneBase],deco:104},
 mine:{parts:[...blueRoof,...stoneFront],deco:57},
 barracks:{parts:[...redRoof,...stoneFront],deco:119},
 fort:{parts:[...stoneTop,...stoneBase],deco:92},
 city:{parts:[...blueRoof,...stoneFront],deco:83},
 capital:{parts:[...redRoof,...stoneFront],deco:92}
};
function assembleTownBuildings(){
 let changed=false;
 for(const [kind,spec] of Object.entries(townRecipes)){
  if(townSprites[kind]||![...spec.parts,spec.deco].every(id=>townTiles[id]?.naturalWidth))continue;
  const surface=document.createElement('canvas');surface.width=48;surface.height=48;
  const brush=surface.getContext('2d');brush.imageSmoothingEnabled=false;
  spec.parts.forEach((id,i)=>brush.drawImage(townTiles[id],(i%3)*16,Math.floor(i/3)*16,16,16));
  brush.drawImage(townTiles[spec.deco],31,31,15,15);
  townSprites[kind]=surface;changed=true;
 }
 if(changed)queueDraw();
}
townTileIds.forEach(id=>{
 const img=new Image();townTiles[id]=img;
 img.onload=assembleTownBuildings;
 img.onerror=()=>{console.warn('Tiny Town tile unavailable',id);queueDraw();};
 img.src='assets/tiny-town/tile_'+String(id).padStart(4,'0')+'.png';
});
const buildingInfo={
 farm:{short:'Обеспечивает армию едой.',detail:'+8 еды/с за каждый уровень',place:'Своя земля, кроме горных вершин',resource:'food',perLevel:8},
 lumber:{short:'Добывает древесину для развития.',detail:'+7 древесины/с за уровень',place:'Только лес',resource:'wood',perLevel:7},
 quarry:{short:'Добывает камень для зданий.',detail:'+7 камня/с за уровень',place:'Холмы или горы',resource:'stone',perLevel:7},
 mine:{short:'Добывает золото для исследований.',detail:'+7 золота/с за уровень',place:'Руда, холмы или горы',resource:'gold',perLevel:7},
 barracks:{short:'Позволяют содержать больше войск.',detail:'+430 к лимиту армии · +5 к набору/с за уровень',place:'Своя земля, кроме горных вершин',cap:430,rate:5},
 fort:{short:'Защищает окружающие клетки.',detail:'Радиус 4 клетки · защита до +18,5 за уровень у крепости',place:'Своя земля, в том числе горы'},
 city:{short:'Приносит еду, золото и новых солдат.',detail:'+5 еды/с · +5 золота/с · +260 лимит · +3 набор/с за уровень',place:'Своя земля, кроме горных вершин',cap:260,rate:3}
};
const nameResource={food:'Еда',wood:'Дерево',stone:'Камень',gold:'Золото'};
const briefCost=c=>Object.entries(c||{}).map(([k,v])=>`<span class="cost-unit">${uiIcon(k)}${number(v)}</span>`).join(' ');
function buildingBenefit(id,p,level=1){const b=buildingInfo[id];if(!b)return '';if(b.resource)return `+${Math.round(b.perLevel*level*(1+.25*(p?.tech?.economy||0)))}/с ${({food:'еды',wood:'древесины',stone:'камня',gold:'золота'})[b.resource]}`;if(id==='city')return `+${Math.round(5*level*(1+.25*(p?.tech?.economy||0)))}/с еды и золота · +${260*level} лимит · +${3*level} набор/с`;if(id==='barracks')return `+${430*level} лимит · +${5*level} набор/с`;if(id==='fort')return `до +${(18.5*level).toFixed(1)} защиты в радиусе 4`;return b.detail;}
function techBenefit(id,level){if(id==='economy')return `Множитель дохода ×${(1+level*.25).toFixed(2)}`;if(id==='war')return `Атака эффективнее · защита +${(1.9*level).toFixed(1)} · набор +${2*level} войск/с`;if(id==='logistics')return `Затраты войск при захвате −${8*level}%`;return '';}
function resourceRates(p){
 const c=E.counts(state,p.id),land=p.land||0,m=1+(p.tech.economy||0)*.25;
 const gross=p.income||{
  food:Math.round((2+land/100+c.farm*8+c.city*5)*m),
  wood:Math.round((1+land/180+c.lumber*7)*m),
  stone:Math.round((1+land/200+c.quarry*7)*m),
  gold:Math.round((1+land/220+c.mine*7+c.city*5)*m)
 };
 const cap=p.troopCap||Math.floor(900+land*2.4+c.barracks*430+c.city*260);
 const expected=Math.max(0,Math.min(cap-p.troops,Math.round(4+land/100+p.troops*.018+c.barracks*5+c.city*3+p.tech.war*2)));
 const recruited=p.troopIncome===undefined?Math.min(expected,Math.floor(((p.res.food||0)+gross.food)/.2)):p.troopIncome;
 const foodNet=Math.floor(gross.food||0)-Math.ceil(Math.max(0,recruited||0)*.2);
 return {gross,recruited,foodNet};
}
function resourceStrip(p){const {gross,recruited,foodNet}=resourceRates(p);return `<div class="resource-ledger">`+Object.keys(nameResource).map(k=>{
 const net=k==='food'?foodNet:Math.floor(gross[k]||0);
 return `<div class="ledger-item" data-ledger="${k}">${uiIcon(k)}<div class="ledger-values"><span class="ledger-name">${nameResource[k]}</span><strong>${number(p.res[k])}</strong><small class="${net<0?'is-negative':''}">${net>=0?'+':'−'}${number(Math.abs(net))}/с</small></div></div>`;
 }).join('')+`</div>`;}

const costText=c=>Object.entries(c||{}).map(([k,v])=>({wood:'Древесина',stone:'Камень',gold:'Золото',food:'Еда'}[k]||k)+' '+v).join(' · ');
const number=n=>Math.floor(n||0).toLocaleString('ru-RU');
let dragAttack=null,longPressTimer=null,dragHint=null;
let state=null,myId=null,host=false,demo=false,peer=null,upstream=null,code='',connections=new Map(),lastSendTime=new Map(),phaseShown='',timer=0;
let lastHudPlayer=null,lastHudTick=-1,lastHudLand=null,lastHudOwners=null,lastHudArmies=new Map(),hudNotice=null,hudAlertAction=null;
let activeThreats=[],announcedThreats=new Set(),lastThreatSignature="",attackFocusIndex=0;
let quickBuildOpen=false,buildPlacementChecks=0;
let zoom=1.05,camX=0,camY=0,terrainSeed=null,pressed=new Map(),pointerStart=null,gesture=null,selected=null,buildMode=null,currentTab='build',percent=30,tooltipTimer=null,worldLayer=null,paintedRevision=-1,miniRevision=-1,renderQueued=false,panelOpen=false;let toastTimeout=null,target=null,redirectArmy=null,pauseSolo=false,moveCursor=null,lastTap=0,lastStateAt=Date.now(),pendingOrders=new Map(),seq=0,readyLocal=false,reconnectTries=0,reconnectTimer=null,connectTimer=null,tokenStore=new Map(),previousFocus=null,showTutorialOnce=true,lastRoster='',previousOwners=new Map(),previousRevs=new Map(),lastSaveTick=-1,oldArmyPositions=new Map(),movementStart=0,lastAnnounced='',frontIndex=0;
const TILE=14;const mine=()=>state?.players.find(p=>p.id===myId);const color=id=>state?.players.find(p=>p.id===id)?.color||'#e8f3f3';
function toast(msg,kind){
 const inGame=!$('game').classList.contains('hidden');
 const t=inGame?$('gameToast'):$('toast');
 const severity=kind||(/не хватает|отклонён|ошибк|нет связи|невозмож|не удало|недоступ|разрыв|устарел/i.test(String(msg))?'error':/готова|выполнен|побед|началось|исследован/i.test(String(msg))?'success':'info');
 t.dataset.kind=severity;t.textContent=msg;$('gameError').textContent=severity==='error'?msg:'';
 $('toast').classList.add('hidden');
 t.classList.remove('hidden');
 clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>t.classList.add('hidden'),2450);
}
function show(screen){
 for(const name of ['lobby','waiting','game'])$(name).classList.toggle('hidden',name!==screen);
 if(screen==='game'){$('toast').classList.add('hidden');setTimeout(resize,10);}
 else $('gameToast').classList.add('hidden');
 if(screen==='lobby')updateResume();
}
function error(s){$('lobbyError').textContent=s;toast(s);}
// One auxiliary surface at a time. No panel stacks above another.
const AUX_IDS=['economyPanel','armiesPanel','quickLeadersPanel','contextCard'];
function hideAux(){
 const closingContext=!$('contextCard').classList.contains('hidden');
 for(const id of AUX_IDS)$(id)?.classList.add('hidden');
 $('auxBackdrop')?.classList.add('hidden');document.body.classList.remove('aux-open');
 // Never reopen a dismissed object card on the next network tick.
 if(closingContext)selected=null;
}
function showAux(id){
 const el=$(id);if(!el)return;
 const wasOpen=!el.classList.contains('hidden');
 hideAux();if(wasOpen)return;
 if(id!=='contextCard')selected=null;
 if(panelOpen)closePanel();
 el.classList.remove('hidden');$('auxBackdrop')?.classList.remove('hidden');document.body.classList.add('aux-open');
}

function name(){const val=$('nickname').value.trim().slice(0,18)||'Королевство';try{localStorage.setItem('bk-name',val);}catch(_){ }return val;}
function randomCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',v=new Uint8Array(6);crypto.getRandomValues(v);return Array.from(v,b=>chars[b%chars.length]).join('');}
function urlRoom(){return location.origin+location.pathname+'#'+code;}
function compress(arr){let chunks=[];for(let i=0;i<arr.length;i+=8192)chunks.push(String.fromCharCode(...arr.slice(i,i+8192)));return btoa(chunks.join(''));}
function expand(str){const raw=atob(str),out=new Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out;}
function rlePack(arr){const b=[];for(let i=0;i<arr.length;){const id=arr[i];let n=1;while(i+n<arr.length&&arr[i+n]===id&&n<65535)n++;b.push(id,n&255,n>>8);i+=n;}return compress(b);}
function rleUnpack(data){const a=expand(data),out=[];for(let i=0;i<a.length;i+=3){const id=a[i],n=a[i+1]+256*a[i+2];for(let j=0;j<n;j++)out.push(id);}return out;}
function pack(s,includeTerrain=true){if(!s||!s.owners?.length)return s;return {...s,tiles:includeTerrain?compress(s.tiles):null,owners:rlePack(s.owners),ownerRle:true,packed:true};}
function unpack(s){if(s?.ownerDelta){const owners=state?.owners?.slice();if(!owners?.length)throw Error('Missing state for delta');for(let i=0;i<s.owners.length;i+=2)owners[s.owners[i]]=s.owners[i+1];s.owners=owners;s.tiles=state.tiles;delete s.ownerDelta;}if(s?.packed){s.tiles=s.tiles?expand(s.tiles):(state?.tiles||[]);s.owners=s.ownerRle?rleUnpack(s.owners):expand(s.owners);delete s.ownerRle;delete s.packed;}return s;}
function getPeer(){if(window.Peer)return true;error('Не загрузилась библиотека PeerJS. Проверь интернет.');return false;}
function setBusy(v){$('hostButton').disabled=v;$('joinButton').disabled=v;}
function setNetwork(text){
 $('networkStatus').textContent=text;
 $('feedbackStatus').textContent=text==='ОДИНОЧНО'?'ОДИНОЧНАЯ ИГРА':'СЕТЬ · '+text;
 if(state?.phase==='playing'&&!$('game').classList.contains('hidden'))refreshHudAlert(mine());
}
function warnHud(text,kind='notice',action=null,seconds=6){hudNotice={text,kind,action,until:Date.now()+seconds*1000};refreshHudAlert(mine());}
function hostileAttacks(p){
 if(!state||!p||state.phase!=='playing')return [];
 return state.armies.filter(a=>a.strength>0&&a.owner!==myId&&a.targetOwner===myId&&!p.allies.includes(a.owner));
}
function focusThreat(a){
 if(!a)return;
 const tx=Math.max(0,Math.min(E.W-1,Math.round(a.x))),ty=Math.max(0,Math.min(E.H-1,Math.round(a.y)));
 hideAux();if(panelOpen)closePanel();
 const r=canvas.getBoundingClientRect();
 zoom=Math.max(.9,zoom);$('zoomText').textContent=Math.round(zoom*100)+'%';
 camX=r.width/2-(tx+.5)*TILE*zoom;
 camY=r.height/2-(ty+.5)*TILE*zoom;
 clampCamera();setPreview(null);queueDraw();
}
function threatDistance(a,p){
 const c=p?.capital;return c?Math.round(Math.hypot(a.x-c.x,a.y-c.y)):999;
}
function setThreatList(open){
 const expanded=!!open&&activeThreats.length>1;
 $('threatList').classList.toggle('hidden',!expanded);
 $('threatExpand').setAttribute('aria-expanded',String(expanded));
}
function updateIncomingAttack(p){
 const threats=hostileAttacks(p).sort((a,b)=>threatDistance(a,p)-threatDistance(b,p)||b.strength-a.strength);
 activeThreats=threats;
 $('threatRail').classList.toggle('hidden',!threats.length);
 $('threatExpand').classList.toggle('hidden',threats.length<2);
 if(!threats.length){lastThreatSignature='';announcedThreats.clear();setThreatList(false);return;}
 const attackers=[...new Set(threats.map(a=>a.owner))].map(id=>E.person(state,id)?.name||'Противник');
 const force=threats.reduce((sum,a)=>sum+Math.max(0,a.strength),0);
 const signature=threats.map(a=>a.id).sort().join(',');
 $('incomingTitle').textContent=threats.length===1?'НА ВАС НАПАЛИ':`АТАКИ · ${threats.length} ФРОНТА`;
 $('incomingDetail').textContent=`${attackers.join(', ')} · ${number(force)} войск противника`;
 $('threatCount').textContent=threats.length;
 $('incomingAttack').setAttribute('aria-label',threats.length>1?'Перейти к следующей из '+threats.length+' угроз':'Перейти к месту нападения');
 patchHtml('threatItems',threats.map((a,i)=>{
  const attacker=E.person(state,a.owner),distance=threatDistance(a,p);
  return `<button type="button" data-focus-threat="${esc(a.id)}" class="threat-item"><i style="background:${attacker?.color||'#b94d40'}"></i><span><strong>${esc(attacker?.name||'Противник')}</strong><small>${number(a.strength)} войск · ${distance<999?'≈'+distance+' кл. от столицы':'на границе'}</small></span><b>${i+1} ↗</b></button>`;
 }).join(''));
 if(threats.length<2)setThreatList(false);
 if(signature!==lastThreatSignature){
  const fresh=threats.filter(a=>!announcedThreats.has(a.id));
  if(fresh.length){
   const name=E.person(state,fresh[0].owner)?.name||'Противник';
   $('incomingAnnouncement').textContent=`Внимание! ${name} атакует вашу территорию. Нажмите на предупреждение, чтобы перейти к месту сражения.`;
  }
  attackFocusIndex=0;
  announcedThreats=new Set(threats.map(a=>a.id));
  lastThreatSignature=signature;
 }
}
$('incomingAttack').onclick=()=>{
 if(!activeThreats.length)return;
 focusThreat(activeThreats[attackFocusIndex++%activeThreats.length]);setThreatList(false);
};
$('threatExpand').onclick=()=>setThreatList($('threatList').classList.contains('hidden'));
$('threatClose').onclick=()=>setThreatList(false);
$('threatItems').onclick=e=>{
 const b=e.target.closest('[data-focus-threat]');if(!b)return;
 const a=activeThreats.find(a=>a.id===b.dataset.focusThreat);
 if(a){focusThreat(a);setThreatList(false);}
};
document.addEventListener('pointerdown',e=>{
 if(!$('threatRail').contains(e.target)&&!$('threatList').classList.contains('hidden'))setThreatList(false);
});
function refreshHudAlert(p){
 const box=$('hudAlert');if(!box||!p||state?.phase!=='playing'){box?.classList.add('hidden');return;}
 let text='',kind='',action=null;
 const net=$('networkStatus')?.textContent||'';
 if(!host&&/ПЕРЕПОДКЛЮЧ|НЕТ СВЯЗИ|ЗАДЕРЖ|СИНХРОНИЗ|СЕРВИС|ПОДКЛЮЧ/.test(net)){text=`Соединение нестабильно · обновление ${Math.max(0,Math.floor((Date.now()-lastStateAt)/1000))} с назад. Приказы недоступны.`;kind='danger';}
 if(!text&&p.capital&&!activeThreats.length){
  const cap=p.capital;
  const attackers=state.armies.some(a=>a.owner!==myId&&!p.allies.includes(a.owner)&&Math.hypot(a.x-cap.x,a.y-cap.y)<9);
  let hostileBorder=false;
  for(let dy=-5;dy<=5&&!hostileBorder;dy++)for(let dx=-5;dx<=5;dx++){
   if(Math.abs(dx)+Math.abs(dy)>7)continue;
   const x=cap.x+dx,y=cap.y+dy;
   if(!E.inside(x,y))continue;
   const id=E.owner(state,x,y);
   if(id!==0&&id!==myId&&!p.allies.includes(id)){hostileBorder=true;break;}
  }
  if(attackers||hostileBorder){text='Угроза столице — проверь оборону';kind='danger';action='capital';}
 }
 if(!text&&hudNotice&&Date.now()<hudNotice.until){text=hudNotice.text;kind=hudNotice.kind;action=hudNotice.action;}
 if(!text&&p.troopIncome===0&&p.troops<p.troopCap&&p.res.food<1){text='Нет еды — набор войск остановлен';kind='notice';action='economy';}
 if(!text){
  const weak=state.armies.find(a=>a.owner===myId&&a.initialStrength>0&&a.strength/a.initialStrength<.15);
  if(weak){text='Один из походов почти потерял войска';kind='notice';action='armies';}
 }
 if(!text){box.classList.add('hidden');hudAlertAction=null;return;}
 box.classList.remove('hidden');box.classList.toggle('danger',kind==='danger');
 $('hudAlertIcon').textContent=kind==='danger'?'!':'i';$('hudAlertText').textContent=text;
 hudAlertAction=action;box.title=action?'Нажми, чтобы перейти к событию':text;
}
$('hudAlert').onclick=()=>{
 if(hudAlertAction==='capital'){centerOnCapital();queueDraw();}
 else if(hudAlertAction==='economy')showAux('economyPanel');
 else if(hudAlertAction==='armies'){showAux('armiesPanel');renderArmies();}
 else if(hudAlertAction&&typeof hudAlertAction==='object'){
  const {x,y}=hudAlertAction;camX=canvas.clientWidth/2-(x+.5)*TILE*zoom;camY=canvas.clientHeight/2-(y+.5)*TILE*zoom;clampCamera();queueDraw();
 }
 else $('hudAlert').classList.add('hidden');
};
function updateHudSignals(p){
 const pendingIncome=p.troopIncome===undefined,counts=E.counts(state,myId),estimatedCap=Math.floor(900+p.land*2.4+counts.barracks*430+counts.city*260),cap=pendingIncome?estimatedCap:p.troopCap;
 const projected=Math.max(0,Math.min(cap-p.troops,Math.round(4+p.land/100+p.troops*.018+counts.barracks*5+counts.city*3+p.tech.war*2)));
 const growth=pendingIncome?Math.min(projected,Math.floor((p.res.food||0)/.20)):Math.floor(p.troopIncome||0),full=p.troops>=cap-.5,lowFood=Number(p.res.food||0)<1;
 let reason='';if(growth===0){reason=full?'ЛИМИТ':lowFood?'НЕТ ЕДЫ':'НАБОР 0';}
 if(pendingIncome){$('troopGrowth').textContent='≈+'+number(growth)+'/с';$('troopCap').textContent='/ '+number(cap);}
 const cause=$('troopReason');cause.textContent=reason;cause.classList.toggle('hidden',!reason);
 $('hudTroops').title=`Резерв: ${number(p.troops)} из ${number(cap)}. ${reason||`Набор: +${number(growth)} в секунду`}`;
 const share=p.land/Math.max(1,state.landTotal)*100;
 $('landCount').textContent=share.toFixed(1).replace('.',',')+'%';
 $('landShare').textContent='цель 100%';
 $('landProgress').style.width=Math.max(0,Math.min(100,share)).toFixed(1)+'%';
 $('landCount').title=`Земля: ${number(p.land)} из ${number(state.landTotal)} клеток. До 100%: ${Math.max(0,100-share).toFixed(1)} п.п.`;
 $('frontCount').textContent=state.armies.filter(a=>a.owner===myId&&a.strength>0).length+'/12';
 document.querySelector('.clock-stat')?.classList.remove('is-urgent');
 if(lastHudPlayer!==myId||state.tick<lastHudTick){lastHudPlayer=myId;lastHudLand=null;lastHudOwners=null;lastHudArmies=new Map();hudNotice=null;activeThreats=[];announcedThreats.clear();lastThreatSignature="";}
 const currentArmies=new Map(state.armies.filter(a=>a.owner===myId).map(a=>[a.id,a]));
 if(lastHudLand!==null&&p.land<lastHudLand){
  let lost=null;
  if(lastHudOwners){for(let i=0;i<state.owners.length;i++)if(lastHudOwners[i]&&state.owners[i]!==myId){lost={x:i%E.W,y:Math.floor(i/E.W)};break;}}
  warnHud(`Потеряно ${number(lastHudLand-p.land)} клеток территории`, 'danger',lost,7);
 }
 if(lastHudLand!==null&&lastHudArmies.size){for(const [id,a] of lastHudArmies)if(!currentArmies.has(id)){
  const taken=Number(a.captured||0);
  warnHud(`Поход завершён${taken?' · захвачено '+number(taken)+' клеток':''}`, 'notice','armies',5);break;
 }}
 if(lastHudLand===null||state.territoryRevision!==updateHudSignals.lastRevision){
  lastHudOwners=Uint8Array.from(state.owners,v=>v===myId?1:0);updateHudSignals.lastRevision=state.territoryRevision;
 }
 lastHudLand=p.land;lastHudTick=state.tick;lastHudArmies=new Map([...currentArmies].map(([id,a])=>[id,{id,captured:a.captured,strength:a.strength}]));
 refreshHudAlert(p);
}

function getToken(){try{let t=sessionStorage.getItem('bk-token-'+code);if(!t){t=crypto.randomUUID();sessionStorage.setItem('bk-token-'+code,t);}return t;}catch(_){return code+'-'+name();}}
function saveSolo(){if(!demo||!state||state.phase!=='playing')return;try{localStorage.setItem('bk-v14-save',JSON.stringify(state));}catch(_){}}
function copyText(t){navigator.clipboard?.writeText(t).then(()=>toast('Скопировано')).catch(()=>prompt('Скопируй:',t));}
function canPay(p,c){return Object.entries(c||{}).every(([k,v])=>(p.res[k]||0)>=v);}
function deficit(p,c){return Object.entries(c||{}).filter(([k,v])=>(p.res[k]||0)<v).map(([k,v])=>({wood:'Древесина',stone:'Камень',gold:'Золото',food:'Еда'}[k]+': −'+(v-(p.res[k]||0)))).join(', ');}
function patchHtml(id,html){const el=$(id);if(el&&el.__last!==html){el.innerHTML=html;el.__last=html;}}
function inspectCell(x,y){if(!state||!E.inside(x,y))return;const id=E.owner(state,x,y),p=E.person(state,id),line=terrainNames[E.tile(state,x,y)]+' · '+(p?.name||'Свободная земля')+' · '+x+','+y;$('mapStatus').textContent=line;$('mapStatusMobile').textContent=line;$('mapStatusMobile').classList.remove('hidden');}
function setPreview(t){
 target=t;const box=$('targetPreview');box.classList.toggle('hidden',!t);$('game').classList.toggle('is-targeting',!!t);
 if(!t){queueDraw();return;}
 const owner=E.owner(state,t.x,t.y),enemy=E.person(state,owner),p=mine(),sent=Math.floor(p.troops*percent/100);
 const front=E.previewFront(state,myId,t.x,t.y),sea=E.tile(state,t.x,t.y)===0;
 const allied=!!enemy&&p.allies.includes(owner),received=!!enemy&&enemy.offers.includes(myId),sentOffer=!!enemy&&p.offers.includes(owner);
 const diplomatic=t.type==='send'&&!!enemy,offerButton=$('targetDiplomacy');
 offerButton.classList.toggle('hidden',!diplomatic);
 offerButton.disabled=!diplomatic||allied||sentOffer||!!enemy?.bot;
 offerButton.textContent=allied?'Союз заключён':received?'Принять предложение союза':sentOffer?'Предложение отправлено':enemy?.bot?'Бот не принимает союзы':'Предложить союз';
 box.dataset.diplomacy=allied?'allied':received?'received':sentOffer?'sent':enemy?.bot?'bot':'offer';
 const building=E.buildingAt(state,t.x,t.y);
 $('targetTitle').textContent=t.type==='redirect'?'Сменить направление':allied?'Союзник: '+enemy.name:enemy?'Территория: '+enemy.name:'Захват нейтральной земли';
 $('targetDetail').textContent=`${number(sent)} войск · в резерве ${number(p.troops-sent)} · ${terrainNames[E.tile(state,t.x,t.y)]}${building?' · '+(E.KINDS[building.kind]?.name||'Столица'):''}`;
 const defense=enemy?Math.round(E.tileDefense(state,owner,t.x,t.y)):0;const averageDefense=enemy&&front.cells.length?Math.round(front.cells.reduce((sum,i)=>sum+E.tileDefense(state,owner,i%E.W,Math.floor(i/E.W)),0)/front.cells.length):0;
 $('targetForecast').textContent=allied?'Это территория союзника. Атака запрещена, пока действует союз. Разорвать союз можно в разделе «Союзы».':
   t.type==='redirect'?'После подтверждения армия сменит направление.':
   sea?'Море непроходимо. Выбери сушу.':
   !front.cells.length?'Нет общей границы для наступления. Дипломатия доступна и без общей границы.':
   owner?`Участок: ${front.cells.length} клеток · защита фронта в среднем ${averageDefense} (цель ${defense}) · резерв врага: ${number(enemy?.troops||0)}. Прогноз приблизительный.`:
   `Начало захвата: выделенный участок границы (${front.cells.length} клеток), затем фронт расширится.`;
 $('confirmTarget').textContent=t.type==='redirect'?'Изменить цель':owner?'Атаковать':'Начать захват';
 $('confirmTarget').disabled=allied||!(t.type==='redirect'||(sent>=35&&(front.cells.length>0&&!sea)));
 if(t.type!=='redirect'&&!allied&&p.troops-sent<Math.max(75,Math.min(300,p.troopCap*.12)))$('targetForecast').textContent+=' Внимание: после приказа останется мало войск для обороны.';
 box.dataset.order=t.type;
 const projectedY=(t.y+.5)*TILE*zoom+camY,available=canvas.clientHeight-Math.min(270,Math.max(155,canvas.clientHeight*.37));
 if(projectedY>available){camY-=projectedY-available+18;clampCamera();}
 document.querySelectorAll('[data-target-percent]').forEach(b=>{const on=Number(b.dataset.targetPercent)===percent;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
 queueDraw();
}
function contextual(item){
 const box=$('contextCard'),content=$('contextBody');if(!item){if(!box.classList.contains('hidden'))hideAux();return;}
 const me=mine(),own=item.owner===myId,other=E.person(state,item.owner);let html='';
 if(item.kind&&item.kind!=='army'){
  const details=buildingInfo[item.kind],cost=E.costUpgrade(item),maxed=item.level>=4;
  const effect=details?buildingBenefit(item.kind,me,item.level):'Столица: оборона увеличивается с каждым уровнем';
  const next=details?buildingBenefit(item.kind,me,item.level+1):'Защита столицы увеличится';
  html=`<strong>${esc(E.KINDS[item.kind]?.name||'Столица')} · ур. ${item.level}</strong><span>${esc(other?.name||'')}</span><p class="context-benefit">Сейчас: ${esc(effect)}</p>${maxed?'':`<p class="context-next">После улучшения: ${esc(next)}</p>`}${own?`<button data-context-upgrade="${esc(item.id)}" ${maxed||!canPay(me,cost)?'disabled':''}>${maxed?'Максимальный уровень':`Улучшить · ${briefCost(cost)}`}</button>${!maxed&&!canPay(me,cost)?`<small>Не хватает: ${deficit(me,cost)}</small>`:''}`:''}`;
 }else html=`<strong>Армия · ${esc(other?.name||'')}</strong><span>${number(item.strength)} солдат · ${item.tx},${item.ty}</span>${own?`<button data-context-redirect="${esc(item.id)}">Сменить цель</button><button data-context-return="${esc(item.id)}">Отступить</button>`:''}`;
 if(content.__last!==html){content.innerHTML=html;content.__last=html;}if(box.classList.contains('hidden'))showAux('contextCard');
}
function createRoom(){if(!getPeer())return;setBusy(true);code=randomCode();host=true;demo=false;readyLocal=true;peer=new Peer('bk-'+code);setNetwork('ПОДКЛЮЧЕНИЕ');
 connectTimer=setTimeout(()=>{if(!state){setBusy(false);error('Не удалось создать комнату. Повтори попытку.');try{peer.destroy();}catch(_){}}},12000);
 peer.on('open',()=>{clearTimeout(connectTimer);setBusy(false);state=E.lobby(Date.now());myId=E.addPlayer(state,name());state.players[0].ready=true;state.settings={bots:Number($('botCount').value)};setNetwork('ВЕДУЩИЙ');try{history.replaceState(null,'','#'+code);}catch(_){}phaseShown='';render();});
 peer.on('connection',joinConnection);peer.on('error',e=>{setBusy(false);error('Комната: '+(e.message||e.type||'ошибка'));});
 peer.on('disconnected',()=>setNetwork('СЕРВИС НЕДОСТУПЕН'));
}
function joinRoom(){if(!getPeer())return;code=$('roomCode').value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,9);if(!code)return error('Введи код комнаты.');setBusy(true);host=false;demo=false;peer=new Peer();setNetwork('ПОДКЛЮЧЕНИЕ');
 connectTimer=setTimeout(()=>{if(!state){setBusy(false);error('Комната не отвечает. Проверь код.');try{peer.destroy();}catch(_){}}},14000);
 peer.on('open',()=>connectUpstream());peer.on('error',e=>{setBusy(false);error('Подключение: '+(e.message||e.type||'ошибка'));});
}
function connectUpstream(){if(!peer||peer.destroyed)return;upstream=peer.connect('bk-'+code,{reliable:true});
 upstream.on('open',()=>{upstream.send({t:'join',name:name(),token:getToken()});});
 upstream.on('data',m=>{if(!m||typeof m!=='object')return;if(m.t==='welcome'){clearTimeout(connectTimer);setBusy(false);reconnectTries=0;myId=m.id;state=unpack(m.state);lastStateAt=Date.now();phaseShown=state.phase==='playing'?'':phaseShown;setNetwork('В СЕТИ');render();}else if(m.t==='state'){if(m.state?.ownerDelta&&m.state.ownerBaseRev!==state?.territoryRevision){upstream.send({t:'resync'});setNetwork('СИНХРОНИЗАЦИЯ');return;}const before=state?.armies||[];oldArmyPositions=new Map(before.map(a=>[a.id,{x:a.x,y:a.y}]));movementStart=performance.now();state=unpack(m.state);lastStateAt=Date.now();setNetwork('В СЕТИ');render();}else if(m.t==='ack'){pendingOrders.delete(m.id);toast(m.ok?'Приказ выполнен':m.error||'Приказ отклонён');if(m.ok&&m.action==='build'){cancelMode();}}else if(m.t==='error'){toast(m.message);}});
 upstream.on('close',()=>{setNetwork('ПЕРЕПОДКЛЮЧЕНИЕ');retryUpstream();});upstream.on('error',()=>{setNetwork('НЕТ СВЯЗИ');});
}
function retryUpstream(){if(host||demo||!peer||peer.destroyed)return;clearTimeout(reconnectTimer);if(++reconnectTries>8){setNetwork('НЕТ СВЯЗИ');toast('Ведущий не отвечает. Его вкладка должна оставаться открытой.');return;}reconnectTimer=setTimeout(connectUpstream,Math.min(12000,1000*reconnectTries));}
function joinConnection(conn){conn.on('data',m=>{if(!m||typeof m!=='object')return;
 if(m.t==='join'){
  if(connections.has(conn))return;
  let id=tokenStore.get(m.token);const old=state.players.find(p=>p.id===id);
  if(!old||old.bot){if(state.phase!=='lobby'){conn.send({t:'error',message:'Игра уже идёт. Войти можно только с прежнего устройства.'});return;}id=E.addPlayer(state,m.name);if(!id){conn.send({t:'error',message:'Комната заполнена.'});return;}}
  if(m.token)tokenStore.set(m.token,id);
  for(const [c,v] of connections)if(v===id&&c!==conn){connections.delete(c);previousOwners.delete(c);previousRevs.delete(c);try{c.close();}catch(_){ }}
  state.players.find(p=>p.id===id).connected=true;connections.set(conn,id);conn.send({t:'welcome',id,state:pack(state)});previousOwners.delete(conn);previousRevs.delete(conn);broadcast(false);
 }else if(m.t==='resync'){conn.send({t:'state',state:pack(state,true)});previousOwners.set(conn,state.owners.slice());previousRevs.set(conn,state.territoryRevision);}else if(m.t==='spawn'){const id=connections.get(conn);const p=E.person(state,id);if(p&&state.phase==='lobby'){p.spawnPreference=['northwest','northeast','southwest','southeast','auto'].includes(m.choice)?m.choice:'auto';broadcast();}}else if(m.t==='ready'){const id=connections.get(conn);const p=E.person(state,id);if(p&&state.phase==='lobby'){p.ready=!!m.value;broadcast();}}
 else if(m.t==='settings'){/* only the room host may edit settings */}
 else if(m.t==='action'){
  const id=connections.get(conn);if(!id)return;const now=Date.now();if(now-(lastSendTime.get(conn)||0)<75)return;
  lastSendTime.set(conn,now);const result=E.action(state,id,m.action);conn.send({t:'ack',id:m.id,ok:result.ok,error:result.error,action:m.action?.type});if(result.ok)broadcast();
 }
 });conn.on('close',()=>{const id=connections.get(conn);connections.delete(conn);previousOwners.delete(conn);previousRevs.delete(conn);lastSendTime.delete(conn);if(id){const p=E.person(state,id);if(p){if(state.phase==='lobby'){state.players=state.players.filter(v=>v.id!==id);for(const [token,pid] of tokenStore)if(pid===id)tokenStore.delete(token);}else{p.connected=false;p.ready=false;}}broadcast();}});}
function broadcast(includeTerrain=false){if(!state)return;const packed=pack(state,includeTerrain);for(const c of connections.keys())if(c.open){try{let delta=null,old=previousOwners.get(c);if(!includeTerrain&&old&&old.length===state.owners.length&&state.phase==='playing'){const changes=[];for(let i=0;i<old.length;i++)if(old[i]!==state.owners[i])changes.push(i,state.owners[i]);if(changes.length<state.owners.length*.32)delta=changes;}const out=delta?{...packed,owners:delta,ownerDelta:true,ownerBaseRev:previousRevs.get(c),packed:false}:packed;c.send({t:'state',state:out});previousOwners.set(c,state.owners.slice());previousRevs.set(c,state.territoryRevision);}catch(_){}}render();}
function savedSolo(){try{const x=JSON.parse(localStorage.getItem('bk-v14-save')||'null');return x?.phase==='playing'&&x.version===14?x:null;}catch(_){return null;}}
function updateResume(){const b=$('resumeButton');if(b)b.classList.toggle('hidden',!savedSolo());}
function createDemo(resume=false){
 lastHudLand=null;lastHudTick=-1;lastHudOwners=null;lastHudArmies=new Map();hudNotice=null;activeThreats=[];announcedThreats.clear();lastThreatSignature="";
 worldLayer=null;paintedRevision=-1;host=true;demo=true;pauseSolo=false;code='DEMO';
 const previous=resume?savedSolo():null;state=previous||E.lobby(Date.now());
 myId=state.players[0]?.id||E.addPlayer(state,name());
 if(state.phase==='lobby'){state.settings={bots:Number($('soloBots').value)};E.start(state,Number($('soloBots').value));}
 phaseShown='';setNetwork('ОДИНОЧНО');render();if(!resume)showTutorial();
}
function startGame(){if(!host)return;const waiting=state.players.filter(p=>!p.bot&&p.connected!==false&&!p.ready);if(waiting.length)return toast('Ожидаем готовность: '+waiting.map(p=>p.name).join(', '));state.settings={bots:Number($('botCount').value)};const res=E.start(state,state.settings.bots);if(!res.ok)return toast(res.error);broadcast(true);showTutorial();}
function command(a){if(!state||state.phase!=='playing')return false;
 if(host){const r=E.action(state,myId,a);if(!r.ok){toast(r.error);return false;}broadcast();if(a.type==='build'){toast('Построено · можно поставить ещё');refreshQuickBuild();}else if(a.type==='send'){toast('Наступление началось');}return true;}
 if(upstream?.open){if(Date.now()-lastStateAt>4500){setNetwork('НЕТ СВЯЗИ');toast('Данные устарели. Подожди восстановления соединения перед приказом.');return false;}const id=++seq;pendingOrders.set(id,Date.now());upstream.send({t:'action',id,action:a});return true;}toast('Нет связи с комнатой.');return false;}
function showTutorial(){if(!showTutorialOnce)return;try{localStorage.setItem('bk-v9-tutorial','yes');}catch(_){}showTutorialOnce=false;}

function render(){if(!state)return;
 if(state.phase==='lobby'){
  $('victory').classList.add('hidden');show('waiting');$('showCode').textContent=code;$('roomHeadingLabel').textContent=host?'КОМНАТА ГОТОВА':'ТЫ В КОМНАТЕ';$('roomMembersCount').textContent=state.players.filter(p=>!p.bot).length+' участн.';
  patchHtml('waitingPlayers',state.players.map(p=>`<div class="player-row"><i class="player-dot" style="background:${p.color}"></i><strong>${esc(p.name)}</strong><span class="muted">${p.id===myId?'Ты':p.id===1?'Ведущий':''} · ${p.connected===false?'Не в сети':p.ready?'Готов':'Ожидание'}</span></div>`).join(''));
  $('startButton').classList.toggle('hidden',!host);$('readyButton').classList.toggle('hidden',host);$('readyButton').setAttribute('aria-pressed',String(readyLocal));$('readyButton').textContent=readyLocal?'Готов ✓':'Я готов';$('botCount').disabled=!host;$('spawnChoice').disabled=!!mine()?.ready&&!host;
  $('startButton').disabled=!state.players.filter(p=>!p.bot).every(p=>p.ready||p.connected===false);$('botCount').value=state.settings?.bots??0;
  $('waitingHint').textContent='Игроков: '+state.players.filter(p=>!p.bot).length+' · Ведущий должен держать страницу открытой.'; $('roomSettingsSummary').textContent=(state.settings?.bots??0)+' ботов · без ограничения времени';
  phaseShown='lobby';return;
 }
 if(phaseShown!=='playing'&&phaseShown!=='ended'){
  lastHudLand=null;lastHudTick=-1;lastHudOwners=null;lastHudArmies=new Map();hudNotice=null;activeThreats=[];announcedThreats.clear();lastThreatSignature="";
  show('game');phaseShown='playing';zoom=window.innerWidth<600?.54:.78;setMinimapExpanded(window.innerWidth>=850);resize();centerOnCapital();
 }else if(phaseShown==='ended'&&state.phase==='playing'){phaseShown='playing';}
 updateUI();repaintWorld();queueDraw();
 if(state.phase==='ended'&&phaseShown!=='ended'){
  phaseShown='ended';const w=state.players.find(p=>p.id===state.winner),me=mine();
  const outcome=!w?'draw':w.id===myId?'win':'loss';
  const reason='Победитель контролирует все 100% суши.';
  const duration=Math.floor(state.tick/60)+' мин '+String(state.tick%60).padStart(2,'0')+' сек';
  $('victoryName').textContent=outcome==='win'?'Победа!':outcome==='loss'?'Поражение':'Ничья';
  $('victoryEyebrow').textContent=outcome==='win'?'ТВОЁ КОРОЛЕВСТВО':outcome==='loss'?'МАТЧ ЗАВЕРШЁН':'МАТЧ ЗАВЕРШЁН';
  $('resultEmblem').textContent=outcome==='win'?'★':outcome==='loss'?'⚔':'◈';
  $('resultSheet').dataset.outcome=outcome;
  $('victoryDesc').textContent=outcome==='win'?'Твоё королевство победило.':outcome==='loss'?`Победитель: ${w?.name||'соперник'}.`:'Победитель не определён.';
  $('victoryReason').textContent=reason;
  const landPct=((me?.land||0)/Math.max(1,state.landTotal)*100).toFixed(1)+'%';
  const stats=[['ТЕРРИТОРИЯ',landPct],['ЗАХВАЧЕНО СТОЛИЦ',number(me?.kills)],['ПОСТРОЕК',number(state.buildings.filter(b=>b.owner===myId).length)],['ДЛИТЕЛЬНОСТЬ',duration]];
  $('victoryStats').innerHTML=stats.map(([label,value])=>`<div class="result-stat"><small>${label}</small><b>${value}</b></div>`).join('');
  $('restart').disabled=!host&&!demo;$('restart').textContent=host||demo?'Сыграть снова':'Ждём ведущего…';
  $('victory').classList.remove('hidden');
 }
}
function updateUI(){const p=mine();if(!p)return;
 // Before the first economy tick, derive the same production formula as the engine,
 // rather than showing a misleading +0/s for every resource.
 const {gross,recruited,foodNet}=resourceRates(p);
 for(const r of ['food','wood','stone','gold']){
  const suffix=r[0].toUpperCase()+r.slice(1),amount=Math.floor(p.res[r]||0);
  const rate=r==='food'?foodNet:Math.floor(gross[r]||0);
  $('res'+suffix).textContent=number(amount);
  const rateNode=$('inc'+suffix),item=rateNode.closest('[data-resource]');
  rateNode.textContent=(rate>=0?'+':'−')+number(Math.abs(rate))+'/с';
  rateNode.classList.toggle('resource-negative',rate<0);
  item.classList.toggle('resource-low',r==='food'&&amount<Math.max(12,Math.abs(rate)*5));
  item.setAttribute('title',`${nameResource[r]}: ${number(amount)}. ${r==='food'?'Примерный чистый прирост после набора войск':'Производство'}: ${rate>=0?'+':'−'}${number(Math.abs(rate))} в секунду`);
 }

 updateIncomingAttack(p);
 $('troopCount').textContent=number(p.troops);$('troopCap').textContent='/ '+number(p.troopCap);$('troopGrowth').textContent='+'+number(p.troopIncome||0)+'/с';updateHudSignals(p);$('myKingdom').textContent=p.name+(p.eliminated?' · РАЗГРОМ':'');$('myKingdom').title=p.name;$('myKingdom').style.color=p.color;
 const sent=Math.floor(p.troops*percent/100);$('sendingTroops').textContent=number(sent);$('remainingTroops').textContent=number(p.troops-sent);$('activeArmies').textContent=state.armies.filter(a=>a.owner===myId).length+'/12';$('dockSummary').textContent=percent+'%';if(target)setPreview(target);const frontNum=state.armies.filter(a=>a.owner===myId).length;$('frontCountBadge').textContent=String(frontNum);$('frontCountBadge').classList.toggle('hidden',frontNum===0);$('armiesToggle').setAttribute('aria-label',`Мои походы: ${frontNum}`);$('armiesToggle').classList.toggle('has-fronts',state.armies.some(a=>a.owner===myId));renderArmies();
 const top=[...state.players].filter(p=>p.land>0).sort((a,b)=>b.land-a.land);
 patchHtml('quickLeadersList',top.slice(0,6).map(v=>'<div class="quick-row"><span style="background:'+v.color+'"></span><b>'+esc(v.name)+'</b><small>'+number(v.land)+' клеток</small></div>').join(''));
 patchHtml('leaderboard',top.slice(0,9).map((v,i)=>`<div class="leader-row"><span>${i+1}.</span><i class="player-dot" style="background:${v.color}"></i><span class="leader-name" title="${esc(v.name)}">${esc(v.name)}${v.bot?' · Bot':''}</span><div class="bar"><i style="width:${Math.max(3,v.land/Math.max(1,top[0].land)*100)}%;background:${v.color}"></i></div><div>${number(v.land)}</div></div>`).join(''));
 if(currentTab==='build'){
  patchHtml('buildResourceSummary',resourceStrip(p));
  updateBuildCards(p);
 }else if(currentTab==='tech'){
  patchHtml('techResourceSummary',resourceStrip(p));
  updateTechCards(p);
 }else if(currentTab==='diplomacy'){
  patchHtml('diplomacyPanel',state.players.filter(v=>v.id!==myId&&!v.eliminated).map(v=>`<div class="dip-item"><div class="dip-heading"><i class="dip-color" style="background:${v.color}"></i><strong>${esc(v.name)}</strong></div><p>${number(v.land)} клеток · ${p.allies.includes(v.id)?'Союзник':p.offers.includes(v.id)?'Предложение отправлено':v.offers.includes(myId)?'Предлагает союз':'Нейтральный'}</p><div class="dip-actions"><button class="${p.allies.includes(v.id)?'dip-danger':'dip-accept'}" data-ally="${v.id}">${p.allies.includes(v.id)?'Разорвать союз':v.offers.includes(myId)?'Принять союз':'Предложить союз'}</button>${p.allies.includes(v.id)?`<button data-donate="${v.id}">Подарить 100 золота</button>`:''}</div></div>`).join(''));
 }else{
  patchHtml('infoPanel',`<div class="info-stat"><span>Территория</span><strong>${number(p.land)} / ${number(state.landTotal)} · ${(p.land/Math.max(1,state.landTotal)*100).toFixed(1)}%</strong></div><div class="info-stat"><span>До победы (100%)</span><strong>${Math.max(0,(100-p.land/Math.max(1,state.landTotal)*100)).toFixed(1)}%</strong></div><div class="info-stat"><span>Армии</span><strong>${state.armies.filter(a=>a.owner===myId).length}/12</strong></div><div class="info-stat"><span>Здания</span><strong>${state.buildings.filter(b=>b.owner===myId).length}</strong></div>`);patchHtml('events',state.log.map(msg=>`<div>${esc(msg)}</div>`).join(''));
 }
 patchHtml('economyDetails',resourceStrip(p)+`<div class="economy-army"><strong>Армия: ${number(p.troops)} / ${number(p.troopCap)}</strong><small>Набор: +${number(p.troopIncome||0)}/с ${p.troops>=p.troopCap?'· лимит':'· зависит от еды и зданий'}</small><small>Расход еды на набор: ≈${((p.troopIncome||0)*.2).toFixed(1)}/с</small></div>`);
 patchHtml('accessibleObjects',state.buildings.filter(b=>b.owner===myId).slice(0,30).map(b=>'<li>'+esc(E.KINDS[b.kind]?.name||'Столица')+' '+b.x+','+b.y+'</li>').join('')+state.armies.filter(a=>a.owner===myId).map(a=>'<li>Армия '+number(a.strength)+' солдат, '+a.x+','+a.y+'</li>').join(''));
 if(state.log?.[0]&&state.tick>3&&state.log[0]!==lastAnnounced){const message=state.log[0];lastAnnounced=message;if(/захватил столицу|разгром|победил|союз/.test(message.toLowerCase()))toast(message);}
 updateSelection();refreshQuickBuild();
}

/* v24: keep live research buttons mounted when resource totals change.
   Rebuilding a button each tick changes layout and drops an in-flight touch. */
function updateTechCards(p){
 const panel=$('techPanel'),entries=Object.entries(E.TECH);
 const key=entries.map(([id])=>id+':'+(p.tech[id]||0)).join('|');
 if(panel.dataset.structure!==key){
  panel.innerHTML=entries.map(([id,t])=>{
   const level=p.tech[id]||0,cost=E.costTech(id,level);
   return `<div class="tech-item tech-detail" data-tech-card="${esc(id)}">
     <div class="tech-heading">${uiIcon(id)}<strong>${esc(t.name)}</strong><span>Уровень ${level}/3</span></div>
     <p>${esc(techBenefit(id,level))}</p>
     <div class="tech-next">${level<3?'После исследования: '+esc(techBenefit(id,level+1)):'Максимальный уровень'}</div>
     <small class="tech-cost">${level<3?'Цена: '+briefCost(cost):'Все исследования завершены'}</small>
     <div class="tech-availability" data-tech-status="${esc(id)}"></div>
     <button type="button" data-research="${esc(id)}">${level<3?'Исследовать':'Исследовано'}</button>
   </div>`;
  }).join('');
  panel.dataset.structure=key;
 }
 for(const [id] of entries){
  const level=p.tech[id]||0,cost=E.costTech(id,level);
  const affordable=level<3&&!p.eliminated&&canPay(p,cost);
  const button=panel.querySelector('[data-research="'+id+'"]'),status=panel.querySelector('[data-tech-status="'+id+'"]');
  if(!button||!status)continue;
  button.disabled=!affordable;
  const message=level>=3?'Максимальный уровень':p.eliminated?'Королевство разгромлено':affordable?'Доступно для исследования':'Не хватает: '+deficit(p,cost);
  if(status.textContent!==message)status.textContent=message;
  status.title=message;
  status.classList.toggle('can-research',affordable);
 }
}
function updateBuildCards(p){
 const panel=$('buildingsPanel'),entries=Object.entries(E.KINDS),counts=E.counts(state,myId);
 const signature=JSON.stringify([p.tech,entries.map(([id])=>[id,counts[id]||0,state.buildings.filter(b=>b.owner===myId&&b.kind===id).length])]);
 if(panel.dataset.structure!==signature){
  panel.innerHTML=entries.map(([id,k])=>{
   const info=buildingInfo[id],count=counts[id]||0,quantity=state.buildings.filter(b=>b.owner===myId&&b.kind===id).length;
   return `<button type="button" data-build="${esc(id)}" class="build-btn build-detail">
     <span class="build-icon">${uiIcon(id)}</span><span class="build-copy"><strong>${esc(k.name)}</strong><small>${esc(info.short)}</small></span>
     <span class="build-gain">${esc(buildingBenefit(id,p,1))}</span>
     <span class="build-meta">${esc(info.place)} · Построено: ${quantity}${count?' (уровней: '+count+')':''}</span>
     <span class="build-price">${briefCost(k.cost)}</span>
     <span class="build-short" data-build-status="${esc(id)}"></span>
    </button>`;
  }).join('');
  panel.dataset.structure=signature;
 }
 for(const [id,k] of entries){
  const button=panel.querySelector('[data-build="'+id+'"]'),status=panel.querySelector('[data-build-status="'+id+'"]');
  if(!button||!status)continue;
  const ok=canPay(p,k.cost);
  button.disabled=!ok||!!p.eliminated;
  button.classList.toggle('active',buildMode===id);
  const message=ok?'':'Не хватает: '+deficit(p,k.cost);
  if(status.textContent!==message)status.textContent=message;
  status.title=message;
 }
}
function updateSelection(){const item=selected?.kind==='army'?state.armies.find(a=>a.id===selected.id):selected?.kind==='building'?state.buildings.find(b=>b.id===selected.id):null;contextual(item);const box=$('selectedPanel');if(!item){box.textContent='Коснись объекта на карте. Для атаки выбери цель и подтверди приказ.';return;}box.textContent=(item.kind?E.KINDS[item.kind]?.name||'Столица':'Армия')+' · '+(E.person(state,item.owner)?.name||'')+' · '+(item.strength?number(item.strength)+' войск':'уровень '+item.level);}
// Fast-build selection: choosing a building does not spend resources.
// Placement is performed with a separate map tap after the player sees legal cells.
function refreshQuickBuild(){
 const p=mine(),container=$('quickBuildChoices');if(!container||!p||!state)return;
 const html=Object.entries(E.KINDS).map(([id,item])=>{
  const costs=Object.entries(item.cost).map(([r,n])=>`${({food:'Е',wood:'Д',stone:'К',gold:'З'})[r]}${n}`).join(' ');
  const affordable=Object.entries(item.cost).every(([r,n])=>(p.res[r]||0)>=n);
  return `<button type="button" class="quick-build-item ${buildMode===id?'chosen':''} ${!affordable?'unaffordable':''}" data-fast-build="${id}" aria-pressed="${buildMode===id}" title="${esc(item.name)} — ${esc(buildingInfo[id]?.short||'')} · ${costs}">${uiIcon(id)}<span>${esc(item.name)}</span><small>${costs}</small></button>`;
 }).join('');
 if(container.dataset.html!==html){const scroll=container.scrollLeft;container.innerHTML=html;container.dataset.html=html;container.scrollLeft=scroll;}
 const description=buildMode?`${E.KINDS[buildMode]?.name}: зелёный — можно, красный — нельзя. ${buildMode==='fort'?'Жёлтый ромб — радиус защиты.':''}`:'Выбери тип здания. Зелёные клетки доступны, красные запрещены.';
 $('quickBuildHelp').textContent=description;
 $('placingBuild').classList.toggle('hidden',!buildMode||quickBuildOpen);
 if(buildMode){$('placingBuildText').textContent=E.KINDS[buildMode].name+' · выбери клетку';$('placingBuildIcon').src=artSrc('building-'+buildMode+'.svg');}
}
function toggleQuickBuild(force){
 quickBuildOpen=typeof force==='boolean'?force:!quickBuildOpen;
 $('quickBuild').classList.toggle('hidden',!quickBuildOpen);
 $('mapView').classList.toggle('build-palette-open',quickBuildOpen);
 if(quickBuildOpen){closePanelIfOpen();setPreview(null);}
 refreshQuickBuild();queueDraw();
}
function closePanelIfOpen(){if(panelOpen)closePanel();}
function setBuildingMode(kind){
 buildMode=kind||null;selected=null;setPreview(null);moveCursor=null;
 $('cancelMode').classList.toggle('hidden',!buildMode);
 $('modeLabel').textContent=buildMode?'Построить: '+E.KINDS[buildMode].name:'Наступление';
 $('actionHint').textContent=buildMode?'Зелёная клетка — разрешено, красная — запрещено.':'Коснись цели или проведи от своей земли.';
 if(buildMode)toggleQuickBuild(false);
 refreshQuickBuild();updateUI();queueDraw();
}
$('quickBuildChoices').addEventListener('click',e=>{const b=e.target.closest('[data-fast-build]');if(b)setBuildingMode(b.dataset.fastBuild);});
$('quickBuildClose').onclick=()=>toggleQuickBuild(false);
$('quickBuildInfo').onclick=()=>{toggleQuickBuild(false);currentTab='build';openPanel();document.querySelector('[data-tab="build"]')?.click();};
$('changeBuild').onclick=()=>toggleQuickBuild(true);
$('stopBuild').onclick=cancelMode;

$('buildingsPanel').addEventListener('click',e=>{const b=e.target.closest('[data-build]');if(!b)return;setBuildingMode(buildMode===b.dataset.build?null:b.dataset.build);if(buildMode&&window.innerWidth<851)closePanel();});
$('techPanel').addEventListener('click',e=>{const b=e.target.closest('[data-research]');if(b)command({type:'research',key:b.dataset.research});});
$('diplomacyPanel').addEventListener('click',e=>{const b=e.target.closest('[data-ally]'),d=e.target.closest('[data-donate]');if(b){const partner=Number(b.dataset.ally),allied=mine()?.allies.includes(partner);if(!allied||window.confirm('Разорвать союз? После этого вы снова сможете нападать друг на друга.'))command({type:'diplomacy',target:partner});}if(d)command({type:'donate',target:Number(d.dataset.donate),amount:100,resource:'gold'});});
$('contextCard').addEventListener('click',e=>{const u=e.target.closest('[data-context-upgrade]'),r=e.target.closest('[data-context-return]'),d=e.target.closest('[data-context-redirect]');if(u)command({type:'upgrade',id:u.dataset.contextUpgrade});if(r){command({type:'return',id:r.dataset.contextReturn});contextual(null);}if(d){redirectArmy=d.dataset.contextRedirect;toast('Теперь выбери новую цель на карте.');contextual(null);}});
$('closeContext').onclick=()=>{selected=null;contextual(null);hideAux()};
$('selectedPanel').addEventListener('click',e=>{const b=e.target.closest('[data-upgrade]'),r=e.target.closest('[data-retreat]');if(b)command({type:'upgrade',id:b.dataset.upgrade});if(r)command({type:'return',id:r.dataset.retreat});});
for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>{currentTab=b.dataset.tab;document.querySelectorAll('[data-tab]').forEach(t=>{t.classList.toggle('active',t===b);t.setAttribute('aria-selected',String(t===b));});document.querySelectorAll('.tab-content').forEach(t=>t.classList.toggle('hidden',t.id!=='tab-'+currentTab));updateUI();};
function openPanel(){hideAux();previousFocus=document.activeElement;panelOpen=true;$('sidebar').classList.add('open');$('panelBackdrop').classList.remove('hidden');$('sidebar').setAttribute('aria-modal',String(window.innerWidth<851));$('closePanel').focus();}
function closePanel(){panelOpen=false;$('sidebar').classList.remove('open');$('panelBackdrop').classList.add('hidden');$('sidebar').setAttribute('aria-modal','false');previousFocus?.focus?.();}
$('menuToggle').onclick=()=>panelOpen?closePanel():openPanel();$('developButton').onclick=()=>toggleQuickBuild();$('closePanel').onclick=closePanel;$('panelBackdrop').onclick=closePanel;$('auxBackdrop').onclick=hideAux;
$('attackPercent').oninput=e=>{percent=Number(e.target.value);$('percentLabel').textContent=percent+'%';document.querySelectorAll('[data-percent]').forEach(t=>{const on=Number(t.dataset.percent)===percent;t.classList.toggle('active',on);t.setAttribute('aria-pressed',String(on));});if(state)updateUI();};
document.querySelectorAll('[data-target-percent]').forEach(b=>b.onclick=()=>{$('attackPercent').value=b.dataset.targetPercent;$('attackPercent').oninput({target:$('attackPercent')});});
for(const b of document.querySelectorAll('[data-percent]')){b.setAttribute('aria-pressed',String(Number(b.dataset.percent)===percent));b.onclick=()=>{$('attackPercent').value=b.dataset.percent;$('attackPercent').oninput({target:$('attackPercent')});};}
$('cancelMode').onclick=cancelMode;function cancelMode(){setBuildingMode(null);}
$('cancelTarget').onclick=()=>{setPreview(null);redirectArmy=null;lastTap=0;};$('confirmTarget').onclick=()=>{if(!target)return;const t=target;const ok=command(t.type==='redirect'?{type:'redirect',id:t.id,x:t.x,y:t.y}:{type:'send',x:t.x,y:t.y,percent});if(ok){setPreview(null);redirectArmy=null;}};
$('targetDiplomacy').onclick=()=>{
 if(!target||target.type!=='send')return;
 const owner=E.owner(state,target.x,target.y),other=E.person(state,owner),me=mine();
 if(!other||!me||other.id===myId||other.bot||me.allies.includes(owner)||me.offers.includes(owner))return;
 const accepting=other.offers.includes(myId);
 if(command({type:'diplomacy',target:owner})){
  toast(accepting?'Запрос на принятие союза отправлен':'Предложение союза отправлено');
  if(state?.phase==='playing'&&target)setPreview(target);
 }
};
$('dockToggle').onclick=()=>{const dock=$('battleDock');const collapsed=dock.classList.toggle('collapsed');$('dockToggle').setAttribute('aria-expanded',String(!collapsed));};
function setMinimapExpanded(expanded){
 $('minimapWrap').classList.toggle('minimized',!expanded);
 $('minimapToggle').setAttribute('aria-expanded',String(!!expanded));
 $('minimapToggle').setAttribute('aria-label',expanded?'Скрыть миникарту':'Открыть миникарту');
 $('minimapToggle').querySelector('.minimap-chevron').textContent=expanded?'−':'+';
 $('minimap').tabIndex=expanded?0:-1;
}
$('minimapToggle').onclick=()=>setMinimapExpanded($('minimapWrap').classList.contains('minimized'));
function renderArmies(){if(!state||!myId)return;const mineArmies=state.armies.filter(a=>a.owner===myId);
 patchHtml('armiesList',mineArmies.length?mineArmies.map(a=>{
  const initial=a.initialStrength||a.strength,spent=Math.max(0,initial-a.strength),percentSpent=Math.floor(spent/Math.max(1,initial)*100);
  return `<div class="army-line"><div><strong>${number(a.strength)} войск <small>из ${number(initial)}</small></strong><small>${esc(E.person(state,a.targetOwner)?.name||'Нейтральные земли')} · ${a.naval?'Морской переход':a.stuck>0?'Фронт встретил сопротивление':'Наступает'}</small><small class="army-stats${percentSpent>=80?' army-critical':''}">Захвачено ${number(a.captured||0)} клеток · Потери ${number(spent)}</small></div><button data-focus-army="${esc(a.id)}" aria-label="Перейти к армии">Найти</button><button data-recall-army="${esc(a.id)}" aria-label="Отозвать армию">Отозвать</button></div>`;
 }).join(''):'<div class="empty-armies"><strong>Пока нет походов</strong><p>Выбери нейтральную или вражескую границу, чтобы отправить армию.</p></div>');
}
$('armiesToggle').onclick=()=>{showAux('armiesPanel');renderArmies();};
$('closeArmies').onclick=hideAux;
$('armiesList').onclick=e=>{const r=e.target.closest('[data-recall-army]'),f=e.target.closest('[data-focus-army]');if(r){if(command({type:'return',id:r.dataset.recallArmy}))renderArmies();}if(f){const a=state?.armies.find(v=>v.id===f.dataset.focusArmy);if(a){camX=canvas.clientWidth/2-(a.x+.5)*TILE*zoom;camY=canvas.clientHeight/2-(a.y+.5)*TILE*zoom;clampCamera();hideAux();queueDraw();}}};
$('economyToggle').onclick=()=>showAux('economyPanel');$('closeEconomy').onclick=hideAux;$('pauseMobile').onclick=()=>$('pauseGame').click();$('quickLeaders').onclick=()=>{$('economyPanel').classList.add('hidden');showAux('quickLeadersPanel');};$('closeQuickLeaders').onclick=hideAux;$('nextFront').onclick=()=>{const armies=state?.armies.filter(a=>a.owner===myId)||[];if(!armies.length)return toast('Нет действующих армий');const a=armies[frontIndex++%armies.length];camX=canvas.clientWidth/2-(a.x+.5)*TILE*zoom;camY=canvas.clientHeight/2-(a.y+.5)*TILE*zoom;clampCamera();selected={kind:'army',id:a.id};updateSelection();hideAux();queueDraw();};
$('helpButton').onclick=()=>{$('tutorial').classList.remove('hidden');$('closeTutorial').focus();};$('helpMenu').onclick=()=>{closePanel();$('helpButton').click();};$('closeTutorial').onclick=()=>{$('tutorial').classList.add('hidden');showTutorialOnce=false;try{localStorage.setItem('bk-v9-tutorial','yes');}catch(_){}$('mapCanvas').focus();};
$('pauseGame').onclick=()=>{if(!demo)return toast('Пауза только для одиночной игры.');pauseSolo=!pauseSolo;$('pauseGame').textContent=pauseSolo?'Продолжить':'Пауза';saveSolo();};
$('myKingdom').onclick=()=>toast(mine()?.name||'Королевство');
function resize(){const rect=canvas.getBoundingClientRect();if(rect.width<1)return;const dpr=Math.min(window.innerWidth<900?1:1.5,devicePixelRatio||1);const w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;queueDraw();}}
function centerOnCapital(){const p=mine();if(!p?.capital)return;const c=p.capital;const r=canvas.getBoundingClientRect();camX=r.width/2-(c.x+.5)*TILE*zoom;camY=r.height/2-(c.y+.5)*TILE*zoom;clampCamera();queueDraw();}
function clampCamera(){
 const r=canvas.getBoundingClientRect(),mapW=E.W*TILE*zoom,mapH=E.H*TILE*zoom;
 // Pan past the map edges so a boundary cell can be placed into the free middle of the screen,
 // out from under the build bar, minimap and mobile toolbars.
 const pan=(view,extent,current)=>{
   if(extent<view*.35)return (view-extent)/2;
   const lower=view*.58-extent,upper=view*.42;
   return Math.max(lower,Math.min(upper,current));
 };
 camX=pan(r.width,mapW,camX);camY=pan(r.height,mapH,camY);
}
function zoomAt(factor,cx,cy){const old=zoom;zoom=Math.max(.14,Math.min(5,zoom*factor));camX=cx-(cx-camX)*zoom/old;camY=cy-(cy-camY)*zoom/old;clampCamera();$('zoomText').textContent=Math.round(zoom*100)+'%';queueDraw();}
function pixelAt(clientX,clientY){const r=canvas.getBoundingClientRect();return {x:clientX-r.left,y:clientY-r.top};}
function gridAt(clientX,clientY){const p=pixelAt(clientX,clientY);return {x:Math.floor((p.x-camX)/(TILE*zoom)),y:Math.floor((p.y-camY)/(TILE*zoom))};}
function nearestObject(px,py,kind){const arr=kind==='army'?state.armies:state.buildings,worldX=(px-camX)/(TILE*zoom),worldY=(py-camY)/(TILE*zoom);let nearest=null,best=Infinity;for(const v of arr){const d=Math.hypot(v.x+.5-worldX,v.y+.5-worldY)*TILE*zoom;if(d<best&&d<(kind==='army'?23:25)){best=d;nearest=v;}}return nearest;}
function selectMap(clientX,clientY){
 if(state?.phase!=='playing'||mine()?.eliminated)return;
 const pt=pixelAt(clientX,clientY),p=gridAt(clientX,clientY);
 if(!E.inside(p.x,p.y))return;
 inspectCell(p.x,p.y);$('mapHint').classList.add('hidden');
 if(buildMode){
  moveCursor=p;if(E.owner(state,p.x,p.y)!==myId)return toast('Нужна своя территория','error');
  const fail=E.canBuild(state,myId,buildMode,p.x,p.y);if(fail)return toast(fail,'error');
  command({type:'build',kind:buildMode,x:p.x,y:p.y});queueDraw();return;
 }
 if(redirectArmy){setPreview({type:'redirect',id:redirectArmy,x:p.x,y:p.y,valid:true});return;}
 // In a conquest game, tap ownership wins over enlarged decorative hitboxes.
 // Enemy buildings and friendly icons near an enemy border must not block attacks.
 const clickedOwner=E.owner(state,p.x,p.y);
 if(clickedOwner!==myId){
  if(!E.tile(state,p.x,p.y))return toast('Море не захватывается. Выбери сушу.');
  selected=null;contextual(null);
  if(target?.type==='send'&&target.x===p.x&&target.y===p.y)return;
  setPreview({type:'send',x:p.x,y:p.y,valid:true});return;
 }
 const a=nearestObject(pt.x,pt.y,'army');
 if(a?.owner===myId){selected={kind:'army',id:a.id};updateSelection();setPreview(null);return;}
 const b=nearestObject(pt.x,pt.y,'building');
 if(b?.owner===myId){selected={kind:'building',id:b.id};updateSelection();setPreview(null);return;}
 setPreview(null);
}
function updateMapStatus(x,y){inspectCell(x,y);}
// Tap a target, or long-press on your own land and drag toward the destination.
// Moving immediately still pans the map, avoiding an accidental attack gesture.
function onPointerDown(e){
 if(!state)return;canvas.setPointerCapture(e.pointerId);
 pressed.set(e.pointerId,{x:e.clientX,y:e.clientY});
 clearTimeout(longPressTimer);dragAttack=null;
 if(pressed.size===1){
  pointerStart={x:e.clientX,y:e.clientY,camX,camY,moved:false};gesture=null;
  const at=gridAt(e.clientX,e.clientY);
  if(e.pointerType==='touch'&&state.phase==='playing'&&!buildMode&&E.inside(at.x,at.y)&&E.owner(state,at.x,at.y)===myId){
   longPressTimer=setTimeout(()=>{
    if(pressed.size!==1||!pointerStart||pointerStart.moved)return;
    dragAttack={from:at,to:at};pointerStart=null;
    if(navigator.vibrate)navigator.vibrate(15);
    $('mapHint').textContent='Веди палец к цели и отпусти';$('mapHint').classList.remove('hidden');queueDraw();
   },320);
  }
 }else if(pressed.size===2){
  const v=[...pressed.values()],r=canvas.getBoundingClientRect(),cx=(v[0].x+v[1].x)/2-r.left,cy=(v[0].y+v[1].y)/2-r.top;
  gesture={dist:Math.hypot(v[0].x-v[1].x,v[0].y-v[1].y),zoom,worldX:(cx-camX)/(TILE*zoom),worldY:(cy-camY)/(TILE*zoom)};
  pointerStart=null;dragAttack=null;
 }
}
function onPointerMove(e){
 if(buildMode&&state?.phase==='playing'){
  const cell=gridAt(e.clientX,e.clientY);
  if(E.inside(cell.x,cell.y)&&(moveCursor?.x!==cell.x||moveCursor?.y!==cell.y)){
   moveCursor=cell;queueDraw();
  }
 }
 if(!pressed.has(e.pointerId))return;
 pressed.set(e.pointerId,{x:e.clientX,y:e.clientY});
 if(dragAttack){dragAttack.to=gridAt(e.clientX,e.clientY);queueDraw();return;}
 if(pressed.size===2&&gesture){
  const vals=[...pressed.values()],r=canvas.getBoundingClientRect();
  zoom=Math.max(.2,Math.min(5,gesture.zoom*Math.hypot(vals[0].x-vals[1].x,vals[0].y-vals[1].y)/Math.max(1,gesture.dist)));
  camX=(vals[0].x+vals[1].x)/2-r.left-gesture.worldX*TILE*zoom;
  camY=(vals[0].y+vals[1].y)/2-r.top-gesture.worldY*TILE*zoom;
  clampCamera();$('zoomText').textContent=Math.round(zoom*100)+'%';queueDraw();return;
 }
 if(pointerStart){
  const dx=e.clientX-pointerStart.x,dy=e.clientY-pointerStart.y;
  if(Math.hypot(dx,dy)>(e.pointerType==='touch'?11:6)){pointerStart.moved=true;clearTimeout(longPressTimer);}
  if(pointerStart.moved){camX=pointerStart.camX+dx;camY=pointerStart.camY+dy;clampCamera();queueDraw();}
 }
}
function onPointerUp(e){
 clearTimeout(longPressTimer);
 const drag=dragAttack,was=pointerStart,touch=pressed.size;
 pressed.delete(e.pointerId);dragAttack=null;
 if(drag){
  const pos=gridAt(e.clientX,e.clientY);
  if(E.inside(pos.x,pos.y)&&E.owner(state,pos.x,pos.y)!==myId&&E.tile(state,pos.x,pos.y)!==0){
   setPreview({type:'send',x:pos.x,y:pos.y,valid:true});
  }else toast('Отпусти палец над чужой или нейтральной землёй.');
  pointerStart=null;queueDraw();return;
 }
 if(touch===1){
  pointerStart=null;
  if(was&&!was.moved){const now=Date.now(),g=gridAt(e.clientX,e.clientY),friendly=E.inside(g.x,g.y)&&E.owner(state,g.x,g.y)===myId;if(friendly&&!target&&!buildMode&&now-lastTap<280){const p=pixelAt(e.clientX,e.clientY);zoomAt(1.45,p.x,p.y);lastTap=0;}else{selectMap(e.clientX,e.clientY);lastTap=friendly?now:0;}}
 }else{pointerStart=null;gesture=null;}
}
canvas.addEventListener('pointerdown',onPointerDown);
canvas.addEventListener('pointermove',onPointerMove);
canvas.addEventListener('pointerup',onPointerUp);
canvas.addEventListener('pointercancel',e=>{clearTimeout(longPressTimer);pressed.delete(e.pointerId);pointerStart=null;gesture=null;dragAttack=null;});
canvas.addEventListener('wheel',e=>{e.preventDefault();const p=pixelAt(e.clientX,e.clientY);zoomAt(e.deltaY<0?1.13:.885,p.x,p.y);},{passive:false});canvas.addEventListener('contextmenu',e=>e.preventDefault());
$('zoomIn').onclick=()=>zoomAt(1.24,canvas.clientWidth/2,canvas.clientHeight/2);$('zoomOut').onclick=()=>zoomAt(.8,canvas.clientWidth/2,canvas.clientHeight/2);$('viewAll').onclick=()=>{zoom=Math.min((canvas.clientWidth-16)/(E.W*TILE),(canvas.clientHeight-16)/(E.H*TILE));camX=(canvas.clientWidth-E.W*TILE*zoom)/2;camY=(canvas.clientHeight-E.H*TILE*zoom)/2;$('zoomText').textContent=Math.round(zoom*100)+'%';queueDraw();};$('centerMap').onclick=()=>{zoom=window.innerWidth<650?.58:.95;centerOnCapital();};
mini.addEventListener('pointerdown',e=>{const r=mini.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*E.W,y=(e.clientY-r.top)/r.height*E.H;camX=canvas.clientWidth/2-x*TILE*zoom;camY=canvas.clientHeight/2-y*TILE*zoom;clampCamera();queueDraw();});mini.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('viewAll').click();}});
// Low-resolution territory bitmap: one pixel per world tile. The GPU enlarges it.
// It is updated only when a territory changes, NOT once per animation frame.
const TERRAIN_RGB=[[47,111,148],[158,193,108],[71,127,83],[172,159,116],[181,205,113],[143,137,120],[168,164,152]];
let minimapCached=null,pixelLayer=null;
function repaintWorld(){
 if(!state?.owners?.length||!state?.tiles?.length)return;
 const revision=state.territoryRevision??state.tick;
 if(worldLayer&&paintedRevision===revision&&terrainSeed===state.seed)return;
 if(!worldLayer){worldLayer=document.createElement('canvas');worldLayer.width=E.W*6;worldLayer.height=E.H*6;}
 if(!pixelLayer){pixelLayer=document.createElement('canvas');pixelLayer.width=E.W;pixelLayer.height=E.H;}
 const c=pixelLayer.getContext('2d',{alpha:false});const img=c.createImageData(E.W,E.H);
 const colors=state.players.map(p=>{const x=parseInt(p.color.slice(1),16);return[(x>>>16)&255,(x>>>8)&255,x&255];});
 const owners=state.owners,tiles=state.tiles,d=img.data;
 for(let i=0;i<owners.length;i++){
  const terr=TERRAIN_RGB[tiles[i]]||TERRAIN_RGB[1],id=owners[i],col=id?colors[id-1]:null;
  const p=i*4;
  const k=col ? 0.82 : 0;
  let h=Math.imul(i% E.W+state.seed*3,374761393)^Math.imul((i/E.W)|0,668265263);h=Math.imul(h^(h>>>13),1274126177);const noise=((h>>>24)&15)-7;
  const shade=tiles[i]===0?noise*.25:noise*.76;
  d[p]=Math.max(0,Math.min(255,Math.round(terr[0]*(1-k)+(col?.[0]||0)*k+shade)));
  d[p+1]=Math.max(0,Math.min(255,Math.round(terr[1]*(1-k)+(col?.[1]||0)*k+shade)));
  d[p+2]=Math.max(0,Math.min(255,Math.round(terr[2]*(1-k)+(col?.[2]||0)*k+shade)));
  d[p+3]=255;
 }
 c.putImageData(img,0,0);const wc=worldLayer.getContext('2d',{alpha:false});wc.imageSmoothingEnabled=false;wc.drawImage(pixelLayer,0,0,worldLayer.width,worldLayer.height);
 // Painted terrain marks: cached in world bitmap, not recreated every frame.
 for(let y=1;y<E.H-1;y++)for(let x=1;x<E.W-1;x++){
  const i=y*E.W+x,t=tiles[i];if(owners[i]||!t||((x*41+y*73+state.seed*13)%9))continue;
  const px=x*6+3,py=y*6+3;
  if(t===2){wc.fillStyle='#315c3f99';wc.fillRect(px-2,py-1,2,3);wc.fillRect(px+1,py-2,2,4);wc.fillStyle='#93bf82aa';wc.fillRect(px,py+1,2,1);}
  else if(t===3||t===6){wc.strokeStyle='#eee4bd7d';wc.lineWidth=.9;wc.beginPath();wc.moveTo(px-2,py+1);wc.lineTo(px,py-2);wc.lineTo(px+2,py+1);wc.stroke();}
  else if(t===4){wc.fillStyle='#e4d89088';wc.fillRect(px-2,py,4,1);}
  else if(t===5){wc.fillStyle='#f2cd6d99';wc.fillRect(px-1,py-2,2,2);}
 }
 terrainSeed=state.seed;paintedRevision=revision;miniRevision=-1;
}
function hexAlpha(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;}
function drawFortRange(x,y,preview){
 const t=TILE,r=4;
 ctx.save();ctx.fillStyle=preview?'rgba(255,210,71,.23)':'rgba(255,211,95,.18)';
 ctx.strokeStyle=preview?'#ffe3a6':'#eec05e';ctx.lineWidth=Math.max(2/Math.max(.5,zoom),1);
 ctx.beginPath();ctx.moveTo((x+.5)*t,(y-r)*t);ctx.lineTo((x+r+1)*t,(y+.5)*t);
 ctx.lineTo((x+.5)*t,(y+r+1)*t);ctx.lineTo((x-r)*t,(y+.5)*t);ctx.closePath();
 ctx.fill();ctx.stroke();ctx.restore();
}
function queueDraw(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;draw();});}
function draw(){if(!state?.tiles.length)return;repaintWorld();resize();const dpr=canvas.width/Math.max(1,canvas.clientWidth);const w=canvas.clientWidth,h=canvas.clientHeight;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#2c688e';ctx.fillRect(0,0,w,h);
 ctx.save();ctx.translate(camX,camY);ctx.scale(zoom,zoom);ctx.imageSmoothingEnabled=true;ctx.drawImage(worldLayer,0,0,worldLayer.width,worldLayer.height,0,0,E.W*TILE,E.H*TILE);
 // Draw vector borders only when zoomed in sufficiently; avoid per-tile work otherwise.
 if(zoom>=0.28){
  const minX=Math.max(0,Math.floor(-camX/(TILE*zoom))-1),maxX=Math.min(E.W-1,Math.ceil((w-camX)/(TILE*zoom))+1);
  const minY=Math.max(0,Math.floor(-camY/(TILE*zoom))-1),maxY=Math.min(E.H-1,Math.ceil((h-camY)/(TILE*zoom))+1);
  ctx.lineWidth=Math.max(.55,1.65/zoom);ctx.strokeStyle='#203a2dcc';ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
  const o=state.owners;
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
   const i=y*E.W+x,id=o[i];if(!id)continue;
   if(x===0||o[i-1]!==id){ctx.moveTo(x*TILE,y*TILE);ctx.lineTo(x*TILE,(y+1)*TILE);}
   if(y===0||o[i-E.W]!==id){ctx.moveTo(x*TILE,y*TILE);ctx.lineTo((x+1)*TILE,y*TILE);}if(x===E.W-1||o[i+1]!==id){ctx.moveTo((x+1)*TILE,y*TILE);ctx.lineTo((x+1)*TILE,(y+1)*TILE);}if(y===E.H-1||o[i+E.W]!==id){ctx.moveTo(x*TILE,(y+1)*TILE);ctx.lineTo((x+1)*TILE,(y+1)*TILE);}
  }
  ctx.stroke();
  // Thin coast outline separates land and sea without heavy biome gridlines.
  ctx.beginPath();ctx.strokeStyle='#f5e4b5aa';ctx.lineWidth=Math.max(.55,1.2/zoom);
  const tiles=state.tiles;
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
   const i=y*E.W+x;if(!tiles[i])continue;
   if(x===0||!tiles[i-1]){ctx.moveTo(x*TILE,y*TILE);ctx.lineTo(x*TILE,(y+1)*TILE);}
   if(x===E.W-1||!tiles[i+1]){ctx.moveTo((x+1)*TILE,y*TILE);ctx.lineTo((x+1)*TILE,(y+1)*TILE);}
   if(y===0||!tiles[i-E.W]){ctx.moveTo(x*TILE,y*TILE);ctx.lineTo((x+1)*TILE,y*TILE);}
   if(y===E.H-1||!tiles[i+E.W]){ctx.moveTo(x*TILE,(y+1)*TILE);ctx.lineTo((x+1)*TILE,(y+1)*TILE);}
  }
  ctx.stroke();
 }
 // Logical footprint is exactly one cell; 3/4 roofs rise above it uncropped.
 ctx.textAlign='center';ctx.textBaseline='middle';
 for(const b of [...state.buildings].sort((a,b)=>a.y-b.y)){
  const x=(b.x+.5)*TILE,y=(b.y+.5)*TILE;
  if(x*zoom+camX<-55||x*zoom+camX>w+55||y*zoom+camY<-55||y*zoom+camY>h+55)continue;
  const ownerColor=color(b.owner);
  ctx.save();ctx.globalAlpha=.22;ctx.fillStyle=ownerColor;
  ctx.fillRect(b.x*TILE+.8,b.y*TILE+.8,TILE-1.6,TILE-1.6);ctx.restore();
  ctx.strokeStyle=ownerColor;ctx.lineWidth=1.5/Math.max(.7,zoom);
  ctx.strokeRect(b.x*TILE+.8,b.y*TILE+.8,TILE-1.6,TILE-1.6);
  const spriteW=Math.min(32/Math.max(.3,zoom),Math.max(TILE*1.22,24/Math.max(.3,zoom)));
  const spriteH=spriteW*1.08,footY=y+TILE*.49;
  const sprite=townSprites[b.kind]||iconImages[b.kind];
  if(sprite?.width&&(!('naturalWidth' in sprite)||sprite.naturalWidth)){
   const smoothing=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=false;
   ctx.drawImage(sprite,x-spriteW*.5,footY-spriteH,spriteW,spriteH);
   ctx.imageSmoothingEnabled=smoothing;
  }
  if(b.kind==='capital'&&zoom>.39){
   const p=E.person(state,b.owner),label=(p?.id||'?')+' · '+(p?.name||'');
   ctx.font='750 '+Math.max(9,11/zoom)+'px system-ui';
   const tw=ctx.measureText(label).width+20/zoom,lh=20/zoom,ly=footY+11/zoom;
   ctx.fillStyle='#283a31ef';ctx.strokeStyle=ownerColor;ctx.lineWidth=1.2/Math.max(.5,zoom);
   ctx.beginPath();ctx.roundRect(x-tw/2,ly-lh/2,tw,lh,8/Math.max(.5,zoom));ctx.fill();ctx.stroke();
   ctx.fillStyle='#f1fff6';ctx.fillText(label,x,ly);
  }
 }
 // Incoming hostile fronts are highlighted on the battlefield, not only in the HUD.
 for(const a of activeThreats){
  const x=(a.x+.5)*TILE,y=(a.y+.5)*TILE;
  ctx.save();ctx.strokeStyle='#ff5f6c';ctx.lineWidth=3/Math.max(.45,zoom);
  ctx.beginPath();ctx.arc(x,y,19/Math.max(.55,zoom),0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#ff5f6c';ctx.beginPath();ctx.arc(x+12/Math.max(.65,zoom),y-12/Math.max(.65,zoom),8/Math.max(.7,zoom),0,2*Math.PI);ctx.fill();
  ctx.fillStyle='#fff';ctx.font='900 '+(10/Math.max(.7,zoom))+'px system-ui';ctx.textAlign='center';ctx.fillText('!',x+12/Math.max(.65,zoom),y-12/Math.max(.65,zoom)+1);
  ctx.restore();
 }
 for(const a of state.armies){const old=oldArmyPositions.get(a.id),t=Math.min(1,(performance.now()-movementStart)/260),x=((old?old.x+(a.x-old.x)*t:a.x)+.5)*TILE,y=((old?old.y+(a.y-old.y)*t:a.y)+.5)*TILE;if(x*zoom+camX<-50||x*zoom+camX>w+50||y*zoom+camY<-50||y*zoom+camY>h+50)continue;
  ctx.fillStyle='#0d2234';ctx.strokeStyle=(a.owner===myId&&a.initialStrength&&a.strength/a.initialStrength<.2)?'#ff968e':color(a.owner);ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(x,y,8.5,0,2*Math.PI);ctx.fill();ctx.stroke();ctx.fillStyle='#ffffff';ctx.font='700 7px system-ui';ctx.fillText('↗',x,y+.5);
  if(zoom>0.27){ctx.font='700 '+Math.max(8,9/Math.max(.8,zoom))+'px system-ui';const n=number(a.strength);ctx.fillStyle='rgba(255,255,255,.95)';ctx.beginPath();ctx.roundRect(x-20,y+9,40,12,5);ctx.fill();ctx.fillStyle='#0f1720';ctx.fillText(n,x,y+15);}
  if(a.owner===myId&&a.targetOwner){ctx.strokeStyle=hexAlpha(color(a.owner),.55);ctx.setLineDash([2,3]);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo((a.tx+.5)*TILE,(a.ty+.5)*TILE);ctx.stroke();ctx.setLineDash([]);}
 }
 if(selected){const b=selected.kind==='building'?state.buildings.find(v=>v.id===selected.id):state.armies.find(v=>v.id===selected.id);if(b){ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;ctx.setLineDash([4,3]);ctx.strokeRect(b.x*TILE-5,b.y*TILE-5,TILE+10,TILE+10);ctx.setLineDash([]);}}
 if(buildMode){
  const minX=Math.max(0,Math.floor(-camX/(TILE*zoom))-1),maxX=Math.min(E.W-1,Math.ceil((w-camX)/(TILE*zoom))+1);
  const minY=Math.max(0,Math.floor(-camY/(TILE*zoom))-1),maxY=Math.min(E.H-1,Math.ceil((h-camY)/(TILE*zoom))+1);
  const p=mine(),price=E.KINDS[buildMode]?.cost||{},affordable=Object.entries(price).every(([k,v])=>(p?.res[k]||0)>=v);
  const allowedColor=affordable?'rgba(111,244,126,.29)':'rgba(251,184,48,.26)';
  const blockedColor='rgba(231,65,70,.32)';
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
   if(E.owner(state,x,y)!==myId)continue;
   ctx.fillStyle=E.canBuild(state,myId,buildMode,x,y)?blockedColor:allowedColor;
   ctx.fillRect(x*TILE,y*TILE,TILE,TILE);
  }
  // Four-neighbour tile range is exactly Manhattan radius 4, matching tileDefense().
  if(buildMode==='fort'&&moveCursor&&E.inside(moveCursor.x,moveCursor.y))drawFortRange(moveCursor.x,moveCursor.y,true);
  if(moveCursor&&E.inside(moveCursor.x,moveCursor.y)){
   ctx.strokeStyle=E.canBuild(state,myId,buildMode,moveCursor.x,moveCursor.y)?'#f15d50':'#ecffe9';
   ctx.lineWidth=Math.max(2/Math.max(.5,zoom),1);
   ctx.strokeRect(moveCursor.x*TILE-2,moveCursor.y*TILE-2,TILE+4,TILE+4);
  }
 }
 // Display the selected existing fort's real defence range without entering build mode.
 if(selected?.kind==='building'){
  const b=state.buildings.find(v=>v.id===selected.id);
  if(b?.kind==='fort')drawFortRange(b.x,b.y,false);
 }
 if(target||dragAttack){
  const to=dragAttack?.to||target;
  const actual=E.previewFront(state,myId,to.x,to.y);
  if(actual.cells.length){
   ctx.save();ctx.fillStyle='#a9f5c666';ctx.strokeStyle='#f1fdd5';ctx.lineWidth=1.6/Math.max(.5,zoom);
   for(const i of actual.cells){const x=i%E.W,y=Math.floor(i/E.W);ctx.fillRect(x*TILE,y*TILE,TILE,TILE);ctx.strokeRect(x*TILE,y*TILE,TILE,TILE);}
   ctx.restore();
  }
  // Display the strategic origin. The real frontline stays separately highlighted.
   const from=(target?.type==='redirect'?state.armies.find(a=>a.id===target.id):null)||mine()?.capital||dragAttack?.from;
  if(to&&from){
   const ax=(from.x+.5)*TILE,ay=(from.y+.5)*TILE,bx=(to.x+.5)*TILE,by=(to.y+.5)*TILE;
   ctx.save();ctx.strokeStyle='#ffffffd8';ctx.lineWidth=3/Math.max(.45,zoom);ctx.setLineDash([10/Math.max(.5,zoom),7/Math.max(.5,zoom)]);
   ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();ctx.setLineDash([]);
   const angle=Math.atan2(by-ay,bx-ax),head=11/Math.max(.5,zoom);
   ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx-Math.cos(angle-.55)*head,by-Math.sin(angle-.55)*head);ctx.lineTo(bx-Math.cos(angle+.55)*head,by-Math.sin(angle+.55)*head);ctx.closePath();ctx.fill();
   ctx.strokeStyle='#fff';ctx.lineWidth=2.5/Math.max(.5,zoom);ctx.beginPath();ctx.arc(bx,by,14/Math.max(.55,zoom),0,Math.PI*2);ctx.stroke();ctx.restore();
  }
 }
 if(moveCursor){ctx.strokeStyle='#2c3139';ctx.lineWidth=1.5/Math.max(.5,zoom);ctx.strokeRect(moveCursor.x*TILE,moveCursor.y*TILE,TILE,TILE);}
 ctx.restore();drawMini();if(movementStart&&performance.now()-movementStart<280)queueDraw();}
function drawMini(){
 if(!state?.owners?.length||!worldLayer)return;
 const revision=state.territoryRevision??state.tick;
 if(miniRevision!==revision){
  if(!minimapCached){minimapCached=document.createElement('canvas');minimapCached.width=E.W;minimapCached.height=E.H;}
  const mc=minimapCached.getContext('2d',{alpha:false});mc.imageSmoothingEnabled=true;mc.drawImage(worldLayer,0,0);
  miniRevision=revision;
 }
 mctx.clearRect(0,0,E.W,E.H);mctx.drawImage(minimapCached,0,0);
 for(const a of activeThreats){mctx.strokeStyle='#ff5e70';mctx.lineWidth=2.5;mctx.beginPath();mctx.arc(a.x,a.y,5,0,2*Math.PI);mctx.stroke();}

 mctx.lineWidth=.65;mctx.strokeStyle='#ffffff';const scale=zoom*TILE;
 mctx.strokeRect(-camX/scale,-camY/scale,canvas.clientWidth/scale,canvas.clientHeight/scale);
}
window.addEventListener('resize',()=>{resize();clampCamera();queueDraw();});document.addEventListener('keydown',e=>{if(e.key==='Escape'){setThreatList(false);hideAux();setPreview(null);redirectArmy=null;if(panelOpen)closePanel();else cancelMode();$('tutorial').classList.add('hidden');return;}if(panelOpen&&window.innerWidth<851&&e.key==='Tab'){const items=[...$('sidebar').querySelectorAll('button:not([disabled]), select:not([disabled])')].filter(el=>el.offsetParent!==null);if(items.length){const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
 if(!state||state.phase!=='playing'||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName))return;if(e.key==='+'||e.key==='=')zoomAt(1.2,canvas.clientWidth/2,canvas.clientHeight/2);if(e.key==='-')zoomAt(.8,canvas.clientWidth/2,canvas.clientHeight/2);if(document.activeElement===canvas){if(!moveCursor)moveCursor=mine()?.capital?{...mine().capital}:{x:80,y:52};if(e.key.startsWith('Arrow')){e.preventDefault();const d={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[e.key];moveCursor.x=Math.max(0,Math.min(E.W-1,moveCursor.x+d[0]));moveCursor.y=Math.max(0,Math.min(E.H-1,moveCursor.y+d[1]));camX=canvas.clientWidth/2-(moveCursor.x+.5)*TILE*zoom;camY=canvas.clientHeight/2-(moveCursor.y+.5)*TILE*zoom;clampCamera();inspectCell(moveCursor.x,moveCursor.y);$('keyboardPosition').textContent=$('mapStatus').textContent;queueDraw();}if(e.key==='Enter'){e.preventDefault();const x=moveCursor.x,y=moveCursor.y;const r=canvas.getBoundingClientRect();selectMap(r.left+camX+(x+.5)*TILE*zoom,r.top+camY+(y+.5)*TILE*zoom);}}});
$('hostButton').onclick=createRoom;$('joinButton').onclick=joinRoom;$('demoButton').onclick=()=>createDemo(false);$('resumeButton').onclick=()=>createDemo(true);$('leaveRoom').onclick=()=>{try{peer?.destroy();}catch(_){}for(const c of connections.keys()){try{c.close();}catch(_){}}connections.clear();upstream=null;peer=null;host=false;demo=false;state=null;code='';phaseShown='';setBusy(false);history.replaceState(null,'',location.pathname+location.search);show('lobby');};$('startButton').onclick=startGame;$('copyLink').onclick=()=>copyText(urlRoom());$('copyCode').onclick=()=>copyText(code);
$('readyButton').onclick=()=>{readyLocal=!readyLocal;$('readyButton').setAttribute('aria-pressed',String(readyLocal));upstream?.send({t:'ready',value:readyLocal});};
for(const id of ['botCount'])$(id).onchange=()=>{if(host&&state?.phase==='lobby'){state.settings={bots:Number($('botCount').value)};broadcast();}};
$('spawnChoice').onchange=()=>{if(state?.phase!=='lobby')return;if(host){mine().spawnPreference=$('spawnChoice').value;broadcast();}else upstream?.send({t:'spawn',choice:$('spawnChoice').value});};
$('resultExit').onclick=()=>{if(window.confirm('Вернуться в главное меню? Текущий завершённый матч будет закрыт.'))location.href=location.pathname;};$('restart').onclick=()=>{if(host&&state?.phase==='ended'){const players=state.players.filter(p=>!p.bot).map(p=>({id:p.id,name:p.name,connected:p.connected}));const fresh=E.lobby(Date.now());Object.assign(state,fresh);const newIds=new Map();players.forEach((p,i)=>{const id=E.addPlayer(state,p.name);newIds.set(p.id,id);const v=E.person(state,id);v.connected=p.connected;v.ready=i===0;});for(const [tok,id] of tokenStore)tokenStore.set(tok,newIds.get(id)||id);for(const [conn,id] of connections)connections.set(conn,newIds.get(id)||id);worldLayer=null;pixelLayer=null;paintedRevision=-1;selected=null;setPreview(null);cancelMode();contextual(null);closePanel();$('victory').classList.add('hidden');phaseShown='';broadcast(true);}else if(demo){try{localStorage.removeItem('bk-v9-save');}catch(_){}$('victory').classList.add('hidden');createDemo(false);}else toast('Новый матч запускает ведущий.');};
$('downloadSave').onclick=()=>{const blob=new Blob([JSON.stringify({tick:state.tick,winner:state.winner,players:state.players.map(p=>({name:p.name,land:p.land,kills:p.kills}))},null,2)],{type:'application/json'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='brothers-kingdoms-results.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
try{const previous=localStorage.getItem('bk-name');if(previous)$('nickname').value=previous;}catch(_){ }
const fromHash=location.hash.replace('#','').toUpperCase().replace(/[^A-Z0-9]/g,'');if(fromHash){$('roomCode').value=fromHash;$('joinDetails').open=true;$('joinButton').textContent='Войти в комнату '+fromHash;}updateResume();
setInterval(()=>{if(demo&&state?.phase==='playing'&&!pauseSolo&&state.tick%10===0&&lastSaveTick!==state.tick){lastSaveTick=state.tick;saveSolo();}if(!host||!state||state.phase!=='playing'||pauseSolo)return;E.tick(state);broadcast();},1000);
setInterval(()=>{if(host&&state?.phase==='playing'&&!pauseSolo&&state.armies.length){E.combatStep(state);broadcast();}},333);
setInterval(()=>{if(!demo&&!host&&state?.phase==='playing'&&Date.now()-lastStateAt>4500){setNetwork('СВЯЗЬ ЗАДЕРЖИВАЕТСЯ');}for(const [id,at] of pendingOrders)if(Date.now()-at>7000){pendingOrders.delete(id);toast('Приказ не подтверждён. Проверь соединение.');}},2000);
})();
