'use strict';
// v135: objective routes cannot cut across sea or keep fighting after diplomacy changes.
const assert=require('node:assert/strict'),E=require('../engine.js');
function scenario(blocked=false){
 const s=E.lobby(7611),id=E.addPlayer(s,'Human'),foe=E.addPlayer(s,'Rival');
 assert(E.start(s,0).ok);
 s.tiles.fill(1);s.owners.fill(0);
 s.armies=[];s.attackPlans=[];s.recoveryPlans=[];s.buildings=[];s.wars=[];
 const y=39;
 for(let yy=24;yy<=58;yy++)for(let xx=25;xx<=69;xx++)s.owners[E.idx(xx,yy)]=id;
 for(let yy=24;yy<=58;yy++)for(let xx=70;xx<=104;xx++)s.owners[E.idx(xx,yy)]=foe;
 if(blocked)for(let yy=24;yy<=58;yy++)s.tiles[E.idx(76,yy)]=0;
 const p=E.person(s,id),q=E.person(s,foe);
 p.land=s.owners.filter((x,i)=>x===id&&s.tiles[i]).length;
 q.land=s.owners.filter((x,i)=>x===foe&&s.tiles[i]).length;
 p.troops=3000;p.troopCap=6000;p.garrisons=[{id:'front',x:69,y,strength:3000}];p.capital={x:65,y};
 q.troops=300;q.garrisons=[{id:'foe',x:100,y,strength:300}];q.capital={x:90,y};
 s.buildings=[{id:'target',owner:foe,kind:'city',level:1,x:90,y},{id:'scout',owner:id,kind:'fort',level:3,x:68,y}];
 s.territoryRevision++;
 assert(E.visibleBuilding(s,id,s.buildings[0]),'Known target within fort intelligence');
 assert(E.action(s,id,{type:'setNationTarget',target:foe,enabled:true}).ok);
 return {s,id,foe,p};
}
{
 const {s,id}=scenario(true),before=E.militaryStrength(s,id).total;
 const r=E.action(s,id,{type:'objectiveAttack',x:90,y:39,percent:40});
 assert.equal(r.ok,false,'Sea barrier makes building unreachable by land');
 assert.match(r.error,/No land route/);
 assert.equal(s.attackPlans.length,0,'Rejected order does not create a plan');
 assert.equal(s.armies.length,0,'Rejected order does not move troops');
 assert.equal(E.militaryStrength(s,id).total,before,'Rejected order preserves army');
}
for(const diplomaticChange of ['alliance','withdraw']){
 const {s,id,foe,p}=scenario(false),landBefore=p.land;
 const r=E.action(s,id,{type:'objectiveAttack',x:90,y:39,percent:40});
 assert(r.ok,r.error);assert(s.attackPlans.length>0);
 assert(s.armies.some(a=>a.owner===id&&a.strength>0),'Active objective creates a physical offensive');
 if(diplomaticChange==='alliance')p.allies.push(foe);
 else assert(E.action(s,id,{type:'setNationTarget',target:foe,enabled:false}).ok);
 s.territoryRevision++;
 for(let step=0;step<32;step++)E.combatStep(s);
 assert.equal(p.land,landBefore,'No territory captured after diplomatic authorization ends');
 assert(s.armies.every(a=>a.owner!==id||a.strength<8),'All attacking waves stop');
 assert(E.militaryStrength(s,id).total>0,'Uncommitted and returned soldiers remain accounted for');
}
{
 const {s,id,p}=scenario(false),landBefore=p.land;
 assert(E.action(s,id,{type:'objectiveAttack',x:90,y:39,percent:40}).ok);
 for(let step=0;step<32;step++)E.combatStep(s);
 assert(p.land>landBefore,'Uninterrupted legal objective still makes progress');
}
console.log('PASS v135: sea barriers and revoked diplomatic permission stop objectives without troop creation');
