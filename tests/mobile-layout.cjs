'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright');
const root=process.cwd(),types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{
 const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname),file=path.join(root,name==='/'?'index.html':name);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 try{
  let body=fs.readFileSync(file);
  if(name==='/'||name==='/index.html')body=body.toString().split('\n').filter(line=>!line.includes('unpkg.com/peerjs')).join('\n');
  if(name==='/game.js')body=body.toString().replace(/\}\)\(\);\s*$/,"window.__layout={contextual,getArmyDisplay,drawArmyDisplay,render,draw,chooseSpawn,getState:()=>state,createDemo,setBuildingMode,warnHud,toast,openPanel,closePanel,showAux,hideAux,goHome,setRoom:()=>{goHome();state=E.lobby(5);myId=E.addPlayer(state,'A very long player');E.addPlayer(state,'Second player');host=true;render();}};})();");
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});res.end(body);
 }catch(_){res.writeHead(404);res.end();}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 for(const [name,type] of [['Chromium',chromium],['WebKit',webkit]]){
  const browser=await type.launch({headless:true});
  try{for(const viewport of [{width:320,height:568},{width:390,height:780},{width:844,height:390}]){
   const page=await browser.newPage({viewport});const label=name+' '+viewport.width+'x'+viewport.height;
   await page.goto(base,{waitUntil:'load'});
   await page.evaluate(()=>window.__layout.setRoom());
   assert(await page.locator('#waiting').isVisible(),label+' room is visible');
   assert(await page.locator('#startButton').isVisible(),label+' room Start visible');
   const spawn=page.locator('#spawnMap'),bounds=await spawn.boundingBox();
   assert(bounds.width>180&&bounds.height>100,label+' spawn map visible with usable size');
   const chosen=await page.evaluate(()=>{const s=window.__layout.getState(),E=window.BKEngine;for(let y=10;y<E.H-10;y++)for(let x=10;x<E.W-10;x++)if(!E.spawnError(s,1,x,y))return {x,y};});
   await spawn.scrollIntoViewIfNeeded();const rect=await spawn.boundingBox();
   await page.mouse.click(rect.x+(chosen.x+.5)/160*rect.width,rect.y+(chosen.y+.5)/104*rect.height);
   assert.deepEqual(await page.evaluate(()=>window.__layout.getState().players[0].spawnPoint),chosen,label+' map click chooses exact point');
   await page.locator('#spawnAuto').click();assert.equal(await page.evaluate(()=>window.__layout.getState().players[0].spawnPoint),null,label+' automatic resets selection');
   await page.evaluate(()=>window.__layout.createDemo(false));
   const performanceChecks=await page.evaluate(()=>{
    const E=window.BKEngine,L=window.__layout,s=L.getState(),id=s.players.find(p=>!p.bot).id;
    const zone=s.tiles.flatMap((tile,i)=>tile&&s.owners[i]!==id?[i]:[]),i=zone[0];
    const result=E.action(s,id,{type:'send',x:i%E.W,y:(i/E.W)|0,zone,percent:30});
    if(!result.ok)throw Error(result.error);
    const original=E.estimatePlanFront;let estimates=0;
    E.estimatePlanFront=(...args)=>{estimates++;return original(...args);};
    L.render();const closed=estimates;L.showAux('armiesPanel');const opened=estimates;L.hideAux();E.estimatePlanFront=original;
    const plan=s.attackPlans.find(p=>p.owner===id);let traversals=0;
    plan.zoneCells[Symbol.iterator]=function*(){traversals++;for(let k=0;k<this.length;k++)yield this[k];};
    L.draw();const first=traversals;L.draw();const second=traversals;delete plan.zoneCells[Symbol.iterator];
    return {closed,opened,first,second};
   });
   assert.equal(performanceChecks.closed,0,label+' closed army panel performs no frontier estimates');
   assert(performanceChecks.opened>0,label+' opening army panel still renders live estimates');
   assert(performanceChecks.first>0,label+' initial planned geometry is drawn');
   assert.equal(performanceChecks.second,performanceChecks.first,label+' repeated frames reuse plan geometry');
   const visualBudget=await page.evaluate(()=>{
    const L=window.__layout,E=window.BKEngine,s=L.getState(),id=s.players.find(p=>!p.bot).id;
    const saved=s.armies,owned=s.owners.flatMap((v,i)=>v===id?[i]:[]);
    const i=s.tiles.findIndex((v,i)=>v&&s.owners[i]!==id&&[i-1,i+1,i-E.W,i+E.W].some(j=>s.owners[j]===id));
    const anchor=[i-1,i+1,i-E.W,i+E.W].find(j=>s.owners[j]===id),tx=anchor%E.W,ty=(anchor/E.W)|0;
    const columns=Array.from({length:1000},(_,n)=>{const pos=n%20===0?anchor:owned[n%owned.length];return {x:pos%E.W,y:(pos/E.W)|0,tx,ty,strength:100,sector:'test',route:[]};});
    s.armies=[{id:'visual-stress',owner:id,strength:100000,frontCells:[i],columns,sectors:[{key:'test',anchor,cells:[i],required:3}]}];
    const first=L.getArmyDisplay(),same=first===L.getArmyDisplay(),canvas=document.getElementById('mapCanvas'),c=canvas.getContext('2d');
    const originals={fill:c.fill,fillText:c.fillText,arc:c.arc,fillRect:c.fillRect};let fills=0,labels=0,circles=0,rects=0;
    c.fill=function(...a){fills++;return originals.fill.apply(this,a);};
    c.fillRect=function(...a){rects++;return originals.fillRect.apply(this,a);};
    c.fillText=function(...a){labels++;return originals.fillText.apply(this,a);};
    c.arc=function(...a){circles++;return originals.arc.apply(this,a);};
    try{L.drawArmyDisplay(canvas.clientWidth,canvas.clientHeight);}
    finally{for(const [key,value]of Object.entries(originals))c[key]=value;s.armies=saved;}
    return {same,paths:first.paths.length,fills,labels,circles,rects,players:s.players.length};
   });
   assert(visualBudget.same,label+' army display geometry is reused between frames');
   assert(visualBudget.paths<=visualBudget.players*4,label+' concentration lines are batched');
   assert.equal(visualBudget.fills,0,label+' troop display has no arrow glyphs');
   assert(visualBudget.rects>0&&visualBudget.rects<1000,label+' overlapping troops share shaded cells');
   assert.equal(visualBudget.labels,0,label+' no troop number labels on the map');
   assert.equal(visualBudget.circles,0,label+' no per-squad circles');
   await page.evaluate(()=>{const L=window.__layout,s=L.getState();L.contextual(s.buildings.find(b=>b.kind==='capital'&&!s.players.find(p=>p.id===b.owner).bot));});
   assert((await page.locator('#contextBody').textContent()).includes('Garrison nearby'),label+' base tap reveals stationed troops');
   await page.evaluate(()=>window.__layout.hideAux());
   await page.locator('#planToolPaint').click();
   assert.equal(await page.locator('#planTroopsControl').isVisible(),false,label+' no troop percentage slider');
   assert.equal(await page.locator('#planBrushSize').isVisible(),true,label+' brush sizing remains available');
   await page.evaluate(()=>{window.__layout.showAux('armiesPanel');window.__layout.hideAux();});
   await page.evaluate(()=>window.__layout.setBuildingMode('lumber'));
   assert.equal(await page.locator('#planGuide').isVisible(),false,label+' resource priority does not open paint');
   await page.evaluate(()=>window.__layout.render());
   assert.equal(await page.evaluate(()=>window.__layout.getState().players.find(p=>!p.bot).workPriority),'wood',label+' extraction priority selected');
   await page.evaluate(()=>window.__layout.setBuildingMode('barracks'));
   const geometry=await page.locator('#placingBuild').evaluate(bar=>{
    const r=bar.getBoundingClientRect(),name=document.getElementById('placingBuildName').getBoundingClientRect(),cost=document.getElementById('placingBuildCost').getBoundingClientRect();
    return {width:r.width,height:r.height,left:r.left,right:r.right,nameWidth:name.width,nameHeight:name.height,costHeight:cost.height,screen:innerWidth};
   });
   assert(geometry.height<=96,label+' placement height '+JSON.stringify(geometry));
   assert(geometry.width>=280,label+' placement must not shrink '+JSON.stringify(geometry));
   assert(geometry.nameWidth>=60,label+' name width '+JSON.stringify(geometry));
   assert(geometry.nameHeight<=22,label+' title is one line '+JSON.stringify(geometry));
   assert(geometry.left>=0&&geometry.right<=viewport.width,label+' placement inside viewport');
   await page.evaluate(()=>{window.__layout.warnHud('Offensive ended');window.__layout.toast('Order completed','success');});
   assert.equal(await page.locator('#hudAlert').isVisible(),false,label+' ordinary notice hidden behind toast');
   assert.equal(await page.locator('#gameToast').isVisible(),true,label+' toast visible');
   await page.evaluate(()=>window.__layout.warnHud('Capital threatened','danger'));
   assert.equal(await page.locator('#hudAlert').isVisible(),true,label+' danger takes priority');
   assert.equal(await page.locator('#gameToast').isVisible(),false,label+' toast hidden behind danger');
   await page.evaluate(()=>window.__layout.showAux('armiesPanel'));
   assert(await page.locator('[data-front-row="home-army"]').isVisible(),label+' home squads are visible in army overview');
   const armyBox=await page.locator('#armiesPanel').boundingBox();
   assert(armyBox.x>=0&&armyBox.x+armyBox.width<=viewport.width+1,label+' army overview fits the screen');
   await page.evaluate(()=>window.__layout.hideAux());
   await page.evaluate(()=>window.__layout.openPanel());
   assert.equal(await page.locator('#planToolSwitch').isVisible(),false,label+' tools do not cover Research');
   await page.evaluate(()=>window.__layout.showAux('sessionPanel'));
   assert.equal(await page.locator('#sidebar').evaluate(el=>el.classList.contains('open')),false,label+' Research closes for Match');
   const close=page.locator('#closeSession');await close.click();
   await page.evaluate(()=>window.__layout.goHome());
   assert(await page.locator('#lobby').isVisible(),label+' home visible');
   console.log('PASS '+label);await page.close();
  }}finally{await browser.close();}
 }
})().catch(error=>{console.error('::error::'+String(error.stack||error).replace(/\n/g,'%0A'));process.exitCode=1;}).finally(()=>server.close());
