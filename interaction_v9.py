import asyncio, re
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).parent
async def main():
 async with async_playwright() as p:
  browser=await p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=await browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  html=(ROOT/'index.html').read_text();html=re.sub(r'<script[^>]*>.*?</script>','',html,flags=re.S);html=re.sub(r'<link[^>]+stylesheet[^>]+>','',html)
  await page.set_content(html)
  for f in ('style.css','frontline-v7.css','refined-v9.css'):await page.add_style_tag(content=(ROOT/f).read_text())
  await page.add_script_tag(content=(ROOT/'engine.js').read_text())
  await page.add_script_tag(content="window.__testStore=new Map();")
  code=(ROOT/'game.js').read_text().replace("'use strict';","'use strict'; const localStorage={getItem:k=>window.__testStore.get(k)||null,setItem:(k,v)=>window.__testStore.set(k,v),removeItem:k=>window.__testStore.delete(k)};",1).replace('const TILE=14;','window.__state=()=>({state,myId,zoom,camX,camY});const TILE=14;',1)
  await page.add_script_tag(content=code)
  assert await page.locator('#resumeButton').is_hidden()
  await page.locator('#playerPreferences summary').click();await page.locator('#nickname').fill('Амир')
  await page.locator('#demoButton').click();await page.wait_for_timeout(150)
  assert await page.locator('#game').is_visible()
  # Choose a neutral pixel adjacent to the local eastern frontier and send a verified action.
  xy=await page.evaluate('''()=>{
    const {state,myId,zoom,camX,camY}=window.__state(), E=window.BKEngine, cap=state.players.find(p=>p.id===myId).capital;
    const b=document.querySelector('#mapCanvas').getBoundingClientRect();
    for(let d=5;d<23;d++){
      const x=cap.x+d,y=cap.y;if(E.inside(x,y)&&E.owner(state,x,y)!==myId&&E.tile(state,x,y)&&E.previewFront(state,myId,x,y).cells.length){
        const px=camX+(x+.5)*14*zoom,py=camY+(y+.5)*14*zoom;
        if(px>10&&py>70&&px<b.width-10&&py<b.height-190)return {x,y,px,py};
      }
    }
    return null;
  }''')
  assert xy,'no reachable neutral target in current viewport'
  await page.locator('#mapCanvas').click(position={'x':xy['px'],'y':xy['py']})
  await page.wait_for_timeout(80)
  assert await page.locator('#targetPreview').is_visible(),'target confirmation is missing'
  assert 'участок границы' in (await page.locator('#targetForecast').inner_text()).lower()
  assert await page.locator('#battleDock').is_hidden(),'old control dock must not duplicate percent buttons'
  await page.screenshot(path=str(ROOT/'iphone13-attack-preview.png'))
  count_before=await page.locator('#activeArmies').inner_text()
  await page.locator('#confirmTarget').click();await page.wait_for_timeout(90)
  assert not await page.locator('#targetPreview').is_visible(),'attack confirmation must close preview'
  assert (await page.locator('#activeArmies').inner_text())!='0/12','army should be active'
  await page.locator('#armiesToggle').click()
  assert await page.locator('[data-recall-army]').count()>=1
  await page.screenshot(path=str(ROOT/'iphone13-active-armies.png'))
  await page.locator('[data-recall-army]').first.click();await page.wait_for_timeout(80)
  assert await page.locator('[data-recall-army]').count()==0,'retreat should remove active army'
  print('PASS map select => preview actual frontier => attack => army list => recall',xy)
  # Single player save/resume: set tick=10 and let the autosave interval persist state.
  await page.evaluate('window.__state().state.tick=10');await page.wait_for_timeout(1150)
  assert await page.evaluate("!!window.__testStore.get('bk-v9-save')"),'game should autosave'
  print('PASS solo autosave')
  assert not errors, errors
  print('PASS no JS runtime errors')
  await browser.close()
asyncio.run(main())
