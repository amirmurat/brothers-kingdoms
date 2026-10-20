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
