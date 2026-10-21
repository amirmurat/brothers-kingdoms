'use strict';
const assert=require('node:assert/strict'),E=require('../engine.js');
function fixture(){const s=E.lobby(19),id=E.addPlayer(s,'A'),foe=E.addPlayer(s,'B');E.start(s,0);s.tiles.fill(1);s.owners.fill(0);s.buildings=[];s.armies=[];s.attackPlans=[];s.recoveryPlans=[];for(let y=20;y<60;y++)for(let x=20;x<70;x++)s.owners[E.idx(x,y)]=id;s.territoryRevision++;const p=E.person(s,id);p.land=2000;p.troops=10000;p.garrisons=[{id:'home',x:65,y:40,strength:10000}];p.capital={x:30,y:40};s.buildings=[{id:'base',owner:id,kind:'capital',x:30,y:40,level:1}];return {s,id,foe,p};}
{
 const {s,id,foe,p}=fixture(),enemy={id:'secret',owner:foe,kind:'city',level:4,x:85,y:40};s.buildings.push(enemy);
 assert(!E.visibleBuilding(s,id,enemy));let wire=E.networkState(s,id);assert(!wire.buildings.some(b=>b.id==='secret'));assert.equal(wire.players.find(p=>p.id===foe).capital,null);
 const hidden=E.strategicWeight(s,id,85,40);assert.equal(hidden,1,'AI cannot target a hidden building');
 const fort={id:'scout',owner:id,kind:'fort',level:1,x:68,y:40};s.buildings.push(fort);assert(!E.visibleBuilding(s,id,enemy));fort.level=2;assert(E.visibleBuilding(s,id,enemy));s.tick++;
 assert(E.strategicWeight(s,id,85,40)>hidden);assert(E.networkState(s,id).buildings.some(b=>b.id==='secret'));
 s.buildings.push({...enemy,id:'cluster',x:84});s.tick++;const clustered=E.strategicWeight(s,id,85,40);s.buildings.pop();s.tick++;assert(clustered>E.strategicWeight(s,id,85,40),'Building cluster importance accumulates');
 s.owners[E.idx(fort.x,fort.y)]=foe;s.territoryRevision++;assert(!E.visibleBuilding(s,id,enemy),'Captured fort loses intelligence');
 for(const value of ['aggressive','balanced','defensive'])assert(E.action(s,id,{type:'armyPosture',value}).ok);
 assert(E.reserveShare({armyPosture:'aggressive'})<E.reserveShare({armyPosture:'balanced'}));assert(E.reserveShare({armyPosture:'balanced'})<E.reserveShare({armyPosture:'defensive'}));
 p.allies=[foe];s.owners[E.idx(72,40)]=foe;assert(!E.action(s,id,{type:'armyFocus',x:72,y:40}).ok);
 assert(!E.action(s,id,{type:'send',x:70,y:40,zone:[E.idx(72,40)]}).ok);assert(E.action(s,id,{type:'send',x:70,y:40,zone:[E.idx(72,40),E.idx(70,40)]}).ok);assert(s.attackPlans.every(q=>!q.zoneCells.includes(E.idx(72,40))));
 const r={id:'recover',owner:id,targetOwner:foe,targets:[foe],autoRecovery:true,zoneCells:[E.idx(72,41),E.idx(73,41),E.idx(74,41)]};s.recoveryPlans=[r];
 assert(E.action(s,id,{type:'erasePlanCells',cells:[E.idx(73,41)]}).ok);assert.equal(s.recoveryPlans.length,2);assert(s.recoveryPlans.every(q=>!q.zoneCells.includes(E.idx(73,41))));
 assert(E.action(s,id,{type:'erasePlanCells',cells:[E.idx(72,41),E.idx(74,41)]}).ok);assert.equal(s.recoveryPlans.length,0);
}
{
 const {s,id,p}=fixture();s.buildings.push({id:'camp',owner:id,kind:'barracks',level:2,x:60,y:40});const total=E.militaryStrength(s,id).total;
 E.spatialArmyStep(s,false);assert.equal(E.militaryStrength(s,id).total,total);assert(p.garrisons.some(g=>g.camp===E.idx(60,40)));
 for(let i=0;i<25;i++){s.tick++;E.spatialArmyStep(s,true);}
 const guard=p.garrisons.find(g=>g.camp===E.idx(60,40));assert(guard&&guard.x===60&&guard.y===40,'Camp guard walks to its barracks');
 assert(E.action(s,id,{type:'armyFocus',x:68,y:40}).ok);E.spatialArmyStep(s,false);assert(p.garrisons.filter(g=>g.role==='Priority defense').reduce((n,g)=>n+g.strength,0)>p.troops/2,'Own focus takes the majority of reachable reserve while keeping other posts');assert(p.garrisons.some(g=>g.camp!==undefined&&g.strength>0));assert.equal(E.militaryStrength(s,id).total,total);
}
console.log('PASS v101: fort intelligence, hidden AI knowledge, cluster weight, posture, independent focus, allies, recovery eraser and physical camp guard');

{
 const {s,id,p}=fixture();p.troops=2000;p.garrisons=[{id:'home',x:30,y:40,strength:2000}];s.armies=[{id:'deployed',owner:id,strength:8000,columns:[{x:68,y:40,strength:8000}]}];
 assert(E.action(s,id,{type:'armyPosture',value:'defensive'}).ok);assert.equal(E.militaryStrength(s,id).total,10000);assert.equal(s.armies[0].strength,4000);
 assert(p.garrisons.some(g=>g.returning&&g.x===68&&g.y===40&&g.strength===4000),'Defensive posture withdraws surplus physically from the front');
}
