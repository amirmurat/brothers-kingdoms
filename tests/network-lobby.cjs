'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {WebSocketServer}=require('ws'),{chromium,webkit}=require('playwright');
const root=process.cwd(),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const rooms=new Map(),source=fs.readFileSync('server/cloudflare.mjs','utf8').replace(/^import .*;$/m,'').replace('export default','const worker =').replace('export class KingdomRoom','class KingdomRoom');
globalThis.BKEngine=require('../engine.js');
const {worker,KingdomRoom}=new Function(source+';return {worker,KingdomRoom};')();
function createRoom(code){
 const sockets=new Set(),data=new Map();
 const storage={async get(k){return Array.isArray(k)?new Map(k.map(x=>[x,data.get(x)])):data.get(k);},async put(k,v){data.set(k,structuredClone(v));},async transaction(fn){return fn(this);},async setAlarm(){},async deleteAll(){data.clear();}};
 const ctx={storage,getWebSockets:()=>[...sockets].filter(w=>w.readyState===1),blockConcurrencyWhile(fn){this.ready=fn();},waitUntil(p){p.catch(console.error);}};
 const room=new KingdomRoom(ctx,{});const entry={room,ctx,sockets};rooms.set(code,entry);return entry;
}
const env={ROOMS:{idFromName:x=>x,get(code){return {async fetch(request){const entry=rooms.get(code)||createRoom(code);await entry.ctx.ready;return entry.room.fetch(request);}};}}};
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://'+req.headers.host);
 if(url.pathname.startsWith('/api/')){
  try{
   const chunks=[];for await(const chunk of req)chunks.push(chunk);
   const request=new Request(url,{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})});
   const response=await worker.fetch(request,env);res.writeHead(response.status,{'Content-Type':'application/json'});res.end(await response.text());
  }catch(error){console.error(error);res.writeHead(500);res.end();}
  return;
 }
 const file=path.join(root,url.pathname==='/'?'index.html':url.pathname);
 try{
  let body=fs.readFileSync(file);
  if(url.pathname==='/'||url.pathname==='/index.html')body=body.toString().split('\n').filter(l=>!l.includes('unpkg.com/peerjs')).join('\n');
  if(url.pathname==='/server-config.js')body='window.BK_SERVER=true;';
  if(url.pathname==='/game.js')body=body.toString().replace(/\}\)\(\);\s*$/,"window.__net={get:()=>({state,host,myId,code}),reconnect:()=>openServerSocket()};})();");
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(body);
 }catch(_){res.writeHead(404);res.end();}
});
const wss=new WebSocketServer({noServer:true});
server.on('upgrade',(req,socket,head)=>{
 const code=new URL(req.url,'http://localhost').pathname.split('/')[3],entry=rooms.get(code);
 if(!entry){socket.destroy();return;}
 wss.handleUpgrade(req,socket,head,ws=>{
  ws.attachment={id:null,last:0,connected:Date.now()};
  ws.serializeAttachment=a=>ws.attachment=a;ws.deserializeAttachment=()=>ws.attachment;
  entry.sockets.add(ws);
  ws.on('message',bytes=>entry.room.webSocketMessage(ws,bytes.toString()).catch(console.error));
  ws.on('close',()=>entry.room.disconnect(ws).catch(console.error));
 });
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 for(const [name,type] of [['Chromium',chromium],['WebKit',webkit]]){
  const browser=await type.launch();
  try{
   const owner=await browser.newContext({viewport:{width:390,height:780},hasTouch:true,isMobile:true});
   const guest=await browser.newContext({viewport:{width:390,height:780},hasTouch:true,isMobile:true});
   let a=await owner.newPage();const b=await guest.newPage();
   await a.goto(base);await a.fill('#nickname','Creator');await a.click('#hostButton');await a.waitForSelector('#waiting:not(.hidden)');
   const code=await a.evaluate(()=>window.__net.get().code);
   await b.goto(base+'/#'+code);await b.fill('#nickname','Guest');await b.click('#joinButton');await b.waitForSelector('#waiting:not(.hidden)');
   await a.waitForFunction(()=>window.__net.get().state.players.length===2);
   assert(await a.evaluate(()=>window.__net.get().host),name+' creator is host');
   assert.equal(await b.evaluate(()=>window.__net.get().host),false,name+' guest is not host');
   // Reproduce returning from a native share sheet: reconnect creator socket.
   await a.evaluate(()=>window.__net.reconnect());
   await a.waitForFunction(()=>window.__net.get().host&&window.__net.get().state.players[0].connected);
   assert.equal(await b.evaluate(()=>window.__net.get().host),false,name+' reconnect cannot promote guest');
   const chosen=await a.evaluate(()=>{const {state,myId}=window.__net.get(),E=window.BKEngine;for(let y=15;y<E.H-15;y++)for(let x=15;x<E.W-15;x++)if(!E.spawnError(state,myId,x,y))return {x,y};});
   await a.locator('#spawnMap').scrollIntoViewIfNeeded();let box=await a.locator('#spawnMap').boundingBox();
   await a.touchscreen.tap(box.x+(chosen.x+.5)/160*box.width,box.y+(chosen.y+.5)/104*box.height);
   await a.waitForFunction(p=>JSON.stringify(window.__net.get().state.players.find(p=>p.name==='Creator').spawnPoint)===JSON.stringify(p),chosen);
   await b.waitForFunction(p=>JSON.stringify(window.__net.get().state.players.find(p=>p.name==='Creator').spawnPoint)===JSON.stringify(p),chosen);
   await a.close();await b.waitForFunction(()=>window.__net.get().state.players.find(p=>p.name==='Creator').connected===false);
   assert.equal(await b.evaluate(()=>window.__net.get().host),false,name+' owner keeps lobby ownership while away');
   a=await owner.newPage();await a.goto(base+'/#'+code);await a.waitForSelector('#waiting:not(.hidden)');
   assert(await a.evaluate(()=>window.__net.get().host),name+' owner reclaims session');
   assert.deepEqual(await a.evaluate(()=>window.__net.get().state.players.find(p=>p.name==='Creator').spawnPoint),chosen,name+' spawn survives reconnect');
   await a.click('#startButton');await a.waitForSelector('#game:not(.hidden)');await b.waitForSelector('#game:not(.hidden)');
   assert.deepEqual(await a.evaluate(()=>window.__net.get().state.players.find(p=>p.name==='Creator').capital),chosen,name+' chosen point becomes actual capital');
   for(const page of [a,b])assert(await page.evaluate(()=>window.__net.get().state.players.every(p=>Array.isArray(p.garrisons)&&Math.abs(p.garrisons.reduce((n,g)=>n+g.strength,0)-p.troops)<.001)),name+' both clients receive consistent spatial army');
   for(const page of [a,b])await page.waitForFunction(()=>window.__net.get().state.players.every(p=>Array.isArray(p.workers)&&p.workers.length<=24));
   await a.click('#resourceSummary [data-resource="gold"]');
   for(const page of [a,b])await page.waitForFunction(()=>window.__net.get().state.players.find(p=>p.name==='Creator').workPriority==='gold');
   for(const page of [a,b])assert(await page.evaluate(()=>!JSON.stringify(window.__net.get().state.players).includes('"route"')),name+' route internals remain off the wire');
   console.log('PASS '+name+' two-client lobby: owner, reconnect, touch spawn, shared state, rejoin and actual capital');
   await owner.close();await guest.close();
  }finally{await browser.close();}
 }
})().catch(e=>{console.error('::error::'+String(e.stack||e).replace(/\n/g,'%0A'));process.exitCode=1;}).finally(()=>{for(const {room,sockets}of rooms.values()){if(room.timer)clearInterval(room.timer);for(const ws of sockets)ws.terminate();}wss.close();server.close();});
