const fs=require('fs'),vm=require('vm'),assert=require('assert');
const E=require(process.cwd()+'/engine.js');
const html=fs.readFileSync('index.html','utf8'),elements=new Map(),saved=new Map();
function el(id=''){
 if(elements.has(id))return elements.get(id);
 const attrs=[...html.matchAll(/<[^>]+\bid="([^"]+)"[^>]*>/g)].find(m=>m[1]===id)?.[0]||'';
 const classes=new Set((attrs.match(/\bclass="([^"]*)"/)?.[1]||'').split(' '));
 const e={id,value:'',textContent:'',innerHTML:'',dataset:{},style:{},tagName:'DIV',disabled:false,options:[],classList:{add(...a){a.forEach(x=>classes.add(x))},remove(...a){a.forEach(x=>classes.delete(x))},contains(x){return classes.has(x)},toggle(x,b){const v=b===undefined?!classes.has(x):b;v?classes.add(x):classes.delete(x);return v}},setAttribute(){},getAttribute(){return null},addEventListener(){},focus(){},querySelector(sel){return el(id+sel)},querySelectorAll(){return []},getBoundingClientRect(){return {width:390,height:650,left:0,top:0}},getContext(){return context},closest(){return el(id+'parent')},contains(){return false}};
 elements.set(id,e);return e;
}
const context=new Proxy({createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)}},measureText(){return {width:30}}},{get(t,k){return t[k]||(()=>{})}});
const document={getElementById:el,querySelectorAll(){return []},querySelector(){return null},createElement(){return el('created')},addEventListener(){},activeElement:el('body'),body:el('body'),hidden:false};
const sandbox={btoa,atob,console,window:{BKEngine:E,innerWidth:390,addEventListener(){}},document,localStorage:{getItem(k){return saved.get(k)||null},setItem(k,v){saved.set(k,v)},removeItem(k){saved.delete(k)}},location:{hash:'',origin:'https://test',pathname:'/index.html',search:''},history:{replaceState(){}},navigator:{},Path2D:class{},requestAnimationFrame(){},setTimeout(){return 1},clearTimeout(){},setInterval(){},performance:{now(){return 0}},devicePixelRatio:1,crypto:require('crypto').webcrypto,Uint8Array,Uint8ClampedArray,Blob};
el('soloBots').value='2';el('nickname').value='Test';

const sent=[],timers=[];
class Socket{
 constructor(url){this.url=String(url);this.readyState=1;Socket.last=this;}
 send(text){sent.push(JSON.parse(text));}
 close(){this.readyState=3;if(this.onclose)this.onclose();}
}
sandbox.window.BK_SERVER=true;sandbox.WebSocket=Socket;sandbox.URL=URL;sandbox.clearInterval=()=>{};sandbox.setInterval=fn=>{timers.push(fn);return timers.length;};
sandbox.fetch=async()=>({ok:true,json:async()=>({code:'A1B2C3'})});
const source=fs.readFileSync('game.js','utf8').replace(/\}\)\(\);\s*$/, "window.test={createServerRoom,joinServerRoom,goHome,command,startGame,get:()=>({state,host,serverActive,myId}),snapshot:()=>state};})();");
vm.runInNewContext(source,sandbox);const t=sandbox.window.test;
(async()=>{
 await t.createServerRoom();const ws=Socket.last;ws.onopen();
 assert.equal(sent.at(-1).t,'join');assert(saved.get('bk-token-A1B2C3'),'server identity survives tab closure');
 const room=E.lobby(9);E.addPlayer(room,'A');E.addPlayer(room,'B');room.serverAdmin=1;
 ws.onmessage({data:JSON.stringify({t:'welcome',id:1,state:room})});
 assert.equal(t.get().host,true);assert.equal(t.get().serverActive,true);
 t.startGame();assert.equal(sent.at(-1).t,'start');assert.equal(t.snapshot().phase,'lobby','client must not start simulation');
 E.start(room,0);room.serverAdmin=1;
 ws.onmessage({data:JSON.stringify({t:'state',state:room})});
 const troops=t.snapshot().players[0].troops;
 assert(t.command({type:'setNationTarget',target:2,enabled:true}));assert.equal(sent.at(-1).t,'action');
 assert.equal(t.snapshot().wars.length,0,'client cannot apply order locally');
 assert.equal(t.snapshot().players[0].troops,troops);
 for(const fn of timers)fn();assert.equal(t.snapshot().tick,0,'browser must not advance server clock');
 t.goHome();assert.equal(t.get().serverActive,false);assert.equal(t.get().state,null);
 ws.onmessage({data:JSON.stringify({t:'state',state:room})});assert.equal(t.get().state,null,'late callback cannot revive session');
 console.log('Cloudflare client: creation, persistent identity, server authority, timers, exit and stale callbacks passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
