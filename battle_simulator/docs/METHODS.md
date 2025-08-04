# モジュール別メソッド詳細

## HololiveBattleEngine (js/battle_engine.js)

### 初期化・設定系
- `constructor()` - エンジン初期化、各モジュールのインスタンス化
- `initializeGame()` - ゲーム初期化処理
- `createGameStateProxy()` - ゲーム状態のプロキシオブジェクト生成
- `createPlayersProxy()` - プレイヤー状態のプロキシオブジェクト生成
- `createPlayerState()` - プレイヤーの初期状態生成
- `initializeUI()` - UI要素の初期化
- `setupControlPanel()` - コントロールパネル設定
- `setupCardAreaListeners()` - カードエリアのイベントリスナー設定

### ゲーム制御系
- `startGame()` - ゲーム開始
- `resetGame()` - ゲームリセット
- `validateGameSetup()` - ゲーム設定の検証
- `executeGameSetup()` - ゲーム設定の実行
- `endGame(winner)` - ゲーム終了処理

### カード操作系
- `drawCard(playerId)` - カードドロー
- `placeCard(card, area, playerId)` - カード配置
- `moveCard(card, fromArea, toArea)` - カード移動
- `shuffleDeck(playerId)` - デッキシャッフル
- `addCardToArea(card, area, playerId)` - 指定エリアにカード追加
- `removeCardFromArea(card, area, playerId)` - 指定エリアからカード削除

### 状態更新系
- `updatePlayerCards(playerId, area, cards)` - プレイヤーカード状態更新
- `updatePlayerGameState(playerId, property, value)` - プレイヤーゲーム状態更新
- `updatePlayerDeck(playerId, property, value)` - プレイヤーデッキ情報更新
- `updateUI()` - UI全体更新
- `updateGameStatus()` - ゲーム状態表示更新
- `updateTurnInfo()` - ターン情報更新

### ユーティリティ系
- `getTestCards()` - テスト用カード取得
- `createTestDecks()` - テスト用デッキ作成
- `validateCard(card)` - カード検証
- `isHolomenCard(card)` - ホロメンカード判定
- `canPlaceCard(card, area)` - カード配置可能判定

## HololiveStateManager (state-manager.js)

### 状態管理系
- `constructor(battleEngine)` - 状態管理初期化
- `getState()` - 現在の状態取得
- `updateState(action, payload)` - 状態更新
- `getStateByPath(path)` - パス指定で状態取得
- `validateState(state)` - 状態検証

### 永続化系
- `saveState()` - 状態保存
- `loadState()` - 状態復元
- `exportState()` - 状態エクスポート
- `importState(stateData)` - 状態インポート

### 変更通知系
- `subscribe(callback)` - 状態変更購読
- `unsubscribe(callback)` - 状態変更購読解除
- `notifyChange(action, payload)` - 変更通知

## PhaseController (phase-controller.js)

### フェーズ制御系
- `constructor(battleEngine)` - フェーズコントローラ初期化
- `nextPhase()` - 次フェーズへ進行
- `setPhase(phase)` - 指定フェーズに設定
- `getCurrentPhase()` - 現在フェーズ取得
- `getPhaseNameByIndex(index)` - フェーズ名取得

### フェーズ処理系
- `executePhase(phase)` - フェーズ処理実行
- `canAdvancePhase()` - フェーズ進行可能判定
- `handlePhaseTransition(fromPhase, toPhase)` - フェーズ遷移処理
- `validatePhaseAction(action)` - フェーズアクション検証

## HololiveTurnManager (turn-manager.js)

### ターン制御系
- `constructor(battleEngine)` - ターン管理初期化
- `nextTurn()` - 次ターンへ
- `endTurn()` - ターン終了
- `getCurrentPlayer()` - 現在プレイヤー取得
- `switchPlayer()` - プレイヤー切り替え

### ターン処理系
- `startTurn(playerId)` - ターン開始処理
- `endTurnProcessing()` - ターン終了処理
- `resetTurnFlags()` - ターンフラグリセット
- `validateTurnAction(action)` - ターンアクション検証

## HololivePlacementController (placement-controller.js)

### 配置制御系
- `constructor(battleEngine)` - 配置コントローラ初期化
- `canPlaceCard(card, area, position)` - 配置可能判定
- `placeCard(card, area, position)` - カード配置実行
- `validatePlacement(card, area)` - 配置ルール検証
- `getAvailablePositions(card)` - 配置可能位置取得

### ドラッグ&ドロップ系
- `handleDragStart(event, card)` - ドラッグ開始処理
- `handleDragOver(event, area)` - ドラッグオーバー処理
- `handleDrop(event, area)` - ドロップ処理
- `handleDragEnd(event)` - ドラッグ終了処理

## HololiveGameSetupManager (game-setup-manager.js)

### ゲーム設定系
- `constructor(battleEngine)` - セットアップ管理初期化
- `setupGame()` - ゲーム全体設定
- `createTestDeckIfNeeded()` - テストデッキ作成判定
- `loadCardData()` - カードデータ読み込み
- `loadStageData()` - ステージデータ読み込み

### デッキ管理系
- `setupPlayerDeck(playerId, deckData)` - プレイヤーデッキ設定
- `shuffleDeck(deck)` - デッキシャッフル
- `dealInitialHand(playerId)` - 初期手札配布
- `validateDeck(deck)` - デッキ検証

## HololiveCPULogic (cpu_logic.js)

### AI思考系
- `constructor(battleEngine)` - CPUロジック初期化
- `makeDecision()` - AI判断実行
- `evaluateGameState()` - ゲーム状態評価
- `selectBestAction()` - 最適行動選択
- `calculateScore(action)` - アクションスコア計算

### 自動実行系
- `autoExecutePhase()` - フェーズ自動実行
- `autoPlaceCards()` - カード自動配置
- `autoSelectTarget()` - ターゲット自動選択

## HandManager (hand-manager.js)

### 手札管理系
- `constructor(battleEngine)` - 手札管理初期化
- `updateHandDisplay()` - 手札表示更新
- `addCardToHand(playerId, card)` - 手札にカード追加
- `removeCardFromHand(playerId, card)` - 手札からカード削除
- `getHandSize(playerId)` - 手札枚数取得

### 手札操作系
- `handleCardClick(event, card)` - 手札カードクリック処理
- `enableHandDrag(playerId)` - 手札ドラッグ有効化
- `disableHandDrag(playerId)` - 手札ドラッグ無効化

## CardDisplayManager (card-display-manager.js)

### 表示管理系
- `constructor(battleEngine)` - カード表示管理初期化
- `updateCardAreas()` - 全カードエリア更新
- `displayCardsInArea(area, cards, areaId)` - 指定エリアのカード表示
- `createCardElement(card, areaId)` - カード要素作成
- `updateBackSlots(playerType)` - バックスロット更新

### 視覚効果系
- `addYellCardsToArea(area, card, areaId)` - エールカード表示追加
- `updateCardCounter(area, count)` - カードカウンター更新
- `applyDisplayTypeStyles(cardElement, areaId)` - 表示スタイル適用
- `shouldCardBeFaceUp(card, areaId)` - 表向き表示判定

## InfoPanelManager (info-panel-manager.js)

### 情報表示系
- `constructor()` - 情報パネル管理初期化
- `updateInfoPanel(card)` - 情報パネル更新
- `showCardInfo(card)` - カード情報表示
- `hideInfoPanel()` - 情報パネル非表示
- `formatCardInfo(card)` - カード情報フォーマット

### イベント処理系
- `handleCardHover(event, card)` - カードホバー処理
- `handleCardLeave(event)` - カードリーブ処理
- `bindEvents()` - イベントバインド
