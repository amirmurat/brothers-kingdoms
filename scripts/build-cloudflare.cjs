const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
for(const file of ['index.html','game.js','engine.js','styles','assets'])fs.cpSync(path.join(root,file),path.join(out,file),{recursive:true});
const html=fs.readFileSync(path.join(out,'index.html'),'utf8');
fs.writeFileSync(path.join(out,'index.html'),html.split('\n').filter(line=>!line.includes('unpkg.com/peerjs')).join('\n'));
fs.writeFileSync(path.join(out,'server-config.js'),"window.BK_SERVER=true;\n");
console.log('Built existing game assets for Cloudflare');
