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
  if(name==='/game.js')body=body.toString().replace(/\}\)\(\);\s*$/,"window.__layout={buildingLevelColor,repaintWorld,simulatePacket:()=>{movementStart=performance.now();},contextual,getArmyDisplay,drawArmyDisplay,render,draw,chooseSpawn,getState:()=>state,createDemo,setBuildingMode,warnHud,toast,openPanel,closePanel,showAux,hideAux,goHome,setRoom:()=>{goHome();state=E.lobby(5);myId=E.addPlayer(state,'A very long player');E.addPlayer(state,'Second player');host=true;render();}};})();");
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
   const mapWork=await page.evaluate(()=>{
    const L=window.__layout,s=L.getState();L.repaintWorld();const i=s.owners.findIndex(v=>v===1),old=s.owners[i];
    s.owners[i]=0;s.territoryRevision++;const changed=L.repaintWorld(),unchanged=L.repaintWorld();
    s.owners[i]=old;s.territoryRevision++;L.repaintWorld();
    const original=window.requestAnimationFrame;let frames=0;window.requestAnimationFrame=()=>{frames++;return 0;};
    try{L.simulatePacket();L.draw();}finally{window.requestAnimationFrame=original;}
    return {changed,unchanged,frames};
   });
   assert(mapWork.changed>0&&mapWork.changed<=5,label+' one capture repaints at most five terrain cells');
   assert.equal(mapWork.unchanged,0,label+' unchanged ownership repaints nothing');
   assert.equal(mapWork.frames,0,label+' static cell display does not run a perpetual animation loop');
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
   const levelColors=await page.evaluate(()=>[1,2,3,4,5].map(level=>window.__layout.buildingLevelColor({level})));
   assert.equal(new Set(levelColors).size,5,label+' building upgrades have distinct level colors');
   await page.locator('#resourceSummary [data-resource="gold"]').click();
   assert.equal(await page.evaluate(()=>window.__layout.getState().players.find(p=>!p.bot).workPriority),'gold',label+' resource HUD selects production priority');
   assert.equal(await page.locator('#resourceSummary [data-resource="gold"]').getAttribute('aria-pressed'),'true',label+' priority is visibly selected');
   await page.locator('#resourceSummary [data-resource="gold"]').click();
   assert.equal(await page.evaluate(()=>window.__layout.getState().players.find(p=>!p.bot).workPriority),'balanced',label+' second resource tap restores balance');
   await page.locator('#resourceSummary [data-resource="food"]').press('Enter');
   assert.equal(await page.evaluate(()=>window.__layout.getState().players.find(p=>!p.bot).workPriority),'food',label+' resource priority supports keyboard');
   const navigation=await page.evaluate(()=>{const m=document.getElementById('minimapToggle').getBoundingClientRect(),n=document.getElementById('warChip').getBoundingClientRect(),menu=document.getElementById('menuToggle').getBoundingClientRect(),map=document.getElementById('mapView').getBoundingClientRect();return {sameParent:document.getElementById('warChip').parentElement.id==='mapNavigation',separate:n.left>=m.right,menuTop:menu.top,mapTop:map.top};});
   assert(navigation.sameParent&&navigation.separate,label+' map and Nations sit together');
   assert.equal(navigation.menuTop,navigation.mapTop+10,label+' menu occupies former Nations corner');
   const typeColors=await page.evaluate(()=>['city','barracks','fort'].map(kind=>window.__layout.buildingLevelColor({kind,level:1})));
   assert.equal(new Set(typeColors).size,3,label+' map building types have distinct colors');
   const dock=await page.locator('#buildDock').boundingBox();
   assert(dock&&dock.width<=viewport.width&&dock.x>=0&&dock.y+dock.height<=viewport.height+1,label+' strategic dock fits');
   assert.equal(await page.locator('#developButton').isVisible(),false,label+' no construction catalogue toggle');
   assert.equal(await page.locator('[data-place-building]').count(),3,label+' only three strategic buildings');
   assert.equal(await page.locator('#buildDock button > img').count(),3,label+' dock uses original building art');
   assert.equal(await page.locator('#workerCount').isVisible(),true,label+' workforce count is visible');
   assert.equal(await page.locator('#planToolPaint use').getAttribute('href'),'assets/icons/game.svg#sword',label+' attack action has sword icon');
   await page.locator('[data-place-building="city"]').click();
   assert.equal(await page.locator('[data-place-building="city"]').getAttribute('aria-pressed'),'true',label+' tap selects building');
   await page.locator('[data-place-building="city"]').click();
   assert.equal(await page.locator('[data-place-building="city"]').getAttribute('aria-pressed'),'false',label+' second tap deselects building');
   await page.locator('[data-place-building="city"]').click();
   await page.locator('[data-place-building="fort"]').click();
   assert.equal(await page.locator('[data-place-building="city"]').getAttribute('aria-pressed'),'false',label+' choosing another clears previous building');
   assert.equal(await page.locator('[data-place-building="fort"]').getAttribute('aria-pressed'),'true',label+' choosing another selects it');
   assert.equal(await page.locator('#placingBuild').isVisible(),false,label+' no separate placement chooser');
   const buttons=await page.locator('#buildDock button').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect(),icon=el.querySelector(':scope > img').getBoundingClientRect();return {width:r.width,height:r.height,centerError:Math.abs(icon.x+icon.width/2-r.x-r.width/2)};}));
   assert(buttons.every(b=>Math.abs(b.width-buttons[0].width)<.5&&Math.abs(b.height-buttons[0].height)<.5&&b.centerError<1),label+' bottom actions share dimensions and centered icons '+JSON.stringify(buttons));
   assert.equal(await page.locator('#buildDock').evaluate(el=>getComputedStyle(el).borderRadius),'0px',label+' bottom HUD has no floating frame');
   await page.evaluate(()=>{window.__layout.warnHud('Offensive ended');window.__layout.toast('Order completed','success');});
   assert.equal(await page.locator('#hudAlert').isVisible(),false,label+' ordinary notice hidden behind toast');
   assert.equal(await page.locator('#gameToast').isVisible(),true,label+' toast visible');
   const statusRects=await page.evaluate(()=>{const a=document.getElementById('gameToast').getBoundingClientRect(),b=document.getElementById('warChip').getBoundingClientRect();return {separate:a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom,nationWidth:b.width,nationHeight:b.height};});
   assert(statusRects.separate,label+' feedback does not overlap diplomacy');
   const noticeLayout=await page.evaluate(()=>{
    const toast=document.getElementById('gameToast'),rail=document.getElementById('threatRail'),expand=document.getElementById('threatExpand');
    const a=toast.getBoundingClientRect(),radius=getComputedStyle(toast).borderRadius,saved=[rail.className,expand.className];
    rail.classList.remove('hidden');expand.classList.remove('hidden');
    const b=rail.getBoundingClientRect(),map=document.getElementById('mapView').getBoundingClientRect();
    const hidden=getComputedStyle(document.getElementById('gameFeedback')).display==='none';
    const result={x:a.x,y:a.y,width:a.width,height:a.height,threatX:b.x,threatY:b.y,threatWidth:b.width,threatHeight:b.height,mapTop:map.top,radius,threatRadius:getComputedStyle(rail).borderRadius,hidden};
    [rail.className,expand.className]=saved;return result;
   });
   assert(noticeLayout.hidden,label+' attack suppresses other notification cards');
   assert.equal(noticeLayout.x,noticeLayout.threatX,label+' notifications use the same corner');
   assert.equal(noticeLayout.y,noticeLayout.threatY,label+' notification switches in place');
   assert.equal(noticeLayout.width,noticeLayout.threatWidth,label+' notifications have identical widths');
   assert.equal(noticeLayout.height,noticeLayout.threatHeight,label+' notifications have identical heights');
   assert.equal(noticeLayout.radius,noticeLayout.threatRadius,label+' notifications have identical shapes');
   assert.equal(noticeLayout.y,noticeLayout.mapTop+10,label+' notification sits at the top edge of the map');
   assert.equal(statusRects.nationWidth,48,label+' diplomacy is a compact icon action');
   assert(statusRects.nationHeight>=44,label+' diplomacy keeps a touch target');
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
   const sheetStyle=async(selector,heading)=>page.locator(selector).evaluate((el,h)=>{
    const r=el.getBoundingClientRect(),css=getComputedStyle(el),head=getComputedStyle(el.querySelector(h));
    return {x:r.x,width:r.width,bottom:r.bottom,radius:css.borderRadius,background:css.backgroundColor,title:head.fontSize};
   },heading);
   const match=await sheetStyle('#sessionPanel','.aux-head strong');
   await page.evaluate(()=>{window.__layout.hideAux();window.__layout.openPanel();});
   const research=await sheetStyle('#sidebar','.sidebar-heading strong');
   await page.evaluate(()=>window.__layout.closePanel());
   await page.locator('#warChip').click();
   const nations=await sheetStyle('#warPanel','.war-panel-title strong');
   for(const [kind,sheet] of [['Research',research],['Nations',nations]]){
    assert.equal(sheet.width,match.width,label+' '+kind+' shares sheet width');
    assert.equal(sheet.radius,match.radius,label+' '+kind+' shares corner radius');
    assert.equal(sheet.background,match.background,label+' '+kind+' shares surface');
    assert.equal(sheet.title,match.title,label+' '+kind+' shares title type');
    assert(sheet.x>=0&&sheet.bottom<=viewport.height+1,label+' '+kind+' fits viewport');
   }
   assert.equal(await page.locator('#nationsBackdrop').isVisible(),true,label+' Nations has a modal backdrop');
   assert.notEqual(await page.locator('#nationsBackdrop').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(0, 0, 0, 0)',label+' Nations backdrop actually dims the map');
   assert.equal(await page.locator('#buildDock').isVisible(),false,label+' Nations hides placement tools');
   await page.locator('#warPanelClose').click();
   assert.equal(await page.locator('#nationsBackdrop').isVisible(),false,label+' closing Nations removes its backdrop');
   await page.evaluate(()=>window.__layout.showAux('sessionPanel'));
   const close=page.locator('#closeSession');await close.click();
   await page.evaluate(()=>window.__layout.goHome());
   assert(await page.locator('#lobby').isVisible(),label+' home visible');
   console.log('PASS '+label);await page.close();
  }}finally{await browser.close();}
 }
})().catch(error=>{console.error('::error::'+String(error.stack||error).replace(/\n/g,'%0A'));process.exitCode=1;}).finally(()=>server.close());
