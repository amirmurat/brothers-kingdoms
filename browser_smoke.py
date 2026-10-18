from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).parent
html=(root/'index.html').read_text().replace('href="style.css?v=6"', 'href="style.css?v=6"')
# Inline game scripts to run without PeerJS service; demo mode doesn't need it.
html=html.replace('<link rel="stylesheet" href="style.css?v=6">','<style>'+ (root/'style.css').read_text()+'</style>')
html=html.replace('<script src="engine.js?v=6"></script>','<script>'+ (root/'engine.js').read_text()+'</script>').replace('<script src="game.js?v=6"></script>','<script>'+ (root/'game.js').read_text()+'</script>').replace('<script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"></script>','')
(root/'screens').mkdir(exist_ok=True)
for label,w,h,is_mobile in [('iphone',390,844,True),('small',320,568,True),('landscape',844,390,True),('desktop',1440,900,False)]:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
  context=browser.new_context(viewport={'width':w,'height':h},is_mobile=is_mobile,has_touch=is_mobile,device_scale_factor=1,permissions=['clipboard-read','clipboard-write'])
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(html,timeout=20000,wait_until='domcontentloaded')
  page.locator('#nickname').fill('Amir');page.locator('#demoButton').click()
  page.wait_for_timeout(300)
  assert not page.locator('#game').evaluate('(e)=>e.classList.contains("hidden")'),(label,'game hidden')
  if page.locator('#tutorial').is_visible():page.locator('#closeTutorial').click()
  # find a neutral cell projected near user's territory but not a building via compute from engine in page
  coords=page.evaluate('''() => {const p=window.BKEngine;let q={x:24,y:24};return q;}''')
  canvas=page.locator('#mapCanvas')
  cbox=canvas.bounding_box();assert cbox and cbox['height']>80,(label,cbox)
  # click near capital then target neutral in current viewport
  page.mouse.click(cbox['x']+cbox['width']*.7,cbox['y']+cbox['height']*.52)
  # Test tooltip/help opens
  page.locator('#helpButton').click(force=True)
  assert page.locator('#tutorial').is_visible()
  page.locator('#closeTutorial').click()
  page.locator('#developButton').click()
  assert page.locator('#sidebar').evaluate('(e)=>e.classList.contains("open")')
  page.wait_for_timeout(300)
  page.locator('#closePanel').click(force=True)
  assert not page.locator('#sidebar').evaluate('(e)=>e.classList.contains("open")')
  metrics=page.evaluate('''()=>({canvas:mapCanvas.getBoundingClientRect().toJSON(),topbar:document.querySelector('.topbar').getBoundingClientRect().toJSON(),dock:document.getElementById('battleDock').getBoundingClientRect().toJSON(),pageHeight:document.documentElement.scrollHeight,hasResources:!!document.getElementById('economyToggle'),attackControls:Array.from(document.querySelectorAll('.map-toolbar button')).map(e=>[e.id,Math.round(e.getBoundingClientRect().height)])})''')
  page.screenshot(path=str(root/'screens'/(label+'.png')))
  print(label,'errors=',errors,'metrics=',metrics)
  assert not errors,(label,errors)
  assert metrics['topbar']['y']>=-1,(label,'clipped topbar',metrics['topbar'])
  assert metrics['canvas']['height']>120,(label,'map too short')
  context.close();browser.close()
