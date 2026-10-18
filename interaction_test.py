from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).parent
html=(root/'index.html').read_text().replace('<link rel="stylesheet" href="style.css?v=6">','<style>'+ (root/'style.css').read_text()+'</style>')
html=html.replace('<script src="engine.js?v=6"></script>','<script>'+ (root/'engine.js').read_text()+'</script>').replace('<script src="game.js?v=6"></script>','<script>'+ (root/'game.js').read_text()+'</script>').replace('<script src="https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js"></script>','')
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 page=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded');page.locator('#nickname').fill('Amir');page.locator('#demoButton').click()
 if page.locator('#tutorial').is_visible():page.locator('#closeTutorial').click()
 c=page.locator('#mapCanvas').bounding_box();cx=c['width']/2;cy=c['height']/2
 # attack preview never applies an order until confirmed
 before=page.locator('#troopCount').inner_text()
 page.locator('#mapCanvas').click(position={'x':round(cx+125),'y':round(cy+6)})
 assert page.locator('#targetPreview').is_visible(),'no target preview'
 assert page.locator('#troopCount').inner_text()==before,'accidental automatic attack'
 page.locator('#cancelTarget').click()
 assert not page.locator('#targetPreview').is_visible(),'cancel failed'
 print('PASS: click previews target without sending; cancel works')
 # invalid build must keep selected building mode
 page.locator('#developButton').click();page.wait_for_timeout(260)
 page.locator('#buildingsPanel [data-build="farm"]').click()
 page.wait_for_timeout(250)
 assert 'Построить' in page.locator('#modeLabel').inner_text()
 page.locator('#mapCanvas').click(position={'x':round(cx+155),'y':round(cy)})
 assert 'Построить' in page.locator('#modeLabel').inner_text(),'invalid building aborted build mode'
 print('PASS: invalid farm remains in build mode')
 # pause game: game timer does not change until resumed
 page.locator('#cancelMode').click()
 page.locator('#economyToggle').click()
 page.locator('#pauseMobile').click()
 a=page.locator('#timeLeft').inner_text();page.wait_for_timeout(1150);b=page.locator('#timeLeft').inner_text()
 assert a==b,('pause failed',a,b)
 page.locator('#pauseMobile').click();page.wait_for_timeout(1100)
 assert a!=page.locator('#timeLeft').inner_text(),'resume failed'
 print('PASS: mobile pause/resume works')
 assert not errors,errors
 browser.close()
