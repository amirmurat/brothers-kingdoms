'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),{performance}=require('node:perf_hooks'),cp=require('node:child_process');
function load(source){const mod={exports:{}};new Function('module',source)(mod);return mod.exports;}
function fixture(E){
 const s=E.lobby(13);for(let n=0;n<4;n++)E.addPlayer(s,'Nation '+n);E.start(s,0);s.tiles.fill(1);s.owners.fill(0);s.buildings=[];
 for(let y=0;y<E.H;y++)for(let x=0;x<E.W;x++)s.owners[E.idx(x,y)]=1+(x>=80?1:0)+(y>=52?2:0);
 for(const p of s.players){p.land=4160;p.troops=450000;p.capital={x:p.id%2?25:135,y:p.id<3?25:80};p.garrisons=[{id:'g'+p.id,...p.capital,strength:p.troops}];p.res={food:10000,wood:10000,stone:10000,gold:10000};for(let n=0;n<8;n++)s.buildings.push({id:'b'+p.id+'-'+n,owner:p.id,kind:n?'city':'capital',x:p.capital.x+n,y:p.capital.y,level:4});}
 s.territoryRevision++;
 for(const p of s.players){const zone=[];for(let y=5;y<99;y++)for(let x=65;x<95;x++)if(s.owners[E.idx(x,y)]!==p.id)zone.push(E.idx(x,y));for(const q of s.players)if(q.id!==p.id)assert(E.action(s,p.id,{type:'setNationTarget',target:q.id,enabled:true}).ok);assert(E.action(s,p.id,{type:'send',x:zone[0]%E.W,y:Math.floor(zone[0]/E.W),zone}).ok);}
 s.roads=Array.from({length:160},(_,x)=>E.idx(x,25));s.roadRevision++;
 assert(s.armies.length>=4);return s;
}
function measure(E){const s=fixture(E),times=[],wireTimes=[];let columns=0,bytes=0;
 for(let k=0;k<40;k++){let t=performance.now();E.tick(s);for(let j=0;j<3;j++)E.combatStep(s);times.push(performance.now()-t);
 t=performance.now();const text=JSON.stringify(E.networkState(s));E.restoreNetworkState(JSON.parse(text));wireTimes.push(performance.now()-t);bytes+=Buffer.byteLength(text);columns=Math.max(columns,s.armies.reduce((n,a)=>n+(a.columns?.length||0),0));
 for(const p of s.players){assert(Number.isFinite(p.troops)&&p.troops>=0);assert(Math.abs(p.troops-(p.garrisons||[]).reduce((n,g)=>n+g.strength,0))<1e-4);}}
 times.sort((a,b)=>a-b);return {simulationMs:times.reduce((a,b)=>a+b),medianSecondMs:times[20],p95SecondMs:times[38],snapshotMs:wireTimes.reduce((a,b)=>a+b),maxColumns:columns,averageWireBytes:Math.round(bytes/40)};
}
if(require.main===module){const source=fs.readFileSync('engine.js','utf8'),baseline=cp.execFileSync('git',['show','e8a8856a65baa35168785be14bc4a0aed80b8a07:engine.js'],{encoding:'utf8',maxBuffer:2e6});const runs={v99:[],v100:[]};for(let n=0;n<5;n++){runs.v99.push(measure(load(baseline)));runs.v100.push(measure(load(source)));}const med=a=>a.sort((a,b)=>a-b)[2],summary={};for(const key in runs){summary[key]={};for(const metric in runs[key][0])summary[key][metric]=Math.round(med(runs[key].map(r=>r[metric]))*100)/100;}console.log(JSON.stringify({workload:'4 nations, 450k soldiers each, 32 level-4 bases, independent war plans, roads, 40 economy + 160 combat steps, 40 exact snapshot round trips; median of 5 runs',...summary},null,2));}
module.exports={fixture,measure};
