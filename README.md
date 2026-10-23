# Brothers Kingdoms — браузерная стратегия для игры с братьями

**Основная игра:** https://brothers-kingdoms.murat-amir-olzhasuly.workers.dev/ (Cloudflare Workers/Durable Objects).

**Рабочая ветка:** `design/visual-review-v26`. `main` и GitHub Pages — старые версии игры. Фактическую клиентскую версию проверяй в актуальном `index.html` и на развернутом Cloudflare-сайте, а не по устаревшему номеру в документации.

**Для нового чата:** прежде всего **[AGENTS.md](AGENTS.md)** — обязательный краткий стиль, ускоренные самостоятельные итерации, шесть стадий решения проблем и защита от выбора неверной ветки. Затем свежие записи **[HANDOFF.md](HANDOFF.md)** и относящиеся к задаче исходники.

## Правила
- Победа только при контроле **100% захватываемой суши**, без ограничения времени.
- Карта — связный материк; нет портов, флота и морских атак.
- Автоматическая добыча на захваченных месторождениях; выбор сбалансированного производства или приоритета ресурса. Города дают рабочих; города, казармы и форты строят рабочие. Старые добывающие здания совместимы с сохранениями.
- Три исследования: экономика, военное дело, логистика.
- Для комнаты с братьями 0 ботов по умолчанию. Авторитетное состояние хранится на сервере; владелец комнаты управляет стартом и паузой.

## Последние UX-изменения
- v15: быстрый каталог построек прямо на карте, подсветка разрешённых/запрещённых клеток, радиус крепости, панорамирование краёв карты, менее мешающие уведомления.
- v16: улучшение читаемости лобби и кода комнаты, приглашений, настроек, поведения окон и перекрывающих уведомлений.
- v17: список отдельных атак с переходом к фронту, порядок по расстоянию до столицы; исправление повторного открытия контекстной карточки и переходов между окнами, отдельная позиция тревоги под мобильным тулбаром.
- v18: одна постоянная компактная строка игровых сообщений под ресурсами; обычные уведомления и предупреждения не закрывают миникарту, карту и боевые кнопки. Приоритет критической тревоги над прочими сообщениями, видимый статус соединения. Игровой HUD не плавает поверх карты.
- v19: чужие здания больше не блокируют выбор территории для атаки; союзы можно предлагать и принимать прямо на карте; отправка армии на союзника запрещена движком.
- v20: первый проход пиксельного оформления с Kenney; Pixelify Sans оказался неудобным для чтения.
- v21: единый читаемый системный шрифт на всех экранах; 8 пиксельных рисунков построек в меню и на карте; заменены старые SVG в лобби, HUD, приглашениях, кнопках карты и походов. Формы и состояния UI унифицированы. Правила не менялись.
- **Важно:** после v16 пользователь не подтверждал удобство на реальном Safari; полноценные тесты v16 были пропущены по его просьбе ради скорости. Не утверждать, что всё протестировано.

- v22: исходники CSS/движка/логики вынесены из HTML, введена единая активная тема для главного меню, комнаты и матча, удалены устаревшие CSS-переопределения пиксельной темы. Добавлена полная навигационная карта интерфейса `docs/GAME_MAP.md`.

## Структура
- `index.html` — HTML-структура для GitHub Pages; подключает внешние файлы, больше **не является автономным bundle**.
- `engine.js` — единственный активный игровой движок; `game.js` — активная логика рендера, ввода, сетевого мультиплеера и UI.
- `styles/legacy.css` — старые CSS-слои v6–v19 (совместимость/разметка, на постепенное удаление); **не добавлять сюда стили**.
- `styles/theme.css` — единый активный набор визуальных правил для главного меню, комнаты и матча. Новые правки дизайна только здесь.
- `docs/GAME_MAP.md` — полная карта HTML-ID, экранов, режимов, JS-функций и дизайн-зон.
- `game-v13.css`, `game-v15.css` и другие старые версии — архивные исходники, не подключены к сайту.
- `UX_AUDIT_V15.md`, `DEEP_UI_AUDIT.md`, `UI_V13_STATUS.md` — исторические отчёты с полезными деталями, но не всегда отражают последнюю версию.

## Как работать с владельцем
Пользователь хочет **играть на сайте, а не скачивать сборки**. Не готовь ZIP/прочие загрузки без отдельной просьбы. Предпочитает быстрые заметные исправления и профессиональные игровые ассеты, а не поверхностные аудиты и простые SVG. После публикации дай ссылку на игру и честно укажи непроверенные случаи.

Полный рабочий контекст — **[HANDOFF.md](HANDOFF.md)**.

## Пиксельные ассеты и лицензии v20
- Kenney **UI Pack – Pixel Adventure**: https://kenney.nl/assets/ui-pack-pixel-adventure — CC0 1.0, рамки интерфейса.
- Kenney **RTS Medieval (Pixel)**: https://kenney.nl/assets/rts-medieval-pixel — CC0 1.0, ресурсные и командные спрайты.
- Текст: системный шрифт устройства; Pixelify Sans удалён в v21 из-за проблем с читаемостью.

### v23 — UX управления
- Предпросмотр атаки теперь начинается от столицы, а реальный фронт по-прежнему подсвечивается отдельно.
- На мобильном миникарта изначально свёрнута, открытие через кнопку 48px.
- Размеры основных кнопок, процентов атаки и вкладок стандартизированы.
- Иконки ресурсов, действий, науки и меню заменены официальной библиотекой Phosphor (MIT). Лицензия в `assets/icons/LICENSE.txt`.

### v24 — стабильные кнопки
- Карточки науки и строительства не пересоздаются при изменении ресурсов. Суммы и доступность обновляются на месте; размер кнопок и строк состояния постоянный.

### v25 — крупные здания Kenney Tiny Town
- Семь зданий и столица собираются из оригинальных тайлов **Kenney Tiny Town** (CC0, 16×16, 3/4). В карте используется компоновка 3×3 (48×48) с тематическими декоративными элементами: ферма, лесопилка, каменоломня, шахта, казармы, крепость, город, столица.
- Основание занимает одну игровую клетку, а высокая крыша выходит вверх без обрезания; изображения заметнее на мобильном, при этом игровые координаты и логика не изменены.
- Источник и лицензия: https://kenney.nl/assets/tiny-town (CC0). Тайлы: `assets/tiny-town/`; отрисовка: `game.js`.

### v48 — Barracks / Reserve camp icon
- **Medieval Pavilion** (Barracks) and **Barn** (Farm) by **Delapouite** — [Pavilion](https://game-icons.net/1x1/delapouite/medieval-pavilion.html), [Barn](https://game-icons.net/1x1/delapouite/barn.html), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Black backgrounds removed, fills changed to #eef2f8; thin white outline added on Canvas map.
- **Dark Squad** (Reserve) by **Lorc** — [source](https://game-icons.net/1x1/lorc/dark-squad.html), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). Black background removed, fill changed to #eef2f8.
- Adaptations: original black background removed, pavilion recolored to `#eef2f8`, and same vector geometry reused for map building marker. Attribution is also visible in the game's Help panel.

### v52 — color-coded licensed shapes
All assets adapted from [Game-icons.net](https://game-icons.net/) under [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
- [Medieval Pavilion](https://game-icons.net/1x1/delapouite/medieval-pavilion.html) — Delapouite.
- [Barn](https://game-icons.net/1x1/delapouite/barn.html) — Delapouite.
- [Axe in Stump](https://game-icons.net/1x1/lorc/axe-in-stump.html) — Lorc.
- [Tumulus](https://game-icons.net/1x1/cathelineau/tumulus.html) — Cathelineau.
- [Gold Mine](https://game-icons.net/1x1/delapouite/gold-mine.html) — Delapouite.
- [Defensive Wall](https://game-icons.net/1x1/heavenly-dog/defensive-wall.html) — HeavenlyDog.
- [Qaitbay Citadel](https://game-icons.net/1x1/delapouite/qaitbay-citadel.html) — Delapouite.
- [Dark Squad](https://game-icons.net/1x1/lorc/dark-squad.html) — Lorc.
- [Stone Pile](https://game-icons.net/1x1/delapouite/stone-pile.html) — Delapouite.

Adaptations: original black backgrounds removed, fills recolored for visibility, and buildings outlined with a thin white stroke on Canvas. Palette: Farm orange, Lumber green, Quarry silver-blue, Mine gold, Barracks blue, Fort coral, City purple, Reserve light blue, Stone blue-gray. No artwork generated.

### v54 — Draw-to-plan conquest (preview)
- New Attack button: drag a loop from owned land across one enemy/neutral region and back to owned land; only a confirmed planned region can be conquered by human players. Confirmation selects 15–95% troops and declares war once for a hostile nation. Ongoing fronts remain inside the outlined cells, can be cancelled by tapping the region, and mutually agreed peace stops current wars.
- War & Peace chip opens when in conflict; offers and acceptance are available between human countries. Bots may attack using their automated border selection and do not accept peace proposals.
- Work remains on preview branch `design/visual-review-v26`; iPhone Safari UI and real multiplayer have not been physically tested.

### v55 — Paint attack zones (preview)
- Attack now uses a direct tile brush instead of a closed outline. Multiple strokes build one area; Clear resets it; Review attack checks border contact, connectivity, single target owner and the 2–3,500 cell limit. Edit area preserves painted cells. Existing conquest, war and peace remain host-authoritative. Preview branch only; physical Safari and multiplayer tests pending.

### v56 — direct brush attack UX (preview)
- Brush size (1–6 tile radius) and committed troops (5–95%) sliders now share the Paint Attack Zone panel. The Exit, Clear and Start offensive buttons are aligned on one row; Start dispatches the validated painted region directly, with no second review step. Ordinary taps outside your kingdom no longer show the old attack arrow. Host-authoritative zone, war and peace mechanics remain. iPhone Safari and live multiplayer still need testing.

### v57 — Persistent offensive plans (preview)
- Painted zones remain on the map after a wave stops. The host keeps the original zone and automatically launches the next wave against uncaptured cells once sufficient troops have recovered. Players can cancel the entire plan from its highlighted area or the Offensives list; the plan ends when the region is fully controlled or a peace treaty is accepted. Existing solo saves with active painted waves migrate on the next tick. Rules stay server authoritative. iPhone Safari and real multiplayer are still unverified.

### v59 — Adaptive attack permissions (preview)
- An offensive's painted region can include neutral land and several kingdoms. In the same compact paint panel, choose each country to attack: neutral is selected by default, other kingdoms are opt-in, and allies are disabled. Unselected regions remain in the plan but are never conquered. Host-side validation and each new wave use the current tile owners and explicit permissions. Plans wait for eligible borders without being discarded. Tap an existing region or use Edit in Offensives to change the shape, target countries or troop percentage. Only an explicit choice declares a new war. Peace revokes the affected permission and stops that front without cancelling unrelated objectives. Programmatic engine and UI simulations passed; physical Safari and multiplayer are still unverified.

### v60 — Unified attack plans, eraser, whole-front waves
- Overlapping painted plans belonging to the same kingdom merge into one. Eraser removes individual selected tiles; an existing plan can be edited without deleting everything. Country opt-in/out permissions remain authoritative. Each wave now captures the whole currently accessible approved border as one atomic step; with insufficient committed troops the plan remains visible while waiting for reserves. Preview branch only; physical iPhone and live multiplayer testing remain pending.

### v61 — Compact mobile offensive editor (preview)
- The former Attack action is replaced with Paint and Eraser icon buttons permanently available along the map's right edge. Tap either to enter planning; choose the other without losing the region; tap the active tool again to close. Brush size and troop commitment appear as slim vertical sliders on the left only while planning. A small bottom bar retains the necessary Exit, Clear/Reset and Start/Save actions and opponent permissions. Uses original Lucide Paintbrush/Eraser art under ISC license; license included. Simulator UI checks passed, but real iPhone Safari and network play are still unverified.

### v62 — Four compact map tools and independent saved-plan eraser
- Paint, Eraser, Build and Research now share four matching icon-only buttons along the right edge of the map; the old bottom Build/Research action bar is gone. Tapping Eraser directly (even after leaving paint mode) activates a global eraser for **all your saved offensive plans**. Brush over their marked regions to trim individual tiles, including multiple plans in a single stroke; no confirmation step is needed. The left brush-size slider stays visible, the troop slider stays hidden, and two fingers still pan/pinch without deleting cells. Plans of other players and actual captured territories are unaffected; erasing a plan's last cell cancels only that plan. Existing painting/local erasing, construction and research workflows remain intact. The game continues to use its fixed preview-branch URL. Programmatic tests passed, but physical iPhone Safari and live multiplayer remain unverified.

### v65 — Nations diplomatic controls and active wartime recovery (preview)
- The Wars chip is now an always-visible Nations button with a country flag. Choose a specific nation and tap Attack to enable it globally for all saved or future painted plans; this declares war. Stop attacks disables offensive targeting but does not sign peace. In the same country card, propose or accept peace, offer or accept alliances, or end an alliance (with the current restrictions on bots). Paint stays strictly geographical: no more per-plan opponent chips, and opening Nations does not discard an unfinished drawing. Neutral land remains selectable.
- Recovering territory is always defensive while war persists, even when the opponent is not enabled under Nations Attack. Large recovery borders now progress in affordable distributed sectors rather than waiting indefinitely for enough troops to cover the whole front; manually painted offensives still expand their entire affordable frontline at once. Source version v65-nations. Check Game v65 in the Match menu; multiplayer host must reload. Programmatic engine/UI tests passed; actual iPhone Safari testing not verified.
