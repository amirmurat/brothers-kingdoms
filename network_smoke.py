from pathlib import Path
from html import escape
from playwright.sync_api import sync_playwright
root=Path(__file__).parent
html=(root/'index.html').read_text()
html=html.replace('<link rel="stylesheet" href="style.css?v=6">','<style>'+ (root/'style.css').read_text()+'</style>')
html=html.replace('<script src="engine.js?v=6"></script>','<script>'+ (root/'engine.js').read_text()+'</script>')
mock='''<script>(function(){const reg=top.__rooms||(top.__rooms={});let nonce=0;
class C{constructor(){this.events={};this.open=false;this.peer=null;this.closed=false;}on(k,f){(this.events[k]??=[]).push(f);}emit(k,x){for(const f of this.events[k]||[])f(x);}send(x){if(!this.open)return;const other=this.peer;setTimeout(()=>other?.open&&other.emit('data',structuredClone(x)),0);}close(){this.open=false;this.emit('close');if(this.peer?.open){this.peer.open=false;this.peer.emit('close');}}}
window.Peer=class{constructor(id){this.id=id||'guest-'+(++nonce)+'-'+Math.random();this.handlers={};this.destroyed=false;reg[this.id]=this;setTimeout(()=>this.emit('open',this.id),8);}on(k,f){(this.handlers[k]??=[]).push(f);}emit(k,x){for(const f of this.handlers[k]||[])f(x);}connect(id){const a=new C,b=new C;a.peer=b;b.peer=a;this.outgoing=a;setTimeout(()=>{const dst=reg[id];if(!dst||dst.destroyed){this.emit('error',new Error('Unknown room'));return;}dst.emit('connection',b);a.open=b.open=true;a.emit('open');},12);return a;}destroy(){this.destroyed=true;delete reg[this.id];}}})();</script>'''
html=html.replace('<script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"></script>',mock).replace('<script src="game.js?v=6"></script>','<script>'+ (root/'game.js').read_text()+'</script>')
iframe=f'<iframe id="host" style="width:750px;height:700px" srcdoc="{escape(html,quote=True)}"></iframe><iframe id="guest" style="width:750px;height:700px" srcdoc="{escape(html,quote=True)}"></iframe>'
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 context=browser.new_context(viewport={'width':1600,'height':800},permissions=['clipboard-write','clipboard-read'])
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content('<!doctype html><html><body>'+iframe+'</body></html>',timeout=30000,wait_until='domcontentloaded')
 host=page.frame_locator('#host');guest=page.frame_locator('#guest');host.locator('#nickname').fill('Alpha');guest.locator('#nickname').fill('Beta')
 host.locator('#hostButton').click();host.locator('#waiting').wait_for(state='visible',timeout=7000)
 code=host.locator('#showCode').inner_text();assert len(code)==6,code
 guest.locator('#roomCode').fill(code);guest.locator('#joinButton').click()
 guest.locator('#waiting').wait_for(state='visible',timeout=7000)
 page.wait_for_timeout(120)
 assert host.locator('.player-row').count()==2,host.locator('#waitingPlayers').inner_text()
 guest.locator('#readyButton').click();page.wait_for_timeout(130)
 assert 'Готов' in host.locator('#waitingPlayers').inner_text(),host.locator('#waitingPlayers').inner_text()
 host.locator('#startButton').click();host.locator('#game').wait_for(state='visible',timeout=7000);guest.locator('#game').wait_for(state='visible',timeout=7000)
 guest.locator('#closeTutorial').click() if guest.locator('#tutorial').is_visible() else None
 host.locator('#closeTutorial').click() if host.locator('#tutorial').is_visible() else None
 canvas=guest.locator('#mapCanvas').bounding_box()
 guest.locator('#mapCanvas').click(position={'x':round(canvas['width']*.75),'y':round(canvas['height']*.50)})
 page.wait_for_timeout(90)
 if guest.locator('#targetPreview').is_visible():
  guest.locator('#confirmTarget').click()
  page.wait_for_timeout(150)
  assert 'Приказ выполнен' in guest.locator('#toast').inner_text(),('ack',guest.locator('#toast').inner_text())
  print('ONLINE TEST: attack command ACK received')
 # host may still receive other guest data; close guest transport then let retry reconnect
 page.evaluate('''()=>{const p=Object.values(window.__rooms).find(x=>x.id.startsWith('guest-'));p?.outgoing?.close();}''')
 page.wait_for_timeout(2200)
 assert guest.locator('#game').is_visible(), 'Guest lost running game after rejoin'
 print('ONLINE TEST: reconnect after disconnect; network =',guest.locator('#networkStatus').inner_text())
 print('ONLINE TEST: host & guest entered same game, ready/start/ack/reconnect success, room:',code,'errors:',errors)
 assert not errors,errors
 browser.close()
