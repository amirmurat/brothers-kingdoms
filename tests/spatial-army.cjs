'use strict';
const assert=require('node:assert/strict'),E=require('../engine.js');
function fixture(){
 const s=E.lobby(7),id=E.addPlayer(s,'Commander'),enemy=E.addPlayer(s,'Enemy');assert(E.start(s,0).ok);
 s.tiles.fill(1);s.owners.fill(0);s.buildings=[];s.armies=[];
 for(let y=20;y<=40;y++)for(let x=20;x<=70;x++)s.owners[E.idx(x,y)]=id;
 for(let y=20;y<=40;y++)for(let x=71;x<=80;x++)s.owners[E.idx(x,y)]=enemy;
 const p=E.person(s,id),foe=E.person(s,enemy);p.troops=800;p.land=1071;p.capital={x:22,y:30};p.garrisons=[];
 foe.troops=0;foe.garrisons=[];foe.land=210;
 s.buildings=[{id:'home',owner:id,kind:'city',x:22,y:30,level:1},{id:'front',owner:id,kind:'barracks',x:65,y:30,level:1}];
 return {s,id,enemy,p,foe};
}
const sum=p=>p.garrisons.reduce((n,g)=>n+g.strength,0);
{
 const t=fixture();E.spatialArmyStep(t.s);
 assert(Math.abs(sum(t.p)-800)<1e-6,'Squads represent existing troops, not extra troops');
 for(const g of t.p.garrisons)assert(g.x>=64,'Initial soldiers live at a real base');
 assert(t.p.garrisons.every(g=>g.role!=='Guard'),'Peaceful border gets no war deployment');
 E.action(t.s,t.id,{type:'setNationTarget',target:t.enemy,enabled:true});
 const before=new Map(t.p.garrisons.map(g=>[g.id,{x:g.x,y:g.y}]));E.spatialArmyStep(t.s);
 for(const g of t.p.garrisons){const old=before.get(g.id);if(old)assert(Math.abs(old.x-g.x)+Math.abs(old.y-g.y)<=1,'Redeployment moves at most one land cell per tick');}
 for(let n=0;n<70;n++)E.spatialArmyStep(t.s);
 const guards=t.p.garrisons.filter(g=>g.role==='Guard');assert(guards.length&&guards.some(g=>g.x>=68));
 assert(t.p.garrisons.some(g=>g.role==='Reserve'&&g.x<40),'Some soldiers remain in the safe rear');
 const near=E.tileDefense(t.s,t.id,70,30),far=E.tileDefense(t.s,t.id,45,30);assert(near>far,'Positioned soldiers supply local defense');
 const serialized=JSON.parse(JSON.stringify(t.s));E.spatialArmyStep(serialized);assert(Math.abs(sum(E.person(serialized,t.id))-800)<1e-6,'Save/rejoin preserves soldiers');
 E.action(t.s,t.id,{type:'peace',target:t.enemy});E.action(t.s,t.enemy,{type:'peace',target:t.id});
 for(let n=0;n<75;n++)E.spatialArmyStep(t.s);
 assert(t.p.garrisons.every(g=>g.role!=='Guard'),'Peace releases border guard assignments');
 assert(t.p.garrisons.every(g=>E.homeSites(t.s,t.id).some(b=>b.x===g.x&&b.y===g.y)),'Peaceful squads return to bases');
}
{
 const t=fixture();t.s.buildings=t.s.buildings.filter(b=>b.kind==='capital');
 const i=E.idx(71,30);E.action(t.s,t.id,{type:'setNationTarget',target:t.enemy,enabled:true});
 assert(E.action(t.s,t.id,{type:'send',x:71,y:30,zone:[i],percent:50}).ok);
 const a=t.s.armies[0];assert(a?.marching,'Attack starts with physical march from home');
 assert.equal(a.x,22);for(let n=0;n<10;n++)E.combatStep(t.s);
 assert.equal(t.s.owners[i],t.enemy,'Distant troops cannot capture before arrival');
 assert(a.x<=32,'March is bounded to one cell per combat step');
 const location={x:a.x,y:a.y},plan=t.s.attackPlans[0];E.action(t.s,t.id,{type:'cancelPlan',id:plan.id});
 const returning=t.p.garrisons.filter(g=>g.returning);assert(returning.some(g=>g.x===location.x&&g.y===location.y),'Recall starts where troops actually are');
 assert(Math.abs(sum(t.p)-t.p.troops)<1e-6);
 assert(E.action(t.s,t.id,{type:'send',x:71,y:30,zone:[i],percent:95}).ok);
 for(const wave of t.s.armies)assert(wave.initialStrength<=400,'Returning soldiers cannot be deployed again');
 for(let n=0;n<60;n++)E.spatialArmyStep(t.s);
 assert(t.p.garrisons.every(g=>!g.returning),'Survivors physically reach home');
}
{
 const t=fixture();t.s.buildings=t.s.buildings.filter(b=>b.kind==='capital');
 for(let y=20;y<=40;y++)t.s.owners[E.idx(45,y)]=0;
 E.action(t.s,t.id,{type:'setNationTarget',target:t.enemy,enabled:true});
 const result=E.action(t.s,t.id,{type:'send',x:71,y:30,zone:[E.idx(71,30)],percent:50});
 assert(result.ok,'Disconnected plan is accepted');assert.equal(t.s.armies.length,0,'No teleport across neutral gap');
 const saved=JSON.stringify(t.s);E.spatialArmyStep(t.s);assert(Math.abs(sum(t.p)-t.p.troops)<1e-6);
 assert(saved.length<1000000,'Small squads stay compact enough for snapshots');
}
{
 const t=fixture();E.action(t.s,t.id,{type:'setNationTarget',target:t.enemy,enabled:true});
 t.s.armies=[{id:'incoming',owner:t.enemy,strength:900,tx:70,ty:20}];
 for(let n=0;n<80;n++)E.spatialArmyStep(t.s);
 const north=t.p.garrisons.filter(g=>g.role==='Guard'&&g.y<=30).reduce((n,g)=>n+g.strength,0);
 const south=t.p.garrisons.filter(g=>g.role==='Guard'&&g.y>30).reduce((n,g)=>n+g.strength,0);
 assert(north>south,'An approaching attack receives more defenders than a quiet sector');
 // Old saves migrate existing reserve once, then maintain its exact total.
 delete t.p.garrisons;const before=t.p.troops;E.spatialArmyStep(t.s);E.spatialArmyStep(t.s);
 assert(Math.abs(sum(t.p)-before)<1e-6,'Migration does not duplicate reserve');
 const g=t.p.garrisons[0];t.s.owners[E.idx(g.x,g.y)]=t.enemy;
 for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])t.s.owners[E.idx(g.x+dx,g.y+dy)]=t.enemy;
 const lost=g.strength;E.spatialArmyStep(t.s);
 assert(t.p.troops<=before-lost+1e-6,'Encircled squads cannot teleport out of a captured pocket');
}
console.log('PASS spatial army: bases, wartime guards, rear reserve, local defense, peace, marching, recall, save/rejoin and disconnected routes');

// A broad painted plan has a misleading distant midpoint. The real invasion
// is at the north tip; a large reserve must reinforce that physical threat.
{
 const t=fixture();t.p.troops=196400;t.p.garrisons=[{id:'reserve',x:65,y:30,strength:196400,returning:false}];
 E.action(t.s,t.id,{type:'setNationTarget',target:t.enemy,enabled:true});
 t.s.armies=[{id:'invasion',owner:t.enemy,strength:12000,tx:70,ty:40,
  columns:[{x:71,y:20,tx:71,ty:20,strength:12000,route:[]}]}];
 for(let n=0;n<55;n++)E.spatialArmyStep(t.s);
 const north=t.p.garrisons.filter(g=>g.role==='Guard'&&g.y<28).reduce((n,g)=>n+g.strength,0);
 const south=t.p.garrisons.filter(g=>g.role==='Guard'&&g.y>32).reduce((n,g)=>n+g.strength,0);
 assert(north>south*2,'Physical invasion outweighs a quiet, misleading wave midpoint');
 assert(E.tileDefense(t.s,t.id,70,20)>E.tileDefense(t.s,t.id,70,40)*2,'Northern soldiers really defend the threatened cells');
 assert(Math.abs(sum(t.p)-196400)<1e-6,'Redistribution cannot create or lose soldiers');
}
{
 const t=fixture();t.p.troops=196400;t.p.garrisons=[{id:'reserve',x:65,y:30,strength:196400,returning:false}];
 E.action(t.s,t.id,{type:'setNationTarget',target:t.enemy,enabled:true});
 E.spatialArmyStep(t.s);
 const g=t.p.garrisons.find(g=>g.role==='Guard'&&g.route?.length>3);
 assert(g,'A real guard route is available');const before={x:g.x,y:g.y},length=g.route.length;
 for(let n=0;n<3;n++)E.combatStep(t.s);
 assert.equal(Math.abs(before.x-g.x)+Math.abs(before.y-g.y),1,'Reserve travels during combat substeps too');
 assert.equal(g.route.length,length-1,'Combat movement reuses the friendly route');
 const blocked=g.route[0];t.s.owners[blocked]=t.enemy;
 const position={x:g.x,y:g.y};E.combatStep(t.s);
 assert.equal(g.x,position.x);assert.equal(g.y,position.y,'No movement through a newly captured tile');
}
