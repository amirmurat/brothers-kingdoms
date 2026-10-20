'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const E=require('../engine.js');
const source=fs.readFileSync('server/cloudflare.mjs','utf8').replace(/^import .*;$/m,'').replace('export default','const worker =').replace('export class KingdomRoom','class KingdomRoom');
async function checkRoom(E,source,assert,btoa){
 const timers=new Map();let next=1;
 const {KingdomRoom}=new Function('globalThis','setInterval','clearInterval','btoa',source+';return {KingdomRoom,worker};')(
  {BKEngine:E},fn=>{timers.set(next,fn);return next++;},id=>timers.delete(id),btoa);
 const data=new Map(),sockets=[],pending=[];
 const clone=x=>JSON.parse(JSON.stringify(x));
 const storage={async get(k){if(Array.isArray(k))return new Map(k.map(i=>[i,data.get(i)]));return data.get(k);},async put(k,v){data.set(k,clone(v));},async transaction(fn){return fn(this);},async setAlarm(){},async deleteAll(){data.clear();}};
 const ctx={storage,blockConcurrencyWhile(fn){this.ready=fn();},getWebSockets(){return sockets.filter(s=>!s.closed);},waitUntil(p){pending.push(p);}};
 const room=new KingdomRoom(ctx,{});await ctx.ready;await room.fetch(new Request('https://test/internal/create?code=A1B2C3',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'A',token:'session-a-123456789'})}));
 function socket(){const w={attachment:{id:null},sent:[],closed:false,deserializeAttachment(){return this.attachment;},serializeAttachment(a){this.attachment=a;},send(s){this.sent.push(JSON.parse(s));},close(){this.closed=true;}};sockets.push(w);return w;}
 const a=socket(),b=socket(),c=socket();
 const msg=(w,m)=>room.webSocketMessage(w,JSON.stringify(m));
 await msg(b,{t:'join',name:'B',token:'session-b-123456789'});
 assert.equal(room.admin,1,'creator remains owner even if guest socket joins first');
 await msg(a,{t:'join',name:'A',token:'session-a-123456789'});
 assert.equal(room.s.players.length,2);assert.equal(room.admin,1);
 await room.disconnect(a);assert.equal(room.admin,1,'temporary lobby disconnect cannot transfer owner');
 await msg(a,{t:'join',name:'A',token:'session-a-123456789'});assert.equal(room.admin,1);
 let chosen;for(let y=5;y<E.H-5&&!chosen;y++)for(let x=5;x<E.W-5;x++)if(!E.spawnError(room.s,1,x,y)){chosen={x,y};break;}
 await msg(a,{t:'spawn',point:chosen});assert.deepEqual(E.person(room.s,1).spawnPoint,chosen);
 b.attachment.last=0;await msg(b,{t:'spawn',point:chosen});assert(!E.person(room.s,2).spawnPoint,'server rejects another player occupying chosen point');
 a.attachment.last=0;b.attachment.last=0;
 await msg(b,{t:'start'});assert.equal(room.s.phase,'lobby');
 await msg(a,{t:'start'});assert.equal(room.s.phase,'playing');assert.deepEqual(E.person(room.s,1).capital,chosen);
 assert.equal(timers.size,1);assert(a.sent.some(m=>m.state?.packed),'compressed snapshots');
 const before=room.s.tick;for(let i=0;i<4;i++)for(const tick of timers.values())tick();
 assert.equal(room.s.tick,before+1);
 a.attachment.last=0;
 await msg(a,{t:'action',id:1,action:{type:'setNationTarget',target:2,enabled:true}});
 assert(room.s.wars.length===1,'server accepts legal Nations order');
 b.attachment.last=0;
 await msg(b,{t:'action',id:2,action:{type:'cancelPlan',id:'foreign'}});
 assert(b.sent.some(m=>m.t==='ack'&&m.id===2&&!m.ok),'reject invalid orders');
 await room.disconnect(a);assert.equal(room.admin,2);assert.equal(room.s.phase,'playing');
 await msg(c,{t:'join',name:'renamed',token:'session-a-123456789'});
 assert.equal(c.attachment.id,1);assert.equal(room.s.players.length,2);
 await room.disconnect(b);await room.disconnect(c);assert.equal(timers.size,0,'no connected players pauses clock');
 const duplicate=socket();await msg(duplicate,{t:'join',name:'A',token:'session-a-123456789'});
 assert.equal(timers.size,1,'rejoin resumes');
 await room.save();
 const reboot=new KingdomRoom(ctx,{});await ctx.ready;
 assert.equal(reboot.s.tick,room.s.tick);assert.equal(reboot.s.wars.length,1);assert.equal(reboot.tokens['session-a-123456789'],1);
 assert([...data.values()].filter(x=>typeof x==='string').every(x=>x.length<=50000),'snapshot chunks below storage value limit');
 const packed=room.snapshot();
 assert.equal(atob(packed.tiles).length,E.W*E.H);
 for(const id of [...timers.keys()])timers.delete(id);
 await Promise.all(pending);
 console.log('Cloudflare server: authority, orders, snapshots, control transfer, rejoin, pause and recovery passed');
}
checkRoom(E,source,assert,btoa).catch(e=>{console.error(e);process.exitCode=1;});
