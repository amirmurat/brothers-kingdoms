/* Brothers Kingdoms Frontier — canvas world, realtime multiplayer and responsive command UI. */
(()=>{
'use strict';
const E=window.BKEngine,$=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const view=$('mapView'),canvas=$('mapCanvas'),ctx=canvas.getContext('2d',{alpha:false}),mini=$('minimap'),mctx=mini.getContext('2d');
const terrainNames=['Море','Равнина','Лес','Холмы','Плодородная земля','Рудное месторождение','Горы'];
const iconPaths={
 capital:'<path d="M4 21V7l8-4 8 4v14H4Z"/><path d="M9 21v-8h6v8M4 10h16"/>',
 farm:'<path d="M12 21V11m0 4c-5 0-7-3-7-7 4 0 7 2 7 7Zm0-3c0-5 3-7 7-7 0 4-2 7-7 7Z"/>',
 lumber:'<path d="m12 3 7 9h-4l5 6H4l5-6H5l7-9ZM12 18v4"/>',
 quarry:'<path d="m3 18 5-9 5 9H3Zm9 0 4-13 5 13h-9Z"/>',
 mine:'<path d="M4 8c4-6 12-6 16 0M12 7v13m-4-9 8 8"/>',
 barracks:'<path d="M5 4l14 16M19 4 5 20M3 7l4-4m10 18 4-4"/>',
 fort:'<path d="M4 21V7h4v4h8V7h4v14H4Zm6 0v-5h4v5M4 7V4h4v3m8 0V4h4v3"/>',
 port:'<path d="M3 16 12 20 21 16l-2-5H5l-2 5Zm9-5V3m0 2 5 4h-5M3 22c3-2 6-2 9 0 3-2 6-2 9 0"/>',
 city:'<path d="M3 21V9h7v12H3Zm7 0V4h11v17H10ZM6 12v2m0 3v1m7-10v2m4-2v2m-4 4v2m4-2v2"/>'};
const iconSvg=(id)=>`<svg viewBox="0 0 24 24" aria-hidden="true">${iconPaths[id]||iconPaths.city}</svg>`;
const iconImages=Object.fromEntries(Object.entries(iconPaths).map(([id,path])=>{const im=new Image();const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f2f6ed" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);im.onload=()=>queueDraw();return[id,im];}));
const textTech={economy:'Увеличивает производство всех ресурсов на 25% за уровень.',war:'Усиливает атаки и оборону; ускоряет набор войск.',logistics:'Ускоряет походы на одну клетку за ход.',sailing:'Позволяет морские походы через проливы, нужен порт.'};
const costText=c=>Object.entries(c||{}).map(([k,v])=>({wood:'Древесина',stone:'Камень',gold:'Золото',food:'Еда'}[k]||k)+' '+v).join(' · ');
const number=n=>Math.floor(n||0).toLocaleString('ru-RU');
let dragAttack=null,longPressTimer=null,dragHint=null;
let state=null,myId=null,host=false,demo=false,peer=null,upstream=null,code='',connections=new Map(),lastSendTime=new Map(),phaseShown='',timer=0;
let zoom=1.05,camX=0,camY=0,terrainSeed=null,pressed=new Map(),pointerStart=null,gesture=null,selected=null,buildMode=null,currentTab='build',percent=30,tooltipTimer=null,worldLayer=null,paintedRevision=-1,miniRevision=-1,renderQueued=false,panelOpen=false;let toastTimeout=null,target=null,redirectArmy=null,pauseSolo=false,moveCursor=null,lastTap=0,lastStateAt=Date.now(),pendingOrders=new Map(),seq=0,readyLocal=false,reconnectTries=0,reconnectTimer=null,connectTimer=null,tokenStore=new Map(),previousFocus=null,showTutorialOnce=true,lastRoster='',previousOwners=new Map(),previousRevs=new Map(),lastSaveTick=-1,oldArmyPositions=new Map(),movementStart=0,lastAnnounced='',frontIndex=0;
const TILE=14;const mine=()=>state?.players.find(p=>p.id===myId);const color=id=>state?.players.find(p=>p.id===id)?.color||'#e8f3f3';
function toast(msg){const t=$('toast');t.textContent=msg;$('gameError').textContent=msg;t.classList.remove('hidden');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>t.classList.add('hidden'),3200);}
function show(screen){for(const name of ['lobby','waiting','game'])$(name).classList.toggle('hidden',name!==screen);if(screen==='game')setTimeout(resize,10);}
function error(s){$('lobbyError').textContent=s;toast(s);}
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
function setNetwork(text){$('networkStatus').textContent=text;}
function getToken(){try{let t=sessionStorage.getItem('bk-token-'+code);if(!t){t=crypto.randomUUID();sessionStorage.setItem('bk-token-'+code,t);}return t;}catch(_){return code+'-'+name();}}
function saveSolo(){if(!demo||!state||state.phase!=='playing')return;try{localStorage.setItem('bk-v7-save',JSON.stringify(state));}catch(_){}}
function copyText(t){navigator.clipboard?.writeText(t).then(()=>toast('Скопировано')).catch(()=>prompt('Скопируй:',t));}
function canPay(p,c){return Object.entries(c||{}).every(([k,v])=>(p.res[k]||0)>=v);}
function deficit(p,c){return Object.entries(c||{}).filter(([k,v])=>(p.res[k]||0)<v).map(([k,v])=>({wood:'Древесина',stone:'Камень',gold:'Золото',food:'Еда'}[k]+': −'+(v-(p.res[k]||0)))).join(', ');}
function patchHtml(id,html){const el=$(id);if(el&&el.__last!==html){el.innerHTML=html;el.__last=html;}}
function inspectCell(x,y){if(!state||!E.inside(x,y))return;const id=E.owner(state,x,y),p=E.person(state,id),line=terrainNames[E.tile(state,x,y)]+' · '+(p?.name||'Свободная земля')+' · '+x+','+y;$('mapStatus').textContent=line;$('mapStatusMobile').textContent=line;$('mapStatusMobile').classList.remove('hidden');}
function setPreview(t){target=t;const box=$('targetPreview');box.classList.toggle('hidden',!t);if(!t){queueDraw();return;}const owner=E.owner(state,t.x,t.y),enemy=E.person(state,owner),p=mine(),sent=Math.floor(p.troops*percent/100);$('targetTitle').textContent=t.type==='redirect'?'Изменение маршрута':enemy?'Атака: '+enemy.name:'Захват нейтральной земли';$('targetDetail').textContent=terrainNames[E.tile(state,t.x,t.y)]+' · '+number(sent)+' войск · Резерв '+number(p.troops-sent);const defense=enemy?Math.round(E.tileDefense(state,owner,t.x,t.y)):0;const risky=owner>0&&defense>sent/6;$('targetForecast').textContent=t.type==='redirect'?'Приказ будет отправлен после подтверждения.':owner?'Оборона: '+defense+(risky?' · опасная атака':' · преимущество вероятно'):'Сопротивление нейтральной земли небольшое';$('confirmTarget').textContent=t.type==='redirect'?'Сменить цель':'АТАКОВАТЬ →';$('confirmTarget').disabled=!(t.type==='redirect'||sent>=35);box.dataset.order=t.type;document.querySelectorAll('[data-target-percent]').forEach(b=>b.classList.toggle('active',Number(b.dataset.targetPercent)===percent));queueDraw();}
function contextual(item){const box=$('contextCard'),content=$('contextBody');if(!item){box.classList.add('hidden');return;}const me=mine(),own=item.owner===myId,other=E.person(state,item.owner);let html='';if(item.kind&&item.kind!=='army'){const cost=E.costUpgrade(item);html=`<strong>${esc(E.KINDS[item.kind]?.name||'Столица')} · ур. ${item.level}</strong><span>${esc(other?.name||'')}</span>${own?`<button data-context-upgrade="${esc(item.id)}" ${item.level>=4||!canPay(me,cost)?'disabled':''}>${item.level>=4?'Максимальный уровень':'Улучшить · '+costText(cost)}</button>`:''}`;}else{html=`<strong>Армия · ${esc(other?.name||'')}</strong><span>${number(item.strength)} солдат · ${item.tx},${item.ty}</span>${own?`<button data-context-redirect="${esc(item.id)}">Сменить цель</button><button data-context-return="${esc(item.id)}">Отступить</button>`:''}`;}if(content.__last!==html){content.innerHTML=html;content.__last=html;}box.classList.remove('hidden');}

function createRoom(){if(!getPeer())return;setBusy(true);code=randomCode();host=true;demo=false;readyLocal=true;peer=new Peer('bk-'+code);setNetwork('ПОДКЛЮЧЕНИЕ');
 connectTimer=setTimeout(()=>{if(!state){setBusy(false);error('Не удалось создать комнату. Повтори попытку.');try{peer.destroy();}catch(_){}}},12000);
 peer.on('open',()=>{clearTimeout(connectTimer);setBusy(false);state=E.lobby(Date.now());myId=E.addPlayer(state,name());state.players[0].ready=true;state.settings={bots:Number($('botCount').value),duration:Number($('matchDuration').value)};setNetwork('ВЕДУЩИЙ');try{history.replaceState(null,'','#'+code);}catch(_){}phaseShown='';render();});
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
function createDemo(){worldLayer=null;paintedRevision=-1;host=true;demo=true;pauseSolo=false;code='DEMO';const saved=(()=>{try{return JSON.parse(localStorage.getItem('bk-v7-save')||localStorage.getItem('bk-v6-save'));}catch(_){return null;}})();state=saved?.phase==='playing'&&confirm('Продолжить сохранённую одиночную партию?')?saved:E.lobby(Date.now());myId=state.players[0]?.id||E.addPlayer(state,name());if(state.phase==='lobby'){state.settings={bots:Number($('soloBots').value),duration:720};E.start(state,Number($('soloBots').value));}phaseShown='';setNetwork('ОДИНОЧНО');render();showTutorial();} 
function startGame(){if(!host)return;const waiting=state.players.filter(p=>!p.bot&&p.connected!==false&&!p.ready);if(waiting.length)return toast('Ожидаем готовность: '+waiting.map(p=>p.name).join(', '));state.settings={bots:Number($('botCount').value),duration:Number($('matchDuration').value)};const res=E.start(state,state.settings.bots);if(!res.ok)return toast(res.error);broadcast(true);showTutorial();}
function command(a){if(!state||state.phase!=='playing')return false;
 if(host){const r=E.action(state,myId,a);if(!r.ok){toast(r.error);return false;}broadcast();if(a.type==='build'){toast('Постройка готова');cancelMode();}return true;}
 if(upstream?.open){const id=++seq;pendingOrders.set(id,Date.now());upstream.send({t:'action',id,action:a});return true;}toast('Нет связи с комнатой.');return false;}
function showTutorial(){if(!showTutorialOnce)return;try{if(localStorage.getItem('bk-v7-tutorial'))return;}catch(_){}$('tutorial').classList.remove('hidden');$('closeTutorial').focus();}

function render(){if(!state)return;
 if(state.phase==='lobby'){
  $('victory').classList.add('hidden');show('waiting');$('showCode').textContent=code;
  patchHtml('waitingPlayers',state.players.map(p=>`<div class="player-row"><i class="player-dot" style="background:${p.color}"></i><strong>${esc(p.name)}</strong><span class="muted">${p.id===myId?'Ты':p.id===1?'Ведущий':''} · ${p.connected===false?'Не в сети':p.ready?'Готов':'Ожидание'}</span></div>`).join(''));
  $('startButton').classList.toggle('hidden',!host);$('readyButton').classList.toggle('hidden',host);$('readyButton').setAttribute('aria-pressed',String(readyLocal));$('readyButton').textContent=readyLocal?'Готов ✓':'Я готов';$('botCount').disabled=!host;$('matchDuration').disabled=!host;$('spawnChoice').disabled=!!mine()?.ready&&!host;
  $('startButton').disabled=!state.players.filter(p=>!p.bot).every(p=>p.ready||p.connected===false);$('botCount').value=state.settings?.bots??7;$('matchDuration').value=state.settings?.duration??720;
  $('waitingHint').textContent='Игроков: '+state.players.filter(p=>!p.bot).length+' · Ведущий должен держать страницу открытой.';
  phaseShown='lobby';return;
 }
 if(phaseShown!=='playing'&&phaseShown!=='ended'){
  show('game');phaseShown='playing';zoom=window.innerWidth<600?.54:.78;if(window.innerWidth<850){$('minimapWrap').classList.add('minimized');$('minimapToggle').setAttribute('aria-expanded','false');document.querySelector('#minimapToggle span').textContent='+';}resize();centerOnCapital();
 }else if(phaseShown==='ended'&&state.phase==='playing'){phaseShown='playing';}
 updateUI();repaintWorld();queueDraw();
 if(state.phase==='ended'&&phaseShown!=='ended'){
  phaseShown='ended';const w=state.players.find(p=>p.id===state.winner);
  $('victoryName').textContent=w?(w.id===myId?'Твоё королевство победило!':w.name+' победило!'):'Ничья';
  $('victoryDesc').textContent=w?'Захвачено '+number(w.land)+' клеток мира. Война длилась '+Math.floor(state.tick/60)+' мин '+state.tick%60+' сек.':'Победитель не определён.';
  $('victory').classList.remove('hidden');$('victoryStats').textContent='Твоя земля: '+number(mine()?.land)+' · Уничтожено столиц: '+number(mine()?.kills)+' · Построек: '+state.buildings.filter(b=>b.owner===myId).length;
 }
}
function updateUI(){const p=mine();if(!p)return;
 for(const r of ['food','wood','stone','gold']){$('res'+r[0].toUpperCase()+r.slice(1)).textContent=number(p.res[r]);$('inc'+r[0].toUpperCase()+r.slice(1)).textContent='+'+number(p.income?.[r]||0)+'/с';}
 $('troopCount').textContent=number(p.troops);$('troopCap').textContent='/ '+number(p.troopCap);$('troopGrowth').textContent='+'+number(p.troopIncome||0)+'/с';const sec=Math.max(0,state.duration-state.tick);$('timeLeft').textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');$('landCount').textContent=number(p.land);$('landShare').textContent=(p.land/Math.max(1,state.landTotal)*100).toFixed(1)+'% / 70%';$('myKingdom').textContent=p.name+(p.eliminated?' · РАЗГРОМ':'');$('myKingdom').title=p.name;$('myKingdom').style.color=p.color;
 const sent=Math.floor(p.troops*percent/100);$('sendingTroops').textContent=number(sent);$('remainingTroops').textContent=number(p.troops-sent);$('activeArmies').textContent=state.armies.filter(a=>a.owner===myId).length+'/12';$('dockSummary').textContent=percent+'% · '+number(sent);if(target)setPreview(target);
 const top=[...state.players].filter(p=>p.land>0).sort((a,b)=>b.land-a.land);
 patchHtml('quickLeadersList',top.slice(0,6).map(v=>'<div class="quick-row"><span style="background:'+v.color+'"></span><b>'+esc(v.name)+'</b><small>'+number(v.land)+' клеток</small></div>').join(''));
 patchHtml('leaderboard',top.slice(0,9).map((v,i)=>`<div class="leader-row"><span>${i+1}.</span><i class="player-dot" style="background:${v.color}"></i><span class="leader-name" title="${esc(v.name)}">${esc(v.name)}${v.bot?' · Bot':''}</span><div class="bar"><i style="width:${Math.max(3,v.land/Math.max(1,top[0].land)*100)}%;background:${v.color}"></i></div><div>${number(v.land)}</div></div>`).join(''));
 if(currentTab==='build'){
  patchHtml('buildingsPanel',Object.entries(E.KINDS).map(([id,k])=>{const ok=canPay(p,k.cost),req=({lumber:'Лес',quarry:'Холмы или горы',mine:'Холмы, горы, руда',port:'Побережье'})[id]||'Своя земля';return `<button data-build="${id}" class="build-btn ${buildMode===id?'active':''}" ${!ok||p.eliminated?'disabled':''} title="${ok?'Место: '+req:'Не хватает: '+deficit(p,k.cost)}"><span class="build-icon">${iconSvg(id)}</span><strong>${esc(k.name)}</strong><span>${esc(req)} · ${costText(k.cost)}${ok?'':' · Не хватает: '+deficit(p,k.cost)}</span></button>`;}).join(''));
 }else if(currentTab==='tech'){
  patchHtml('techPanel',Object.entries(E.TECH).map(([id,t])=>{const l=p.tech[id],cost=E.costTech(id,l),ok=canPay(p,cost);return `<div class="tech-item"><strong>${esc(t.name)} · ${l}/3</strong><p>${textTech[id]}</p><button data-research="${id}" ${l>=3||!ok||p.eliminated?'disabled':''}>${l>=3?'Исследовано':ok?'Изучить · '+costText(cost):'Не хватает: '+deficit(p,cost)}</button></div>`;}).join(''));
 }else if(currentTab==='diplomacy'){
  patchHtml('diplomacyPanel',state.players.filter(v=>v.id!==myId&&!v.eliminated).map(v=>`<div class="dip-item"><strong style="color:${v.color}">${esc(v.name)}</strong><p>${number(v.land)} земли · ${p.allies.includes(v.id)?'Союзник':p.offers.includes(v.id)?'Предложение отправлено':v.offers.includes(myId)?'Ожидает согласия':'Нейтральный'}</p><button data-ally="${v.id}">${p.allies.includes(v.id)?'Разорвать союз':v.offers.includes(myId)?'Принять союз':'Предложить союз'}</button>${p.allies.includes(v.id)?`<button data-donate="${v.id}">Передать 100 золота</button>`:''}</div>`).join(''));
 }else{
  patchHtml('infoPanel',`<div class="info-stat"><span>Территория</span><strong>${number(p.land)} / ${number(state.landTotal)} · ${(p.land/Math.max(1,state.landTotal)*100).toFixed(1)}%</strong></div><div class="info-stat"><span>До победы (70%)</span><strong>${Math.max(0,(70-p.land/Math.max(1,state.landTotal)*100)).toFixed(1)}%</strong></div><div class="info-stat"><span>Армии</span><strong>${state.armies.filter(a=>a.owner===myId).length}/12</strong></div><div class="info-stat"><span>Здания</span><strong>${state.buildings.filter(b=>b.owner===myId).length}</strong></div>`);patchHtml('events',state.log.map(msg=>`<div>${esc(msg)}</div>`).join(''));
 }
 $('economyDetails').textContent='Еда '+number(p.res.food)+' (+'+number(p.income?.food||0)+'/с) · Древесина '+number(p.res.wood)+' · Камень '+number(p.res.stone)+' · Золото '+number(p.res.gold);
 patchHtml('accessibleObjects',state.buildings.filter(b=>b.owner===myId).slice(0,30).map(b=>'<li>'+esc(E.KINDS[b.kind]?.name||'Столица')+' '+b.x+','+b.y+'</li>').join('')+state.armies.filter(a=>a.owner===myId).map(a=>'<li>Армия '+number(a.strength)+' солдат, '+a.x+','+a.y+'</li>').join(''));
 if(state.log?.[0]&&state.tick>3&&state.log[0]!==lastAnnounced){const message=state.log[0];lastAnnounced=message;if(/захватил столицу|разгром|победил|союз/.test(message.toLowerCase()))toast(message);}
 updateSelection();
}
function updateSelection(){const item=selected?.kind==='army'?state.armies.find(a=>a.id===selected.id):selected?.kind==='building'?state.buildings.find(b=>b.id===selected.id):null;contextual(item);const box=$('selectedPanel');if(!item){box.textContent='Коснись объекта на карте. Для атаки выбери цель и подтверди приказ.';return;}box.textContent=(item.kind?E.KINDS[item.kind]?.name||'Столица':'Армия')+' · '+(E.person(state,item.owner)?.name||'')+' · '+(item.strength?number(item.strength)+' войск':'уровень '+item.level);}
$('buildingsPanel').addEventListener('click',e=>{const b=e.target.closest('[data-build]');if(!b)return;buildMode=buildMode===b.dataset.build?null:b.dataset.build;selected=null;setPreview(null);$('cancelMode').classList.toggle('hidden',!buildMode);$('modeLabel').textContent=buildMode?'Построить: '+E.KINDS[buildMode].name:'Наступление';$('actionHint').textContent=buildMode?'Подсвечены допустимые клетки. Коснись своей земли.':'Коснись цели или удержи свою землю и проведи к цели.';updateUI();if(buildMode&&window.innerWidth<851)closePanel();queueDraw();});
$('techPanel').addEventListener('click',e=>{const b=e.target.closest('[data-research]');if(b)command({type:'research',key:b.dataset.research});});
$('diplomacyPanel').addEventListener('click',e=>{const b=e.target.closest('[data-ally]'),d=e.target.closest('[data-donate]');if(b)command({type:'diplomacy',target:Number(b.dataset.ally)});if(d)command({type:'donate',target:Number(d.dataset.donate),amount:100,resource:'gold'});});
$('contextCard').addEventListener('click',e=>{const u=e.target.closest('[data-context-upgrade]'),r=e.target.closest('[data-context-return]'),d=e.target.closest('[data-context-redirect]');if(u)command({type:'upgrade',id:u.dataset.contextUpgrade});if(r){command({type:'return',id:r.dataset.contextReturn});contextual(null);}if(d){redirectArmy=d.dataset.contextRedirect;toast('Теперь выбери новую цель на карте.');contextual(null);}});
$('closeContext').onclick=()=>{selected=null;contextual(null)};
$('selectedPanel').addEventListener('click',e=>{const b=e.target.closest('[data-upgrade]'),r=e.target.closest('[data-retreat]');if(b)command({type:'upgrade',id:b.dataset.upgrade});if(r)command({type:'return',id:r.dataset.retreat});});
for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>{currentTab=b.dataset.tab;document.querySelectorAll('[data-tab]').forEach(t=>{t.classList.toggle('active',t===b);t.setAttribute('aria-selected',String(t===b));});document.querySelectorAll('.tab-content').forEach(t=>t.classList.toggle('hidden',t.id!=='tab-'+currentTab));updateUI();};
function openPanel(){previousFocus=document.activeElement;panelOpen=true;$('sidebar').classList.add('open');$('panelBackdrop').classList.remove('hidden');$('sidebar').setAttribute('aria-modal',String(window.innerWidth<851));$('closePanel').focus();}
function closePanel(){panelOpen=false;$('sidebar').classList.remove('open');$('panelBackdrop').classList.add('hidden');$('sidebar').setAttribute('aria-modal','false');previousFocus?.focus?.();}
$('menuToggle').onclick=()=>panelOpen?closePanel():openPanel();$('developButton').onclick=()=>panelOpen?closePanel():openPanel();$('closePanel').onclick=closePanel;$('panelBackdrop').onclick=closePanel;
$('attackPercent').oninput=e=>{percent=Number(e.target.value);$('percentLabel').textContent=percent+'%';document.querySelectorAll('[data-percent]').forEach(t=>{const on=Number(t.dataset.percent)===percent;t.classList.toggle('active',on);t.setAttribute('aria-pressed',String(on));});if(state)updateUI();};
document.querySelectorAll('[data-target-percent]').forEach(b=>b.onclick=()=>{$('attackPercent').value=b.dataset.targetPercent;$('attackPercent').oninput({target:$('attackPercent')});});
for(const b of document.querySelectorAll('[data-percent]')){b.setAttribute('aria-pressed',String(Number(b.dataset.percent)===percent));b.onclick=()=>{$('attackPercent').value=b.dataset.percent;$('attackPercent').oninput({target:$('attackPercent')});};}
$('cancelMode').onclick=cancelMode;function cancelMode(){buildMode=null;$('modeLabel').textContent='Наступление';$('actionHint').textContent='Коснись цели или проведи от своей земли.';$('cancelMode').classList.add('hidden');queueDraw();}
$('cancelTarget').onclick=()=>{setPreview(null);redirectArmy=null;lastTap=0;};$('confirmTarget').onclick=()=>{if(!target)return;const t=target;if(t.type!=='redirect'&&percent>=75&&!confirm('Отправить '+percent+'% войск? Защита королевства ослабнет.'))return;const ok=command(t.type==='redirect'?{type:'redirect',id:t.id,x:t.x,y:t.y}:{type:'send',x:t.x,y:t.y,percent});if(ok){setPreview(null);redirectArmy=null;}};
$('dockToggle').onclick=()=>{const dock=$('battleDock');const collapsed=dock.classList.toggle('collapsed');$('dockToggle').setAttribute('aria-expanded',String(!collapsed));};
$('minimapToggle').onclick=()=>{const v=$('minimapWrap').classList.toggle('minimized');$('minimapToggle').setAttribute('aria-expanded',String(!v));document.querySelector('#minimapToggle span').textContent=v?'+':'−';};
$('economyToggle').onclick=()=>$('economyPanel').classList.toggle('hidden');$('closeEconomy').onclick=()=>$('economyPanel').classList.add('hidden');$('pauseMobile').onclick=()=>$('pauseGame').click();$('quickLeaders').onclick=()=>{$('economyPanel').classList.add('hidden');$('quickLeadersPanel').classList.remove('hidden');};$('closeQuickLeaders').onclick=()=>$('quickLeadersPanel').classList.add('hidden');$('nextFront').onclick=()=>{const armies=state?.armies.filter(a=>a.owner===myId)||[];if(!armies.length)return toast('Нет действующих армий');const a=armies[frontIndex++%armies.length];camX=canvas.clientWidth/2-(a.x+.5)*TILE*zoom;camY=canvas.clientHeight/2-(a.y+.5)*TILE*zoom;clampCamera();selected={kind:'army',id:a.id};updateSelection();$('economyPanel').classList.add('hidden');queueDraw();};
$('helpButton').onclick=()=>{$('tutorial').classList.remove('hidden');$('closeTutorial').focus();};$('closeTutorial').onclick=()=>{$('tutorial').classList.add('hidden');showTutorialOnce=false;try{localStorage.setItem('bk-v7-tutorial','yes');}catch(_){}$('mapCanvas').focus();};
$('pauseGame').onclick=()=>{if(!demo)return toast('Пауза только для одиночной игры.');pauseSolo=!pauseSolo;$('pauseGame').textContent=pauseSolo?'Продолжить':'Пауза';saveSolo();};
$('myKingdom').onclick=()=>toast(mine()?.name||'Королевство');
function resize(){const rect=canvas.getBoundingClientRect();if(rect.width<1)return;const dpr=Math.min(window.innerWidth<900?1:1.5,devicePixelRatio||1);const w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;queueDraw();}}
function centerOnCapital(){const p=mine();if(!p?.capital)return;const c=p.capital;const r=canvas.getBoundingClientRect();camX=r.width/2-(c.x+.5)*TILE*zoom;camY=r.height/2-(c.y+.5)*TILE*zoom;clampCamera();queueDraw();}
function clampCamera(){const rect=canvas.getBoundingClientRect();camX=Math.min(70,Math.max(rect.width-E.W*TILE*zoom-70,camX));camY=Math.min(70,Math.max(rect.height-E.H*TILE*zoom-70,camY));}
function zoomAt(factor,cx,cy){const old=zoom;zoom=Math.max(.14,Math.min(5,zoom*factor));camX=cx-(cx-camX)*zoom/old;camY=cy-(cy-camY)*zoom/old;clampCamera();$('zoomText').textContent=Math.round(zoom*100)+'%';queueDraw();}
function pixelAt(clientX,clientY){const r=canvas.getBoundingClientRect();return {x:clientX-r.left,y:clientY-r.top};}
function gridAt(clientX,clientY){const p=pixelAt(clientX,clientY);return {x:Math.floor((p.x-camX)/(TILE*zoom)),y:Math.floor((p.y-camY)/(TILE*zoom))};}
function nearestObject(px,py,kind){const arr=kind==='army'?state.armies:state.buildings,worldX=(px-camX)/(TILE*zoom),worldY=(py-camY)/(TILE*zoom);let nearest=null,best=Infinity;for(const v of arr){const d=Math.hypot(v.x+.5-worldX,v.y+.5-worldY)*TILE*zoom;if(d<best&&d<(kind==='army'?19:17)){best=d;nearest=v;}}return nearest;}
function selectMap(clientX,clientY){if(state?.phase!=='playing'||mine()?.eliminated)return;const pt=pixelAt(clientX,clientY),p=gridAt(clientX,clientY);if(!E.inside(p.x,p.y))return;inspectCell(p.x,p.y);$('mapHint').classList.add('hidden');
 if(buildMode){if(E.owner(state,p.x,p.y)!==myId)return toast('Строительство: выбери свою землю.');const fail=E.canBuild(state,myId,buildMode,p.x,p.y);if(fail)return toast(fail);command({type:'build',kind:buildMode,x:p.x,y:p.y});return;}
 if(redirectArmy){setPreview({type:'redirect',id:redirectArmy,x:p.x,y:p.y,valid:true});return;}
 const a=nearestObject(pt.x,pt.y,'army');if(a&&a.owner===myId){selected={kind:'army',id:a.id};updateSelection();setPreview(null);return;}
 const b=nearestObject(pt.x,pt.y,'building');if(b){selected={kind:'building',id:b.id};updateSelection();setPreview(null);return;}
 if(E.owner(state,p.x,p.y)===myId){setPreview(null);return;}selected=null;contextual(null);
 if(E.tile(state,p.x,p.y)===0&&mine().tech.sailing<1)return toast('Для морского похода нужны порт и исследование флота.');
 if(target?.type==='send'&&target.x===p.x&&target.y===p.y){$('confirmTarget').click();return;}
 setPreview({type:'send',x:p.x,y:p.y,valid:true});}
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
const TERRAIN_RGB=[[18,38,56],[78,99,91],[69,94,84],[93,105,99],[85,105,94],[91,103,100],[107,112,109]];
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
  const k=col ? 0.94 : 0;
  d[p]=Math.round(terr[0]*(1-k)+(col?.[0]||0)*k);
  d[p+1]=Math.round(terr[1]*(1-k)+(col?.[1]||0)*k);
  d[p+2]=Math.round(terr[2]*(1-k)+(col?.[2]||0)*k);
  d[p+3]=255;
 }
 c.putImageData(img,0,0);const wc=worldLayer.getContext('2d',{alpha:false});wc.imageSmoothingEnabled=false;wc.drawImage(pixelLayer,0,0,worldLayer.width,worldLayer.height);terrainSeed=state.seed;paintedRevision=revision;miniRevision=-1;
}
function hexAlpha(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;}
function queueDraw(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;draw();});}
function draw(){if(!state?.tiles.length)return;repaintWorld();resize();const dpr=canvas.width/Math.max(1,canvas.clientWidth);const w=canvas.clientWidth,h=canvas.clientHeight;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.fillStyle='#142a3c';ctx.fillRect(0,0,w,h);
 ctx.save();ctx.translate(camX,camY);ctx.scale(zoom,zoom);ctx.imageSmoothingEnabled=true;ctx.drawImage(worldLayer,0,0,worldLayer.width,worldLayer.height,0,0,E.W*TILE,E.H*TILE);
 // Draw vector borders only when zoomed in sufficiently; avoid per-tile work otherwise.
 if(zoom>=0.28){
  const minX=Math.max(0,Math.floor(-camX/(TILE*zoom))-1),maxX=Math.min(E.W-1,Math.ceil((w-camX)/(TILE*zoom))+1);
  const minY=Math.max(0,Math.floor(-camY/(TILE*zoom))-1),maxY=Math.min(E.H-1,Math.ceil((h-camY)/(TILE*zoom))+1);
  ctx.lineWidth=Math.max(.55,1.65/zoom);ctx.strokeStyle='#081b2aa6';ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();
  const o=state.owners;
  for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
   const i=y*E.W+x,id=o[i];if(!id)continue;
   if(x===0||o[i-1]!==id){ctx.moveTo(x*TILE,y*TILE);ctx.lineTo(x*TILE,(y+1)*TILE);}
   if(y===0||o[i-E.W]!==id){ctx.moveTo(x*TILE,y*TILE);ctx.lineTo((x+1)*TILE,y*TILE);}if(x===E.W-1||o[i+1]!==id){ctx.moveTo((x+1)*TILE,y*TILE);ctx.lineTo((x+1)*TILE,(y+1)*TILE);}if(y===E.H-1||o[i+E.W]!==id){ctx.moveTo(x*TILE,(y+1)*TILE);ctx.lineTo((x+1)*TILE,(y+1)*TILE);}
  }
  ctx.stroke();
  // Thin coast outline separates land and sea without heavy biome gridlines.
  ctx.beginPath();ctx.strokeStyle='#bbd7c55e';ctx.lineWidth=Math.max(.55,1.2/zoom);
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
 const capF=Math.max(9,13/zoom);ctx.font='800 '+capF+'px DM Sans, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
 for(const b of state.buildings){const x=(b.x+.5)*TILE,y=(b.y+.5)*TILE;if(x*zoom+camX<-40||x*zoom+camX>w+40||y*zoom+camY<-40||y*zoom+camY>h+40)continue;
  const c=color(b.owner),r=(b.kind==='capital'?11:8.5)/Math.max(.62,zoom);
  ctx.fillStyle='#102d3ee8';ctx.strokeStyle=c;ctx.lineWidth=2/Math.max(0.75,zoom);
  ctx.beginPath();if(b.kind==='capital'||b.kind==='fort'){ctx.roundRect(x-r,y-r,2*r,2*r,b.kind==='capital'?5:2);}else{ctx.arc(x,y,r,0,Math.PI*2);}ctx.fill();ctx.stroke();
  const im=iconImages[b.kind];if(im?.complete&&im.naturalWidth)ctx.drawImage(im,x-r*.62,y-r*.62,r*1.24,r*1.24);
  if(b.kind==='capital'&&zoom>.39){const p=E.person(state,b.owner),t=(p?.id||'?')+' · '+(p?.name||'');ctx.font='750 '+Math.max(9,11/zoom)+'px system-ui';const tw=ctx.measureText(t).width+20/zoom,lh=20/zoom,ly=y+r+11/zoom;ctx.fillStyle='#0d2335e8';ctx.strokeStyle=c;ctx.lineWidth=1.2/Math.max(.5,zoom);ctx.beginPath();ctx.roundRect(x-tw/2,ly-lh/2,tw,lh,8/Math.max(.5,zoom));ctx.fill();ctx.stroke();ctx.fillStyle='#f1fff6';ctx.fillText(t,x,ly);}

 }
 for(const a of state.armies){const old=oldArmyPositions.get(a.id),t=Math.min(1,(performance.now()-movementStart)/260),x=((old?old.x+(a.x-old.x)*t:a.x)+.5)*TILE,y=((old?old.y+(a.y-old.y)*t:a.y)+.5)*TILE;if(x*zoom+camX<-50||x*zoom+camX>w+50||y*zoom+camY<-50||y*zoom+camY>h+50)continue;
  ctx.fillStyle='#0d2234';ctx.strokeStyle=color(a.owner);ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(x,y,8.5,0,2*Math.PI);ctx.fill();ctx.stroke();ctx.fillStyle='#ffffff';ctx.font='700 7px system-ui';ctx.fillText('↗',x,y+.5);
  if(zoom>0.27){ctx.font='700 '+Math.max(8,9/Math.max(.8,zoom))+'px system-ui';const n=number(a.strength);ctx.fillStyle='rgba(255,255,255,.95)';ctx.beginPath();ctx.roundRect(x-20,y+9,40,12,5);ctx.fill();ctx.fillStyle='#0f1720';ctx.fillText(n,x,y+15);}
  if(a.owner===myId){ctx.strokeStyle=hexAlpha(color(a.owner),.55);ctx.setLineDash([2,3]);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo((a.tx+.5)*TILE,(a.ty+.5)*TILE);ctx.stroke();ctx.setLineDash([]);}
 }
 if(selected){const b=selected.kind==='building'?state.buildings.find(v=>v.id===selected.id):state.armies.find(v=>v.id===selected.id);if(b){ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;ctx.setLineDash([4,3]);ctx.strokeRect(b.x*TILE-5,b.y*TILE-5,TILE+10,TILE+10);ctx.setLineDash([]);}}
 if(buildMode){const minX=Math.max(0,Math.floor(-camX/(TILE*zoom))-1),maxX=Math.min(E.W-1,Math.ceil((w-camX)/(TILE*zoom))+1),minY=Math.max(0,Math.floor(-camY/(TILE*zoom))-1),maxY=Math.min(E.H-1,Math.ceil((h-camY)/(TILE*zoom))+1);ctx.fillStyle='rgba(5,114,85,.19)';for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)if(E.owner(state,x,y)===myId&&!E.canBuild(state,myId,buildMode,x,y))ctx.fillRect(x*TILE,y*TILE,TILE,TILE);}
 if(target||dragAttack){
  const to=dragAttack?.to||target,from=dragAttack?.from||E.nearestBorderLand(state,myId,to.x,to.y)||mine()?.capital;
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
 mctx.lineWidth=.65;mctx.strokeStyle='#ffffff';const scale=zoom*TILE;
 mctx.strokeRect(-camX/scale,-camY/scale,canvas.clientWidth/scale,canvas.clientHeight/scale);
}
window.addEventListener('resize',()=>{resize();clampCamera();queueDraw();});document.addEventListener('keydown',e=>{if(e.key==='Escape'){setPreview(null);redirectArmy=null;if(panelOpen)closePanel();else cancelMode();$('tutorial').classList.add('hidden');return;}if(panelOpen&&window.innerWidth<851&&e.key==='Tab'){const items=[...$('sidebar').querySelectorAll('button:not([disabled]), select:not([disabled])')].filter(el=>el.offsetParent!==null);if(items.length){const first=items[0],last=items[items.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
 if(!state||state.phase!=='playing'||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName))return;if(e.key==='+'||e.key==='=')zoomAt(1.2,canvas.clientWidth/2,canvas.clientHeight/2);if(e.key==='-')zoomAt(.8,canvas.clientWidth/2,canvas.clientHeight/2);if(document.activeElement===canvas){if(!moveCursor)moveCursor=mine()?.capital?{...mine().capital}:{x:80,y:52};if(e.key.startsWith('Arrow')){e.preventDefault();const d={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]}[e.key];moveCursor.x=Math.max(0,Math.min(E.W-1,moveCursor.x+d[0]));moveCursor.y=Math.max(0,Math.min(E.H-1,moveCursor.y+d[1]));camX=canvas.clientWidth/2-(moveCursor.x+.5)*TILE*zoom;camY=canvas.clientHeight/2-(moveCursor.y+.5)*TILE*zoom;clampCamera();inspectCell(moveCursor.x,moveCursor.y);$('keyboardPosition').textContent=$('mapStatus').textContent;queueDraw();}if(e.key==='Enter'){e.preventDefault();const x=moveCursor.x,y=moveCursor.y;const r=canvas.getBoundingClientRect();selectMap(r.left+camX+(x+.5)*TILE*zoom,r.top+camY+(y+.5)*TILE*zoom);}}});
$('hostButton').onclick=createRoom;$('joinButton').onclick=joinRoom;$('demoButton').onclick=createDemo;$('startButton').onclick=startGame;$('copyLink').onclick=()=>copyText(urlRoom());$('copyCode').onclick=()=>copyText(code);
$('readyButton').onclick=()=>{readyLocal=!readyLocal;$('readyButton').setAttribute('aria-pressed',String(readyLocal));upstream?.send({t:'ready',value:readyLocal});};
for(const id of ['botCount','matchDuration'])$(id).onchange=()=>{if(host&&state?.phase==='lobby'){state.settings={bots:Number($('botCount').value),duration:Number($('matchDuration').value)};broadcast();}};
$('spawnChoice').onchange=()=>{if(state?.phase!=='lobby')return;if(host){mine().spawnPreference=$('spawnChoice').value;broadcast();}else upstream?.send({t:'spawn',choice:$('spawnChoice').value});};
$('restart').onclick=()=>{if(host&&state?.phase==='ended'){const players=state.players.filter(p=>!p.bot).map(p=>({id:p.id,name:p.name,connected:p.connected}));const fresh=E.lobby(Date.now());Object.assign(state,fresh);const newIds=new Map();players.forEach((p,i)=>{const id=E.addPlayer(state,p.name);newIds.set(p.id,id);const v=E.person(state,id);v.connected=p.connected;v.ready=i===0;});for(const [tok,id] of tokenStore)tokenStore.set(tok,newIds.get(id)||id);for(const [conn,id] of connections)connections.set(conn,newIds.get(id)||id);worldLayer=null;pixelLayer=null;paintedRevision=-1;selected=null;setPreview(null);cancelMode();contextual(null);closePanel();$('victory').classList.add('hidden');phaseShown='';broadcast(true);}else if(demo){try{localStorage.removeItem('bk-v7-save');}catch(_){}location.href=location.pathname;}else toast('Новый матч запускает ведущий.');};
$('downloadSave').onclick=()=>{const blob=new Blob([JSON.stringify({tick:state.tick,winner:state.winner,players:state.players.map(p=>({name:p.name,land:p.land,kills:p.kills}))},null,2)],{type:'application/json'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='brothers-kingdoms-results.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
try{const previous=localStorage.getItem('bk-name');if(previous)$('nickname').value=previous;}catch(_){ }
const fromHash=location.hash.replace('#','').toUpperCase().replace(/[^A-Z0-9]/g,'');if(fromHash){$('roomCode').value=fromHash;$('joinButton').textContent='Войти в комнату '+fromHash;}
setInterval(()=>{if(demo&&state?.phase==='playing'&&!pauseSolo&&state.tick%10===0&&lastSaveTick!==state.tick){lastSaveTick=state.tick;saveSolo();}if(!host||!state||state.phase!=='playing'||pauseSolo)return;E.tick(state);broadcast();},1000);
setInterval(()=>{if(host&&state?.phase==='playing'&&!pauseSolo&&state.armies.length){E.combatStep(state);broadcast();}},333);
setInterval(()=>{if(!demo&&!host&&state?.phase==='playing'&&Date.now()-lastStateAt>4500){setNetwork('СВЯЗЬ ЗАДЕРЖИВАЕТСЯ');}for(const [id,at] of pendingOrders)if(Date.now()-at>7000){pendingOrders.delete(id);toast('Приказ не подтверждён. Проверь соединение.');}},2000);
})();
