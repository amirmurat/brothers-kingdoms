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

### v35 — система значков
- Главная/наука/закрытия: SVG существующего Phosphor вместо символов шрифта, единый оптический размер.
- Здания: кольцо, ёлка, полый ромб, крест, двойной шеврон, квадратная крепость, столбцы города, звезда столицы. Одни пути для Canvas и assets/shapes. Размер на карте увеличен.
- Армии: цветной направленный шеврон к фактической цели вместо круга с неизменной текстовой стрелкой. Правила/хитбоксы не изменены. Проверка по коду без браузера.

### v36 — армии клетками фронта, цветные показатели
- Армии рисуются подсветкой клеток следующего слоя захвата, без значка/числового бейджа/линии. engine хранит frontCells на армии при приказе/редиректе/шаге боя; данные входят в обычный snapshot для гостей. Механика захвата не изменена. Список походов сохраняет численность/действия.
- Верхние метрики и ресурсы получили разные приглушённые фоны/цвета. setRate задаёт data-trend для плюса/минуса/нуля, ноль без знака плюс.
- Проверки по коду и Node без браузера.

### v37 — спокойная верхняя панель и меню
- Цветные фоны метрик v36 удалены из активного блока. Единый графитовый фон, белые значения, серые подписи; цвет только у ресурсных SVG и signed rates. Верх 60px + ресурсы 58px, единая сетка и вариант для узкого/landscape.
- Меню без плиток: Обзор, Помощь, Вся карта, К столице; выход отделён линией. menuToggle без рамки, область касания 44px сохранена.
- hudNumber сокращает запасы/резерв от 10000 для узкого экрана; полные значения в экономике/title. Проверки Node/синтаксиса без браузера.

### v38-align — компактная соосная верхняя панель (20.10.2026)
- Верхняя строка (резерв, земля, походы, меню) и строка четырёх ресурсов используют одинаковые четыре равные колонки и симметричные поля. Все показатели, значения и доходы выровнены по центру своих колонок, вместо смещения подписи относительно цифры.
- Высота шапки сокращена 60→50px, ресурсов 58→46px (в коротком landscape 44+42px); зона нажатия меню осталась 44×44px. Цвета трендов и значков сохранены. Кэш статики переключён на v38-align.
- Изменена только геометрия HUD в styles/theme.css и ссылки кэша в index.html; логика игры не затронута. Проверка по исходникам, без физического Safari и полноценного браузерного прогона. Ветка design/visual-review-v26; main остаётся отдельной.

### v39 — поля HUD и привязка меню (20.10.2026)
- По исправленному скриншоту с iPhone: геометрия v38 в целом соосна, но обе строки слишком близки к физическим краям. Синхронные внешние поля увеличены 8→18px для верхних метрик и четырёх ресурсов; на ≤360px 6→12px во избежание тесноты.
- Кнопка меню остаётся в четвёртой колонке общей сетки, 44×44px и по вертикальному центру, но получила умеренный фон/контур, корректный размер SVG 22px и фокус для клавиатуры. Обработка нажатий и число колонок не изменены.
- Кэш-метка v39-hud-gutter; изменения в ветке design/visual-review-v26, main не изменена. Реальная проверка на iPhone/Safari и игровой мультиплеер не проводились.

### v40 — вертикальные отступы HUD, меню без рамки (20.10.2026)
- По скриншоту владельца увеличена высота HUD: показатели 50→64px, ресурсы 46→62px; добавлены вертикальные отступы, равномерная сетка и боковые поля v39 сохранены. Короткий landscape получает 52+50px.
- Кнопка меню без фона, рамки и тени; кнопка сохраняет область касания 44×44px, пиктограмма увеличена до 30px. В Phosphor-спрайте controls.svg три линии symbol#list сделаны действительно толще геометрически, а не ненадёжным CSS stroke на <use>.
- Версия ресурсов v40-vertical, ветка design/visual-review-v26, основная ветка не изменена. Проверки исходников; настоящий Safari и многопользовательский матч не проверены.

### v41 — English-only UI + long-press selection prevention (20.10.2026)
- Переведены статические строки HTML/ARIA и все видимые сообщения game.js, ошибки, названия объектов/исследований, имена ботов и события из engine.js. HTML lang=en, формат чисел en-US и десятичная точка. В active `index.html`, `game.js`, `engine.js` отсутствует кириллица в исходнике.
- Отключены user-select и iOS touch-callout на сайте, а также selectstart за пределами редактируемых полей; inputs и textarea по-прежнему выделяемы. На canvas уже есть contextmenu preventDefault, pointer-жесты не заменены.
- Код игровых правил не переписан, изменена локализация/поведение native selection. Проверены JS syntax и простая симуляция запуска матча с ботами; реальный Safari/iPhone и сетевой гость не проверены. Основная ветка main без изменений; рабочая ветка design/visual-review-v26.

### v42 — duplicate Economy dialog removed (20.10.2026)
- Удалено окно #economyPanel, включая DOM, обновление динамических данных, обработчики, ссылки и ARIA. #resourceSummary теперь статичная строка HUD (role=group), только показывает ресурсы и изменения в секунду.
- Предупреждение о нехватке еды теперь открывает строительство (фермы), а не удалённую экономику. В инструкции указано строительство ферм и городов.
- Столица сохранена: стартовая точка, центрирование камеры, сильная защита в радиусе 3 клеток, штраф армии при её захвате; захват столицы не завершает матч. Игровые правила неизменны.
- Preview branch `design/visual-review-v26`; проверен JS синтаксис, на реальном Safari UI ещё не проверен.

### v43 — компактное меню матча (20.10.2026)
- С учётом скриншота владельца меню сокращено до двух одинаковых действий Overview / Help и отдельно Leave match. Удалены видимые пункты Full map / To capital; подсказка стала короче, отступы/высота/иконки выровнены единым блоком CSS.
- Зум и map-view кнопки удалены из меню, но скрытые zoom controls для прежних внутренних обработчиков остались. Клавиатурный Enter на миникарте продолжает вписывать карту в экран через fitWorld вместо удалённого #viewAll; функция центрирования по столице сохраняется для стартовой камеры и угроз, но кнопки больше нет.
- Меню автоматически ставит одиночную игру на паузу; выход, обзор, справка и восстановление соединения сохранены. Изменены index.html / game.js / styles/theme.css. QA: синтаксис JS + проверка DOM-ID; iPhone/Safari не проверен. Только preview ветка, main не меняли.

### v44 — Leaderboard вместо Overview, Research только исследования (20.10.2026)
- Окно матча открывает Leaderboard, в рейтинге все активные игроки, порядковые номера, территория в % и клетках, подсветка своей строки.
- Research теперь имеет единственный экран: три исследования, их эффекты и цены, без вкладок, статистики и повторов ресурсов. Дипломатия остаётся через выделение земли соперника, Build работает отдельно.
- Убраны обработчики удалённого Overview и лишних боковых разделов; DOM IDs и JS синтаксис проверены. Кэш v44-leaderboard-research; реальный iPhone/Safari и multiplayer не проверены. Только preview-ветка, main не меняли.

### v45 — Leaderboard Close fix (20.10.2026)
- Исправлен подтверждённый баг v44: после удаления старого Overview обработчик `#closeQuickLeaders` отсутствовал. Назначен `hideAux`, одинаково с другими modal-кнопками закрытия. Окно, рейтинг, экран Research, остальные маршруты не менялись.
- JS syntax и наличие кнопки в DOM проверены, реальная проверка на iPhone/Safari всё ещё требуется. Preview-ветка `design/visual-review-v26`, `main` не изменён.

### v46 — compact context-sized alert chip under HUD (20.10.2026)
- По скриншоту уведомление занимало всю ширину карты, хотя сообщение было коротким. GameFeedback сделал по ширине содержимого (максимум 360px / доступная ширина), оставив положение слева под HUD, отступ 10px, высоту 36px, без отдельной видимой рамки и тени. Критические алерты используют отдельный насыщенный фон и могут быть шириной до 390px.
- Стрелка теперь видна только у событий, открывающих действие (`data-actionable`). Событие `Offensive ended` больше не ведёт в список активных армий, потому что завершённой армии там уже нет; уведомление пассивное, показывается 3 секунды. Обработчики реальных угроз и других actionable-сообщений не изменены.
- Проверены JS syntax / HTML arrow / CSS markers, preview branch `design/visual-review-v26`; реальный Safari iPhone не проверен. Main не изменён.

### v47 — explicit content-fit of alert and toast (20.10.2026)
- Устранён конфликт старого `width:100%!important` у внутренних `#hudAlert/#gameToast`, который мог продолжать растягивать уведомление внутри компактного контейнера v46. Теперь `width:auto; max-width:100%` гарантирует контентную ширину, не затрагивая обработку алертов.
- Кэш v47-alert-fit, preview branch, iPhone Safari не проверен.

### v48 — Medieval Pavilion №8 для Barracks и Reserve (20.10.2026)
- По выбору владельца использован настоящий оригинальный SVG Delapouite из официального game-icons/icons, CC BY 3.0. Удалён чёрный фон, палатка перекрашена #eef2f8, автор указан в README и Help.
- Один локальный файл `assets/shapes/barracks.svg` используется для иконки Barracks в Build, превью постановки и рядом с RESERVE; геометрия карты синхронизирована оригинальным path 512×512 с корректным масштабом. Игровые правила не менялись.
- Version v48-camp-icon, preview ветка design/visual-review-v26; JS синтаксис и ссылки проверены, визуальный iPhone/Safari ещё не проверен.

### v49 — яркий контур казармы, подготовлен переход в новый чат (20.10.2026)
- В `game.js` заменена тёмная обводка только у `barracks` на чисто белую, ширина в локальных координатах 512 увеличена 24→30. Остальные здания и игровая логика не затронуты. Сохранены оригинальные ресурсы Medieval Pavilion и атрибуция CC BY 3.0.
- Кэш `v49-visible-camp`; новый чат должен продолжать с HEAD preview-ветки и проверять изменения на iPhone. Подтверждена статическая JS-проверка; реальные масштаб/контрастность в Safari ещё не проверены.
- Текущий чат тормозит; актуальное состояние и инструкции перенесены в начало HANDOFF, старое вводное описание v25 помечено как историческое.

### v50 — тонкая обводка казармы (20.10.2026)
- `draw()` в `game.js`: `barracks` получает белую обводку шириной 12 единиц в SVG-пространстве 512, масштабируемую вместе с Canvas/zoom, без минимального экранного размера. Остальные виды зданий без изменений. `index.html`: `game.js?v=50-thin-camp`.

### v51 — Farm / Reserve icons (20.10.2026)
- Farm: SVG `assets/shapes/farm.svg` (Delapouite Barn) and `BUILDING_PATHS.farm` both use 512 coordinates; `draw()` draws thin white 12/512 stroke without zoom compensation, same as Barracks.
- HUD Reserve: `#hudTroops .reserve-label img.reserve-army-icon`, `assets/shapes/reserve.svg` (Lorc Dark Squad), CSS size 16px; no HUD value changes. Asset attribution in README and `#tutorial` Help.

### v52 — замена иконок (20.10.2026)
- game.js: BUILDING_PATHS для lumber/quarry/mine/fort/city теперь используют оригиналы в 512x512, BUILDING_PALETTE окрашивает Canvas в тон SVG. Все здания, кроме столицы, получают масштабируемый контур 12/512; столица 64x64 не изменена.
- assets/shapes/stone.svg: Stone Pile для HUD (resourceSummary data-resource=stone img.res-icon) и затрат (uiIcon('stone')); styles/theme.css обеспечивает размер и object-fit. Другие ресурсы/правила не затронуты. Источники в README, Help.

### v53 — HUD height and Reserve icon clipping (20.10.2026)
- `styles/theme.css`: topbar 86px, resourceSummary 78px; Reserve label 20px and icon 18px. Landscape compact 66px+56px and 14px icon. Four column alignment remains. `index.html`: `styles/theme.css?v=53-hud-height`.

### v54 — attack zone planner / war / peace (20.10.2026)
- `index.html`: `#planAttackButton` → `#planGuide` (draw state) → `#planReview` (force presets, declare war/start) → `#planCancelDialog` (active zone click); `#warChip` and `#warPanel` for mutual peace proposals; `#targetPeace` in old foreign-territory preview. `styles/theme.css` v54 cards and responsive controls; all visible copy English.
- `game.js`: `attackPlanner` state, `onPointerDown`/Move/Up draw over canvas, `completePlan` polygon rasterization (one owner, connected to friendly border, starts/ends in friendly territory), `drawAttackPlanning` dashed region and live path overlay. Host/UI `send` transmits `zone` to engine; `renderWars` and `peace` handler. Single tap for enemy only diplomatic preview: direct send disabled. Cancelling active planned area invokes `return` with Yes/No.
- `engine.js`: `validateZone` host checks 2..3500 cells, ownership and connected border; human `send` requires zone, army tracks `zoneCells`, `initialFront`/`waveFront`/`advance` never cross zone. Bot sends may use old free-front mode. Wars pair keys stored in `state.wars`; `state.peaceOffers` accepted mutually by action `peace`, simultaneous offensives stopped. Redirect cannot bypass selected zone. `pack` spreads state through network; victory conditions unchanged.

## v55 — кисть зоны атаки (20.10.2026)
- `#planGuide`: `#planGuideHint`, `#planPaintCount`, `#planPaintClear`, `#planReviewButton`, `#planGuideExit`. Режим `attackPlanner.mode='paint'`, кисть радиуса 1 клетка, несколько мазков; PointerMove интерполируется. Review attack открывает `#planReview`, Edit area возвращает закрашенную зону. `#planLaunch` отправляет host-authoritative `send(zoneCells)`.
- Проверки: один enemy/neutral owner, 2..3500 клеток, общая граница, связность. Свои/союзные/морские клетки не включаются. War & Peace прежний; Safari и online не проверены.

## v56 — direct attack painting (20.10.2026)
- `#planGuide`: теперь `#planBrushSize` (radius 1..6), `#planBrushValue`, `#planTroopsPercent` (5..95%), `#planTroopsValue`; `#planGuideExit`, `#planPaintClear`, `#planReviewButton` (визуальная подпись Start offensive) стоят в одном ряду. Обработчик `reviewPaintedZone` непосредственно вызывает `command(type=send,zone=checked.cells)`; UI этап review не вызывается. Название обработчика и скрытый `#planReview` устарели и могут быть удалены при отдельной проверенной чистке. Обычный тап по нейтралу без атакующего окна; чужие люди открывают дипломатию, стрелка Canvas не рисуется для обычной foreign цели; hold-to-attack отключён.

## v57 — persistent plans across waves (20.10.2026)
- `state.attackPlans[]` (host-authoritative) отделён от `state.armies[]`. Один план по ID и зона с процентом войск переживает сколько угодно волн, пока исходная область не полностью принадлежит владельцу. `planId` привязывает волну к плану. Проверка резерва и старт новой волны на host в `advanceOffensivePlans()`; новый фронт выбирается только из исходных ещё не захваченных клеток. Войны и мир остаются серверными. Legacy v56 армия с зоной мигрирует через `adoptLegacyOffensives()`.
- `drawAttackPlanning()` рисует сохранённые plans даже без армии; `renderArmies()` показывает текущую волну / ожидание; `openCancelPlan()` и `#planCancelDescription` подтверждают отмену всего плана по `cancelPlan`. HUD Offensive count показывает планы вместе с одиночными legacy/bot армиями. Восстановление из localStorage и pack/unpack сохраняет данные. Не считать Safari и сеть проверенными.

## v58 — multitouch in planning mode (20.10.2026)
- `game.js`: `attackPlanner.touchLocked` + `strokeStart`/`strokeOrigin`, shared `pressed` map and helpers `beginPaintNavigation`, `updatePaintNavigation`, `finishPaintPointer`. 1 touch paints on release or movement ≥6px; 2 touches pan/pinch anchored to midpoint with no painting, remaining 1 finger locked until all released. `pointercancel` removes contact without painting; `planReviewButton` disabled while any pointer is down. `index.html` hint/help and version query updated. Desktop single finger/mouse painting is preserved. No engine changes.

## v59 — adaptive multi-owner offensive permissions (20.10.2026)
- `engine.js`: `createPaintedPlan`, `changePaintedPlan`, `parseTargets`, `validatePaintedRegion`, `declareApprovedWars`; `plan.targets` — whitelist ownerIDs including neutral 0, distinct from `zoneCells`. Existing plans only attack current owner if approved, not allied, and war formally exists. Approved additions explicitly declare war on send/update, peace removes target from every affected plan but retains geometry. New wave recomputes targets vs current land owners and shared borders; can wait without cancelling when zone inaccessible. Geometry edits stop active wave with ordinary retreat penalty and then replan. Plans v57 without targets are normalized from targetOwner. Bots keep original send system.
- `game.js`/`index.html`: `planTargetOptions` delegating country toggles, `planTargetsHint`, `planHeading`, editable `beginAttackPlanner(existing)`, `data-edit-plan` and tap-on-existing-plan, `reviewPaintedZone` sends either `send` or `updatePlan`. Selected / protected areas have different opacity; ally buttons disabled. Two-finger pan remains. `styles/theme.css`: scrollable choices sized for iPhone. Cache-bust `v59-choice-zones`. Regression test `tests/offensive-plans.cjs` covers consent, owner changes, continuation, peace, legacy.

## v60 — MERGE / ERASER / FULL FRONT (20.10.2026)
- Engine: upsertPaintedPlan joins intersecting zones transitively; updatePlan can preserve one tile and persist paused zones. Explicit excludeTargets prevents accidental war permissions. planFrontier selects all adjacent permitted frontier cells, planTileCost prices them from one snapshot; estimatePlanFront exposes required troops. sendNextPlannedWave waits until full-layer strength is available, advancePlannedWave captures that complete layer in one combatStep, or none if underfunded. This applies only to planned attacks; bots preserve legacy advancement.
- UI: planToolPaint and planToolErase share brush size; Clear becomes Reset when editing and cannot accidentally delete the saved plan. planGuide indicates merge on Start, Offensives displays reserve required for a full frontier. New cache marker v60-merge-fullfront. Tests plan-frontier-merge.cjs and offensive-plans.cjs; real iPhone Safari/WebRTC unverified.

## v61 — Side painting UI (20.10.2026)
- `#planToolSwitch` (в `#mapView` всегда виден) содержит `#planToolPaint` и `#planToolErase` с официальными Lucide SVG; теперь вместо удалённого `#planAttackButton`. `#planControls.hidden`: слева два вертикальных `#planBrushSize`, `#planTroopsPercent`, показывают `#planBrushValue`, `#planTroopsValue`. `#planGuide.hidden`: низкая action-панель с `#planHeading`, `#planPaintCount`, `#planGuideHint`, `#planTargetOptions` (горизонтальный scroll) и кнопками Exit/Clear/Start. `#gameActionBar` остался Research/Build.
- `game.js`: `togglePaintTool` стартует режим и сразу выбирает инструмент или закрывает при повторном нажатии; `setPaintTool` меняет цвет инструмента и `aria-pressed`; `beginAttackPlanner` показывает `#planControls`, `resetAttackPlanner` скрывает, `refreshPaintGuide` скрывает разрешения, пока нет клеток. CSS для вертикальных ползунков использует `rotate(-90deg)` для mobile Safari с ограниченным размером. Cached assets version v61-side-tools. Реальное iOS/WebRTC тестирование предстоит.

## v62 — four sidebar controls / global plan eraser (20.10.2026)
- Right `#planToolSwitch` (mapView) contains Paint `#planToolPaint`, Eraser `#planToolErase`, Build `#developButton`, Research `#scienceButton`. The old `#gameActionBar` HTML was removed. Existing Build/Research handlers remain wired; active state reflected via class `.chosen` and `aria-pressed`; existing game.svg hammer/books assets used.
- `#planControls.erase-only #planTroopsControl` is hidden; `#planEraseHint` is a tiny bottom status hint, `#planGuide` stays hidden when a standalone saved-plan eraser is active. `beginGlobalEraser()` uses attackPlanner.mode='erase' and its brush-radius slider; pointer handlers preserve two-finger navigation. On pointerup the client sends one action `erasePlanCells:{cells:number[]}`; pointercancel or switching to two fingers discards unsent deletions.
- `engine.js` action erasePlanCells validates 1–3500 integer indices and the requesting owner; mutates any owned saved attackPlans.zoneCells that overlap, removes empty plans via cancelOffensivePlan, withdraws touched active waves safely and preserves foreign plans and map ownership. Saved game state propagates via existing host snapshots. `tests/saved-plan-eraser.cjs` exercises host constraints. Cache-bust v62-unified-icons-eraser.

## v63 — Adaptive planning, unified overlays and wartime recovery
- HUD: `#gameFeedback` occupies reserved left column; `#warChip` right column; `#threatRail` below. Compact single-line notification with ellipsis, full text available via tooltip/action.
- `game.js`: Paint one or more valid land cells starting anywhere, including own territory. Preview chips auto select encountered opponents except explicit exclusions or allies. Start only disabled if the area is empty or a pointer is active. `drawAttackPlanning` builds a union of saved and draft cells before tracing one exterior border; recovery claims use a warm fill. `renderArmies` shows recovery fronts. `frontCount` is not restricted to 12 plans.
- `engine.js`: `validatePaintedRegion` ignores invalid/sea cells and duplicates, `upsertPaintedPlan` accepts waiting/surrounded plans and removes hard count/merge-size refusal. Recovery plans live in `s.recoveryPlans`, created by `gainTile` only during existing war; full-front `advance` and `sendNextPlannedWave` use `getOffensivePlan`. Peace cancels recovery, no new war is triggered. Explicit selected and excluded opponent IDs remain authoritative.
- `tests/adaptive-offensives.cjs` covers recovery and peace; full existing test set passed. Cache `v63-no-reject-recovery`. Physical iOS Safari and online multiplayer untested.

## v64 — stale build diagnostics and no fixed plan-area cap
- The visible error `Merged area exceeds 3,500 cells` is from older cached engine code, not v63. `BKEngine.BUILD='v64'` is now visible in `#sessionHint` when opening Match menu. If a client sees an old counter `0/12` or the old merge warning, reopen the branch preview; multiplayer host also must load v64.
- `engine.js`: legacy `validateZone` and saved-plan `erasePlanCells` bounded by real map dimensions (`W*H`), not an arbitrary 3,500. `game.js` and `index.html` use refreshed `v64-unlimited-plans` assets. `tests/unlimited-plans.cjs`: merged region 7,600 cells, eraser stroke 4,100. Primary `upsertPaintedPlan` had no size restriction since v63.

## v65 — Nations diplomacy and automatic defensive partial sectors
- Replace war-only UI: `#warChip` always displays `NATIONS` plus war count and the existing `controls.svg#flag-banner`. `#warPanel` contains scrollable country cards in `#warPanelList`, generated by `game.js.renderWars` (retained function name for call sites). Each card has `data-nation-attack`, `data-nation-peace` OR `data-nation-diplomacy`. Delegated click handler handles attacks, stop attacks, bilateral peace and bilateral alliances. Targeting does not close an active Paint draft. `#planTargets` and `#planTargetOptions` removed from HTML/JS. `refreshPaintGuide` shows count permitted under Nations, `selectedNationTargets` reflects current player.attackTargets and legacy saved plan fallback. `#planGuide` retains Exit/Clear/Start and brush/troop sliders.
- Engine `player.attackTargets`, `nationTargets`, `syncNationPlans` and `action setNationTarget` centralize country attack preferences. New manual plan/edits use `[0,...attackTargets]`, do not auto-declare war; selecting Attack in Nations explicitly starts war, removing selection recalls that opponent's waves, peace removes preference on both sides without destroying zone, alliance cannot coexist with war. Existing old saves without field infer selected opponents from old plan targets.
- Recovery: `recoveryPlans` are defensive claims recorded on wartime losses regardless of `attackTargets`. `advancePlannedWave` conditionally uses affordable subset via `balancedLayer` for `autoRecovery`; manual paint remains full-front atomic. `sendNextPlannedWave` has smaller minimum for recovery. Regression tests `tests/nations.cjs`, `tests/recovery-frontier.cjs`, plus existing suites. Asset revision `v65-nations`; real mobile/PeerJS tests outstanding.

## v66 — Cloudflare authoritative rooms (20.10.2026)
- User requires free server; Render excluded by user. Cloudflare account registered; direct Cloudflare connector discovery returned no matching plugin, so Dashboard GitHub linking remains required.
- Added server/cloudflare.mjs and wrangler.jsonc: SQLite Durable Object per room, authoritative existing engine, WebSocket commands, compressed snapshots, room-control transfer, same-device persistent identity, reconnect and all-disconnected pause. Transactional split snapshots every 10s/commands/disconnect; idle cleanup after 24h.
- game.js adds opt-in same-origin transport via server-config.js; scripts/build-cloudflare.cjs creates a Cloudflare-only static bundle and enables it. Raw preview remains PeerJS; do not tell user it already uses server. No server URL deployed yet.
- Engine build v66; gameplay unchanged. Main untouched. Setup instructions docs/CLOUDFLARE_SETUP.md.
- Seven engine regression suites plus server/client behavior adapters passed in V8. No shell environment available; no Node/real Wrangler/workerd/Safari/physical multiplayer execution. New tests are committed for replay. Cloudflare deploy and free-tier usage still require validation.

## v67 — window hierarchy, mobile controls and current-building prices (20.10.2026)
- Cloudflare v66 deployment was confirmed by the user's build log and GitHub Workers Builds check for 199c53ad (version 08f8070b-eddf-4c61-903c-bb923adafb2f).
- Live game: https://brothers-kingdoms.murat-amir-olzhasuly.workers.dev . Raw branch preview still uses PeerJS; do not confuse it with the server.
- UI source sweep covers all three screens and 202 static DOM IDs. All static JS ID references exist; 29 sprite references resolve and 31 static asset references exist. This is source/DOM verification, not a real Safari visual audit.
- styles/theme.css now owns named layer variables. Map shell is an isolated stacking context below Research, backdrops, auxiliary dialogs, Help and results. Build/Nations/review hide conflicting map tools; modal state blocks map actions. Removed contradictory Build tool display override. Small viewport tools scroll inside bounds; landscape uses a 2×2 tool grid and separate planning space.
- Close controls use 44px touch areas; building prices wrap instead of clipping; owned count and current placement prices shown. Long player/nation names and army rows wrap; sheets scroll inside viewport.
- Nations preserves an unfinished draft but clears captured gestures. Window transitions close incompatible windows; Help/home/result cleanup fixes stale panels. Closing an already closed Build palette no longer discards a drawing.
- Build, Nations, Offensives and incoming-threat buttons retain their DOM nodes while live numbers change, avoiding dropped mid-touch clicks.
- engine.costBuilding(state,owner,kind): base × (1 + 0.20 × current owned structures of that same type), rounded up per resource. Physical structures count, not levels. Starting/captured structures count; losses lower the next price, never below base. Engine validates/charges this price; UI uses the same function. Upgrade prices retain their level rule. No refunds for prior builds.
- Border cache now also invalidates on territoryRevision within the same tick.
- Engine build/cache tags v67. Main untouched; all changes on design/visual-review-v26.
- Eleven suites passed in available V8 adapters: 7 offensive regressions, Cloudflare client/server, building pricing, UI window behavior. No usable shell/browser environment; Node commands, real CSS layout, physical iPhone Safari and separate-network multiplayer not executed in this pass. Actual Cloudflare deployment check is reported separately after commit.

## v68 — screenshot-driven placement and feedback repair (21.10.2026)
- User iPhone screenshot showed placement label compressed to 1–2 characters per line and two concurrent feedback messages. v67's static/DOM checks did not establish real CSS geometry.
- Placement has explicit responsive width and four grid columns (icon, flexible copy, Change, Close); name and prices are separate nodes. Name ellipsizes on one line, resource words wrap normally. Removed anywhere-wrapping from this compact component.
- Current feedback precedence uses the same specificity as its layout: danger > toast > ordinary notice; one message in the slot.
- Cache/engine v68. Added tests/mobile-layout.cjs and GitHub Mobile layout workflow: real Chromium and WebKit at 320x568, 390x780, 844x390; actual bounds, feedback priority, Research tool visibility and three-screen transitions. Browser CI status must be verified after commit; physical Safari still separate.
- Existing UI transitions, Cloudflare client and build-marker suites passed in V8 after this change. Main unchanged.

## v69 — choose exact capital on the room map (21.10.2026)
- Room now includes shared #spawnMap, #spawnHint, #spawnAuto and #spawnLegend, outside collapsed match settings. Tap land to choose your capital; Automatic clears it. Other selections and reserved separation circles are visible. Keyboard arrows/Enter supported; vertical page scrolling does not accidentally select.
- engine.previewTerrain returns a cached, copy-protected deterministic mainland for the room seed. setSpawn/spawnError validate ownership identity, lobby phase, integer bounds/margins, land, non-peak and 14-cell separation. start revalidates all saved choices before mutation and reserves manual points before placing automatic players/bots. Capital coordinates are exact; initial claims no longer turn adjacent sea into land, so preview coastline matches match.
- Server spawn messages call E.setSpawn using WebSocket identity. PeerJS path applies same engine validation; errors return to sender. Removed quadrant select from active HTML/JS; old engine spawnPreference remains a fallback for saved rooms. Selected spawnPoint persists in server room state and snapshots.
- Engine/cache v69. Main unchanged. New tests/spawn-points.cjs verifies deterministic preview, exact manual points, invalid/overlapping positions, bot spacing, reset and start preflight. Cloudflare test exercises player-specific selections. Browser workflow now checks real map click/reset across Chromium/WebKit at 3 viewports and runs existing engine/server/UI regressions.
- V8 start-position regression and JS syntax passed before commit. Node/browser CI and deployment must be checked after push. Physical iPhone separate-network testing remains unconfirmed.

## v70 — persistent lobby creator and real network/touch regression (21.10.2026)
- Reported: second joiner becomes host; starting-point choice did not work on phone.
- Confirmed host cause: visibility/reconnect closes creator socket and lobby disconnect/next join elected another player. New rooms reserve creator ID/token in HTTP creation before any WebSocket handshake. creatorId persists; lobby admin remains creator across temporary disconnects; live-match delegation stays available. Old saved rooms infer creator from first player when restored. Player list displays actual serverAdmin, including "You · Host".
- Client stores creation token per room and uses it on initial/reconnect socket. Native share/foreground reconnect cannot give lobby ownership away.
- Spawn tap handled on pointerup, independent of a synthesized click and its coordinates. Cancel/movement still avoids selection during scroll. Pending selection displays Saving until authoritative snapshot; server errors remain visible in room hint. Spawn messages no longer hit the gameplay-order 60ms throttle.
- tests/cloudflare-server.cjs now reserves creator, lets guest join first, tests temporary lobby disconnect, then existing selection/gameplay/rejoin cases.
- Added tests/network-lobby.cjs: actual HTTP/WebSocket bridge to KingdomRoom with two isolated browser contexts, real touch tap, creator reconnect/close/rejoin, guest visibility and exact in-match capital in Chromium and WebKit. Uses mock Durable Object storage, real transport and production engine/room/client. Cloudflare-specific storage lifecycle and physical Safari remain separate.
- v70 engine/cache. Working branch only; Node/browser CI and deployment checked after push.

### v71 military commitment
`engine.militaryStrength` counts reserve + active waves for recruitment capacity. `planAllocation` shares total commitment among reachable manual/recovery fronts; active waves consume their share. `estimatePlanFront.committed` is the actually available allocation. Full-front manual expansion remains atomic. Offensives rows explain allocated vs required strength; reserve tooltip separates deployed troops from home defense. No new UI controls.

### v72 spatial army
- `p.garrisons`: physical reserve squads (`id,x,y,strength,role,tx,ty,returning`). Sum equals existing `p.troops`; recruits appear at owned bases. Old saves migrate once.
- `spatialArmyStep`: peace base garrisons; war sectors weighted by incoming attacks/important positions plus safe rear reserve; friendly-land routing, no teleports, retreat/encirclement handling. `tileDefense` uses nearby squads.
- Wave `columns`: mobilized troops march to frontier before existing atomic full-front combat; recall returns survivors at actual positions. Returning reserve is unavailable to `planAllocation`/mobilization until home arrival. Both bots and players use this.
- Existing canvas draws compact squads/columns. Existing `#armiesPanel` (My army) gains home-army summary and march states. Help updated; no new DOM layers or controls.

### v73 distributed attack front
- Fixes v72's single-point assembly/global conquest mismatch. A wave retains physical columns throughout combat. frontSectors groups a frontier into small locally connected sectors; positionAttack/marchWave deploy survivors to their own sector anchors.
- localAttackStrength/spendAttack allow only arrived, assigned troops within range 7 to pay a sector's capture cost. Manual layers remain atomic across all sectors; recovery can advance funded local sectors separately. a.strength is only the aggregate military total, not an independent remote budget.
- frontDeployment supplies ready/total sector counts to existing army rows. Canvas aggregates actual co-located columns, keeps them visible after arrival and highlights only manned cells. Saved/server states retain columns, sectors, destinations and paths.

### v74 army performance
- Home squads reuse valid routes and component reachability, instead of whole-map path floods every tick. Local arrived sector strengths are cached and invalidated on movement/payment.
- renderArmies skips hidden #armiesPanel; showAux refreshes it upon opening. drawAttackPlanning caches contour union through animation/panning, invalidating on real geometry/ownership/target/draft changes.
- networkState/restoreNetworkState provide compact display snapshots for server and PeerJS. Wire geometry uses exact zoneRuns, reused as shared zoneCells arrays after decode. Internal routes/front keys remain only in authoritative state/saves. Arrival derives from coordinates/destination, not missing wire routes.

### v75 army command and display
- Existing waves receive physical support via reinforcePlannedWave within planAllocation. Underfunded waves hold position; local weak sectors can rebalance from nearby front troops. Manual plans retain simultaneous full-front expansion, locally arrived funding and Nations authority.
- Mobilization chooses nearby garrisons. Updated fronts allocate minimums locally and retain surplus near prior positions, instead of proportionally reshuffling every soldier each layer. Explicit orders have 2:1 allocation weight versus automatic recovery.
- getArmyDisplay caches owner/concentration Path2D boundaries and grouped transfer arrows. drawArmyDisplay shows at most 8 on-screen arrows and no individual troop circles/numbers; minimap reuses cached lines. Existing base contextCard reports stationary nearby garrison strength.
- My army statuses expose waitingForRoute/awaitingReinforcements rather than silently cycling troops home. No new IDs or stacking layers.

### v76 autonomous sectors — latest gameplay rule
User explicitly replaces whole-front simultaneous readiness and manual troop percentage. Every drawn plan now advances funded, physically arrived local sectors independently. Unready/distant/blocked sectors wait on their own, not as a barrier to the rest of the plan.
automaticAllocation estimates resistance, supply distance, shared capacity and a defensive reserve; legacy percent is ignored for painted plans. Reinforcements remain physical. Normal sectors pay their full local sector cost; recovery can use affordable partial sectors.
#planTroopsControl, .plan-force-options, #targetQuickPercents and #battleDock are hidden in theme.css. The brush control remains available. Normal paint/edit orders omit percent; existing plans need no redraw.

### v79 resource work and roads
- Existing resource catalogue entries call beginWorkPlanner(resource), reusing #planGuide/#planControls, eraser, brush size and two-finger map navigation. workResource distinguishes civilian paint from combat geography. Save replaces that own resource zone; empty save clears it. #workforceSummary is a status inside #quickBuild, not another overlay.
- Engine actions workZone and queueBuild are authoritative. workforceStep assigns bounded p.workers groups to production/construction/road routes; p.workIncome feeds ordinary income. s.workZones stores suitable extraction geography, s.buildJobs paid construction, s.roads traversed road cells. workforceStats supplies capacity/working/queued UI.
- roadRoute/roadSet reuse friendly-land road geometry; moveOnRoute controls military road/open speed. Civilian routes are limited to two new searches/player/tick. networkState/restoreNetworkState compact civilian geometry/roads and omit private path arrays.
- drawInfrastructure caches zones and connected roads. drawArmyDisplay aggregates occupied cells, without troop arrows/icons/numbers. Existing legacy extraction buildings render as colored cells; cities/barracks/forts remain strategic silhouettes. Tests/workforce.cjs and existing mobile/network suites cover the new flow.

### v80 automatic resource terrain
Resource buttons now call setWorkPriority instead of beginWorkPlanner; #workBalanced selects balanced production. No civilian paint interaction is offered. automaticWorkSites uses owned terrain, not saved workZones. Food=4, Wood=2, Stone=3/6, Gold=5. Workers reconsider an arrived assignment gradually as new land becomes available. repaintWorld draws saturated terrain with resource patterns on owned and unowned cells, weak ownership tint and cached owner-colored boundaries. Legacy extraction structures and old work-zone metadata remain save-compatible.

### v81 bottom placement and capacity
#buildDock inside #mapView offers [data-place-building] city/barracks/fort buttons; #developButton/#quickBuild are hidden compatibility remnants. #placingBuild and minimap are raised above the dock. Sheets, Nations and paint mode hide the dock. Match menu now contains #productionPriority, #workforceSummary and #storageSummary. resourceCapacity derives storage from land*50; planCellLimit derives silent brush/API capacity from total military/10 and preserves existing oversized drawings. New starts no longer create a farm.
