'use strict';
const fs=require('node:fs'),http=require('node:http'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,webkit}=require('playwright'),root=process.cwd();
const hooks=`window.__build={get:()=>({state,myId,camX,camY}),mode:setBuildingMode,blocked:mapInputBlocked,icon:flatBuildingIcon,occupancy:buildingOccupancy,draw,select:(x,y)=>{const r=canvas.getBoundingClientRect();selectMap(r.left+camX+(x+.5)*TILE*zoom,r.top+camY+(y+.5)*TILE*zoom);},fixture:()=>{pauseSolo=true;const p=mine();state.tiles.fill(1);state.owners.fill(0);state.armies=[];state.buildJobs=[];state.attackPlans=[];state.recoveryPlans=[];state.roads=[];for(let y=30;y<75;y++)for(let x=60;x<110;x++)state.owners[E.idx(x,y)]=myId;state.territoryRevision++;p.land=2250;p.troops=100;p.garrisons=[];p.workers=[];p.capital={x:80,y:50};p.res={food:10000,wood:10000,stone:10000,gold:10000};state.buildings=['city','barracks','fort'].map((kind,n)=>({id:'fixture-'+kind,kind,owner:myId,x:80+n*3,y:50,level:1}));E.workforceStep(state);zoom=.8;camX=canvas.clientWidth/2-82*TILE*zoom;camY=canvas.clientHeight/2-50*TILE*zoom;render();draw();}};})();`;
const server=http.createServer((req,res)=>{try{
 const name=new URL(req.url,'http://localhost').pathname,file=path.join(root,name==='/'?'index.html':name);
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 let body=fs.readFileSync(file);if(name==='/'||name==='/index.html')body=body.toString().split('\n').filter(l=>!l.includes('unpkg.com/peerjs')).join('\n');
 if(name==='/game.js')body=body.toString().replace(/\}\)\(\);\s*$/,hooks);
 const type=file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.png')?'image/png':file.endsWith('.svg')?'image/svg+xml':'text/html';res.writeHead(200,{'Content-Type':type});res.end(body);
 }catch{res.writeHead(404);res.end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));fs.mkdirSync('test-results',{recursive:true});
 try{for(const [name,type] of [['Chromium',chromium],['WebKit',webkit]]){
 const browser=await type.launch({headless:true});try{for(const viewport of [{width:320,height:568},{width:390,height:780}]){
  const {width,height}=viewport,page=await browser.newPage({viewport});await page.goto('http://127.0.0.1:'+server.address().port);
  await page.click('#demoButton');await page.click('#startButton');await page.evaluate(()=>window.__build.fixture());
  const tool=await page.locator('#developButton').evaluate(el=>{const r=el.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {width:r.width,height:r.height,reachable:el.contains(hit)};});
  assert(tool.width>=44&&tool.height>=44&&tool.reachable,'Build button is actually reachable before any auto-scroll');
  await page.evaluate(()=>window.__build.select(80,50));
  const geometry=await page.evaluate(()=>{const b=document.getElementById('contextCard').getBoundingClientRect(),m=document.getElementById('mapCanvas').getBoundingClientRect();return {top:b.top,bottom:m.bottom,mapHeight:m.height,blocked:window.__build.blocked(),backdrop:!document.getElementById('auxBackdrop').classList.contains('hidden')};});
  assert(geometry.top>=geometry.bottom-1&&geometry.mapHeight>150,'Details occupy a separate bottom row, preserving usable map');assert(!geometry.blocked&&!geometry.backdrop);
  const cityBounds=await page.locator('#contextCard').boundingBox();assert(cityBounds.y+cityBounds.height<=height+.5,'Details are inside viewport without auto-scroll');
  await page.evaluate(()=>new Promise(requestAnimationFrame));
  const mapBounds=await page.locator('#mapCanvas').boundingBox(),camera=await page.evaluate(()=>window.__build.get().camX);
  await page.mouse.move(mapBounds.x+mapBounds.width*.45,mapBounds.y+mapBounds.height*.4);await page.mouse.down();
  await page.mouse.move(mapBounds.x+mapBounds.width*.45+30,mapBounds.y+mapBounds.height*.4,{steps:4});await page.mouse.up();
  assert(Math.abs(await page.evaluate(()=>window.__build.get().camX)-camera)>10,'Map still pans while details stay open');
  assert(await page.locator('#contextCard').isVisible());
  const occupancy=await page.evaluate(()=>{const {state,myId}=window.__build.get(),city=state.buildings[0],p=state.players.find(p=>p.id===myId);p.garrisons=[{id:'guards',x:city.x,y:city.y,strength:37},{id:'nearby',x:city.x+1,y:city.y,strength:99}];return window.__build.occupancy(city);});assert.equal(occupancy.workers,24);assert.equal(occupancy.troops,37,'Map count excludes nearby troops');
  const pixels=await page.evaluate(()=>['city','barracks','fort','farm','lumber','quarry','mine'].map(k=>{const c=window.__build.icon(k,1),d=c.getContext('2d').getImageData(0,0,32,32).data;let opaque=0;for(let i=3;i<d.length;i+=4)if(d[i]===255)opaque++;return opaque;}));assert(pixels.every(n=>n===1024),'New icons fill the complete tile');
  await page.evaluate(()=>window.__build.mode('barracks'));
  const before=await page.evaluate(()=>JSON.stringify(window.__build.get().state.players[0].res));
  await page.evaluate(()=>window.__build.select(89,50));
  assert.equal(await page.evaluate(()=>window.__build.get().state.buildJobs.length),0,'Selecting a site never spends resources');
  assert.equal(await page.evaluate(()=>JSON.stringify(window.__build.get().state.players[0].res)),before);
  await page.locator('[data-context-dismiss]').click();assert.equal(await page.evaluate(()=>window.__build.get().state.buildJobs.length),0);
  await page.evaluate(()=>window.__build.select(89,50));await page.locator('[data-context-place]').click();
  assert.equal(await page.evaluate(()=>window.__build.get().state.buildJobs.length),1,'Explicit confirmation queues exactly one job');
  await page.evaluate(()=>{window.__build.mode(null);window.__build.select(89,50);});
  assert((await page.locator('#contextBody').textContent()).includes('Barracks · construction'),'Site identifies the actual building');
  await page.locator('[data-context-cancel]').click();assert.equal(await page.evaluate(()=>window.__build.get().state.buildJobs.length),0);
  assert.equal(await page.evaluate(()=>JSON.stringify(window.__build.get().state.players[0].res)),before,'Untouched construction cancellation returns the price');
  await page.evaluate(()=>window.__build.select(83,50));await page.locator('[data-context-remove]').click();
  assert.equal(await page.evaluate(()=>window.__build.get().state.buildings.length),3,'Removal asks for confirmation');
  await page.locator('[data-context-keep]').click();await page.locator('[data-context-remove]').click();await page.locator('[data-context-remove-confirm]').click();
  assert.equal(await page.evaluate(()=>window.__build.get().state.buildings.length),2);
  await page.evaluate(()=>window.__build.select(86,50));await page.locator('[data-context-upgrade]').click();
  assert(await page.locator('[data-context-cancel]').isVisible(),'Upgrade can be cancelled separately from building removal');
  await page.screenshot({path:'test-results/v144-building-'+name+'-'+width+'.png'});
  await page.locator('#closeContext').click();await page.locator('#developButton').click();await page.locator('[data-fast-build="farm"]').click();
  await page.evaluate(()=>window.__build.select(92,50));
  assert((await page.locator('#contextBody').textContent()).includes('Build Farm here?'),'Farm uses the same explicit confirmation');
  await page.locator('[data-context-place]').click();
  assert(await page.evaluate(()=>window.__build.get().state.buildJobs.some(j=>j.kind==='farm')),'Farm queues actual paid work');
  await page.evaluate(()=>{const {state}=window.__build.get();for(let n=0;n<120;n++)window.BKEngine.workforceStep(state);window.__build.draw();window.__build.mode(null);window.__build.select(92,50);});
  assert((await page.locator('#contextBody').textContent()).includes('/ 6 workers'),'Completed farm explains real staffing');
  assert(await page.locator('#contextCard').isVisible(),'Farm details stay visible');
  const farmBounds=await page.locator('#contextCard').boundingBox();
  assert(farmBounds.y+farmBounds.height<=height+.5,'Farm dock remains inside viewport '+JSON.stringify(farmBounds));
  await page.screenshot({path:'test-results/v145-farm-'+name+'-'+width+'.png'});
  await page.locator('#closeContext').click();await page.locator('#developButton').click();
  assert.equal(await page.locator('[data-fast-build]').count(),7);
  assert(await page.evaluate(()=>getComputedStyle(document.getElementById('quickBuild')).backgroundColor===getComputedStyle(document.getElementById('sessionPanel')).backgroundColor),'Catalog uses the existing Match sheet surface');
  assert(await page.locator('#quickBuild').evaluate(el=>getComputedStyle(el).borderRadius==='0px'&&getComputedStyle(el).borderTopWidth==='0px'),'Catalog follows flat frameless menu');
  assert(await page.locator('[data-fast-build]').evaluateAll(els=>els.every(el=>getComputedStyle(el).borderRadius==='0px'&&getComputedStyle(el).borderTopWidth==='0px')),'Cards add no decorative frames or rounded corners');
  const catalogGeometry=await page.locator('#quickBuild').evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x,right:r.right,y:r.y,bottom:r.bottom};});
  assert(catalogGeometry.x>=0&&catalogGeometry.right<=width&&catalogGeometry.y>=0&&catalogGeometry.bottom<=height,'Catalog fits viewport before scrolling');
  await page.screenshot({path:'test-results/v146-catalog-'+name+'-'+width+'.png'});
  for(const [kind,terrain] of [['lumber',2],['quarry',3],['mine',5]]){
   await page.locator('[data-fast-build="'+kind+'"]').click();
   await page.evaluate(([kind,terrain])=>{const {state}=window.__build.get();state.tiles[window.BKEngine.idx(94,50)]=terrain;state.territoryRevision++;window.__build.select(94,50);},[kind,terrain]);
   assert(await page.locator('[data-context-place]').isEnabled(),kind+' valid terrain can be confirmed');
   await page.locator('[data-context-place]').click();
   await page.evaluate(()=>{window.__build.mode(null);window.__build.select(94,50);});
   assert((await page.locator('#contextBody').textContent()).includes('construction'));
   await page.locator('[data-context-cancel]').click();
   await page.locator('#developButton').click();
  }
  await page.locator('#quickBuildClose').click();
  await page.locator('#menuToggle').click();await page.screenshot({path:'test-results/v146-menu-reference-'+name+'-'+width+'.png'});
  await page.locator('#closeSession').click();
  await page.close();console.log('PASS v144 building UI '+name+' '+width);
 }}finally{await browser.close();}}
 }finally{server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
