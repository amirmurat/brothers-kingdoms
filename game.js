/* Brothers Kingdoms Frontier — canvas world, realtime multiplayer and responsive command UI. */
(()=>{
'use strict';
const E=window.BKEngine,$=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const view=$('mapView'),canvas=$('mapCanvas'),ctx=canvas.getContext('2d',{alpha:false}),mini=$('minimap'),mctx=mini.getContext('2d');
const terrainNames=['Море','Равнина','Лес','Холмы','Плодородная земля','Рудное месторождение','Горы'];
const symbols={capital:'♛',farm:'♨',lumber:'♣',quarry:'◆',mine:'✦',barracks:'⚔',fort:'♜',port:'⚓',city:'⌂'};
const textTech={economy:'Увеличивает производство всех ресурсов на 25% за уровень.',war:'Усиливает атаки и оборону; ускоряет набор войск.',logistics:'Ускоряет походы на одну клетку за ход.',sailing:'Позволяет морские походы через проливы, нужен порт.'};
const costText=c=>Object.entries(c||{}).map(([k,v])=>({wood:'Д',stone:'К',gold:'З',food:'Е'}[k]||k)+': '+v).join(' · ');
const number=n=>Math.floor(n||0).toLocaleString('ru-RU');
let state=null,myId=null,host=false,demo=false,peer=null,upstream=null,code='',connections=new Map(),lastSendTime=new Map(),phaseShown='',timer=0;
let zoom=1.65,camX=0,camY=0,terrainSeed=null,pressed=new Map(),pointerStart=null,gesture=null,selected=null,buildMode=null,currentTab='build',percent=30,tooltipTimer=null,terrainLayer=null,ownershipLayer=null,renderQueued=false,panelOpen=false;let toastTimeout=null;
const TILE=14;const mine=()=>state?.players.find(p=>p.id===myId);const color=id=>state?.players.find(p=>p.id===id)?.color||'#e8f3f3';
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.remove('hidden');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>t.classList.add('hidden'),3200);}
function show(screen){for(const name of ['lobby','waiting','game'])$(name).classList.toggle('hidden',name!==screen);if(screen==='game')setTimeout(resize,10);}
function error(s){$('lobbyError').textContent=s;toast(s);}
function name(){const val=$('nickname').value.trim().slice(0,18)||'Королевство';try{localStorage.setItem('bk-name',val);}catch(_){ }return val;}
function randomCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',v=new Uint8Array(6);crypto.getRandomValues(v);return Array.from(v,b=>chars[b%chars.length]).join('');}
function urlRoom(){return location.origin+location.pathname+'#'+code;}
function compress(arr){let chunks=[];for(let i=0;i<arr.length;i+=8192)chunks.push(String.fromCharCode(...arr.slice(i,i+8192)));return btoa(chunks.join(''));}
function expand(str){const raw=atob(str),out=new Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out;}
function pack(s){if(!s||!s.owners?.length)return s;return {...s,tiles:compress(s.tiles),owners:compress(s.owners),packed:true};}
function unpack(s){if(s?.packed){s.tiles=expand(s.tiles);s.owners=expand(s.owners);delete s.packed;}return s;}
function getPeer(){if(window.Peer)return true;error('Не загрузилась библиотека PeerJS. Проверь интернет.');return false;}
function createRoom(){if(!getPeer())return;code=randomCode();host=true;demo=false;peer=new Peer('bk-'+code);$('networkStatus').textContent='ПОДКЛЮЧЕНИЕ…';
 peer.on('open',()=>{state=E.lobby(Date.now());myId=E.addPlayer(state,name());$('networkStatus').textContent='● ВЕДУЩИЙ';history.replaceState(null,'','#'+code);phaseShown='';render();});
 peer.on('connection',joinConnection);peer.on('error',e=>error('Комната: '+(e.message||e.type||'ошибка')));
 peer.on('disconnected',()=>toast('Связь с сервером комнат потеряна.'));
}
function joinRoom(){if(!getPeer())return;code=$('roomCode').value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,9);if(!code)return error('Введи код комнаты.');host=false;demo=false;peer=new Peer();$('networkStatus').textContent='ПОДКЛЮЧЕНИЕ…';
 peer.on('open',()=>{upstream=peer.connect('bk-'+code,{reliable:true});
   upstream.on('open',()=>upstream.send({t:'join',name:name()}));
   upstream.on('data',m=>{if(!m||typeof m!=='object')return;if(m.t==='welcome'){myId=m.id;state=unpack(m.state);phaseShown='';$('networkStatus').textContent='● ОНЛАЙН';render();}else if(m.t==='state'){state=unpack(m.state);render();}else if(m.t==='error'){toast(m.message);}});
   upstream.on('close',()=>{$('networkStatus').textContent='● НЕТ СВЯЗИ';toast('Связь с ведущим потеряна.');});
   upstream.on('error',e=>error('Подключение: '+(e.message||'ошибка')));
 });peer.on('error',e=>error('Подключение: '+(e.message||e.type||'ошибка')));
}
function joinConnection(conn){conn.on('data',m=>{if(!m||typeof m!=='object')return;
 if(m.t==='join'){
  if(connections.has(conn))return;
  const id=E.addPlayer(state,m.name);if(!id){conn.send({t:'error',message:'Комната заполнена или матч уже идёт.'});return;}
  connections.set(conn,id);conn.send({t:'welcome',id,state:pack(state)});broadcast();
 }else if(m.t==='action'){
  const id=connections.get(conn);if(!id)return;
  const now=Date.now();if(now-(lastSendTime.get(conn)||0)<90)return;lastSendTime.set(conn,now);
  const result=E.action(state,id,m.action);if(!result.ok)conn.send({t:'error',message:result.error});else broadcast();
 }
 });conn.on('close',()=>{connections.delete(conn);lastSendTime.delete(conn);toast('Один из игроков покинул комнату.');});}
function broadcast(){if(!state)return;const packed=pack(state);for(const c of connections.keys())if(c.open){try{c.send({t:'state',state:packed});}catch(_){}}render();}
function createDemo(){host=true;demo=true;code='DEMO';state=E.lobby(Date.now());myId=E.addPlayer(state,name());E.start(state,7);phaseShown='';$('networkStatus').textContent='● ОДИНОЧНАЯ ИГРА';render();}
function startGame(){if(!host)return;const res=E.start(state,Number($('botCount').value));if(!res.ok)return toast(res.error);broadcast();}
function command(a){if(!state||state.phase!=='playing')return;
 if(host){const r=E.action(state,myId,a);if(!r.ok)toast(r.error);else broadcast();}
 else if(upstream?.open){upstream.send({t:'action',action:a});}else toast('Нет связи с комнатой.');}
function render(){if(!state)return;
 if(state.phase==='lobby'){
  show('waiting');$('showCode').textContent=code;
  $('waitingPlayers').innerHTML=state.players.map(p=>`<div class="player-row"><i class="player-dot" style="background:${p.color}"></i><strong>${esc(p.name)}</strong><span class="muted">${p.id===myId?'это ты':''}</span></div>`).join('');
  $('startButton').classList.toggle('hidden',!host);$('botCount').disabled=!host;
  $('waitingHint').textContent=state.players.length===1?'Начать можно даже одному — против ботов.':state.players.length+' игроков готовы к битве.';
  phaseShown='lobby';return;
 }
 if(phaseShown!=='playing'&&phaseShown!=='ended'){
  show('game');phaseShown='playing';resize();centerOnCapital();
 }else if(phaseShown==='ended'&&state.phase==='playing'){phaseShown='playing';}
 updateUI();repaintWorld();queueDraw();
 if(state.phase==='ended'&&phaseShown!=='ended'){
  phaseShown='ended';const w=state.players.find(p=>p.id===state.winner);
  $('victoryName').textContent=w?(w.id===myId?'Твоё королевство победило!':w.name+' победило!'):'Ничья';
  $('victoryDesc').textContent=w?'Захвачено '+number(w.land)+' клеток мира. Война длилась '+Math.floor(state.tick/60)+' мин '+state.tick%60+' сек.':'Победитель не определён.';
  $('victory').classList.remove('hidden');
 }
}
function updateUI(){const p=mine();if(!p)return;
 for(const r of ['food','wood','stone','gold']){$('res'+r[0].toUpperCase()+r.slice(1)).textContent=number(p.res[r]);$('inc'+r[0].toUpperCase()+r.slice(1)).textContent='+'+number(p.income?.[r]);}
 $('troopCount').textContent=number(p.troops);$('troopCap').textContent='/ '+number(p.troopCap);
 const sec=Math.max(0,state.duration-state.tick);$('timeLeft').textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
 $('myKingdom').textContent=p.name.toUpperCase()+ (p.eliminated?' · РАЗГРОМЛЕНО':'');$('myKingdom').style.color=p.color;
 const top=[...state.players].filter(p=>p.land>0).sort((a,b)=>b.land-a.land);
 $('leaderboard').innerHTML=top.slice(0,9).map((v,i)=>`<div class="leader-row"><span>${i+1}.</span><i class="player-dot" style="background:${v.color}"></i><span class="leader-name">${esc(v.name)}${v.bot?' · AI':''}</span><div class="bar"><i style="width:${Math.max(3,v.land/Math.max(1,top[0].land)*100)}%;background:${v.color}"></i></div><div>${number(v.land)}</div></div>`).join('');
 if(currentTab==='build'){
  $('buildingsPanel').innerHTML=Object.entries(E.KINDS).map(([id,k])=>`<button data-build="${id}" class="build-btn ${buildMode===id?'active':''}" ${p.eliminated?'disabled':''}><span class="symbol">${symbols[id]}</span><strong>${esc(k.name)}</strong><span>${costText(k.cost)}</span></button>`).join('');
 }else if(currentTab==='tech'){
  $('techPanel').innerHTML=Object.entries(E.TECH).map(([id,t])=>{const l=p.tech[id];return `<div class="tech-item"><strong>${esc(t.name)} · Уровень ${l}/3</strong><p>${textTech[id]}</p><button data-research="${id}" ${l>=3||p.eliminated?'disabled':''}>${l>=3?'ИЗУЧЕНО':'ИССЛЕДОВАТЬ · '+costText(E.costTech(id,l))}</button></div>`;}).join('');
 }else if(currentTab==='diplomacy'){
  $('diplomacyPanel').innerHTML=state.players.filter(v=>v.id!==myId&&!v.eliminated).map(v=>`<div class="dip-item"><strong style="color:${v.color}">${esc(v.name)} ${v.bot?'[AI]':''}</strong><p>${number(v.land)} территорий · ${p.allies.includes(v.id)?'Ваш союзник':p.offers.includes(v.id)?'Предложение отправлено':v.offers.includes(myId)?'Ждёт вашего ответа':'Нейтральные отношения'}</p><button data-ally="${v.id}">${p.allies.includes(v.id)?'РАЗОРВАТЬ СОЮЗ':v.offers.includes(myId)?'ПРИНЯТЬ СОЮЗ':'ПРЕДЛОЖИТЬ СОЮЗ'}</button>${p.allies.includes(v.id)?`<button data-donate="${v.id}">ПОДАРИТЬ 100 ЗОЛОТА</button>`:''}</div>`).join('');
 }else{
  $('infoPanel').innerHTML=`<div class="info-stat"><span>Территория</span><strong>${number(p.land)} / ${number(state.landTotal)}</strong></div><div class="info-stat"><span>Доля суши</span><strong>${(p.land/state.landTotal*100).toFixed(1)}%</strong></div><div class="info-stat"><span>Действующие армии</span><strong>${state.armies.filter(a=>a.owner===myId).length}</strong></div><div class="info-stat"><span>Постройки</span><strong>${state.buildings.filter(b=>b.owner===myId).length}</strong></div><div class="info-stat"><span>Завоёванные столицы</span><strong>${p.kills}</strong></div>`;
  $('events').innerHTML=state.log.map(msg=>`<div>${esc(msg)}</div>`).join('');
 }
 updateSelection();
}
function updateSelection(){const p=mine(),item=selected?.kind==='army'?state.armies.find(a=>a.id===selected.id):selected?.kind==='building'?state.buildings.find(b=>b.id===selected.id):null;
 const box=$('selectedPanel');if(!item){box.textContent='Нажми на здание или армию, чтобы увидеть подробности. Для атаки нажми на чужую территорию.';return;}
 const own=item.owner===myId,op=E.person(state,item.owner);
 if(selected.kind==='army')box.innerHTML=`<strong>⚔ Отряд ${esc(op?.name||'')}</strong><div>Солдаты: ${number(item.strength)}</div><div>Цель: ${item.tx}, ${item.ty}</div>${own?'<button data-retreat="'+esc(item.id)+'">ВЕРНУТЬ В СТОЛИЦУ</button><div>Чтобы сменить цель, нажми на другую клетку карты.</div>':''}`;
 else box.innerHTML=`<strong>${symbols[item.kind]} ${esc(E.KINDS[item.kind]?.name||'Столица')}</strong><div>Владелец: ${esc(op?.name||'')}</div><div>Уровень: ${item.level}/4</div>${own?`<button data-upgrade="${esc(item.id)}" ${item.level>=4?'disabled':''}>${item.level>=4?'МАКС. УРОВЕНЬ':'УЛУЧШИТЬ · '+costText(E.costUpgrade(item))}</button>`:''}`;
}
$('buildingsPanel').addEventListener('click',e=>{const b=e.target.closest('[data-build]');if(!b)return;buildMode=buildMode===b.dataset.build?null:b.dataset.build;selected=null;$('cancelMode').classList.toggle('hidden',!buildMode);$('modeLabel').textContent=buildMode?'⌂ Строительство: '+E.KINDS[buildMode].name:'⚔ Отправить войска';$('actionHint').textContent=buildMode?'Нажми на свою землю для строительства.':'Нажми на цель на карте для похода.';updateUI();});
$('techPanel').addEventListener('click',e=>{const b=e.target.closest('[data-research]');if(b)command({type:'research',key:b.dataset.research});});
$('diplomacyPanel').addEventListener('click',e=>{const b=e.target.closest('[data-ally]'),d=e.target.closest('[data-donate]');if(b)command({type:'diplomacy',target:Number(b.dataset.ally)});if(d)command({type:'donate',target:Number(d.dataset.donate),amount:100,resource:'gold'});});
$('selectedPanel').addEventListener('click',e=>{const b=e.target.closest('[data-upgrade]'),r=e.target.closest('[data-retreat]');if(b)command({type:'upgrade',id:b.dataset.upgrade});if(r)command({type:'return',id:r.dataset.retreat});});
for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>{currentTab=b.dataset.tab;document.querySelectorAll('[data-tab]').forEach(t=>t.classList.toggle('active',t===b));document.querySelectorAll('.tab-content').forEach(t=>t.classList.toggle('hidden',t.id!=='tab-'+currentTab));updateUI();};
$('menuToggle').onclick=()=>{panelOpen=!panelOpen;$('sidebar').classList.toggle('open',panelOpen);};
$('attackPercent').oninput=e=>{percent=Number(e.target.value);$('percentLabel').textContent=percent+'%';document.querySelectorAll('[data-percent]').forEach(t=>t.classList.toggle('active',Number(t.dataset.percent)===percent));};
for(const b of document.querySelectorAll('[data-percent]'))b.onclick=()=>{$('attackPercent').value=b.dataset.percent;$('attackPercent').oninput({target:$('attackPercent')});};
$('cancelMode').onclick=cancelMode;function cancelMode(){buildMode=null;$('modeLabel').textContent='⚔ Отправить войска';$('actionHint').textContent='Нажми на цель на карте для похода.';$('cancelMode').classList.add('hidden');updateUI();}
function resize(){const rect=canvas.getBoundingClientRect();if(rect.width<1)return;const dpr=Math.min(2,devicePixelRatio||1);const w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;queueDraw();}}
function centerOnCapital(){const p=mine();if(!p?.capital)return;const c=p.capital;const r=canvas.getBoundingClientRect();camX=r.width/2-(c.x+.5)*TILE*zoom;camY=r.height/2-(c.y+.5)*TILE*zoom;clampCamera();queueDraw();}
function clampCamera(){const rect=canvas.getBoundingClientRect();camX=Math.min(70,Math.max(rect.width-E.W*TILE*zoom-70,camX));camY=Math.min(70,Math.max(rect.height-E.H*TILE*zoom-70,camY));}
function zoomAt(factor,cx,cy){const old=zoom;zoom=Math.max(.52,Math.min(5,zoom*factor));camX=cx-(cx-camX)*zoom/old;camY=cy-(cy-camY)*zoom/old;clampCamera();$('zoomText').textContent=Math.round(zoom*100)+'%';queueDraw();}
function pixelAt(clientX,clientY){const r=canvas.getBoundingClientRect();return {x:clientX-r.left,y:clientY-r.top};}
function gridAt(clientX,clientY){const p=pixelAt(clientX,clientY);return {x:Math.floor((p.x-camX)/(TILE*zoom)),y:Math.floor((p.y-camY)/(TILE*zoom))};}
function selectMap(clientX,clientY){if(state?.phase!=='playing'||mine()?.eliminated)return;const p=gridAt(clientX,clientY);if(!E.inside(p.x,p.y))return;
 const b=E.buildingAt(state,p.x,p.y),a=E.armiesAt(state,p.x,p.y).find(a=>a.owner===myId)||E.armiesAt(state,p.x,p.y)[0];
 if(buildMode){if(E.owner(state,p.x,p.y)!==myId){toast('Строить можно только на собственной территории.');return;}command({type:'build',kind:buildMode,x:p.x,y:p.y});cancelMode();return;}
 if(a&&a.owner===myId){selected={kind:'army',id:a.id};updateSelection();queueDraw();return;}
 if(b){selected={kind:'building',id:b.id};updateSelection();queueDraw();if(b.owner===myId)return;}
 if(selected?.kind==='army'&&state.armies.some(a=>a.id===selected.id&&a.owner===myId)){command({type:'redirect',id:selected.id,x:p.x,y:p.y});selected=null;return;}
 if(E.owner(state,p.x,p.y)===myId&&!b){selected=null;updateSelection();queueDraw();return;}
 if(E.tile(state,p.x,p.y)===0&&mine().tech.sailing<1)toast('До моря нужен флот. Исследуй «Флот» и построй порт.');
 else command({type:'send',x:p.x,y:p.y,percent});
 updateMapStatus(p.x,p.y);
}
function updateMapStatus(x,y){if(!state)return;const o=E.owner(state,x,y),p=E.person(state,o);$('mapStatus').textContent=`${terrainNames[E.tile(state,x,y)]} · ${p?p.name:'Свободные земли'} · (${x},${y})`;}
function onPointerDown(e){if(!state)return;canvas.setPointerCapture(e.pointerId);pressed.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pressed.size===1){pointerStart={x:e.clientX,y:e.clientY,camX,camY,moved:false};gesture=null;}else if(pressed.size===2){const v=[...pressed.values()];gesture={dist:Math.hypot(v[0].x-v[1].x,v[0].y-v[1].y),zoom,cx:(v[0].x+v[1].x)/2,cy:(v[0].y+v[1].y)/2};pointerStart=null;}}
function onPointerMove(e){if(!pressed.has(e.pointerId))return;pressed.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pressed.size===2&&gesture){const vals=[...pressed.values()];const nextDist=Math.max(1,Math.hypot(vals[0].x-vals[1].x,vals[0].y-vals[1].y));const center=pixelAt((vals[0].x+vals[1].x)/2,(vals[0].y+vals[1].y)/2);const newZoom=Math.max(.52,Math.min(5,gesture.zoom*nextDist/Math.max(1,gesture.dist)));zoomAt(newZoom/zoom,center.x,center.y);return;}
 if(pointerStart){const dx=e.clientX-pointerStart.x,dy=e.clientY-pointerStart.y;if(Math.hypot(dx,dy)>6)pointerStart.moved=true;if(pointerStart.moved){camX=pointerStart.camX+dx;camY=pointerStart.camY+dy;clampCamera();queueDraw();}}}
function onPointerUp(e){const was=pointerStart;const touch=pressed.size;pressed.delete(e.pointerId);if(touch===1){pointerStart=null;if(was&&!was.moved)selectMap(e.clientX,e.clientY);}else{pointerStart=null;gesture=null;}}
canvas.addEventListener('pointerdown',onPointerDown);canvas.addEventListener('pointermove',onPointerMove);canvas.addEventListener('pointerup',onPointerUp);canvas.addEventListener('pointercancel',e=>{pressed.delete(e.pointerId);pointerStart=null;gesture=null;});
canvas.addEventListener('wheel',e=>{e.preventDefault();const p=pixelAt(e.clientX,e.clientY);zoomAt(e.deltaY<0?1.13:.885,p.x,p.y);},{passive:false});canvas.addEventListener('contextmenu',e=>e.preventDefault());
$('zoomIn').onclick=()=>zoomAt(1.24,canvas.clientWidth/2,canvas.clientHeight/2);$('zoomOut').onclick=()=>zoomAt(.8,canvas.clientWidth/2,canvas.clientHeight/2);$('centerMap').onclick=centerOnCapital;
mini.addEventListener('pointerdown',e=>{const r=mini.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*E.W,y=(e.clientY-r.top)/r.height*E.H;camX=canvas.clientWidth/2-x*TILE*zoom;camY=canvas.clientHeight/2-y*TILE*zoom;clampCamera();queueDraw();});
function buildTerrain(){if(!state?.tiles.length)return;terrainLayer=document.createElement('canvas');terrainLayer.width=E.W*TILE;terrainLayer.height=E.H*TILE;const c=terrainLayer.getContext('2d');
 const palette=['#235574','#52735d','#2b6156','#687064','#719c6e','#88774a','#657482'];
 for(let y=0;y<E.H;y++)for(let x=0;x<E.W;x++){
  const t=E.tile(state,x,y),xx=x*TILE,yy=y*TILE;c.fillStyle=palette[t];c.fillRect(xx,yy,TILE,TILE);
  const h=(x*183+y*97+x*y*3)%17;if(t===0){if(h<3){c.fillStyle='#447f96';c.fillRect(xx+4,yy+6,5,1);}continue;}
  if(t===2){c.fillStyle='#1a5247';c.beginPath();c.arc(xx+5,yy+5,4,0,Math.PI*2);c.arc(xx+10,yy+9,3,0,Math.PI*2);c.fill();}
  if(t===3||t===6){c.fillStyle=t===6?'#b3b9a3':'#939986';c.beginPath();c.moveTo(xx+3,yy+11);c.lineTo(xx+8,yy+3);c.lineTo(xx+13,yy+12);c.closePath();c.fill();}
  if(t===5){c.fillStyle='#edcb6b';c.fillRect(xx+6,yy+5,3,3);}
  if(t===4&&h<4){c.fillStyle='#aedc85';c.fillRect(xx+3,yy+6,2,4);}
 }
}
function repaintWorld(){if(!state?.owners.length)return;if(!terrainLayer||terrainSeed!==state.seed){buildTerrain();terrainSeed=state.seed;}
 ownershipLayer=document.createElement('canvas');ownershipLayer.width=E.W*TILE;ownershipLayer.height=E.H*TILE;const c=ownershipLayer.getContext('2d');
 const col=state.players.map(p=>p.color);const fillById=new Map(state.players.map(p=>[p.id,hexAlpha(p.color,.55)]));
 for(let y=0;y<E.H;y++)for(let x=0;x<E.W;x++){
  const id=state.owners[y*E.W+x];if(!id)continue;const xx=x*TILE,yy=y*TILE;c.fillStyle=fillById.get(id)||'#ffffff77';c.fillRect(xx,yy,TILE,TILE);
  c.strokeStyle=col[id-1]||'#fff';c.lineWidth=1.5;
  if(x===0||state.owners[y*E.W+x-1]!==id){c.beginPath();c.moveTo(xx+.8,yy);c.lineTo(xx+.8,yy+TILE);c.stroke();}
  if(y===0||state.owners[(y-1)*E.W+x]!==id){c.beginPath();c.moveTo(xx,yy+.8);c.lineTo(xx+TILE,yy+.8);c.stroke();}
 }
}
function hexAlpha(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;}
function queueDraw(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;draw();});}
function draw(){if(!state?.tiles.length||!terrainLayer)return;resize();const dpr=canvas.width/Math.max(1,canvas.clientWidth);const w=canvas.clientWidth,h=canvas.clientHeight;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#112e42';ctx.fillRect(0,0,w,h);
 ctx.save();ctx.translate(camX,camY);ctx.scale(zoom,zoom);ctx.imageSmoothingEnabled=false;ctx.drawImage(terrainLayer,0,0);if(ownershipLayer)ctx.drawImage(ownershipLayer,0,0);
 const capF=Math.max(9,13/zoom);ctx.font='800 '+capF+'px DM Sans, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
 for(const b of state.buildings){const x=(b.x+.5)*TILE,y=(b.y+.5)*TILE;if(x*zoom+camX<-40||x*zoom+camX>w+40||y*zoom+camY<-40||y*zoom+camY>h+40)continue;
  const c=color(b.owner);const rad=b.kind==='capital'?12:8;ctx.fillStyle='#101b29';ctx.strokeStyle=c;ctx.lineWidth=2/zoom;ctx.beginPath();ctx.arc(x,y,rad,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle=b.kind==='capital'?'#edcc83':'#f7f7ed';ctx.font=(b.kind==='capital'?'bold ':'')+Math.max(11,14/zoom)+'px Georgia,serif';ctx.fillText(symbols[b.kind]||'◇',x,y+1);
  if(b.kind==='capital'&&zoom>.8){const p=E.person(state,b.owner);const text=p?.name||'';ctx.font='bold '+Math.max(9,12/zoom)+'px DM Sans, sans-serif';ctx.fillStyle='#071725dd';const tw=ctx.measureText(text).width+12;ctx.fillRect(x-tw/2,y+15,tw,18);ctx.fillStyle='#fff';ctx.fillText(text,x,y+24);}
 }
 for(const a of state.armies){const x=(a.x+.5)*TILE,y=(a.y+.5)*TILE;if(x*zoom+camX<-50||x*zoom+camX>w+50||y*zoom+camY<-50||y*zoom+camY>h+50)continue;
  ctx.fillStyle='#09131cf1';ctx.strokeStyle=color(a.owner);ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,7,0,2*Math.PI);ctx.fill();ctx.stroke();ctx.fillStyle='#fff';ctx.font='bold 8px Arial';ctx.fillText('➤',x,y+.5);
  if(zoom>1.15){ctx.font='bold 8px DM Sans';const n=number(a.strength);ctx.fillStyle='#031320b5';ctx.fillRect(x-20,y+9,40,12);ctx.fillStyle='#fff';ctx.fillText(n,x,y+15);}
  if(a.owner===myId){ctx.strokeStyle=hexAlpha(color(a.owner),.55);ctx.setLineDash([2,3]);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo((a.tx+.5)*TILE,(a.ty+.5)*TILE);ctx.stroke();ctx.setLineDash([]);}
 }
 if(selected){const b=selected.kind==='building'?state.buildings.find(v=>v.id===selected.id):state.armies.find(v=>v.id===selected.id);if(b){ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;ctx.setLineDash([4,3]);ctx.strokeRect(b.x*TILE-5,b.y*TILE-5,TILE+10,TILE+10);ctx.setLineDash([]);}}
 ctx.restore();drawMini();}
function drawMini(){if(!state?.owners.length)return;const im=mctx.createImageData(E.W,E.H);for(let i=0;i<state.tiles.length;i++){
  const o=state.owners[i],t=state.tiles[i],hex=o?color(o):['#20506e','#436950','#255444','#555d54','#799465','#8f7a51','#68717a'][t];const val=parseInt(hex.slice(1),16);const at=i*4;im.data[at]=(val>>16)&255;im.data[at+1]=(val>>8)&255;im.data[at+2]=val&255;im.data[at+3]=255;
 }mctx.putImageData(im,0,0);mctx.lineWidth=.7;mctx.strokeStyle='#fff';const scale=zoom*TILE;const x=-camX/scale,y=-camY/scale;mctx.strokeRect(x,y,canvas.clientWidth/scale,canvas.clientHeight/scale);
}
window.addEventListener('resize',()=>{resize();clampCamera();queueDraw();});document.addEventListener('keydown',e=>{if(e.key==='Escape')cancelMode();if(!state||state.phase!=='playing'||['INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;if(e.key==='+'||e.key==='=')zoomAt(1.2,canvas.clientWidth/2,canvas.clientHeight/2);if(e.key==='-')zoomAt(.8,canvas.clientWidth/2,canvas.clientHeight/2);});
$('hostButton').onclick=createRoom;$('joinButton').onclick=joinRoom;$('demoButton').onclick=createDemo;$('startButton').onclick=startGame;$('copyLink').onclick=async()=>{try{await navigator.clipboard.writeText(urlRoom());toast('Ссылка на комнату скопирована.');}catch(_){prompt('Ссылка:',urlRoom());}};$('restart').onclick=()=>location.href=location.pathname;
try{const previous=localStorage.getItem('bk-name');if(previous)$('nickname').value=previous;}catch(_){ }
const fromHash=location.hash.replace('#','').toUpperCase().replace(/[^A-Z0-9]/g,'');if(fromHash)$('roomCode').value=fromHash;
setInterval(()=>{if(!host||!state||state.phase!=='playing')return;E.tick(state);broadcast();},1000);
})();
