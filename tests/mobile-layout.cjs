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
  if(name==='/game.js')body=body.toString().replace(/\}\)\(\);\s*$/,"window.__layout={focusCandidate:()=>{const p=mine().capital,r=canvas.getBoundingClientRect();for(let dy=-12;dy<=12;dy++)for(let dx=-12;dx<=12;dx++){const x=p.x+dx,y=p.y+dy;if(E.inside(x,y)&&x>10&&x<E.W-10&&y>10&&y<E.H-10&&E.tile(state,x,y)&&E.owner(state,x,y)===0){zoom=.55;camX=canvas.clientWidth/2-(x+.5)*TILE*zoom;camY=canvas.clientHeight/2-(y+.5)*TILE*zoom;clampCamera();draw();return {x:r.left+camX+(x+.5)*TILE*zoom,y:r.top+camY+(y+.5)*TILE*zoom};}}return null;},beginAttackPlanner,brushAt,refreshPaintGuide,syncPaintEligibility,resetAttackPlanner,getPlanner:()=>attackPlanner,buildingCells,drawHarvestSites,buildingLevelColor,roofSprite,roofBase,buildingSpritePath,buildingTileBounds,ownedLevelSprites,farmLevelSprites,drawMapBuilding,repaintWorld,simulatePacket:()=>{movementStart=performance.now();},contextual,nationLabelAnchors,getArmyDisplay,drawArmyDisplay,render,draw,selectMapTile:(x,y)=>{const r=canvas.getBoundingClientRect();selectMap(r.left+camX+(x+.5)*TILE*zoom,r.top+camY+(y+.5)*TILE*zoom);},chooseSpawn,getState:()=>state,createDemo,setBuildingMode,warnHud,toast,openPanel,closePanel,showAux,hideAux,goHome,setRoom:()=>{goHome();state=E.lobby(5);myId=E.addPlayer(state,'A very long player');E.addPlayer(state,'Second player');host=true;render();}};})();");
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
   const entryFlat=await page.evaluate(()=>{
    const read=id=>{const el=document.querySelector(id),s=getComputedStyle(el),r=el.getBoundingClientRect();return {radius:s.borderRadius,x:r.x,right:r.right};};
    return {primary:read('#demoButton'),friends:read('#hostButton'),name:read('#nickname'),code:read('#roomCode')};
   });
   assert(Object.values(entryFlat).every(v=>v.radius==='0px'),label+' lobby controls share flat HUD corners');
   assert(Math.abs(entryFlat.primary.x-entryFlat.friends.x)<1&&Math.abs(entryFlat.primary.right-entryFlat.friends.right)<1,label+' lobby buttons align');
   assert(Math.abs(entryFlat.name.x-entryFlat.code.x)<1,label+' lobby input columns align');
   assert.equal(await page.locator('#playerPreferences').count(),0,label+' match settings are not duplicated in the mode selector');
   const lobbyIcons=await page.evaluate(()=>{
    const solo=document.querySelector('#demoButton .choice-symbol svg');
    const path=solo.querySelector('path'),soloSvgStyle=getComputedStyle(solo);
    const btn=document.querySelector('#demoButton'),btnBg=getComputedStyle(btn).backgroundColor;
    const resume=document.querySelector('#resumeButton');
    const hasResumePlay=resume.querySelector('use[href$="#play"]')!==null;
    const hasResumeArrow=resume.querySelector('.choice-arrow use[href$="#arrow-right"]')!==null;
    return {soloPath:!!path,soloArea:path?.getBBox().width*path?.getBBox().height,soloColor:soloSvgStyle.color,
      soloFill:soloSvgStyle.fill,btnBg,hasResumePlay,hasResumeArrow,
      soloHeight:btn.getBoundingClientRect().height,friendsHeight:document.getElementById('hostButton').getBoundingClientRect().height};
   });
   assert(lobbyIcons.soloPath&&lobbyIcons.soloArea>3000,label+' solo controller icon is visible geometry, not an absent external reference');
   assert(lobbyIcons.hasResumePlay&&lobbyIcons.hasResumeArrow,label+' resume uses matched action icon family');
   assert.equal(lobbyIcons.soloHeight,lobbyIcons.friendsHeight,label+' Solo and Create room share button height');
   assert.equal(await page.locator('#soloBots').isVisible(),false,label+' opponent count is chosen only in match setup');
   assert(await page.locator('#joinDetails').isVisible(),label+' explicit join-by-code entry stays visible');
   assert.equal(await page.locator('#resumeButton').isVisible(),false,label+' no resume without a solo save');
   await page.click('#demoButton');
   assert(await page.locator('#waiting').isVisible(),label+' solo now enters common preparation lobby');
   assert.equal(await page.locator('#roomInvite').isVisible(),false,label+' local solo never offers a cloud room code');
   assert(await page.locator('#soloBots').isVisible(),label+' the single solo opponent selector is editable in preparation');
   assert.equal(await page.locator('#soloBots').count(),1,label+' only one opponent selector exists');
   assert.equal(await page.locator('#roomMembersCount').textContent(),'1 player',label+' singular player count is correct');
   assert.equal(await page.locator('#botCount').isVisible(),false,label+' multiplayer settings stay out of local solo');
   const soloPick=await page.evaluate(()=>{const s=window.__layout.getState(),E=window.BKEngine;for(let y=10;y<E.H-10;y++)for(let x=10;x<E.W-10;x++)if(!E.spawnError(s,1,x,y))return {x,y};});
   const soloMap=page.locator('#spawnMap');await soloMap.scrollIntoViewIfNeeded();
   const soloRect=await soloMap.boundingBox();
   await page.mouse.click(soloRect.x+(soloPick.x+.5)/160*soloRect.width,soloRect.y+(soloPick.y+.5)/104*soloRect.height);
   assert.deepEqual(await page.evaluate(()=>window.__layout.getState().players[0].spawnPoint),soloPick,label+' local solo saves chosen spawn before starting');
   await page.click('#startButton');
   assert(await page.locator('#game').isVisible(),label+' solo starts only after selecting Start');
   assert.deepEqual(await page.evaluate(()=>window.__layout.getState().players[0].capital),soloPick,label+' solo capital appears at exact chosen location');
   await page.evaluate(()=>window.__layout.goHome());
   assert(await page.locator('#resumeButton').isVisible(),label+' saved solo gets a prominent continue action');
   const savedBeforeSetup=await page.evaluate(()=>localStorage.getItem('bk-v14-save'));
   await page.click('#demoButton');
   assert(await page.locator('#waiting').isVisible(),label+' New solo enters preparation without an early redundant confirmation');
   assert.equal(await page.evaluate(()=>localStorage.getItem('bk-v14-save')),savedBeforeSetup,label+' entering new setup does not replace the prior save');
   assert((await page.locator('#waitingHint').textContent()).includes('replaces your saved solo progress'),label+' destructive action is explained at actual Start');
   await page.click('#leaveRoom');
   assert(await page.locator('#resumeButton').isVisible(),label+' leaving setup preserves resume option');
   assert.equal(await page.evaluate(()=>localStorage.getItem('bk-v14-save')),savedBeforeSetup,label+' leaving setup does not replace the prior save');
   const nonPrimaryColor=await page.locator('#demoButton .choice-symbol svg').evaluate(el=>getComputedStyle(el).color);
   assert.equal(nonPrimaryColor,'rgb(237, 242, 248)',label+' New solo icon is readable next to primary Continue');
   await page.click('#resumeButton');
   assert(await page.locator('#game').isVisible(),label+' Continue bypasses setup and resumes prior match');
   await page.evaluate(()=>window.__layout.goHome());
   await page.click('#demoButton');
   assert(await page.locator('#waiting').isVisible(),label+' a new solo opens the same preparation screen');
   await page.selectOption('#soloBots','2');
   assert.equal(await page.locator('#roomSettingsSummary').textContent(),'2 opponents',label+' the sole selector updates the setup summary');
   await page.click('#startButton');
   assert(await page.locator('#game').isVisible(),label+' starting from preparation launches the chosen new solo');
   assert.equal(await page.evaluate(()=>window.__layout.getState().players.filter(p=>p.bot).length),2,label+' solo opponent setting reaches local engine');
   assert.notEqual(await page.evaluate(()=>localStorage.getItem('bk-v14-save')),savedBeforeSetup,label+' save changes only after explicit Start');
   await page.evaluate(()=>window.__layout.goHome());
   await page.evaluate(()=>window.__layout.setRoom());
   const roomFlat=await page.evaluate(()=>{
    const read=id=>{const el=document.querySelector(id),s=getComputedStyle(el),r=el.getBoundingClientRect();return {radius:s.borderRadius,border:s.borderLeftWidth,x:r.x,right:r.right};};
    return {card:read('#waiting .waiting-card'),invite:read('#waiting .room-invite'),spawn:read('#waiting .spawn-picker'),rules:read('#waiting .room-rules')};
   });
   assert(Object.values(roomFlat).every(v=>v.radius==='0px'&&v.border==='0px'),label+' Room has no nested rounded cards');
   assert(Math.abs(roomFlat.invite.x-roomFlat.spawn.x)<1&&Math.abs(roomFlat.invite.right-roomFlat.spawn.right)<1&&Math.abs(roomFlat.rules.x-roomFlat.spawn.x)<1,label+' Room sections share edges');
   assert(await page.locator('#waiting').isVisible(),label+' room is visible');
   assert(await page.locator('#startButton').isVisible(),label+' room Start visible');
   assert(await page.locator('#roomActionBar').isVisible(),label+' unified room action is present');
   if(viewport.width<viewport.height){
    const action=await page.locator('#startButton').boundingBox();
    assert(action.y>=-1&&action.y+action.height<=viewport.height+1,label+' host Start fits initial portrait viewport '+JSON.stringify(action));
   }
   const roomIcons=await page.evaluate(()=>{
    const ids=['startButton','leaveRoom'];
    return ids.map(id=>{const el=document.getElementById(id),s=getComputedStyle(el),r=el.getBoundingClientRect();
      return {id,radius:s.borderRadius,fill:el.querySelector('use')?.getAttribute('href'),height:r.height};
    });
   });
   assert(roomIcons.every(v=>v.radius==='0px'&&v.height>=48),label+' room buttons match flat action system');
   assert(roomIcons.some(v=>v.id==='leaveRoom'&&v.fill?.endsWith('#arrow-left')),label+' Main menu has coherent back-direction icon');
   assert(roomIcons.some(v=>v.id==='startButton'&&v.fill?.endsWith('#arrow-right')),label+' Start match uses standardized icon instead of text arrow');

   const spawn=page.locator('#spawnMap'),bounds=await spawn.boundingBox();
   assert(bounds.width>180&&bounds.height>100,label+' spawn map visible with usable size');
   const chosen=await page.evaluate(()=>{const s=window.__layout.getState(),E=window.BKEngine;for(let y=10;y<E.H-10;y++)for(let x=10;x<E.W-10;x++)if(!E.spawnError(s,1,x,y))return {x,y};});
   await spawn.scrollIntoViewIfNeeded();const rect=await spawn.boundingBox();
   await page.mouse.click(rect.x+(chosen.x+.5)/160*rect.width,rect.y+(chosen.y+.5)/104*rect.height);
   assert.deepEqual(await page.evaluate(()=>window.__layout.getState().players[0].spawnPoint),chosen,label+' map click chooses exact point');
   await page.locator('#spawnAuto').click();assert.equal(await page.evaluate(()=>window.__layout.getState().players[0].spawnPoint),null,label+' automatic resets selection');
   await page.evaluate(()=>window.__layout.createDemo(false));
   await page.click('#startButton');
   const planStyle=await page.evaluate(()=>{
    const L=window.__layout;L.beginAttackPlanner();
    const buttons=[...document.querySelectorAll('#planGuide .plan-guide-actions button')];
    const rows=buttons.map(b=>{const r=b.getBoundingClientRect(),s=getComputedStyle(b);return {x:r.x,right:r.right,top:r.top,bottom:r.bottom,background:s.backgroundColor,touch:s.touchAction};});
    const pageTouch=getComputedStyle(document.body).touchAction,mapTouch=getComputedStyle(document.getElementById('mapCanvas')).touchAction;
    L.resetAttackPlanner();return {rows,pageTouch,mapTouch};
   });
   assert.equal(planStyle.pageTouch,'manipulation',label+' double-tap browser zoom disabled');
   assert.equal(planStyle.mapTouch,'none',label+' map retains custom touch gestures');
   assert(planStyle.rows.every(r=>r.touch==='manipulation'),label+' repeated action taps cannot trigger Safari zoom');
   assert.equal(new Set(planStyle.rows.map(r=>r.background)).size,2,label+' plan Clear/Save have distinct backgrounds');
   assert(planStyle.rows.every(r=>Math.abs(r.top-planStyle.rows[0].top)<1&&Math.abs(r.bottom-planStyle.rows[0].bottom)<1),label+' plan buttons share same height and y position');
   assert(planStyle.rows.every((r,i,a)=>i===0||r.x>=a[i-1].right),label+' plan buttons do not overlap');
   const nationFallback=await page.evaluate(()=>{
    const E=window.BKEngine,L=window.__layout,s=L.getState();
    const p=s.players.find(p=>p.land>1&&!p.eliminated);if(!p)throw Error('missing living kingdom');
    const cell=s.owners.findIndex(id=>id===p.id),nextOwners=s.owners.slice();nextOwners[cell]=0;
    const snapshot={...s,owners:nextOwners,players:s.players.map(q=>q.id===p.id?{...q,capital:{x:cell%E.W,y:(cell/E.W)|0}}:q),
     buildings:s.buildings.filter(b=>b.owner!==p.id||b.kind!=='capital'),territoryRevision:(s.territoryRevision||0)+1000};
    const marker=L.nationLabelAnchors(snapshot).find(v=>v.id===p.id);
    return {exists:!!marker,name:marker?.name,expected:p.name,cell:marker?.cell,owned:marker?nextOwners[marker.cell]===p.id:false,notLostCell:marker?.cell!==cell};
   });
   assert(nationFallback.exists&&nationFallback.owned&&nationFallback.notLostCell,label+' label remains over owned land after capital capture');
   assert.equal(nationFallback.name,nationFallback.expected,label+' capital loss preserves exact nation name');

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
   const paintRules=await page.evaluate(()=>{
    const L=window.__layout,s=L.getState(),id=s.players.find(p=>!p.bot).id;
    const saved=s.attackPlans,rev=s.territoryRevision;
    const owned=s.owners.findIndex((v,i)=>v===id&&s.tiles[i]);
    const foreign=s.tiles.flatMap((v,i)=>v&&s.owners[i]!==id?[i]:[]),blocked=foreign[0],free=foreign[1],old=s.owners[free];
    s.attackPlans=[{id:'existing-test',owner:id,zoneCells:[blocked],targets:[0]}];
    L.beginAttackPlanner();const plan=L.getPlanner();plan.brushRadius=0;plan.strokeLimit=10;
    const paint=i=>L.brushAt({x:i%160,y:(i/160)|0});
    paint(owned);paint(blocked);const excluded=plan.cells.size===0;
    paint(free);paint(free);const counted=plan.cells.size;
    s.owners[free]=id;s.territoryRevision++;L.syncPaintEligibility(plan);const reclaimed=plan.cells.size;
    L.resetAttackPlanner();s.attackPlans=saved;s.owners[free]=old;s.territoryRevision=rev+2;
    return {excluded,counted,reclaimed};
   });
   assert(paintRules.excluded,label+' own and already planned cells never consume paint capacity');
   assert.equal(paintRules.counted,1,label+' repeated strokes count a cell once');
   assert.equal(paintRules.reclaimed,0,label+' newly captured cells free painting capacity immediately');
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
   const noMapLabels=await page.evaluate(()=>{
    const L=window.__layout,s=L.getState(),p=s.players.find(p=>!p.bot),b=s.buildings.find(b=>b.owner===p.id),saved=p.workers,c=document.getElementById('mapCanvas').getContext('2d');
    const text=c.fillText,stroke=c.strokeRect;let labels=0,markers=0;
    p.workers=[{x:b.x,y:b.y,tx:b.x,ty:b.y,resource:'food',progress:3,count:6}];
    c.fillText=()=>labels++;c.strokeRect=()=>markers++;
    try{L.drawHarvestSites(innerWidth,innerHeight);}finally{c.fillText=text;c.strokeRect=stroke;p.workers=saved;}
    return {labels,markers};
   });
   assert.equal(noMapLabels.labels,0,label+' production never covers map cells with labels');
   assert.equal(noMapLabels.markers,0,label+' production does not cover a building cell');
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
   // Capital has become an ordinary City; current upgrade details use the
   // flat map-style level track rather than the old framed effect widget.
   await page.evaluate(()=>{
    const L=window.__layout,s=L.getState(),p=s.players.find(p=>!p.bot);
    L.contextual(s.buildings.find(b=>b.kind==='city'&&b.owner===p.id));
   });
   const buildingDetails=await page.locator('#contextBody').textContent();
   assert(buildingDetails.includes('Nearby garrison'),label+' owned city exposes nearby garrison');
   assert(buildingDetails.includes('BUILDER CREWS'),label+' upgraded building panel shows real builder crew status');
   assert(buildingDetails.includes('Local builders:')&&buildingDetails.includes('no resource or army bonus'),label+' city explains local builders and its separated role');
   assert(!buildingDetails.includes('food and gold')&&!buildingDetails.includes('recruitment/s'),label+' city no longer advertises removed economic or military bonuses');
   const contextFlat=await page.evaluate(()=>{
    const card=document.getElementById('contextCard'),
     track=document.querySelector('#contextBody .context-level-track'),
     costs=[...document.querySelectorAll('#contextBody .cost-unit')].map(x=>{const z=getComputedStyle(x);return {radius:z.borderRadius,fill:z.backgroundColor}});
    return {radius:getComputedStyle(card).borderRadius,steps:track?.children.length,
      trackRadius:track?getComputedStyle(track).borderRadius:null,costs};
   });
   assert.equal(contextFlat.radius,'0px',label+' building details share the square map HUD');
   assert.equal(contextFlat.steps,3,label+' building upgrade has a three-tier progress track');
   assert(contextFlat.costs.every(c=>c.radius==='0px'&&c.fill==='rgba(0, 0, 0, 0)'),label+' costs have no pills');
   await page.evaluate(()=>window.__layout.hideAux());

   await page.locator('#planToolFocus').click();
   assert(await page.locator('#armyFocusGuide').isVisible(),label+' focus has a bottom panel');
   assert.equal(await page.locator('#buildDock').evaluate(e=>getComputedStyle(e).visibility),'hidden',label+' focus never overlaps construction');
   assert.equal(await page.locator('#armyFocusGuide button').count(),1,label+' focus mode button itself toggles off; bottom only clears focus');
   const focusBounds=await page.locator('#armyFocusGuide').evaluate(e=>{const r=e.getBoundingClientRect();return [...e.querySelectorAll('button,span,strong')].every(c=>{const b=c.getBoundingClientRect();return b.left>=r.left&&b.right<=r.right+1&&b.bottom<=r.bottom+1;});});
   assert(focusBounds,label+' focus content fits bottom surface');
   await page.screenshot({path:'/tmp/bk-v102-focus-'+name+'-'+viewport.width+'.png'});
   if(viewport.height>480){const point=await page.evaluate(()=>window.__layout.focusCandidate());assert(point,label+' invalid neutral point available');await page.mouse.click(point.x,point.y);assert.equal(await page.locator('#armyFocusGuide').getAttribute('data-valid'),'true',label+' invalid focus leaves prior state unchanged');assert.equal(await page.evaluate(()=>window.__layout.getState().players[0].armyFocus??null),null,label+' rejected focus never becomes an army order');assert((await page.locator('#gameToast').textContent()).includes('Focus must be on your land'),label+' invalid focus gives a useful error');await page.screenshot({path:'/tmp/bk-v102-invalid-focus-'+name+'-'+viewport.width+'.png'});await page.locator('#clearArmyFocus').click();}
   // Switching directly between tools must never leave the old tool highlighted.
   const focusSurface=await page.locator('#armyFocusGuide').evaluate(e=>getComputedStyle(e).backgroundColor);
   const focusRect=await page.locator('#armyFocusGuide').boundingBox();
   const focusButton=await page.locator('#clearArmyFocus').boundingBox();
   await page.locator('#planToolErase').click();
   assert.equal(await page.locator('#planToolFocus').getAttribute('aria-pressed'),'false',label+' eraser releases focus button');
   assert.equal(await page.locator('#planToolErase').getAttribute('aria-pressed'),'true',label+' eraser is the only active paint tool');
   assert(await page.locator('#armyFocusGuide').evaluate(e=>e.classList.contains('hidden')),label+' eraser closes focus panel');
   assert.equal(await page.locator('#planEraseHint').evaluate(e=>getComputedStyle(e).backgroundColor),focusSurface,label+' focus and eraser share the same panel surface');
   const eraserRect=await page.locator('#planEraseHint').boundingBox();
   const eraserButton=await page.locator('#eraseReset').boundingBox();
   assert(Math.abs(eraserRect.y-focusRect.y)<1&&Math.abs(eraserRect.height-focusRect.height)<1,label+' focus/eraser same exact bounding box');
   assert(Math.abs(eraserButton.height-focusButton.height)<1,label+' focus/eraser action sizes match');
   await page.locator('#planToolFocus').click();
   assert.equal(await page.locator('#planToolErase').getAttribute('aria-pressed'),'false',label+' focus releases eraser button');
   assert.equal(await page.locator('#planToolFocus').getAttribute('aria-pressed'),'true',label+' focus is the only selected tool');
   await page.locator('#planToolFocus').click();
   assert.equal(await page.locator('#buildDock').evaluate(e=>getComputedStyle(e).visibility),'visible',label+' exiting focus restores construction');
   const savedFocusCheck=await page.evaluate(()=>{
    const L=window.__layout,s=L.getState(),E=window.BKEngine,p=s.players.find(v=>!v.bot),f=p.capital;
    const cmd=E.action(s,p.id,{type:'armyFocus',x:f.x,y:f.y});
    const context=document.getElementById('mapCanvas').getContext('2d'),arc=context.arc;
    let visible=false;
    try{
     context.arc=function(x,y,r,...args){if(Math.abs(x-(f.x+.5)*14)<.01&&Math.abs(y-(f.y+.5)*14)<.01&&r>2)visible=true;return arc.call(this,x,y,r,...args);};
     L.draw();
    }finally{context.arc=arc;}
    const kept=!!p.armyFocus&&p.armyFocus.x===f.x&&p.armyFocus.y===f.y;
    E.action(s,p.id,{type:'armyFocus',clear:true});
    return {ok:cmd.ok,kept,visible};
   });
   assert(savedFocusCheck.ok&&savedFocusCheck.kept&&savedFocusCheck.visible,label+' saved focus stays visible on the map after leaving focus mode');
   await page.locator('#planToolPaint').click();
   const clearFixture=await page.evaluate(()=>{
    const L=window.__layout,s=L.getState(),p=s.players.find(v=>!v.bot);
    const i=s.tiles.findIndex((t,i)=>t&&s.owners[i]!==p.id&&!p.allies.includes(s.owners[i]));
    if(i>=0){L.getPlanner().cells.add(i);L.refreshPaintGuide();}
    return {index:i,count:L.getPlanner().cells.size,enabled:!document.getElementById('planPaintClear').disabled};
   });
   if(clearFixture.index>=0){
    assert(clearFixture.count>0&&clearFixture.enabled,label+' planning Clear enables for newly painted cells');
    await page.locator('#planPaintClear').click();
    assert.equal(await page.evaluate(()=>window.__layout.getPlanner().cells.size),0,label+' Clear immediately discards every painted cell');
   }
   const symmetricToolGutters=await page.evaluate(()=>{
    const map=document.getElementById('mapView').getBoundingClientRect();
    const left=document.getElementById('planControls').getBoundingClientRect(),right=document.getElementById('planToolSwitch').getBoundingClientRect();
    return {left:left.left-map.left,right:map.right-right.right};
   });
   assert(Math.abs(symmetricToolGutters.left-symmetricToolGutters.right)<=2,label+' brush rail and right-side tools use symmetric horizontal gutters '+JSON.stringify(symmetricToolGutters));
   await page.locator('#planToolErase').click();
   assert(await page.locator('#planGuide').evaluate(e=>e.classList.contains('hidden')),label+' brush to eraser closes planning panel');
   assert.equal(await page.evaluate(()=>window.__layout.getPlanner().mode),'erase',label+' eraser is global');
   const eraseHud=await page.evaluate(()=>{
    const h=document.getElementById('planEraseHint'),m=document.getElementById('mapView'),r=h.getBoundingClientRect(),mr=m.getBoundingClientRect(),s=getComputedStyle(h);
    return {visible:!h.classList.contains('hidden'),radius:s.borderRadius,background:s.backgroundColor,
      right:mr.right-r.right,left:r.left-mr.left,bottom:mr.bottom-r.bottom,display:s.display,
      title:h.querySelector('strong')?.textContent,detail:h.querySelector('span')?.textContent};
   });
   assert(eraseHud.visible&&eraseHud.display==='grid',label+' eraser appears as a permanent HUD status, not a floating toast');
   assert.equal(eraseHud.radius,'0px',label+' eraser HUD has square panel geometry');
   assert(Math.abs(eraseHud.left)<1&&Math.abs(eraseHud.right)<1&&Math.abs(eraseHud.bottom)<1,label+' eraser strip fills map width at bottom');
   assert.equal(await page.locator('#planEraseHint button').count(),2,label+' eraser exposes only Reset and Erase selected');
   assert.equal(await page.locator('#buildDock').evaluate(e=>getComputedStyle(e).visibility),'hidden',label+' eraser never overlaps construction');
   assert.equal(eraseHud.title,'ERASER',label+' eraser has distinct mode title');
   await page.locator('#planToolErase').click();
   const bottomBefore=await page.locator('#buildDock').boundingBox();
   const toolBefore=await page.locator('#planToolPaint').boundingBox();
   await page.locator('#planToolPaint').click();
   const toolAfter=await page.locator('#planToolPaint').boundingBox();
   const bottomAfter=await page.locator('#planGuide').boundingBox();
   if(viewport.width<viewport.height){
    assert(bottomAfter.height>=bottomBefore.height,label+' planning surface preserves larger action controls');
    assert(bottomAfter.y<=bottomBefore.y,label+' planning surface expands upward when needed');
   }else{
    assert.equal(bottomAfter.height,bottomBefore.height,label+' landscape surface retains previous geometry');
    assert.equal(bottomAfter.y,bottomBefore.y,label+' landscape panel stays stable');
   }
   assert(Math.abs(bottomAfter.y-focusRect.y)<1&&Math.abs(bottomAfter.height-focusRect.height)<1,label+' attack/focus/eraser share exactly one panel geometry');
   assert.equal(await page.locator('#planGuide').evaluate(e=>getComputedStyle(e).display),'grid',label+' attack panel uses same CSS grid as focus/eraser');
   const attackButton=await page.locator('#planPaintClear').boundingBox();
   assert(Math.abs(attackButton.height-focusButton.height)<1,label+' all editing action rows share one height');
   const controls=await page.evaluate(()=>{const map=document.getElementById('mapView').getBoundingClientRect(),bottom=document.getElementById('planGuide').getBoundingClientRect(),tools=document.getElementById('planToolSwitch').getBoundingClientRect(),brush=document.getElementById('planControls').getBoundingClientRect();return {expected:map.y+(64+map.height-bottom.height)/2,tools:tools.y+tools.height/2,brush:brush.y+brush.height/2};});
   assert(Math.abs(controls.tools-controls.expected)<1&&Math.abs(controls.brush-controls.expected)<1,label+' both side controls are centered in usable map space');

   assert(Math.abs(toolBefore.x-toolAfter.x)<1&&Math.abs(toolBefore.y-toolAfter.y)<1,label+' selecting attack keeps side tool position stable');
   assert.equal(await page.locator('#planTroopsControl').isVisible(),false,label+' no troop percentage slider');
   assert.equal(await page.locator('#planBrushSize').isVisible(),true,label+' brush sizing remains available');
   assert.equal(await page.locator('#planPaintClear').evaluate(el=>getComputedStyle(el).borderTopWidth),'0px',label+' plan controls have no frames');
   await page.evaluate(()=>{window.__layout.showAux('armiesPanel');window.__layout.hideAux();});
   await page.evaluate(()=>window.__layout.setBuildingMode('lumber'));
   assert.equal(await page.locator('#planGuide').isVisible(),false,label+' resource priority does not open paint');
   await page.evaluate(()=>window.__layout.render());
   assert.equal(await page.evaluate(()=>window.__layout.getState().players.find(p=>!p.bot).workPriority),'wood',label+' extraction priority selected');
   const levelColors=await page.evaluate(()=>[1,2,3].map(level=>window.__layout.buildingLevelColor({level})));
   assert.equal(new Set(levelColors).size,3,label+' all three gameplay levels have distinct colors');
   await page.evaluate(()=>{window.__resourceEvents=[];for(const type of ['pointerdown','pointerup','click','dblclick'])document.getElementById('resourceSummary').addEventListener(type,e=>window.__resourceEvents.push({type,resource:e.target.closest('[data-resource]')?.dataset.resource,detail:e.detail,pointer:e.pointerType}),true);});
   await page.locator('#resourceSummary [data-resource="gold"]').click();
   assert.equal(await page.evaluate(()=>window.__layout.getState().players.find(p=>!p.bot).workPriority),'gold',label+' resource HUD selects production priority');
   assert.equal(await page.locator('#resourceSummary [data-resource="gold"]').getAttribute('aria-pressed'),'true',label+' priority is visibly selected');
   await page.locator('#resourceSummary [data-resource="gold"]').click();
   assert.equal(await page.evaluate(()=>window.__layout.getState().players.find(p=>!p.bot).workPriority),'balanced',label+' second resource tap restores balance; events='+JSON.stringify(await page.evaluate(()=>window.__resourceEvents)));
   await page.locator('#resourceSummary [data-resource="food"]').press('Enter');
   assert.equal(await page.evaluate(()=>window.__layout.getState().players.find(p=>!p.bot).workPriority),'food',label+' resource priority supports keyboard');
   const flatMapTools=await page.evaluate(()=>{
    const ids=['planToolPaint','planToolErase','minimapWrap','menuToggle','warChip'];
    return ids.map(id=>{const s=getComputedStyle(document.getElementById(id));return {id,radius:s.borderRadius,border:s.borderLeftWidth};});
   });
   assert(flatMapTools.every(v=>v.radius==='0px'&&v.border==='0px'),label+' minimap and map tools share flat geometry '+JSON.stringify(flatMapTools));
   const navigation=await page.evaluate(()=>{const m=document.getElementById('minimapToggle').getBoundingClientRect(),n=document.getElementById('warChip').getBoundingClientRect(),menu=document.getElementById('menuToggle').getBoundingClientRect(),map=document.getElementById('mapView').getBoundingClientRect();return {sameParent:document.getElementById('warChip').parentElement.id==='mapNavigation',separate:n.left>=m.right,menuTop:menu.top,mapTop:map.top};});
   assert(navigation.sameParent&&navigation.separate,label+' map and Nations sit together');
   assert.equal(navigation.menuTop,navigation.mapTop+10,label+' menu occupies former Nations corner');
   const minimapGeometry=await page.evaluate(()=>{
    const rect=id=>document.getElementById(id).getBoundingClientRect();
    const toggle=document.getElementById('minimapToggle'),wrap=document.getElementById('minimapWrap');
    const wasOpen=!wrap.classList.contains('minimized');
    if(wasOpen)toggle.click();
    const before=rect('warChip'),menu=rect('menuToggle'),tools=rect('planToolSwitch');
    toggle.click();
    const after=rect('warChip'),map=rect('minimap'),button=rect('minimapToggle'),wrapRect=rect('minimapWrap');
    const bg=getComputedStyle(wrap).backgroundColor;
    toggle.click();
    if(wasOpen)toggle.click();
    return {shift:Math.abs(before.x-after.x)+Math.abs(before.y-after.y),mapAbove:map.bottom<=button.top+1,
     wrapperHeight:wrapRect.height,background:bg,rightGap:Math.abs(menu.right-tools.right),warRight:before.right};
   });
   assert(minimapGeometry.shift<1,label+' opening minimap does not shift Military shortcut');
   assert(minimapGeometry.mapAbove,label+' expanded minimap opens above map shortcut, never over Military');
   assert(minimapGeometry.wrapperHeight<=49,label+' expanded minimap has no oversized blank header');
   assert.equal(minimapGeometry.background,'rgba(0, 0, 0, 0)',label+' expanded minimap has no gray filler');
   assert(minimapGeometry.rightGap<1,label+' right-side tools and menu have same right inset');

   const typeColors=await page.evaluate(()=>['city','barracks','fort'].map(kind=>window.__layout.buildingLevelColor({kind,level:1})));
   const tiers=await page.evaluate(()=>['city','barracks','fort'].map(kind=>new Set([1,2,3].map(level=>window.__layout.buildingLevelColor({kind,level}))).size));
   assert(tiers.every(n=>n===3),label+' three distinct owner/upgrade color shades');
   assert.equal(new Set(typeColors).size,1,label+' building type never changes the nation/level color');
   const ownedArt=await page.evaluate(async()=>{
    const L=window.__layout,s=L.getState(),me=s.players.find(p=>!p.bot),enemy=s.players.find(p=>p.id!==me.id);
    await Promise.all(['city','barracks','fort'].flatMap(kind=>[1,2,3].map(level=>new Promise(resolve=>{
     const img=L.ownedLevelSprites[kind]?.[level];if(img?.complete&&img.naturalWidth)return resolve();
     img?.addEventListener('load',resolve,{once:true});img?.addEventListener('error',resolve,{once:true});
     if(!img)resolve();
    }))));
    let variants=0,wrongSize=0,wrongPath=0,identical=0,colored=0,neutralModified=0,countryDifferent=0;
    const pix=im=>{if(!im)return null;const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;canvas.getContext('2d').drawImage(im,0,0);return canvas.getContext('2d').getImageData(0,0,32,32).data;};
    const diff=(a,b)=>a&&b&&a.some((v,i)=>v!==b[i]);
    for(const kind of ['city','barracks','fort']){
     const images=[1,2,3].map(level=>L.ownedLevelSprites[kind][level]),originals=images.map(pix);
     if(!diff(originals[0],originals[1])||!diff(originals[1],originals[2]))identical++;
     for(const level of [1,2,3]){
      const img=images[level-1],url=L.buildingSpritePath(kind,level);
      if(img?.naturalWidth!==32||img?.naturalHeight!==32)wrongSize++;
      if(!url.split('?')[0].endsWith('assets/player/'+(kind==='city'?'owned':'owned-v116')+'/'+kind+'/level-'+level+'.png'))wrongPath++;
      if(L.roofSprite(kind,me.id,level))variants++;
      const orig=originals[level-1],tinted=pix(L.roofSprite(kind,me.id,level));
      const mask=new Set(L.roofBase(kind,level)?.mask||[]);
      for(let i=0;i<orig.length;i+=4)if([0,1,2,3].some(j=>orig[i+j]!==tinted[i+j])){
       if(!mask.has(i)||orig[i+3]!==tinted[i+3])neutralModified++;
       else colored++;
      }
     }
     if(enemy){
      const a=pix(L.roofSprite(kind,me.id,1)),b=pix(L.roofSprite(kind,enemy.id,1));
      if(diff(a,b))countryDifferent++;
     }
    }
    const engine=window.BKEngine,lobby=engine.lobby(8127);
    engine.addPlayer(lobby,'Alpha');engine.addPlayer(lobby,'Beta');
    const started=engine.start(lobby,0);
    const spawnIsCity=started.ok&&lobby.players.every(p=>lobby.buildings.some(b=>b.kind==='city'&&b.owner===p.id&&b.x===p.capital.x&&b.y===p.capital.y));
    const noCapitals=lobby.buildings.every(b=>b.kind!=='capital');
    const p=lobby.players[0],b=lobby.buildings.find(b=>b.owner===p.id&&b.kind==='city');
    b.level=3;
    const upgrade=engine.action(lobby,p.id,{type:'upgrade',id:b.id});
    b.level=4;engine.tick(lobby);const migrated=b.level===3;
    return {variants,wrongSize,wrongPath,identical,colored,neutralModified,countryDifferent,
     enemy:!!enemy,spawnIsCity,noCapitals,maxStopped:!upgrade.ok&&upgrade.error==='Maximum level reached.',migrated,
     noCapitalSource:!L.buildingSpritePath('city',1).includes('capital.png')};
   });
   assert.equal(ownedArt.variants,9,label+' all nine original owner sprites render at their three levels');
   assert.equal(ownedArt.wrongSize,0,label+' all new sprites are native 32x32');
   assert.equal(ownedArt.wrongPath,0,label+' all city, barracks and fort levels use the owner PNGs');
   assert.equal(ownedArt.identical,0,label+' upgrade levels have distinct pixel silhouettes');
   assert(ownedArt.colored>0&&ownedArt.neutralModified===0,label+' faction color modifies only the precise lime pixels');
   if(ownedArt.enemy)assert.equal(ownedArt.countryDifferent,3,label+' each building changes lime accent by country');
   assert(ownedArt.spawnIsCity&&ownedArt.noCapitals&&ownedArt.noCapitalSource,label+' start uses City not Capital building');
   assert(ownedArt.maxStopped&&ownedArt.migrated,label+' level 4 is blocked and old saves are capped at level 3');
   const farmArt=await page.evaluate(async()=>{
    const L=window.__layout,s=L.getState(),me=s.players.find(p=>!p.bot);
    const paths=[1,2,3,4].map(level=>L.buildingSpritePath('farm',level));
    const loaded=await Promise.all([1,2,3].map(level=>new Promise(resolve=>{
     const image=L.farmLevelSprites[level];
     if(image?.naturalWidth)return resolve(true);
     if(!image)return resolve(false);
     image.addEventListener('load',()=>resolve(true),{once:true});
     image.addEventListener('error',()=>resolve(false),{once:true});
    })));
    const source=[1,2,3].map(level=>L.farmLevelSprites[level]);
    const pixelArray=source.map(img=>{
     const c=document.createElement('canvas');c.width=c.height=32;
     c.getContext('2d').drawImage(img,0,0);
     return c.getContext('2d').getImageData(0,0,32,32).data;
    });
    const diff=(a,b)=>{let count=0;for(let i=0;i<a.length;i+=4)if([0,1,2,3].some(k=>a[i+k]!==b[i+k]))count++;return count;};
    const preview=await fetch('assets/player/drafts/farm/preview.html');
    const html=preview.ok?await preview.text():'';
    return {loaded:loaded.every(Boolean),paths,diff12:diff(pixelArray[0],pixelArray[1]),
      diff23:diff(pixelArray[1],pixelArray[2]),sizes:source.map(img=>[img.naturalWidth,img.naturalHeight]),
      ownerSame:[1,2,3].every(level=>L.roofSprite('farm',me.id,level)===L.farmLevelSprites[level]),
      preview:preview.ok&&html.includes('Farm evolution')&&html.includes('level-3.png')};
   });
   assert(farmArt.loaded&&farmArt.sizes.every(([w,h])=>w===32&&h===32),label+' 3 native top-down farm PNGs load');
   assert(farmArt.paths.slice(0,3).every((p,i)=>p.endsWith('drafts/farm/level-'+(i+1)+'.png')),label+' farm level art uses exact level-specific PNG');
   assert.equal(farmArt.paths[3],farmArt.paths[2],label+' legacy farm level 4 uses last art tier');
   assert(farmArt.diff12>150&&farmArt.diff23>150,label+' farm levels differ visibly, not just minor decoration');
   assert(farmArt.ownerSame,label+' farm crop hue stays green/gold regardless of nation');
   assert(farmArt.preview,label+' farm gallery is directly viewable on site');
   const hudStability=await page.evaluate(()=>{
    const ids=['troopCount','workerCount','landCount','frontCount','resFood','resWood','resStone','resGold'];
    const nodes=ids.map(id=>document.getElementById(id)),old=nodes.map(n=>n.textContent);
    const boxes=()=>nodes.map(n=>{const r=n.getBoundingClientRect();return [r.x,r.y,r.width,r.height];});
    nodes.forEach(n=>n.textContent='1');const short=boxes();nodes.forEach(n=>n.textContent='102.8k');const long=boxes();nodes.forEach((n,i)=>n.textContent=old[i]);
    const resource=document.getElementById('resourceSummary').getBoundingClientRect(),cells=[...document.querySelectorAll('#resourceSummary > [data-resource]')].map(n=>n.getBoundingClientRect());
    return {short,long,flush:cells.every(r=>r.y===resource.y&&r.height===resource.height)&&cells[0].x===resource.x&&Math.abs(cells.at(-1).right-resource.right)<1};
   });
   assert.deepEqual(hudStability.short,hudStability.long,label+' changing numbers never shifts HUD geometry');
   assert(hudStability.flush,label+' resource backgrounds fill their complete grid cells');
   const headingCenters=await page.locator('#resourceSummary > [data-resource]').evaluateAll(cells=>cells.map(el=>{const r=el.getBoundingClientRect(),h=el.querySelector('.resource-heading'),i=h.firstElementChild.getBoundingClientRect(),t=h.lastElementChild.getBoundingClientRect();return Math.abs((i.left+t.right)/2-(r.left+r.right)/2);}));
   assert(headingCenters.every(error=>error<1),label+' resource icon and label groups are centered '+JSON.stringify(headingCenters));

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
   const buttons=await page.locator('#buildDock button').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect(),icon=el.querySelector(':scope > img').getBoundingClientRect(),price=el.querySelector('.dock-cost').getBoundingClientRect();return {width:r.width,height:r.height,artInside:icon.left>=r.left-1&&icon.right<=r.right+1&&icon.top>=r.top-1&&icon.bottom<=r.bottom+1,pricesInside:price.left>=r.left-1&&price.right<=r.right+1&&price.top>=r.top-1&&price.bottom<=r.bottom+1};}));
   assert(buttons.every(b=>Math.abs(b.width-buttons[0].width)<.5&&Math.abs(b.height-buttons[0].height)<.5&&b.height>=44&&b.artInside&&b.pricesInside),label+' equal tappable build options retain original art and prices '+JSON.stringify(buttons));
   if(viewport.width<viewport.height){
    const aligned=await page.locator('#buildDock button').evaluateAll(els=>els.map(el=>{
     const r=el.getBoundingClientRect(),art=el.querySelector(':scope > img').getBoundingClientRect(),
      title=el.querySelector(':scope > span').getBoundingClientRect(),
      time=el.querySelector('.dock-time').getBoundingClientRect(),
      costs=el.querySelector('.dock-cost').getBoundingClientRect();
     const priceUnits=[...el.querySelectorAll('.dock-cost .cost-unit')].map(u=>u.getBoundingClientRect());
     return {kind:el.dataset.placeBuilding,artX:art.left-r.left,titleX:title.left-r.left,
      timeX:time.left-r.left,priceCenter:(costs.left+costs.right)/2-(r.left+r.right)/2,
      artInside:art.left>=r.left&&art.right<=r.right,headerInside:title.right<=r.right+1&&time.right<=r.right+1,
      separated:art.right+1<=title.left,pricesInside:priceUnits.length===3&&priceUnits.every(u=>u.left>=r.left-1&&u.right<=r.right+1)};
    }));
    const inset=viewport.width<=355?8:12,range=key=>Math.max(...aligned.map(a=>a[key]))-Math.min(...aligned.map(a=>a[key]));
    assert(aligned.length===3&&aligned.every(a=>Math.abs(a.artX-inset)<.6&&a.artInside&&a.headerInside&&a.separated&&a.pricesInside),label+' each portrait build cell shares same safe inset and keeps three prices visible '+JSON.stringify(aligned));
    assert(range('artX')<.6&&range('titleX')<.6&&range('timeX')<.6,label+' City, Barracks and Fort artwork/text align across all columns '+JSON.stringify(aligned));
    assert(aligned.every(a=>Math.abs(a.priceCenter)<.6),label+' live costs stay centered in their original button cells '+JSON.stringify(aligned));
   }
   if(viewport.width<viewport.height){
    const compact=await page.evaluate(()=>({top:document.querySelector('#game .topbar').getBoundingClientRect().height,resources:document.getElementById('resourceSummary').getBoundingClientRect().height,dock:document.getElementById('buildDock').getBoundingClientRect().height}));
    assert(compact.top<=64.5&&compact.resources<=62.5&&compact.dock<=76.5&&compact.dock>=44,label+' portrait HUD frees vertical map space '+JSON.stringify(compact));
   }
   assert.equal(await page.locator('#buildDock').evaluate(el=>getComputedStyle(el).borderRadius),'0px',label+' bottom HUD has no floating frame');
   const falseWarnings=await page.evaluate(()=>{const L=window.__layout,s=L.getState(),p=s.players.find(p=>!p.bot),other=s.players.find(p=>p.id!==s.players[0].id),saved={armies:s.armies,wars:s.wars,recruitment:p.recruitment,food:p.res.food,troopIncome:p.troopIncome};try{s.wars=[];s.armies=[{id:'peaceful',owner:other.id,targetOwner:0,x:p.capital.x+1,y:p.capital.y,strength:100}];p.recruitment={reason:'Army capacity reached'};p.res.food=0;p.troopIncome=0;L.warnHud('');const el=document.getElementById('hudAlert');return el.classList.contains('hidden')||!/Capital threatened|No food/.test(el.textContent);}finally{s.armies=saved.armies;s.wars=saved.wars;p.recruitment=saved.recruitment;p.res.food=saved.food;p.troopIncome=saved.troopIncome;}});
   assert(falseWarnings,label+' peaceful armies and full capacity create no false danger/food alert');
   await page.evaluate(()=>{window.__layout.warnHud('Offensive ended');window.__layout.toast('Connection restored','success');});
   assert.equal(await page.locator('#hudAlert').isVisible(),false,label+' ordinary notice hidden behind toast');
   assert.equal(await page.locator('#gameToast').isVisible(),true,label+' toast visible');
   const statusRects=await page.evaluate(()=>{const a=document.getElementById('gameToast').getBoundingClientRect(),b=document.getElementById('warChip').getBoundingClientRect();return {separate:a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom,nationWidth:b.width,nationHeight:b.height};});
   assert(statusRects.separate,label+' feedback does not overlap diplomacy');
   const noticeLayout=await page.evaluate(()=>{
    const toast=document.getElementById('gameToast'),rail=document.getElementById('threatRail'),expand=document.getElementById('threatExpand');
    const alert=document.getElementById('hudAlert'),feedback=document.getElementById('gameFeedback');
    const a=toast.getBoundingClientRect(),radius=getComputedStyle(toast).borderRadius;
    const saved=[rail.className,expand.className,toast.className,alert.className];
    rail.classList.remove('hidden');expand.classList.remove('hidden');
    const yieldsToToast=getComputedStyle(rail).display==='none'&&getComputedStyle(toast).display!=='none';
    toast.classList.add('hidden');alert.classList.add('hidden');
    const b=rail.getBoundingClientRect(),map=document.getElementById('mapView').getBoundingClientRect();
    const otherHidden=getComputedStyle(feedback).display==='none';
    [rail.className,expand.className,toast.className,alert.className]=saved;
    return {x:a.x,y:a.y,width:a.width,height:a.height,threatX:b.x,threatY:b.y,threatWidth:b.width,threatHeight:b.height,mapTop:map.top,radius,threatRadius:getComputedStyle(rail).borderRadius,otherHidden,yieldsToToast};
   });
   assert(noticeLayout.yieldsToToast,label+' new toast can temporarily replace incoming-attack banner');
   assert(noticeLayout.otherHidden,label+' only one notification occupies the slot');
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
   const noticeControls=await page.evaluate(()=>{
    document.getElementById('gameToast').classList.add('hidden');
    const L=window.__layout,alert=document.getElementById('hudAlert');
    L.warnHud('An offensive has ended','notice',null);
    const info={disabled:alert.disabled,arrow:getComputedStyle(alert.querySelector('.hud-alert-arrow')).display,
      actionable:alert.dataset.actionable};
    const E=window.BKEngine,s=L.getState(),p=s.players.find(v=>v.land>0&&!v.eliminated);
    L.warnHud('Lost 1 cells','danger',{x:p.capital.x,y:p.capital.y});
    const active={disabled:alert.disabled,arrow:getComputedStyle(alert.querySelector('.hud-alert-arrow')).display,
      actionable:alert.dataset.actionable};
    const rect=el=>{const r=el.getBoundingClientRect();return r.y+r.height/2;};
    const centers=[alert.querySelector('#hudAlertIcon'),alert.querySelector('#hudAlertText'),alert.querySelector('.hud-alert-arrow')].map(rect);
    alert.classList.add('hidden');return {info,active,centers};
   });
   assert(noticeControls.info.disabled&&noticeControls.info.arrow==='none'&&noticeControls.info.actionable==='false',label+' informational notification has no fake arrow or button action');
   assert(!noticeControls.active.disabled&&noticeControls.active.arrow!=='none'&&noticeControls.active.actionable==='true',label+' locatable notification exposes its real action');
   assert(Math.max(...noticeControls.centers)-Math.min(...noticeControls.centers)<2,label+' notification icons, text and action are vertically centered');
   assert.equal(await page.locator('#hudFronts').isVisible(),false,label+' separate offensives HUD removed');
   await page.locator('#hudTroops').click();
   assert(await page.locator('[data-front-row="home-army"]').isVisible(),label+' home squads are visible in army overview');
   const emptyGarrison=await page.evaluate(()=>{
    const L=window.__layout,s=L.getState(),player=s.players.find(p=>!p.bot),saved=player.garrisons;
    try{
     player.garrisons=[];L.render();
     const row=document.querySelector('[data-front-row="home-army"]');
     return {visible:!!row&&getComputedStyle(row).display!=='none',text:row?.textContent||''};
    }finally{player.garrisons=saved;L.render();}
   });
   assert(emptyGarrison.visible&&emptyGarrison.text.includes('0 squads'),label+' Reserve persists across a transient empty garrison snapshot');
   const armyFlat=await page.locator('#armiesList .army-line').first().evaluate(el=>{const s=getComputedStyle(el);return {radius:s.borderRadius,left:s.borderLeftWidth,bottom:s.borderBottomWidth};});
   assert.equal(armyFlat.radius,'0px',label+' army rows have no card corners');
   assert.equal(armyFlat.left,'0px',label+' army rows have no outer card frame');
   assert.equal(armyFlat.bottom,'1px',label+' army rows use a flat separator');
   assert(await page.locator('#warPanel').isVisible(),label+' Reserve opens unified Military sheet');
   assert.equal(await page.locator('#warTabArmy').getAttribute('aria-selected'),'true',label+' Reserve selects My army tab');
   const armyBox=await page.locator('#warPanel').boundingBox();
   assert(armyBox.x>=0&&armyBox.x+armyBox.width<=viewport.width+1,label+' unified Military overview fits the screen');
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
   assert.equal(match.radius,'0px',label+' flat rectangular sheets');
   await page.evaluate(()=>{window.__layout.hideAux();window.__layout.openPanel();});
   const research=await sheetStyle('#sidebar','.sidebar-heading strong');
   const techFlat=await page.locator('#techPanel .tech-item.tech-detail').first().evaluate(el=>{const s=getComputedStyle(el);return {radius:s.borderRadius,left:s.borderLeftWidth,bottom:s.borderBottomWidth};});
   assert.equal(techFlat.radius,'0px',label+' research items have no card corners');
   assert.equal(techFlat.left,'0px',label+' research items have no outer card frame');
   assert.equal(techFlat.bottom,'1px',label+' research items share HUD separators');
   await page.evaluate(()=>window.__layout.closePanel());
   await page.locator('#warChip').click();
   assert.equal(await page.locator('#warTabNations').getAttribute('aria-selected'),'true',label+' Nations opens Military in Nations tab');
   await page.evaluate(()=>document.querySelector('#warPanelList .nation-row')?.classList.add('focused'));
   await page.evaluate(()=>window.__layout.hideAux());
   await page.locator('#warChip').click();
   assert.equal(await page.locator('#warPanelList .focused').count(),0,label+' ordinary Military open clears stale map highlights');
   const nationFocus=await page.evaluate(()=>{
    const el=document.querySelector('#warPanelList .nation-row'),dot=el.querySelector('.nation-color'),before=dot.getBoundingClientRect();
    el.classList.add('focused');
    const after=dot.getBoundingClientRect(),style=getComputedStyle(el);el.classList.remove('focused');
    return {move:Math.abs(before.x-after.x),left:style.borderLeftWidth};
   });
   assert(nationFocus.move<1&&nationFocus.left==='0px',label+' chosen nation remains aligned with other rows');
   const selectedSpacing=await page.evaluate(()=>{
     const row=document.querySelector('#warPanelList .nation-row'),measures=()=>{
       const b=row.getBoundingClientRect(),a=row.querySelector('.nation-actions').getBoundingClientRect();
       const identity=row.querySelector('.nation-identity').getBoundingClientRect();
       const buttons=[...row.querySelectorAll('.nation-actions button')].map(el=>el.getBoundingClientRect());
       return {left:a.left-b.left,right:b.right-a.right,identityLeft:identity.left-b.left,
         widths:buttons.map(x=>x.width),gap:buttons[1].left-buttons[0].right};
     };
     const baseline=measures();row.classList.add('focused');const focused=measures();row.classList.remove('focused');
     return {baseline,focused};
   });
   assert(selectedSpacing.focused.left>=7&&selectedSpacing.focused.right>=7,label+' selected diplomacy buttons have space from both card edges');
   assert(Math.abs(selectedSpacing.focused.left-selectedSpacing.focused.right)<1,label+' diplomacy card left/right gutters match');
   assert(Math.abs(selectedSpacing.baseline.left-selectedSpacing.focused.left)<1,label+' selected card preserves other rows internal alignment');
   assert(selectedSpacing.focused.gap>=7,label+' diplomacy buttons have a real gap');


   await page.locator('#warTabThreats').click();
   assert.equal(await page.locator('#warTabThreats').getAttribute('aria-selected'),'true',label+' Attacks tab is operable');
   assert(await page.locator('#warThreatEmpty').isVisible(),label+' no attacks gives an explicit empty state');
   await page.locator('#warTabArmy').click();
   assert(await page.locator('[data-front-row="home-army"]').isVisible(),label+' Army tab preserves the live reserve');
   await page.locator('#warTabNations').click();
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
   await page.locator('#hudLand').click();
   assert.equal(await page.locator('#quickLeadersPanel').isVisible(),true,label+' tapping the LAND percentage opens leaderboard');
   assert.equal(await page.locator('#hudLand').getAttribute('aria-controls'),'quickLeadersPanel',label+' LAND shortcut announces its target');
   await page.locator('#closeQuickLeaders').click();
   await page.locator('#hudLand').focus();
   await page.keyboard.press('Enter');
   assert(await page.locator('#quickLeadersPanel').isVisible(),label+' keyboard Enter opens LAND leaderboard');
   const leaderFlat=await page.locator('#quickLeadersPanel .quick-row.is-me').evaluate(el=>{const s=getComputedStyle(el);return {radius:s.borderRadius,left:s.borderLeftWidth};});
   assert.equal(leaderFlat.radius,'0px',label+' highlighted leaderboard row fills the flat surface');
   assert.equal(leaderFlat.left,'0px',label+' leaderboard has no inset card frame');
   await page.evaluate(()=>window.__layout.hideAux());
   assert.equal(await page.locator('#nationsBackdrop').isVisible(),false,label+' closing Nations removes its backdrop');
   await page.evaluate(()=>window.__layout.showAux('sessionPanel'));
   assert.equal(await page.locator('#productionPriority').isVisible(),false,label+' resource priority is removed from Match menu');
   const close=page.locator('#closeSession');await close.click();
   await page.evaluate(()=>{
    const L=window.__layout,s=L.getState();s.phase='ended';s.winner=s.players[0].id;
    L.render();
   });
   assert(await page.locator('#victory').isVisible(),label+' match result opens at end');
   const outcomeLayout=await page.evaluate(()=>{
    const sheet=document.getElementById('resultSheet'),stats=[...document.querySelectorAll('#victoryStats .result-stat')];
    const geometry=()=>{const r=sheet.getBoundingClientRect(),s=getComputedStyle(sheet);return {x:r.x,width:r.width,right:r.right,bottom:r.bottom,radius:s.borderRadius,background:s.backgroundColor,shadow:s.boxShadow};};
    const win=geometry(),buttons=['restart','resultExit'].map(id=>{const el=document.getElementById(id),r=el.getBoundingClientRect();return {id,width:r.width,height:r.height,left:r.left};});
    const first=getComputedStyle(stats[0]);sheet.dataset.outcome='loss';const loss=geometry();
    return {win,loss,buttons,flatStats:first.borderLeftWidth==='0px'&&first.borderTopWidth==='0px'&&first.borderRadius==='0px',header:!!sheet.querySelector('.result-header')};
   });
   assert(outcomeLayout.header&&outcomeLayout.flatStats,label+' result uses flat HUD sections');
   assert(outcomeLayout.win.radius==='0px'&&outcomeLayout.win.shadow==='none',label+' victory screen has no card corners or shadow');
   assert.equal(outcomeLayout.win.background,outcomeLayout.loss.background,label+' win/loss share one design system');
   assert(outcomeLayout.win.x>=0&&outcomeLayout.win.right<=viewport.width+1,label+' result sheet fits horizontal viewport');
   assert(outcomeLayout.buttons.every(b=>b.height>=44&&Math.abs(b.width-outcomeLayout.buttons[0].width)<1&&Math.abs(b.left-outcomeLayout.buttons[0].left)<1),label+' result actions share geometry');
   await page.evaluate(()=>window.__layout.goHome());
   assert(await page.locator('#lobby').isVisible(),label+' home visible');
   // v134: real portrait flow from a currently scouted building to a bounded order.
   await page.evaluate(()=>window.__layout.createDemo(false));
   await page.locator('#startButton').click();
   const objectiveFixture=await page.evaluate(()=>{
    const L=window.__layout,E=window.BKEngine,s=L.getState(),p=s.players.find(v=>!v.bot),foe=s.players.find(v=>v.bot);
    if(!foe)return null;
    const y=39;s.tiles.fill(1);s.owners=s.owners.map((_,i)=>i%E.W<70?p.id:foe.id);
    s.buildings=[{id:'enemy-test-city',owner:foe.id,kind:'city',level:2,x:82,y},
      {id:'scout-test-fort',owner:p.id,kind:'fort',level:1,x:68,y}];
    s.armies=[];s.attackPlans=[];s.recoveryPlans=[];s.wars=[];
    for(const v of s.players)v.land=s.owners.filter(id=>id===v.id).length;
    p.capital={x:68,y};p.troops=3000;p.troopCap=5000;p.garrisons=[{id:'front',x:68,y,strength:3000}];
    foe.capital={x:82,y};foe.troops=400;foe.garrisons=[{id:'foe',x:90,y,strength:400}];
    s.territoryRevision++;
    const war=E.action(s,p.id,{type:'setNationTarget',target:foe.id,enabled:true});
    L.selectMapTile(82,y);
    return {war:war.ok,visible:E.visibleBuilding(s,p.id,s.buildings[0])};
   });
   if(objectiveFixture){
    assert(objectiveFixture.war&&objectiveFixture.visible,label+' scouted enemy building can be targeted');
    const objectiveButton=page.locator('#confirmTarget');
    assert(await page.locator('#targetPreview').isVisible(),label+' tapping a known city opens objective preview');
    assert((await page.locator('#targetTitle').textContent()).includes('City'),label+' preview identifies the goal');
    assert.equal(await objectiveButton.textContent(),'Attack objective',label+' attack action is clear');
    assert(await page.locator('[data-target-percent="50"]').isVisible(),label+' objective troop presets are visible');
    await page.locator('[data-target-percent="50"]').click();
    await objectiveButton.click();
    const outcome=await page.evaluate(()=>{
     const E=window.BKEngine,s=window.__layout.getState(),p=s.players.find(v=>!v.bot);
     const plan=s.attackPlans.find(v=>v.owner===p.id);
     return {plan:!!plan,goal:!!plan?.zoneCells.includes(E.idx(82,39)),percent:plan?.allocationValue};
    });
    assert(outcome.plan&&outcome.goal&&outcome.percent===50,label+' 50% objective order reaches the local engine');
   }
   console.log('PASS '+label);await page.close();
  }}finally{await browser.close();}
 }
})().catch(error=>{console.error('::error::'+String(error.stack||error).replace(/\n/g,'%0A'));process.exitCode=1;}).finally(()=>server.close());
