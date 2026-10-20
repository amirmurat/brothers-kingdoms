import '../engine.js';
const E = globalThis.BKEngine;
function compress(arr){let chunks=[];for(let i=0;i<arr.length;i+=8192)chunks.push(String.fromCharCode(...arr.slice(i,i+8192)));return btoa(chunks.join(''));}
function expand(str){const raw=atob(str),out=new Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out;}
function rlePack(arr){const b=[];for(let i=0;i<arr.length;){const id=arr[i];let n=1;while(i+n<arr.length&&arr[i+n]===id&&n<65535)n++;b.push(id,n&255,n>>8);i+=n;}return compress(b);}
function pack(s,includeTerrain=true){if(!s||!s.owners?.length)return s;return {...s,tiles:includeTerrain?compress(s.tiles):null,owners:rlePack(s.owners),ownerRle:true,packed:true};}

const json = (data, status = 200) => Response.json(data, {status});
export default {
 async fetch(request, env) {
  const url = new URL(request.url);
  if (url.pathname === '/api/health') return json({ok:true,build:E.BUILD,transport:'cloudflare'});
  if (url.pathname === '/api/rooms' && request.method === 'POST') {
   if (request.headers.get('Origin') !== url.origin) return json({error:'Invalid origin'},403);
   const code=crypto.randomUUID().replace(/-/g,'').slice(0,6).toUpperCase();
   const stub=env.ROOMS.get(env.ROOMS.idFromName(code));
   let creator={};try{creator=await request.json();}catch(_){}
   return stub.fetch(new Request(url.origin+'/internal/create?code='+code,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(creator)}));
  }
  const match=url.pathname.match(/^\/api\/rooms\/([A-F0-9]{6})\/socket$/);
  if (match) {
   if(request.headers.get('Origin')!==url.origin)return json({error:'Invalid origin'},403);
   return env.ROOMS.get(env.ROOMS.idFromName(match[1])).fetch(request);
  }
  if(url.pathname.startsWith('/api/'))return json({error:'Not found'},404);
  return env.ASSETS.fetch(request);
 }
};
export class KingdomRoom {
 constructor(ctx, env) {
  this.ctx=ctx;this.env=env;this.s=null;this.tokens={};this.admin=null;this.creatorId=null;this.code='';this.timer=null;this.step=0;
  ctx.blockConcurrencyWhile(async()=>{
   const count=await ctx.storage.get('chunks');
   if(count){const keys=Array.from({length:count},(_,i)=>'state:'+i);const parts=await ctx.storage.get(keys);Object.assign(this,JSON.parse(keys.map(k=>parts.get(k)).join('')));}
   this.creatorId??=this.s?.players[0]?.id??null;
   if(this.s?.phase==='lobby'&&this.creatorId)this.admin=this.creatorId;
   for(const ws of ctx.getWebSockets())if(ws.deserializeAttachment()?.id)this.run();
  });
 }
 sockets(){return this.ctx.getWebSockets().filter(ws=>ws.deserializeAttachment()?.id);}
 safe(ws,data){try{ws.send(JSON.stringify(data));}catch(_){}}
 async save(){
  const data=JSON.stringify({s:this.s,tokens:this.tokens,admin:this.admin,creatorId:this.creatorId,code:this.code});
  const parts=[];for(let i=0;i<data.length;i+=50000)parts.push(data.slice(i,i+50000));
  await this.ctx.storage.transaction(async tx=>{await tx.put('chunks',parts.length);for(let i=0;i<parts.length;i++)await tx.put('state:'+i,parts[i]);});
 }
 snapshot(){return {...pack(this.s),serverBuild:E.BUILD,serverAdmin:this.admin};}
 broadcast(){
  const text=JSON.stringify({t:'state',state:this.snapshot()});
  for(const ws of this.sockets())try{ws.send(text);}catch(_){}
 }
 run(){
  if(this.timer||this.s?.phase!=='playing'||!this.sockets().length)return;
  this.timer=setInterval(()=>{
   if(!this.sockets().length||this.s?.phase!=='playing'){clearInterval(this.timer);this.timer=null;return;}
   // Existing simulation averages four combat steps per second, one with economy.
   this.step=(this.step+1)%4;
   if(this.step===0)E.tick(this.s);else E.combatStep(this.s);
   this.broadcast();
   if(this.s.phase==='ended'||this.step===0&&this.s.tick%10===0)this.ctx.waitUntil(this.save());
  },250);
 }
 async fetch(request){
  const url=new URL(request.url);
  if(url.pathname==='/internal/create'){
   if(this.s)return json({error:'Room already exists'},409);
   this.s=E.lobby(Date.now());this.tokens={};this.admin=null;this.code=url.searchParams.get('code');
   let creator={};try{creator=await request.json();}catch(_){}
   if(typeof creator.token==='string'&&creator.token.length>=12&&creator.token.length<=160){
    const id=E.addPlayer(this.s,creator.name);this.tokens[creator.token]=id;this.creatorId=id;this.admin=id;
    E.person(this.s,id).connected=false;
   }
   await this.save();await this.ctx.storage.setAlarm(Date.now()+86400000);
   return json({code:this.code,created:true});
  }
  if(!this.s)return json({error:'Room not found. Create a new room.'},404);
  if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return new Response('WebSocket required',{status:426});
  if(this.ctx.getWebSockets().length>=8)return json({error:'Too many connections'},429);
  this.code=url.pathname.split('/')[3];
  const pair=new WebSocketPair(),[client,server]=Object.values(pair);
  this.ctx.acceptWebSocket(server);
  server.serializeAttachment({id:null,last:0,connected:Date.now()});
  await this.ctx.storage.setAlarm(Date.now()+86400000);
  return new Response(null,{status:101,webSocket:client});
 }
 async webSocketMessage(ws,raw){
  if(typeof raw!=='string'||raw.length>400000){ws.close(1009,'Message too large');return;}
  let m;try{m=JSON.parse(raw);}catch(_){return;}
  if(!m||typeof m!=='object')return;
  const a=ws.deserializeAttachment()||{};
  if(m.t==='join'){
   if(a.id)return;
   if(typeof m.token!=='string'||m.token.length<12||m.token.length>160){ws.close(1008,'Invalid session');return;}
   let id=this.tokens[m.token],p=E.person(this.s,id);
   if(!p){
    if(this.s.phase!=='lobby'){this.safe(ws,{t:'error',message:'Match already started. Rejoin on your previous device.'});return;}
    id=E.addPlayer(this.s,m.name);if(!id){this.safe(ws,{t:'error',message:'Room is full.'});return;}
    this.tokens[m.token]=id;p=E.person(this.s,id);
   }
   for(const other of this.sockets())if(other!==ws&&other.deserializeAttachment()?.id===id){
    other.serializeAttachment({id:null});other.close(1000,'Rejoined elsewhere');
   }
   this.creatorId??=id;
   if(this.s.phase==='lobby')this.admin=this.creatorId;
   else if(!this.admin||!this.sockets().some(w=>w.deserializeAttachment()?.id===this.admin))this.admin=id;
   ws.serializeAttachment({id,last:0,connected:Date.now()});
   p.connected=true;p.ready=true;
   await this.save();
   this.safe(ws,{t:'welcome',id,state:this.snapshot()});this.broadcast();this.run();return;
  }
  if(!a.id)return;
  const p=E.person(this.s,a.id);if(!p)return;
  if(m.t==='ping'){this.safe(ws,{t:'pong'});return;}
  if(m.t==='resync'){this.safe(ws,{t:'state',state:this.snapshot()});return;}
  const now=Date.now();
  if(m.t==='action'&&now-(a.last||0)<60){this.safe(ws,{t:'ack',id:m.id,ok:false,error:'Please wait before the next command.'});return;}
  ws.serializeAttachment({...a,last:now});
  let result={ok:true};
  if(m.t==='action'){
   if(!m.action||typeof m.action!=='object'||Array.isArray(m.action))return;
   try{result=E.action(this.s,a.id,m.action);}catch(_){result={ok:false,error:'Invalid order.'};}
   this.safe(ws,{t:'ack',id:m.id,...result,action:m.action.type});
  }else if(m.t==='start'&&a.id===this.admin&&this.s.phase==='lobby'){
   result=E.start(this.s,this.s.settings.bots);
  }else if(m.t==='settings'&&a.id===this.admin&&this.s.phase==='lobby'){
   this.s.settings.bots=Math.max(0,Math.min(8,Math.floor(Number(m.bots)||0)));
  }else if(m.t==='spawn'&&this.s.phase==='lobby'){
   result=E.setSpawn(this.s,a.id,m.point);
  }else if(m.t==='ready'&&this.s.phase==='lobby'){p.ready=!!m.value;
  }else if(m.t==='rematch'&&a.id===this.admin&&this.s.phase==='ended'){
   const old=this.s;this.s=E.lobby(Date.now());this.s.settings=old.settings;this.admin=this.creatorId;
   for(const human of old.players.filter(p=>!p.bot)){
    const id=E.addPlayer(this.s,human.name);
    Object.assign(E.person(this.s,id),{id:human.id,color:human.color,ready:true,connected:human.connected});
   }
  }else return;
  if(result.ok){this.broadcast();this.run();await this.save();}
  else this.safe(ws,{t:'error',message:result.error});
 }
 async disconnect(ws){
  const a=ws.deserializeAttachment();ws.serializeAttachment({id:null});
  const connected=new Set(this.sockets().map(w=>w.deserializeAttachment().id));
  if(a?.id&&!connected.has(a.id)){
   const p=E.person(this.s,a.id);if(p)p.connected=false;
   // Transfer room controls; the simulation always stays on the server.
   if(this.s.phase!=='lobby'&&this.admin===a.id&&connected.size)this.admin=[...connected][0];
  }
  if(!connected.size&&this.timer){clearInterval(this.timer);this.timer=null;}
  if(this.s){await this.save();this.broadcast();}
 }
 async webSocketClose(ws,code){try{ws.close(code===1006?1000:code);}catch(_){}await this.disconnect(ws);}
 async webSocketError(ws){await this.disconnect(ws);}
 async alarm(){
  const now=Date.now();
  for(const ws of this.ctx.getWebSockets()){
   const a=ws.deserializeAttachment();
   if(!a?.id&&now-(a?.connected||0)>30000)try{ws.close(1008,'Join timeout');}catch(_){}
  }
  if(this.sockets().length){await this.save();await this.ctx.storage.setAlarm(now+86400000);}
  else{await this.ctx.storage.deleteAll();this.s=null;this.tokens={};this.admin=null;}
 }
}
