# Brothers Kingdoms — карта интерфейса и исходников (v25)
_Актуальный реестр, извлечённый из `index.html` на 20.10.2026. Не путать с визуальным QA: места элементов подтверждены кодом, на физических устройствах не проверены._

## 1. Единственные активные источники
| Задача | Источник |
|---|---|
| HTML, ID и экранные контейнеры | `index.html` |
| Исходный layout и исторические правила (НЕ редактировать, постепенно удалять) | `styles/legacy.css` |
| Единая действующая тема и визуальные компоненты всех экранов | `styles/theme.css` |
| Локальная логика интерфейса, рендер карты, ввод, PeerJS/сетевая синхронизация | `game.js` |
| Игровые правила, атаки, постройки, исследования, дипломатия, захват/победа | `engine.js` |
| PNG объектов и иконок старой пиксельной итерации (только осознанное использование) | `assets/pixel-ui/` |
| Устаревшие снимки CSS и аудиты | `game-v13.css`, `game-v15.css`, `*_AUDIT*.md` и др.; НЕ подключены |

**Критично:** сайт теперь не является автономным HTML. GitHub Pages грузит относительные CSS/JS. При обновлении статики повышать `?v=N` в `index.html` во избежание старого кэша Safari.

## 2. Навигация и игровые состояния
```text
Открыть сайт → #lobby
  Создать комнату → PeerJS host → state.phase=lobby → #waiting
  Войти по коду → PeerJS guest / welcome → state.phase=lobby → #waiting
  Боты / продолжить → state.phase=playing → #game
#waiting
  Ведущий: копировать код/ссылку, игроки, параметры, старт
  Гость: готовность, параметры появления, ожидание ведущего
  Ошибки: PeerJS недоступен, неверный код, слот занят, разрыв сети
#game → #mapView (canvas)
  Основные режимы: обычный → цель атаки (#targetPreview) → приказ;
                    быстрые постройки (#quickBuild) → размещение (#placingBuild);
                    походы / изменение цели / возврат; обзор карты / миникарта
  #sidebar → вкладки строительство, наука, союзы, обзор
  Другие окна: #economyPanel, #armiesPanel, #quickLeadersPanel,
               #contextCard; один основной auxiliary overlay одновременно
  Постоянные элементы: HUD резерв/территория/фронты; 4 ресурса;
                      #gameFeedback; #threatRail; кнопки карты
  Конец: state.phase=ended → #victory (победа / поражение / ничья)
```

## 3. JS-ориентиры (`game.js`, строки на v22)
| Функция | Строка | Назначение |
|---|---:|---|
| `show()` | 59 | видимость экранов |
| `render()` | 333 | state.phase → экран/конец матча |
| `updateUI()` | 365 | обновление HUD, вкладок и данных |
| `updateHudSignals()` | 204 | боевые показатели и предупреждения |
| `updateIncomingAttack()` | 123 | входящие атаки |
| `refreshHudAlert()` | 166 | приоритет событий |
| `createRoom()` | 285 | создание PeerJS-комнаты |
| `joinRoom()` | 291 | ввод кода |
| `connectUpstream()` | 295 | сетевая синхронизация гостя |
| `joinConnection()` | 301 | подключения к хосту |
| `createDemo()` | 319 | одиночная игра/продолжение |
| `startGame()` | 327 | запуск партии |
| `command()` | 328 | передача приказов движку |
| `openPanel()` | 463 | боковое меню |
| `closePanel()` | 464 | закрытие бокового меню |
| `hideAux()` | 68 | закрытие доп. окна |
| `showAux()` | 75 | открытие доп. окна |
| `selectMap()` | 513 | нажатие по земле/постройке |
| `setPreview()` | 244 | проверка цели и дипломатия на карте |
| `contextual()` | 274 | карточка армии/постройки |
| `toggleQuickBuild()` | 434 | каталог быстрого строительства |
| `setBuildingMode()` | 442 | режим размещения |
| `refreshQuickBuild()` | 421 | кнопки и стоимость строений |
| `draw()` | 655 | Canvas-карта |
| `drawMini()` | 749 | миникарта |
| `toast()` | 50 | уведомление |
| `focusThreat()` | 105 | переход к месту нападения |
| `renderArmies()` | 483 | список походов |
| `updateSelection()` | 418 | выбор объекта |

`engine.js`: `action()` обрабатывает `send`, `redirect`, `return`, `build`, `upgrade`, `research`, `diplomacy`, `donate`; также `tick()`, `combatStep()`, `start()`, `previewFront()`, `canBuild()`, `bot()`. **Правила матча: 100% суши, без таймера и флота**.

## 4. Реестр постоянных DOM-ID (168 без повторений)
*Все перечисленные ID извлечены из живого HTML. Динамические строки/кнопки появляются во время рендера JS и приведены ниже.*

### Главное меню / #lobby (10)
- `#hostButton` — `button.start-choice.start-choice-primary`
- `#joinDetails` — `details.join-details`
- `#roomCode` — `input` (Код комнаты)
- `#joinButton` — `button.primary`
- `#demoButton` — `button.start-choice`
- `#resumeButton` — `button.start-choice.hidden`
- `#playerPreferences` — `details.start-settings`
- `#nickname` — `input`
- `#soloBots` — `select`
- `#lobbyError` — `p.error`

### Комната / #waiting (15)
- `#roomHeadingLabel` — `span`
- `#showCode` — `strong`
- `#copyCode` — `button.secondary` (Скопировать код комнаты)
- `#copyLink` — `button.room-share`
- `#roomMembersCount` — `span`
- `#waitingPlayers` — `div.waiting-players`
- `#roomSettings` — `details.room-settings`
- `#roomSettingsSummary` — `span`
- `#botCount` — `select`
- `#spawnChoice` — `select`
- `#readyButton` — `button.secondary.large.hidden`
- `#roomRules` — `p`
- `#startButton` — `button.primary.large`
- `#waitingHint` — `p.room-foot`
- `#leaveRoom` — `button.leave-room`

### Матч · HUD и карта (131)
- `#hudTroops` — `div.top-stat.troop-stat`
- `#troopCount` — `b`
- `#troopGrowth` — `small`
- `#troopReason` — `small.troop-reason.hidden`
- `#troopCap` — `small.stat-aux`
- `#landCount` — `b`
- `#landShare` — `small`
- `#landProgress` — `i`
- `#frontCount` — `b`
- `#networkStatus` — `small`
- `#economyToggle` — `button.square-button` (Экономика и ресурсы)
- `#menuToggle` — `button.square-button.mobile-menu` (Меню развития)
- `#resourceSummary` — `div.top-resources.resource-hud` (Ресурсы королевства)
- `#resFood` — `b`
- `#incFood` — `small` (Изменение в секунду)
- `#resWood` — `b`
- `#incWood` — `small` (Изменение в секунду)
- `#resStone` — `b`
- `#incStone` — `small` (Изменение в секунду)
- `#resGold` — `b`
- `#incGold` — `small` (Изменение в секунду)
- `#gameFeedback` — `div.game-feedback` (Сообщения матча и состояние соединения)
- `#feedbackIdle` — `div.feedback-idle`
- `#feedbackStatus` — `span`
- `#hudAlert` — `button.hud-alert.hidden`
- `#hudAlertIcon` — `span`
- `#hudAlertText` — `span`
- `#gameToast` — `div.game-toast.hidden`
- `#incomingAnnouncement` — `div.sr-only`
- `#myKingdom` — `strong`
- `#mapStatus` — `span`
- `#armiesToggle` — `button.action-armies` (Открыть список походов)
- `#frontCountBadge` — `span`
- `#pauseGame` — `button.develop-button`
- `#helpButton` — `button.square-button` (Правила игры)
- `#zoomOut` — `button.square-button` (Уменьшить)
- `#zoomText` — `span.zoom-label`
- `#zoomIn` — `button.square-button` (Увеличить)
- `#viewAll` — `button.square-button` (Вся карта)
- `#centerMap` — `button.square-button` (Моя столица)
- `#mapView` — `div.map-view`
- `#threatRail` — `div.threat-rail.hidden` (Входящие атаки)
- `#incomingAttack` — `button.incoming-attack` (Перейти к ближайшей угрозе)
- `#incomingTitle` — `strong`
- `#incomingDetail` — `small`
- `#threatExpand` — `button.threat-expand.hidden` (Список входящих атак)
- `#threatCount` — `b`
- `#threatList` — `div.threat-list.hidden` (Список входящих атак)
- `#threatClose` — `button` (Закрыть список угроз)
- `#threatItems` — `div.threat-items`
- `#mapCanvas` — `canvas` (Карта государств. Стрелки передвигают курсор, Enter выбирает цель.)
- `#keyboardPosition` — `div.sr-only`
- `#mapHint` — `div.map-hint`
- `#mapTooltip` — `div.map-tooltip.hidden`
- `#mapStatusMobile` — `div.map-status-mobile.hidden`
- `#accessibleObjects` — `ul.sr-only` (Доступные объекты карты)
- `#minimapWrap` — `div.minimap-wrap`
- `#minimapToggle` — `button` (Скрыть миникарту)
- `#minimap` — `canvas` (Миникарта, Enter переместиться к центру мира)
- `#targetPreview` — `div.target-preview.hidden`
- `#targetTitle` — `strong`
- `#targetDetail` — `span`
- `#targetForecast` — `span`
- `#targetQuickPercents` — `div.target-quick-percents` (Размер армии)
- `#cancelTarget` — `button.secondary`
- `#confirmTarget` — `button.primary`
- `#targetDiplomacy` — `button.target-diplomacy.hidden`
- `#quickBuild` — `div.quick-build.hidden` (Быстрое строительство)
- `#quickBuildInfo` — `button` (Подробные описания зданий)
- `#quickBuildClose` — `button` (Закрыть быстрый выбор зданий)
- `#quickBuildChoices` — `div.quick-build-choices` (Доступные здания)
- `#quickBuildHelp` — `div.quick-build-help`
- `#placingBuild` — `div.placing-build.hidden`
- `#placingBuildIcon` — `img`
- `#placingBuildText` — `span`
- `#changeBuild` — `button` (Выбрать другое здание)
- `#stopBuild` — `button` (Отменить строительство)
- `#gameActionBar` — `div.game-action-bar` (Основные действия)
- `#developButton` — `button.action-build` (Открыть строительство)
- `#battleDock` — `div.map-battle-controls.collapsed`
- `#dockToggle` — `button.dock-toggle` (Настроить размер отправляемой армии)
- `#dockSummary` — `span`
- `#modeLabel` — `strong`
- `#percentLabel` — `div.percent-pill`
- `#attackPercent` — `input` (Процент отправляемых войск)
- `#attackNumbers` — `div.attack-numbers`
- `#sendingTroops` — `b`
- `#remainingTroops` — `b`
- `#activeArmies` — `b`
- `#actionHint` — `p`
- `#cancelMode` — `button.secondary.cancel-mode.hidden`
- `#panelBackdrop` — `div.panel-backdrop.hidden`
- `#closePanel` — `button.square-button` (Закрыть панель)
- `#tab-build` — `section.tab-content`
- `#buildResourceSummary` — `div.resource-strip`
- `#buildingsPanel` — `div.build-grid`
- `#tab-tech` — `section.tab-content.hidden`
- `#techResourceSummary` — `div.resource-strip`
- `#techPanel` — `div.tech-list`
- `#tab-diplomacy` — `section.tab-content.hidden`
- `#diplomacyPanel` — `div.diplomacy-list`
- `#tab-info` — `section.tab-content.hidden`
- `#infoPanel` — `div`
- `#pauseMobile` — `button.secondary`
- `#nextFront` — `button.secondary`
- `#quickLeaders` — `button.secondary`
- `#helpMenu` — `button.secondary`
- `#events` — `div.events`
- `#selectedPanel` — `div.selected-body`
- `#leaderboard` — `div`
- `#auxBackdrop` — `div.aux-backdrop.hidden`
- `#quickLeadersList` — `div`
- `#closeQuickLeaders` — `button.secondary`
- `#closeContext` — `button.context-close` (Закрыть карточку)
- `#contextBody` — `div`
- `#closeArmies` — `button.square-button` (Закрыть список походов)
- `#armiesList` — `div`
- `#economyTitle` — `strong`
- `#closeEconomy` — `button.icon-close` (Закрыть экономику)
- `#economyDetails` — `div`
- `#closeTutorial` — `button.primary.large`
- `#resultSheet` — `section.result-sheet`
- `#resultEmblem` — `div.result-emblem`
- `#victoryEyebrow` — `div.card-eyebrow`
- `#victoryName` — `h1`
- `#victoryDesc` — `p`
- `#victoryReason` — `div.result-reason`
- `#victoryStats` — `div.result-stats`
- `#restart` — `button.primary.large`
- `#resultExit` — `button.result-exit`
- `#downloadSave` — `button.secondary`

### Вне экранов / глобальные уведомления (5)
- `#lobby` — `div.lobby-screen`
- `#waiting` — `div.waiting-screen.hidden`
- `#game` — `div.game-screen.hidden`
- `#toast` — `div.toast.hidden`
- `#gameError` — `div.sr-only`

## 5. Жизненный цикл компонентов и динамические селекторы
Вместо отдельных HTML-ID строения, технологии, игроки, армии, враги и элементы фронта создаются с `innerHTML` в `game.js`. События обрабатываются **event delegation** по data-атрибутам:
- `[data-tab]` — вкладки бокового меню
- `[data-build]` — стройка из бокового меню
- `[data-fast-build]` — каталог быстрого строительства
- `[data-research]` — исследования
- `[data-ally]` — дипломатия
- `[data-donate]` — дипломатия
- `[data-focus-army]` — походы
- `[data-recall-army]` — походы
- `[data-focus-threat]` — список вражеских угроз
- `[data-target-percent]` — размер отправляемой армии
- `[data-percent]` — размер отправляемой армии
- `[data-context-upgrade]` — карточка объекта
- `[data-context-return]` — карточка объекта
- `[data-context-redirect]` — карточка объекта

**Ресурсные экраны:** `#resourceSummary` (HUD), `#buildResourceSummary`/`#techResourceSummary` (вкладки), `#economyDetails` (модальное окно). Все должны отражать одни значения и формат.

**Поверхности и слои:** #panelBackdrop относится к #sidebar; #auxBackdrop к auxiliary; #targetPreview и #quickBuild управляют режимом выбора на карте; #gameToast и #hudAlert живут ВНЕ Canvas в #gameFeedback. Должны оставаться нажимаемы #minimapWrap и кнопки атаки/строительства при отсутствии модального окна.

## 6. Проверка изменений: никакого «забыли экран»
- Главное меню: хост / код приглашения / боты / продолжение / настройки / ошибка; маленький iPhone и landscape
- Комната: хост и гость, готов/не готов, 0 ботов, копирование кода, ссылка, список игроков, выбор старта, правила, выход, ошибки соединения
- Матч: HUD и все 4 ресурса, карта, масштаб/миникарта, атаковать застроенную территорию, предложить союз, режим строительства и его отказ, походы и возвращение
- 4 вкладки бокового меню: постройки / наука / союзы / обзор, их пустые/disabled состояния
- Окна: экономика / походы / лидеры / карточка постройки или армии / обучение / настройки и помощь / результат матча
- Состояния: успех и ошибка приказа, потеря связи, атака врага, несколько фронтов, победа/поражение, закрыть/назад/backdrop, безопасные зоны iPhone
- Каждый CSS/иконный релиз: сверить `#lobby`, `#waiting`, `#game` в одной версии, не только отдельные скриншоты. Дизайн непиксельный; пиксельность карты допустима.

## 7. Признанный технический долг
1. `styles/legacy.css` (~149 KB) содержит переопределяющие исторические слои v6–v19, перенос не равен полной очистке. Не объявлять рефакторинг завершённым.
2. Логика игры в `game.js` (~79 KB) остаётся монолитной, хотя больше не дублируется в HTML. Разбивать только по устойчивым границам с короткой регрессионной проверкой.
3. PNG построек карты ещё стилизованы под pixel-art, несмотря на отказ от **pixel UI**.
4. Оформление требуется подтвердить на реальном iPhone; статическая проверка не доказывает, что перекрытия устранены.

## v23: взаимодействия
- `draw()` рисует линию приказа от столицы, `E.previewFront()` подсвечивает реальный фронт; redirect начинается у армии.
- `#minimapWrap` через `setMinimapExpanded()` по умолчанию свёрнут на экранах меньше 850px.
- Размеры касаний `#dockToggle`, `#developButton`, `#targetQuickPercents`, `.tabbar`, `.map-toolbar` стабилизированы в `styles/theme.css`.
- Иконки: `assets/icons/game.svg`, `assets/icons/controls.svg`, MIT Phosphor. Ссылки локальные, не требующие CDN.

## v24 — карта стабильных карточек
- `updateTechCards(p)` — создание только при смене уровней; кнопка «Исследовать» и статус постоянно в DOM, доступность обновляется без пересоздания.
- `updateBuildCards(p)` — аналогично для доступности построек, перестройка только при изменении технологий/построек.

## v25 — крупные постройки на карте
- `game.js`: `townTileIds` / `townRecipes` / `assembleTownBuildings()` создают 8 изображений 48×48 на вспомогательных Canvas из оригинальных Kenney Tiny Town (CC0) тайлов `assets/tiny-town/tile_XXXX.png`.
- `draw()` рисует строения с опорой у нижнего центра клетки; основание — 1×1 клетка, крыша не обрезается. Старый ассет fallback используется только до загрузки. Спрайты рисуются в порядке по y и имеют стабильный экранный размер.

## v28-neon — полный визуальный охват
- `styles/theme.css`: финальный раздел NEON задаёт цветовую систему для всех трёх экранов и состояний; существующие размеры и зоны касания сохранены.
- `game.js`: BUILDING_PATHS / buildingPaths — единая геометрия символов; SVG `assets/shapes/` используется для каталога и размещения. Старые PNG не загружаются в UI/Canvas.
- Чеклист: главное меню + настройки/ввод; комната + правила/параметры; HUD + карта/миникарта; стройка/размещение; наука; дипломатия; обзор; экономика; походы; карточка; помощь; итог; выбранные/disabled/ошибки/угрозы.

## v29 — согласованные пользовательские пути
| Сценарий | Путь / результат |
|---|---|
| Первый запуск | Имя на главной, можно оставить значение по умолчанию; «Играть одному» сразу запускает матч |
| Настройка | Число ботов только в настройках одиночной; параметры комнаты в комнате; имя и solo-настройка запоминаются |
| Вход по коду | Поле видно на главной, Enter или «Войти»; неверная длина сразу объясняется |
| Приглашение | Ссылка открывает нужную комнату автоматически для сохранённого имени; первый вход просит только имя/«Войти» |
| Комната | Подключение означает готовность, ведущий запускает; старт на карте остаётся необязательным |
| Подключение/ошибка | Кнопки защищены от повторного запуска, есть отмена; устаревшие callback старой сессии игнорируются |
| Меню матча | `sessionPanel`: развитие, пауза solo, карта/походы/помощь, выход; кнопка возврата и backdrop |
| Строительство | Один быстрый каталог + раскрываемые описания; тип → клетка → повторение, одинаково host/guest |
| Приказы | Выбор цели → процент/прогноз → явное подтверждение; изменение/возврат армии доступны в карточке |
| Выход solo | Сохранение → главная → «Продолжить»; ошибка сохранения требует решения пользователя |
| Выход online | Объяснение последствий → подтверждение; ведущий уведомляет о закрытии, гость может вернуться по коду с того же устройства |
| Личное поражение | Результат сразу при потере всех земель; наблюдение, новая solo-партия или безопасный выход |
| Повтор | Solo сразу новая партия; online та же комната и ID участников, без пересоздания приглашения |
| Завершение | Завершённое solo-сохранение удаляется; на главную без лишнего подтверждения |

Новые ID: `cancelConnect`, `sessionPanel`, `closeSession`, `openDevelopment`, `sessionPause`, `sessionReconnect`, `mapTools`, `exitMatch`, `sessionHint`, `exitPanel`, `exitTitle`, `exitExplanation`, `cancelExit`, `confirmExit`, `exitFromOverview`, `spectateMatch`.
Ранее постоянные инструменты карты перенесены в меню матча, ID сохранены. `tab-build` и повтор ресурсов скрыты, меню развития содержит науку/союзы/обзор. Idle-строка соединения скрыта, ошибки и события появляются по необходимости.

Проверка v29: JS/DOM-ID целостность, node tests/lifecycle.cjs, реальный Chromium solo save/resume. Создание online-room прошло, guest join в двух тестовых вкладках вернул timeout; сетевые пути остаются неподтверждёнными. Меню solo автоматически приостанавливает игру.

## v30 — визуальная чистка
- `hudFronts` — доступная с клавиатуры кнопка-счётчик «Походы», открывает существующий список.
- `quickBuildChoices`: 2 колонки, фиксированная высота 76px / описания 120px; цены — cost-unit с resource SVG и подсветкой дефицита.
- `techPanel`: tech-footer объединяет цену и действие; tech-availability сохраняет две строки под недоступность, без лишнего «Доступно».
- Повторные действия Overview и sessionPause визуально скрыты, основные маршруты меню сохранены. Дополнительные инструменты карты имеют tool-label.

## v31 — выравнивание и контраст
- economyToggle удалён; resourceSummary открывает экономику по клику/Enter/Space.
- Метрики верхней панели имеют общую сетку; reserve stat-meta содержит прирост и лимит.
- Цены context-upgrade-price отделены от кнопки улучшения; context-effect показывает текущий/следующий эффект.
- Свёрнутая миникарта 48×48, SVG по центру. hidden имеет приоритет над стилями раскладки.
- Проверки этого прохода только по коду, без браузера.

### v32 — полная миникарта и неподвижное поле
- drawMini уменьшает worldLayer (6 пикселей на клетку) до E.W×E.H вместо обрезания верхнего левого фрагмента.
- gameFeedback перенесён внутрь map-shell и абсолютно позиционирован: появление/исчезновение сообщений не меняет размеры карты и координаты нажатий. Уведомления пропускают касания, кроме кнопки боевой тревоги.
- Проверка по коду без браузера, согласно запросу владельца.

### v33 — прямые действия
- Нижняя панель: Наука / Строить. battleDock скрыт; процент выбирается в карточке цели. scienceButton всегда открывает tech через openSection.
- Союз предлагается/принимается/разрывается через страну; разрыв требует второго нажатия. Вкладка союзов скрыта, старые обработчики сохранены.
- Меню: Обзор, три равные кнопки помощи/всей карты/столицы, выход. Убраны дубли походов, зума и продолжения. Карта/помощь закрывают меню и возобновляют solo.
- Проверка по коду и Node, без браузера.
- Убраны двойные поверхности: внутренняя рамка hudAlert/gameToast, рамки значков главной, summary внутри настроек/правил, вложенная рамка приглашения. Контейнер уведомлений сохраняет единственную общую рамку.

### v34 — поле кода комнаты
- join-inputs исключён из общего правила поверхностей: правило имело повышенную специфичность из-за ID в :is и возвращало лишнюю рамку. У joinDetails и обёртки нет фона/рамки/псевдоподложек; сами input/button сохранены. Проверено по коду, без браузера.
