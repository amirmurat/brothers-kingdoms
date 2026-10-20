# Brothers Kingdoms — браузерная стратегия для игры с братьями

**Текущая версия:** v25 (20.10.2026). Мобильная real-time стратегия захвата территорий с приватными комнатами через PeerJS.

**Играть:** https://amirmurat.github.io/brothers-kingdoms/?v=25

**Для ChatGPT/нового чата:** сначала прочитай **[AGENTS.md](AGENTS.md)**, затем **[HANDOFF.md](HANDOFF.md)**. Там содержатся актуальные цели, пользовательские требования, известные ошибки, статус разработки и инструкция продолжения. После следующих релизов обновляй `HANDOFF.md`.

## Правила
- Победа только при контроле **100% захватываемой суши**, без ограничения времени.
- Карта — связный материк; нет портов, флота и морских атак.
- Семь построек: ферма, лесопилка, каменоломня, шахта, казармы, крепость, город.
- Три исследования: экономика, военное дело, логистика.
- Для комнаты с братьями 0 ботов по умолчанию. У ведущего хранится авторитетное состояние игры, его вкладка должна оставаться открытой.

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
