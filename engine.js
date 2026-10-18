/* Brothers Kingdoms v0.1 — deterministic server/host-authoritative simulation. */
(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BKEngine = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  const W = 24, H = 16, MAX = 4;
  const COLORS = ['#42d6bc', '#ffb454', '#ab99ff', '#ff758e'];
  const START = [{x:3,y:3},{x:20,y:12},{x:20,y:3},{x:3,y:12}];
  const PRICES = {
    farm:{wood:35}, house:{wood:30,stone:10}, barracks:{wood:65,stone:35},
    tower:{wood:45,stone:55}, outpost:{wood:80,stone:45},
    worker:{food:30,wood:10}, soldier:{food:45,gold:20},
    upgrade:{wood:50,stone:35,gold:15}
  };
  const BUILDINGS = {hall:{hp:260,radius:4},farm:{hp:95,radius:0},house:{hp:115,radius:0},barracks:{hp:150,radius:0},tower:{hp:150,radius:0},outpost:{hp:175,radius:3}};
  let sequence = 0;
  const uid = (tag) => tag + '-' + (++sequence).toString(36);
  const rng = (seed) => { let x = (seed >>> 0) || 1; return () => ((x ^= x << 13, x ^= x >>> 17, x ^= x << 5), (x >>> 0) / 4294967296); };
  const inside = (x,y) => Number.isInteger(x) && Number.isInteger(y) && x>=0 && x<W && y>=0 && y<H;
  const at = (s,x,y) => inside(x,y) ? s.tiles[y * W + x] : null;
  const dist = (a,b) => Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
  const entries = (cost) => Object.entries(cost || {});
  const afford = (p,cost) => entries(cost).every(([k,v]) => (p.res[k]||0) >= v);
  const pay = (p,cost) => { for(const [k,v] of entries(cost)) p.res[k] -= v; };
  const note = (s,text) => {s.log.unshift(text); s.log = s.log.slice(0,7);};
  const player = (s,id) => s.players.find(p=>p.id===id);
  const buildingAt = (s,x,y) => s.buildings.find(b=>b.hp>0 && b.x===x && b.y===y);
  const unitsAt = (s,x,y) => s.units.filter(u=>u.hp>0 && u.x===x && u.y===y);
  function genMap(seed) {
    const r = rng(seed), t = [];
    for (let y=0;y<H;y++) for(let x=0;x<W;x++) {
      const v=r(); t.push(v<.085?'water':v<.27?'forest':v<.39?'stone':'grass');
    }
    // Guaranteed traversable arteries and settlement starting areas.
    for(let y=0;y<H;y++) for(let x=0;x<W;x++) {
      if(y===Math.floor(H/2) || x===Math.floor(W/2)) t[y*W+x]='grass';
      if(START.some(p => Math.abs(x-p.x)<=2 && Math.abs(y-p.y)<=2)) t[y*W+x]='grass';
    }
    return t;
  }
  function lobby(seed) { sequence=0; return {version:1,phase:'lobby',tick:0,tiles:genMap(seed || 3843),players:[],units:[],buildings:[],log:['Создайте поселения и возьмите под контроль карту.'],winner:null,demo:false}; }
  function addPlayer(s,name) {
    if(s.phase!=='lobby'||s.players.length>=MAX) return null;
    const id='p'+(s.players.length+1), n=String(name||'Игрок').trim().slice(0,18)||'Игрок';
    s.players.push({id,name:n,color:COLORS[s.players.length],res:{wood:115,stone:95,food:155,gold:85},eliminated:false});
    note(s,n+' присоединился к комнате.'); return id;
  }
  function addBuilding(s,owner,kind,x,y){const b={id:uid('b'),owner,kind,x,y,level:1,hp:BUILDINGS[kind].hp,maxHp:BUILDINGS[kind].hp};s.buildings.push(b);return b;}
  function addUnit(s,owner,kind,x,y){const hp=kind==='soldier'?90:55; const u={id:uid('u'),owner,kind,x,y,hp,maxHp:hp,task:null,cooldown:0};s.units.push(u);return u;}
  function start(s) {
    if(s.phase!=='lobby'||s.players.length<2) return {ok:false,error:'Нужно минимум 2 игрока.'};
    s.phase='playing';
    s.players.forEach((p,i)=>{
      const b=START[i];
      addBuilding(s,p.id,'hall',b.x,b.y);
      addBuilding(s,p.id,'farm',b.x+ (i===1||i===2?-1:1),b.y);
      addUnit(s,p.id,'worker',b.x,b.y+ (i>1?-1:1));
      addUnit(s,p.id,'worker',b.x+1*(i===1||i===2?-1:1),b.y+ (i>1?-1:1));
      addUnit(s,p.id,'soldier',b.x,b.y);
    });
    note(s,'Матч начался. Побеждает последний уцелевший город.');
    return {ok:true};
  }
  function ownerAt(s,x,y) {
    let best=null,score=-1;
    for(const b of s.buildings){if(!['hall','outpost'].includes(b.kind) || b.hp<=0) continue;
      const radius=BUILDINGS[b.kind].radius + (b.kind==='hall' ? b.level-1 : 0);
      const d=dist(b,{x,y});if(d<=radius && radius-d>score){best=b.owner;score=radius-d;}
      else if(d<=radius && radius-d===score && best!==b.owner) best=null;
    }
    return best;
  }
  function population(s,id){return s.units.filter(u=>u.owner===id).length;}
  function cap(s,id){return 7 + s.buildings.filter(b=>b.owner===id&&b.kind==='house').reduce((n,b)=>n+4*b.level,0);}
  function freeSpawn(s, b) {
    const spots=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1],[1,-1],[-1,-1],[0,0]];
    for(const [dx,dy] of spots){ const x=b.x+dx,y=b.y+dy;if(inside(x,y)&&at(s,x,y)!=='water'&&!buildingAt(s,x,y)&&unitsAt(s,x,y).length<3)return {x,y}; }
    return null;
  }
  function action(s,id,a) {
    if(s.phase!=='playing') return {ok:false,error:'Матч ещё не начался или уже закончен.'};
    const p=player(s,id);
    if(!p||p.eliminated || !a || typeof a!=='object') return {ok:false,error:'Действие недоступно.'};
    if(a.type==='build') {
      const kind=String(a.kind), x=a.x,y=a.y;
      if(!['farm','house','barracks','tower','outpost'].includes(kind))return {ok:false,error:'Неизвестное здание.'};
      if(!inside(x,y)||at(s,x,y)!=='grass'||ownerAt(s,x,y)!==id||buildingAt(s,x,y))return {ok:false,error:'Строить можно на свободной равнине своей территории.'};
      if(!afford(p,PRICES[kind]))return {ok:false,error:'Не хватает ресурсов.'};
      pay(p,PRICES[kind]); addBuilding(s,id,kind,x,y);note(s,p.name+' построил '+kind+'.');return {ok:true};
    }
    if(a.type==='recruit') {
      const kind=String(a.kind); if(!['worker','soldier'].includes(kind))return {ok:false,error:'Неизвестный юнит.'};
      if(population(s,id)>=cap(s,id))return {ok:false,error:'Лимит населения. Построй дом.'};
      const parent=s.buildings.find(b=>b.owner===id&&(kind==='worker'?b.kind==='hall':b.kind==='barracks'));
      if(!parent)return {ok:false,error:kind==='soldier'?'Сначала построй казарму.':'Нет ратуши.'};
      const spot=freeSpawn(s,parent);if(!spot)return {ok:false,error:'Вокруг здания нет места.'};
      if(!afford(p,PRICES[kind]))return {ok:false,error:'Не хватает ресурсов.'};
      pay(p,PRICES[kind]);addUnit(s,id,kind,spot.x,spot.y);return {ok:true};
    }
    if(a.type==='upgrade') {
      const b=s.buildings.find(b=>b.id===a.id&&b.owner===id);
      if(!b||b.level>=3)return {ok:false,error:'Нельзя улучшить это здание.'};
      if(!afford(p,PRICES.upgrade))return {ok:false,error:'Не хватает ресурсов.'};
      pay(p,PRICES.upgrade);b.level++;b.maxHp+=45;b.hp+=45;note(s,p.name+' улучшил '+b.kind+' до ур. '+b.level);return {ok:true};
    }
    if(a.type==='order') {
      const u=s.units.find(u=>u.id===a.id&&u.owner===id);
      if(!u||!inside(a.x,a.y)||at(s,a.x,a.y)==='water')return {ok:false,error:'Недоступная цель.'};
      const enemyUnit=unitsAt(s,a.x,a.y).find(v=>v.owner!==id), enemyBuild=buildingAt(s,a.x,a.y);
      if(enemyUnit)u.task={type:'attack',targetId:enemyUnit.id,targetType:'unit'};
      else if(enemyBuild&&enemyBuild.owner!==id)u.task={type:'attack',targetId:enemyBuild.id,targetType:'building'};
      else if(u.kind==='worker'&&['forest','stone'].includes(at(s,a.x,a.y)))u.task={type:'gather',x:a.x,y:a.y};
      else u.task={type:'move',x:a.x,y:a.y};
      return {ok:true};
    }
    return {ok:false,error:'Неизвестная команда.'};
  }
  function nextStep(s,u,target,adjacent=false) {
    if(inside(target.x,target.y) && dist(u,target)<= (adjacent?1:0)) return null;
    const q=[{x:u.x,y:u.y}], previous=new Map(),seen=new Set([u.y*W+u.x]);
    let last=null;
    for(let i=0;i<q.length;i++) {
      const cur=q[i]; if(dist(cur,target)<=(adjacent?1:0)){last=cur;break;}
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
        const nx=cur.x+dx,ny=cur.y+dy,k=ny*W+nx;
        if(!inside(nx,ny)||seen.has(k)||at(s,nx,ny)==='water'||(buildingAt(s,nx,ny)&&!(nx===target.x&&ny===target.y)))continue;
        seen.add(k);previous.set(k,cur);q.push({x:nx,y:ny});
      }
    }
    if(!last)return null;
    while(previous.has(last.y*W+last.x)) {
      const par=previous.get(last.y*W+last.x);
      if(par.x===u.x&&par.y===u.y)return last;
      last=par;
    }
    return null;
  }
  function hit(s,target,damage){target.hp=Math.max(0,target.hp-damage); if(target.hp===0) {if(target.kind==='hall') { const remaining=s.buildings.filter(b=>b.owner===target.owner&&b.kind==='hall'&&b.hp>0);if(remaining.length===0){const p=player(s,target.owner);if(p){p.eliminated=true;note(s,'Поселение '+p.name+' уничтожено!');}} } }}
  function cleanup(s) {
    s.units=s.units.filter(u=>u.hp>0 && !player(s,u.owner)?.eliminated);
    s.buildings=s.buildings.filter(b=>b.hp>0 && !player(s,b.owner)?.eliminated);
    const live=s.players.filter(p=>!p.eliminated);
    if(live.length<=1&&s.players.length>=2){s.phase='ended';s.winner=live[0]?.id||null;note(s,live[0]?live[0].name+' победил!':'Ничья.');}
  }
  function tick(s) {
    if(s.phase!=='playing')return;
    s.tick++;
    if(s.tick%3===0)for(const b of s.buildings)if(b.kind==='farm'){const p=player(s,b.owner);p.res.food+=6*b.level;}
    if(s.tick%5===0)for(const b of s.buildings)if(b.kind==='hall'){const p=player(s,b.owner);p.res.gold+=4*b.level;}
    for(const u of s.units){
      if(u.hp<=0)continue;
      if(u.cooldown>0)u.cooldown--;
      const task=u.task;
      if(task){
        if(task.type==='move'){
          if(dist(u,task)===0)u.task=null;
          else {const step=nextStep(s,u,task);if(step){u.x=step.x;u.y=step.y;}else u.task=null;}
        } else if(task.type==='gather'){
          if(at(s,task.x,task.y)!=='forest'&&at(s,task.x,task.y)!=='stone')u.task=null;
          else if(dist(u,task)>0){const step=nextStep(s,u,task);if(step){u.x=step.x;u.y=step.y;}else u.task=null;}
          else if(s.tick%2===0){const p=player(s,u.owner);p.res[at(s,u.x,u.y)==='forest'?'wood':'stone']+=5;}
        } else if(task.type==='attack'){
          const target=(task.targetType==='building'?s.buildings:s.units).find(v=>v.id===task.targetId&&v.hp>0);
          if(!target||target.owner===u.owner)u.task=null;
          else if(dist(u,target)<=1){if(u.cooldown===0){hit(s,target,u.kind==='soldier'?24:5);u.cooldown=2;}}
          else {const step=nextStep(s,u,target,true);if(step){u.x=step.x;u.y=step.y;}else u.task=null;}
        }
      } else if(u.kind==='soldier'&&u.cooldown===0){
        const foe=s.units.find(v=>v.owner!==u.owner&&v.hp>0&&dist(v,u)<=1);
        if(foe){hit(s,foe,15);u.cooldown=2;}
      }
    }
    if(s.tick%2===0)for(const b of s.buildings){
      if(b.hp<=0||b.kind!=='tower')continue;
      const enemies=s.units.filter(u=>u.owner!==b.owner&&u.hp>0&&dist(u,b)<=2+b.level-1);
      if(enemies.length)hit(s,enemies[0],20*b.level);
    }
    cleanup(s);
  }
  function bot(s,id) {
    if(s.phase!=='playing')return;
    const p=player(s,id), enemy=s.buildings.find(b=>b.kind==='hall'&&b.owner!==id);
    if(!p||p.eliminated||!enemy)return;
    // Basic demo opponent: generates an economy, recruits and pressures the enemy town hall.
    if(s.tick%12===0){p.res.wood+=25;p.res.stone+=15;p.res.food+=28;p.res.gold+=17;}
    const base=s.buildings.find(b=>b.owner===id&&b.kind==='hall');if(!base)return;
    if(!s.buildings.some(b=>b.owner===id&&b.kind==='barracks')) {
      for(const [dx,dy] of [[2,0],[-2,0],[0,2],[0,-2]]){if(action(s,id,{type:'build',kind:'barracks',x:base.x+dx,y:base.y+dy}).ok)break;}
    }
    if(s.tick%5===0)action(s,id,{type:'recruit',kind:'soldier'});
    if(s.tick%7===0&&!s.buildings.some(b=>b.owner===id&&b.kind==='house')) {
      for(const [dx,dy] of [[1,2],[-1,-2],[2,1],[-2,-1]]){if(action(s,id,{type:'build',kind:'house',x:base.x+dx,y:base.y+dy}).ok)break;}
    }
    for(const u of s.units.filter(u=>u.owner===id&&u.kind==='soldier'&&!u.task))action(s,id,{type:'order',id:u.id,x:enemy.x,y:enemy.y});
  }
  return {W,H,MAX,PRICES,COLORS,lobby,addPlayer,start,action,tick,bot,ownerAt,at,buildingAt,unitsAt,dist,population,cap};
});