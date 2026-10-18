from pathlib import Path
from html import escape
import re
from playwright.sync_api import sync_playwright
root=Path(__file__).parent
html=(root/'index.html').read_text()
for f in ('style.css','frontline-v7.css','refined-v9.css'):
 html=html.replace(f'<link rel="stylesheet" href="{f}?v=9">',f'<style>{(root/f).read_text()}</style>')
for file in ('engine.js','game.js'):
 html=html.replace(f'<script src="{file}?v=9"></script>',f'<script>{(root/file).read_text()}</script>')
mock='''<script>(function(){const reg=top.__rooms||(top.__rooms={});let nonce=0;
class C{constructor(){this.events={};this.open=false;this.peer=null;this.closed=false;}on(k,f){(this.events[k]??=[]).push(f);}emit(k,x){for(const f of this.events[k]||[])f(x);}send(x){if(!this.open)return;const other=this.peer;setTimeout(()=>other?.open&&other.emit('data',structuredClone(x)),0);}close(){this.open=false;this.emit('close');if(this.peer?.open){this.peer.open=false;this.peer.emit('close');}}}
window.Peer=class{constructor(id){this.id=id||'guest-'+(++nonce)+'-'+Math.random();this.handlers={};this.destroyed=false;reg[this.id]=this;setTimeout(()=>this.emit('open',this.id),8);}on(k,f){(this.handlers[k]??=[]).push(f);}emit(k,x){for(const f of this.handlers[k]||[])f(x);}connect(id){const a=new C,b=new C;a.peer=b;b.peer=a;this.outgoing=a;setTimeout(()=>{const dst=reg[id];if(!dst||dst.destroyed){this.emit('error',new Error('Unknown room'));return;}dst.emit('connection',b);a.open=b.open=true;a.emit('open');},12);return a;}destroy(){this.destroyed=true;delete reg[this.id];}}})();</script>'''
html=html.replace('<script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"></script>',mock)
iframe=f'<iframe id="host" style="width:530px;height:820px" srcdoc="{escape(html,quote=True)}"></iframe><iframe id="guest" style="width:530px;height:820px" srcdoc="{escape(html,quote=True)}"></iframe>'
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1150,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html><body>'+iframe+'</body></html>',wait_until='domcontentloaded')
 host=page.frame_locator('#host');guest=page.frame_locator('#guest')
 host.locator('#hostButton').click();host.locator('#waiting').wait_for(state='visible',timeout=5000)
 code=host.locator('#showCode').inner_text();assert len(code)==6,code
 guest.locator('#joinDetails summary').click();guest.locator('#roomCode').fill(code);guest.locator('#joinButton').click()
 guest.locator('#waiting').wait_for(state='visible',timeout=5000)
 page.wait_for_timeout(180)
 assert host.locator('.player-row').count()==2,host.locator('#waitingPlayers').inner_text()
 guest.locator('#readyButton').click();page.wait_for_timeout(160)
 assert 'Готов' in host.locator('#waitingPlayers').inner_text()
 host.locator('#startButton').click();host.locator('#game').wait_for(state='visible',timeout=6500);guest.locator('#game').wait_for(state='visible',timeout=6500)
 print('PASS host creates room -> guest joins -> ready -> shared match',code)
 assert not errors,errors
 browser.close()
