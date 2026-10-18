/* Brothers Kingdoms — UI + room networking. Host owns authoritative game state. */
(() => {
  'use strict';
  const E = window.BKEngine;
  const $ = id => document.getElementById(id);
  const el = {
    lobby:$('lobby'), waiting:$('waiting'), game:$('game'), nickname:$('nickname'), code:$('roomCode'),
    lobbyError:$('lobbyError'), connection:$('connIndicator'), canvas:$('mapCanvas'), status:$('mapStatus')
  };
  const ctx=el.canvas.getContext('2d');
  const T=38;
  const KINDS={farm:['Ферма','35 🪵'],house:['Дом','30 🪵 10 🪨'],barracks:['Казарма','65 🪵 35 🪨'],tower:['Башня','45 🪵 55 🪨'],outpost:['Форпост','80 🪵 45 🪨']};
  const TYPES={hall:'Ратуша',farm:'Ферма',house:'Дом',barracks:'Казарма',tower:'Башня',outpost:'Форпост',worker:'Рабочий',soldier:'Воин'};
  const ESC={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'};
  const safe = v => String(v??'').replace(/[&<>"']/g,c=>ESC[c]);
  let state=null, myId=null, host=false, demo=false, peer=null, upstream=null, code='', selection=null, buildMode=null, roomConnections=new Map(), lastPhase=null, shownVictory=false;
  let lastToastTimer=null;
  const mine=()=>state?.players.find(p=>p.id===myId);
  function showOnly(which){for(const e of [el.lobby,el.waiting,el.game])e.classList.add('hidden');which.classList.remove('hidden');}
  function toast(s){const t=$('toast');t.textContent=s;t.classList.remove('hidden');clearTimeout(lastToastTimer);lastToastTimer=setTimeout(()=>t.classList.add('hidden'),2900);}
  function err(s){el.lobbyError.textContent=s;toast(s);}
  function nick(){const name=el.nickname.value.trim()||'Игрок';try{localStorage.setItem('bk-name',name);}catch(_){}return name;}
  function randomCode(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const bytes=new Uint8Array(6);crypto.getRandomValues(bytes);return [...bytes].map(n=>alphabet[n%alphabet.length]).join('');}
  function link(){return location.origin+location.pathname+'#'+code;}
  function peerReady(){if(!window.Peer){err('Библиотека PeerJS не загрузилась. Проверь интернет и перезагрузи страницу.');return false;}return true;}
  function createRoom(){if(!peerReady())return;code=randomCode();host=true;demo=false;peer=new Peer('bk-'+code);
    peer.on('open',()=>{state=E.lobby(Date.now());myId=E.addPlayer(state,nick());roomReady();el.connection.textContent='● Ведущий · '+code;history.replaceState(null,'','#'+code);render();});
    peer.on('connection',receiveConnection);
    peer.on('error',e=>err('Ошибка создания комнаты: '+(e.message||e.type)));
    peer.on('disconnected',()=>toast('Сигнальный сервер отключился. Возможны проблемы с новыми подключениями.'));
  }
  function joinRoom(){if(!peerReady())return;code=el.code.value.toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,9);
    if(!code){err('Введи код комнаты.');return;}
    host=false;demo=false;peer=new Peer();el.connection.textContent='◌ Подключение…';
    peer.on('open',()=>{upstream=peer.connect('bk-'+code,{reliable:true});upstream.on('open',()=>upstream.send({t:'join',name:nick()}));
      upstream.on('data',m=>{
        if(!m||typeof m!=='object')return;
        if(m.t==='welcome'){myId=m.id;state=m.state;roomReady();el.connection.textContent='● В комнате · '+code;render();}
        if(m.t==='state'){state=m.state;render();}
        if(m.t==='error'){err(m.message);}
      });
      upstream.on('close',()=>{el.connection.textContent='● Связь потеряна';toast('Соединение с ведущим прервано.');});
      upstream.on('error',e=>err('Соединение не удалось: '+e.message));
    });
    peer.on('error',e=>err('Ошибка подключения: '+(e.message||e.type)));
  }
  function receiveConnection(conn){
    conn.on('data',msg=>{
      if(!msg||typeof msg!=='object')return;
      if(msg.t==='join'){
        if(roomConnections.has(conn))return;
        const id=E.addPlayer(state,msg.name);
        if(!id){conn.send({t:'error',message:'Комната полна или матч уже начался.'});return;}
        roomConnections.set(conn,id);conn.send({t:'welcome',id,state,code});broadcast();
      } else if(msg.t==='action'){
        const id=roomConnections.get(conn);if(!id)return;
        const result=E.action(state,id,msg.action);
        if(!result.ok)conn.send({t:'error',message:result.error});
        else broadcast();
      }
    });
    conn.on('close',()=>{const id=roomConnections.get(conn);roomConnections.delete(conn);if(id)toast('Игрок отключился. Его поселение остаётся на карте.');});
  }
  function broadcast(){if(!state)return;for(const conn of roomConnections.keys())if(conn.open)conn.send({t:'state',state});render();}
  function roomReady(){showOnly(el.waiting);$('showCode').textContent=code;setTimeout(()=>{if(state?.phase==='playing')centerOnBase();},80);}
  function startGame(){if(!host||!state)return;const res=E.start(state);if(!res.ok){toast(res.error);return;}broadcast();centerOnBase();}
  function demoGame(){host=true;demo=true;code='DEMO';state=E.lobby(Date.now());myId=E.addPlayer(state,nick());E.addPlayer(state,'Сосед-бот');E.start(state);state.demo=true;el.connection.textContent='● Одиночная игра';render();centerOnBase();}
  function command(a){if(!state)return;if(host){const r=E.action(state,myId,a);if(!r.ok)toast(r.error);else broadcast();}else if(upstream?.open)upstream.send({t:'action',action:a});else toast('Нет соединения с комнатой.');}
  function render(){if(!state)return;
    if(state.phase==='lobby') {showOnly(el.waiting);$('showCode').textContent=code;$('waitingPlayers').innerHTML=state.players.map(p=>playerRow(p)).join('');$('startButton').classList.toggle('hidden',!host);$('startButton').disabled=state.players.length<2;$('waitingHint').textContent=state.players.length<2?'Нужно минимум 2 игрока.':'Можно начинать!';}
    else {if(lastPhase==='lobby'||lastPhase===null){centerOnBase();}showOnly(el.game);renderStats();renderCanvas();if(state.phase==='ended'&&!shownVictory){shownVictory=true;const w=state.players.find(p=>p.id===state.winner);toast(w?'Победитель: '+w.name+'!':'Ничья!');}}
    lastPhase=state.phase;
  }
  function playerRow(p){const you=p.id===myId?' (ты)':'';return `<div class="player-row"><i class="player-dot" style="background:${p.color}"></i><strong>${safe(p.name)}${you}</strong><span class="muted">${p.eliminated?'· выбыл':''}</span></div>`;}
  function renderStats(){const p=mine();if(!p)return;
    for(const key of ['wood','stone','food','gold'])$('res'+key[0].toUpperCase()+key.slice(1)).textContent=Math.floor(p.res[key]);
    $('resPop').textContent=E.population(state,myId)+' / '+E.cap(state,myId);
    $('tickLabel').textContent=String(Math.floor(state.tick/60)).padStart(2,'0')+':'+String(state.tick%60).padStart(2,'0');
    $('sidePlayers').innerHTML=state.players.map(playerRow).join('');
    $('events').innerHTML=state.log.map(entry=>'<div>'+safe(entry)+'</div>').join('');
    $('buildButtons').innerHTML=Object.entries(KINDS).map(([id,v])=>`<button data-build="${id}" class="${buildMode===id?'active':''}" ${p.eliminated?'disabled':''}>${safe(v[0])}<span>${safe(v[1])}</span></button>`).join('');
    $('recruitButtons').innerHTML=`<button data-recruit="worker" ${p.eliminated?'disabled':''}>Рабочий<span>30 🌾 10 🪵</span></button><button data-recruit="soldier" ${p.eliminated?'disabled':''}>Воин<span>45 🌾 20 🟡</span></button>`;
    document.querySelectorAll('[data-build]').forEach(btn=>btn.onclick=()=>{buildMode=buildMode===btn.dataset.build?null:btn.dataset.build;selection=null;renderStats();updateStatus();});
    document.querySelectorAll('[data-recruit]').forEach(btn=>btn.onclick=()=>command({type:'recruit',kind:btn.dataset.recruit}));
    const picked=state.units.find(u=>u.id===selection)||state.buildings.find(b=>b.id===selection);
    const upgrade=$('upgradeButton');upgrade.classList.toggle('hidden',!picked||!picked.maxHp||!('level' in picked)||picked.owner!==myId);upgrade.onclick=()=>command({type:'upgrade',id:selection});
    $('selection').textContent=picked?`${TYPES[picked.kind]} · ${picked.owner===myId?'свой':'чужой'} · HP ${picked.hp}/${picked.maxHp}${picked.level?' · уровень '+picked.level:''}`:'Выбери юнита или здание на карте.';
    updateStatus();
  }
  function updateStatus(){if(buildMode)el.status.textContent='Строительство: '+KINDS[buildMode][0]+'. Нажми на свободную клетку своего владения.';
    else if(selection&&state?.units.some(u=>u.id===selection&&u.owner===myId))el.status.textContent='Нажми на клетку для движения, лес/камень для добычи или врага для атаки.';
    else el.status.textContent='Выбери рабочего или воина. Ратуша и форпост контролируют территорию.';
  }
  function centerOnBase(){const b=state?.buildings.find(b=>b.owner===myId&&b.kind==='hall');if(!b)return;
    requestAnimationFrame(()=>{$('mapWrap').scrollLeft=Math.max(0,b.x*T-$('mapWrap').clientWidth/2);$('mapWrap').scrollTop=Math.max(0,b.y*T-$('mapWrap').clientHeight/2);});
  }
  function colorOf(id){return state.players.find(p=>p.id===id)?.color||'#fff';}
  function hexRGBA(hex,a){const n=parseInt(hex.substring(1),16);return `rgba(${(n>>16)&255},${(n>>8)&255},${n&255},${a})`;}
  function drawTerrain(x,y,kind){const X=x*T,Y=y*T,h=((x*89+y*137)%17);
    ctx.fillStyle=kind==='water'?'#173a55':kind==='forest'?'#214a46':kind==='stone'?'#454d57':h%3===0?'#2f4d46':'#304f47';ctx.fillRect(X,Y,T,T);
    ctx.lineWidth=1;
    if(kind==='water'){ctx.strokeStyle='#5590a64d';ctx.beginPath();ctx.moveTo(X+5,Y+12);ctx.quadraticCurveTo(X+12,Y+8,X+19,Y+12);ctx.moveTo(X+16,Y+27);ctx.quadraticCurveTo(X+24,Y+23,X+31,Y+27);ctx.stroke();}
    if(kind==='forest'){ctx.fillStyle='#33816f';for(let i=0;i<2;i++){const xx=X+12+i*15,yy=Y+14+(i?10:0);ctx.beginPath();ctx.moveTo(xx,yy-10);ctx.lineTo(xx-8,yy+7);ctx.lineTo(xx+8,yy+7);ctx.closePath();ctx.fill();}}
    if(kind==='stone'){ctx.fillStyle='#93a1a2';ctx.beginPath();ctx.moveTo(X+7,Y+28);ctx.lineTo(X+15,Y+12);ctx.lineTo(X+29,Y+17);ctx.lineTo(X+34,Y+28);ctx.closePath();ctx.fill();}
    if(kind==='grass'&&h%5===0){ctx.strokeStyle='#5b866349';ctx.beginPath();ctx.moveTo(X+8,Y+24);ctx.lineTo(X+10,Y+20);ctx.moveTo(X+14,Y+30);ctx.lineTo(X+15,Y+26);ctx.stroke();}
    ctx.strokeStyle='#152a2a58';ctx.strokeRect(X+.5,Y+.5,T,T);
  }
  function drawBuilding(b){const X=b.x*T,Y=b.y*T,c=colorOf(b.owner);
    ctx.fillStyle='#0a151dcc';ctx.fillRect(X+4,Y+8,31,27);ctx.fillStyle=c;ctx.fillRect(X+6,Y+12,26,21);
    ctx.fillStyle='#192b3a';ctx.fillRect(X+10,Y+15,18,18);ctx.fillStyle='#e6edf2';ctx.font='bold 19px Georgia';ctx.textAlign='center';
    const symbols={hall:'♜',farm:'♨',house:'⌂',barracks:'⚒',tower:'◆',outpost:'⚑'};
    ctx.fillText(symbols[b.kind]||'◆',X+19,Y+30);
    if(b.kind==='hall'){ctx.fillStyle='#f3d9a2';ctx.beginPath();ctx.moveTo(X+18,Y+3);ctx.lineTo(X+26,Y+11);ctx.lineTo(X+10,Y+11);ctx.closePath();ctx.fill();}
    hpBar(X+5,Y+36,29,b.hp/b.maxHp,c);
    if(b.level>1){ctx.font='bold 10px Arial';ctx.fillStyle='#fff';ctx.fillText(b.level,X+32,Y+10);}
  }
  function hpBar(x,y,w,portion,color){ctx.fillStyle='#17222c';ctx.fillRect(x,y,w,3);ctx.fillStyle=portion<.35?'#ff7180':color;ctx.fillRect(x,y,w*Math.max(0,portion),3);}
  function drawUnit(u,i){const X=u.x*T+19+(i%2?8:-7),Y=u.y*T+18+(i>1?8:0),c=colorOf(u.owner);
    ctx.lineWidth=2;ctx.fillStyle='#10202add';ctx.strokeStyle=c;ctx.beginPath();ctx.arc(X,Y,10,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.fillStyle=c;ctx.font='bold 15px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(u.kind==='worker'?'●':'▲',X,Y+1);ctx.textBaseline='alphabetic';hpBar(X-9,Y+12,19,u.hp/u.maxHp,c);
  }
  function renderCanvas(){if(!state)return;ctx.clearRect(0,0,el.canvas.width,el.canvas.height);
    const owners=[];for(let y=0;y<E.H;y++)for(let x=0;x<E.W;x++){drawTerrain(x,y,E.at(state,x,y));const o=E.ownerAt(state,x,y);owners[y*E.W+x]=o;
      if(o){ctx.fillStyle=hexRGBA(colorOf(o),.11);ctx.fillRect(x*T,y*T,T,T);}}
    for(let y=0;y<E.H;y++)for(let x=0;x<E.W;x++){
      const o=owners[y*E.W+x];if(!o)continue;const X=x*T,Y=y*T;ctx.strokeStyle=hexRGBA(colorOf(o),.9);ctx.lineWidth=2;
      const neighbors=[[0,-1,0,0,T,0],[0,1,0,T,T,T],[-1,0,0,0,0,T],[1,0,T,0,T,T]];
      for(const [dx,dy,x1,y1,x2,y2] of neighbors)if(x+dx<0||x+dx>=E.W||y+dy<0||y+dy>=E.H||owners[(y+dy)*E.W+(x+dx)]!==o){ctx.beginPath();ctx.moveTo(X+x1,Y+y1);ctx.lineTo(X+x2,Y+y2);ctx.stroke();}
    }
    state.buildings.forEach(drawBuilding);
    const occupied=new Map();for(const u of state.units){const k=u.x+','+u.y;let n=occupied.get(k)||0;drawUnit(u,n);occupied.set(k,n+1);}
    const picked=state.units.find(u=>u.id===selection)||state.buildings.find(b=>b.id===selection);
    if(picked){ctx.strokeStyle='#fff4a5';ctx.lineWidth=3;ctx.setLineDash([5,3]);ctx.strokeRect(picked.x*T+2,picked.y*T+2,T-4,T-4);ctx.setLineDash([]);}
    if(state.phase==='ended'){ctx.fillStyle='#081320bb';ctx.fillRect(0,250,912,110);const winner=state.players.find(p=>p.id===state.winner);ctx.textAlign='center';ctx.fillStyle='#ffe0a4';ctx.font='bold 38px Georgia';ctx.fillText(winner?winner.name+' — победа!':'Ничья',456,312);}
  }
  function mapClick(e){if(!state||state.phase!=='playing'||mine()?.eliminated)return;
    const rect=el.canvas.getBoundingClientRect();const x=Math.floor((e.clientX-rect.left)*el.canvas.width/rect.width/T),y=Math.floor((e.clientY-rect.top)*el.canvas.height/rect.height/T);
    if(x<0||x>=E.W||y<0||y>=E.H)return;
    if(buildMode){command({type:'build',kind:buildMode,x,y});buildMode=null;render();return;}
    const ownUnits=E.unitsAt(state,x,y).filter(u=>u.owner===myId);
    if(ownUnits.length){selection=ownUnits[0].id;render();return;}
    const ownBuild=E.buildingAt(state,x,y);
    if(selection&&state.units.some(u=>u.id===selection&&u.owner===myId)){
      command({type:'order',id:selection,x,y});render();return;
    }
    selection=ownBuild?.id||E.unitsAt(state,x,y)[0]?.id||null;render();
  }
  $('hostButton').onclick=createRoom;
  $('joinButton').onclick=joinRoom;
  $('demoButton').onclick=demoGame;
  $('startButton').onclick=startGame;
  $('copyLink').onclick=async()=>{try{await navigator.clipboard.writeText(link());toast('Ссылка скопирована. Отправь братьям!');}catch(_){window.prompt('Скопируй ссылку:',link());}};
  el.canvas.addEventListener('click',mapClick);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){buildMode=null;selection=null;if(state?.phase==='playing')render();}});
  try{const old=localStorage.getItem('bk-name');if(old)el.nickname.value=old;}catch(_){}
  const hash=location.hash.replace('#','').toUpperCase().replace(/[^A-Z0-9]/g,'');if(hash)el.code.value=hash;
  // The host advances the simulation. Clients only send commands and render snapshots.
  setInterval(()=>{if(!state||!host||state.phase!=='playing')return;E.tick(state);if(demo)E.bot(state,'p2');broadcast();},1000);
})();