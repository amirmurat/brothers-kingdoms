'use strict';
const assert=require('node:assert/strict'),E=require('../engine.js');
function fixture(){const s=E.lobby(7),id=E.addPlayer(s,'Builder'),foe=E.addPlayer(s,'Other');E.start(s,0);s.tiles.fill(1);s.owners.fill(0);for(let y=10;y<80;y++)for(let x=10;x<80;x++)s.owners[E.idx(x,y)]=id;s.territoryRevision++;s.armies=[];s.attackPlans=[];s.recoveryPlans=[];s.buildings=[];s.buildJobs=[];const p=E.person(s,id);p.land=4900;p.res={food:10000,wood:10000,stone:10000,gold:10000};p.capital={x:20,y:20};return {s,id,foe,p};}
{
 const {s,id,foe,p}=fixture(),fort={id:'fort',owner:id,kind:'fort',level:1,x:70,y:40},diagonal={id:'secret',owner:foe,kind:'city',level:1,x:79,y:49};s.buildings=[fort,diagonal];
 assert(E.visibleBuilding(s,id,diagonal),'Circular sight includes diagonal inside actual radius');
 const far={...diagonal,id:'far',x:90,y:40};s.buildings.push(far);assert(!E.visibleBuilding(s,id,far));
 assert.equal(E.fortRadius(fort,s),14);s.tiles[E.idx(fort.x,fort.y)]=3;assert.equal(E.fortRadius(fort,s),18);s.tiles[E.idx(fort.x,fort.y)]=6;assert.equal(E.fortRadius(fort,s),21);assert(E.visibleBuilding(s,id,far),'Mountain height extends authoritative visibility');
 p.allies=[foe];s.buildings=s.buildings.filter(b=>b!==fort);assert(E.visibleBuilding(s,id,far),'Allied buildings visible without a fort');assert(E.networkState(s,id).buildings.some(b=>b.id==='far'));
 p.allies=[];assert(!E.visibleBuilding(s,id,far),'Ending alliance removes unscouted structures');
 assert(E.action(s,id,{type:'armyFocus',x:95,y:40}).ok);assert.equal(E.focusStatus(s,id),'invalid');
 const before=E.strategicWeight(s,id,95,40);assert.equal(before,1,'Invalid focus gives no army weight');
 s.attackPlans=[{id:'p',owner:id,targets:[0],zoneCells:[E.idx(95,40)]}];assert.equal(E.focusStatus(s,id),'attack');s.attackPlans=[];assert.equal(E.focusStatus(s,id),'invalid');
 assert(E.action(s,id,{type:'armyFocus',x:30,y:40}).ok);assert.equal(E.focusStatus(s,id),'defend');
}
{
 const {s,id,p}=fixture();const base={id:'b',owner:id,kind:'city',level:1,x:20,y:20};s.buildings=[base];
 const cost=E.costUpgrade(base),old=p.res.wood;assert(E.action(s,id,{type:'upgrade',id:base.id}).ok);assert.equal(p.res.wood,old-cost.wood);assert.equal(base.level,1,'Upgrade gives no instant output');assert.equal(base.upgrade.readyTick,30);
 const paid=p.res.wood;assert(!E.action(s,id,{type:'upgrade',id:base.id}).ok);assert.equal(p.res.wood,paid,'Duplicate upgrade cannot charge twice');
 s.tick=28;E.tick(s);assert.equal(base.level,1);E.tick(s);assert.equal(base.level,2);assert(!base.upgrade);assert.equal(E.upgradeTime(base),60);assert(E.action(s,id,{type:'upgrade',id:base.id}).ok);s.tick+=59;E.tick(s);assert.equal(base.level,3);assert.equal(E.upgradeTime(base),120);
 const saved=JSON.parse(JSON.stringify(s));assert.equal(saved.buildings[0].level,3);
 assert(E.action(s,id,{type:'build',kind:'barracks',x:21,y:20}).ok);assert(!E.buildingAt(s,21,20),'Legacy strategic build cannot bypass worker construction');
 assert.equal(s.buildJobs[0].progress,0);assert(E.constructionTime('barracks')>=25);
 assert(E.costBuilding(s,id,'city').wood>=495,'Development uses meaningful capital costs');
}
console.log('PASS v102: circular terrain scouting, allied visibility, invalid focus safety, delayed upgrades, duplicate charge prevention and physical construction');
