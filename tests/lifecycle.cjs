const fs=require('fs'),vm=require('vm'),assert=require('assert');
const E=require(process.cwd()+'/engine.js');
const html=fs.readFileSync('index.html','utf8'),elements=new Map(),saved=new Map();
function el(id=''){
 if(elements.has(id))return elements.get(id);
 const classes=new Set((html.match(new RegExp('class="([^"]*)"[^>]*id="'+id+'"'))?.[1]||'').split(' '));
 const e={id,value:'',textContent:'',innerHTML:'',dataset:{},style:{},tagName:'DIV',disabled:false,options:[],classList:{add(...a){a.forEach(x=>classes.add(x))},remove(...a){a.forEach(x=>classes.delete(x))},contains(x){return classes.has(x)},toggle(x,b){const v=b===undefined?!classes.has(x):b;v?classes.add(x):classes.delete(x);return v}},setAttribute(){},getAttribute(){return null},addEventListener(){},focus(){},querySelector(sel){return el(id+sel)},querySelectorAll(){return []},getBoundingClientRect(){return {width:390,height:650,left:0,top:0}},getContext(){return context},closest(){return el(id+'parent')},contains(){return false}};
 elements.set(id,e);return e;
}
const context=new Proxy({createImageData(w,h){return {data:new Uint8ClampedArray(w*h*4)}},measureText(){return {width:30}}},{get(t,k){return t[k]||(()=>{})}});
const document={getElementById:el,querySelectorAll(){return []},querySelector(){return null},createElement(){return el('created')},addEventListener(){},activeElement:el('body'),body:el('body'),hidden:false};
const sandbox={console,window:{BKEngine:E,innerWidth:390,addEventListener(){}},document,localStorage:{getItem(k){return saved.get(k)||null},setItem(k,v){saved.set(k,v)},removeItem(k){saved.delete(k)}},location:{hash:'',origin:'https://test',pathname:'/index.html',search:''},history:{replaceState(){}},navigator:{},Path2D:class{},requestAnimationFrame(){},setTimeout(){return 1},clearTimeout(){},setInterval(){},performance:{now(){return 0}},devicePixelRatio:1,crypto:require('crypto').webcrypto,Uint8Array,Uint8ClampedArray,Blob};
el('soloBots').value='2';el('nickname').value='Test';
let source=fs.readFileSync('game.js','utf8').replace(/\}\)\(\);\s*$/,`window.test={createDemo,goHome,openSession,hideAux,render,requestExit,get:()=>({state,demo,host,pauseSolo,myId}),online:(s)=>{state=s;host=true;demo=false;myId=1;phaseShown='ended';}};})();`);
vm.runInNewContext(source,sandbox);const t=sandbox.window.test;
t.createDemo(false);assert.equal(t.get().state.phase,'playing');
t.get().state.players[0].res.wood=1234;t.goHome();assert.equal(t.get().state,null);assert.equal(JSON.parse(saved.get('bk-v14-save')).players[0].res.wood,1234);
t.createDemo(true);assert.equal(t.get().state.players[0].res.wood,1234);
t.openSession();assert.equal(t.get().pauseSolo,true);t.hideAux();assert.equal(t.get().pauseSolo,false);
t.get().state.phase='ended';el('restart').onclick();assert.equal(t.get().state.phase,'playing');assert.equal(t.get().demo,true);
t.get().state.players[0].eliminated=true;t.get().state.players[0].land=0;t.render();assert.equal(el('victory').classList.contains('hidden'),false);assert.equal(el('victoryName').textContent,'Поражение');el('spectateMatch').onclick();assert.equal(el('victory').classList.contains('hidden'),true);t.requestExit();assert.equal(t.get().state,null);
const online=E.lobby(3);E.addPlayer(online,'Host');E.addPlayer(online,'Guest');online.players[1].id=3;online.phase='ended';t.online(online);el('restart').onclick();assert.equal(t.get().state.phase,'lobby');assert.deepEqual(t.get().state.players.map(p=>p.id),[1,3]);assert(t.get().state.players.every(p=>p.ready));
console.log('PASS: solo save/resume, menu pause/resume, solo rematch, personal defeat/spectate/exit, online rematch identity');
