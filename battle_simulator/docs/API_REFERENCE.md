# API リファレンス - 2024年8月更新版

## 📋 概要

このドキュメントは、ホロライブTCGバトルシミュレーターの全APIを網羅的に説明します。
新アーキテクチャ（ScalableCardEffectManager、PerformanceManager等）を含む最新の実装状況を反映しています。

## 🌐 グローバルオブジェクト

### battleEngine (HololiveBattleEngine)
メインのゲームエンジンインスタンス。すべての機能へのエントリーポイント。

```javascript
// アクセス方法
window.battleEngine
// または単に
battleEngine
```

## 🏗️ 主要APIクラス

### HololiveBattleEngine（メインエンジン）

#### プロパティ
```javascript
// ゲーム状態（StateManagerから取得）
battleEngine.gameState: {
    gameStarted: boolean,
    currentPlayer: number,      // 1 or 2
    currentPhase: number,       // -1: 準備, 0-5: リセット〜エンド
    turn: number,               // 現在ターン数
    isGameOver: boolean,
    winner: number,
    mulliganPhase: boolean,     // マリガンフェーズ中 ⭐新規追加
    debutPlacementPhase: boolean, // デビュー配置フェーズ中 ⭐新規追加
}

// プレイヤー状態（StateManagerから取得）
battleEngine.players: {
    1: PlayerState,
    2: PlayerState
}

// 🔄 状態・制御管理レイヤー
battleEngine.stateManager: HololiveStateManager          // 状態一元管理
battleEngine.phaseController: PhaseController            // フェーズ制御
battleEngine.turnManager: HololiveTurnManager           // ターン管理
battleEngine.placementController: HololivePlacementController // 配置制御
battleEngine.setupManager: HololiveGameSetupManager     // ゲーム設定

// 🤖 AI制御レイヤー
battleEngine.cpuLogic: HololiveCPULogic                 // CPU思考

// 🎨 UI管理レイヤー
battleEngine.handManager: HandManager                    // 手札管理
battleEngine.cardDisplayManager: CardDisplayManager      // カード表示
battleEngine.cardInteractionManager: CardInteractionManager // インタラクション
battleEngine.infoPanelManager: InfoPanelManager         // 情報パネル

// ⚔️ バトル処理レイヤー
battleEngine.performanceManager: PerformanceManager      // パフォーマンス処理 ⭐新規追加

// 🃏 カード効果システム
battleEngine.cardEffectManager: ScalableCardEffectManager // メイン効果管理 ⭐更新（新システム）
```

#### メソッド
```javascript
// 🎮 システム制御
battleEngine.initializeGame(): void                     // ゲーム初期化
battleEngine.startGame(): void                          // ゲーム開始
battleEngine.resetGame(): void                          // ゲームリセット
battleEngine.updateUI(): void                           // UI全体更新

// 📇 カード操作
battleEngine.drawCard(playerId: number): Card           // カードドロー
battleEngine.placeCard(card: Card, area: string): boolean // カード配置
battleEngine.showCardModal(card: Card, position?: object): void // カード詳細表示
battleEngine.shuffleDeck(playerId: number): void        // デッキシャッフル

// 🔍 状態取得
battleEngine.getPlayer(playerId: number): PlayerState   // プレイヤー状態取得
battleEngine.getCurrentPlayer(): PlayerState            // 現在プレイヤー取得
battleEngine.getGamePhase(): string                     // 現在フェーズ取得

// 🛠️ ユーティリティ
battleEngine.isHolomenCard(card: Card): boolean         // ホロメンカード判定
battleEngine.isYellCard(card: Card): boolean            // エールカード判定
battleEngine.isSupportCard(card: Card): boolean         // サポートカード判定
battleEngine.createTestDeckIfNeeded(): void             // テストデッキ作成
battleEngine.showDeckSelection(playerId?: number): void // デッキ選択UI表示

// 📊 ログ・デバッグ
battleEngine.log(level: string, message: string, data?: object): void // ログ出力
battleEngine.getDebugInfo(): object                     // デバッグ情報取得
```

### HololiveStateManager（状態管理）⭐大幅更新

#### プロパティ
```javascript
stateManager.state: GameState                           // 現在のゲーム状態
stateManager.changeHistory: Array                       // 状態変更履歴 ⭐新規追加
stateManager.isTracking: boolean                        // 変更追跡中 ⭐新規追加
```

#### メソッド
```javascript
// 🔄 状態管理
stateManager.getState(): GameState                      // 状態取得
stateManager.updateState(action: string, payload: object): void // 状態更新
stateManager.getStateByPath(path: string): any          // パス指定状態取得
stateManager.saveState(): void                          // 状態保存
stateManager.loadState(): GameState | null              // 状態復元
stateManager.resetState(): void                         // 状態リセット

// 🛡️ ルール検証
stateManager.validatePlacement(card: Card, area: string, player: PlayerState): ValidationResult // 配置検証
stateManager.canPerformAction(action: string, context: object): boolean // アクション実行可能判定
stateManager.checkBatonTouch(sourceCard: Card, targetCard: Card, targetPosition: string, player: PlayerState): ValidationResult // バトンタッチ検証

// 📋 効果状態管理
stateManager.markEffectAsUsed(cardId: string, effectType: string): void // 効果使用済みマーク
stateManager.getEffectState(cardId: string): EffectState // カード効果状態取得
stateManager.resetTurnEffects(playerId: number): void    // ターン効果リセット

// 📊 監視・デバッグ ⭐新規追加
stateManager.startTracking(): void                      // 変更追跡開始
stateManager.stopTracking(): void                       // 変更追跡停止
stateManager.getChangeHistory(): Array                  // 変更履歴取得
stateManager.createSnapshot(): object                   // 状態スナップショット作成
```

#### アクション種別
```javascript
// ゲーム状態更新
'UPDATE_GAME_STATE': { property: string, value: any }

// プレイヤーカード更新
'UPDATE_PLAYER_CARDS': { player: number, area: string, cards: Card[] }

// プレイヤーゲーム状態更新
'UPDATE_PLAYER_GAME_STATE': { player: number, property: string, value: any }

// プレイヤーデッキ情報更新
'UPDATE_PLAYER_DECK': { player: number, property: string, value: any }

// 効果状態更新 ⭐新規追加
'UPDATE_EFFECT_STATE': { cardId: string, effectType: string, state: object }

// UI状態更新 ⭐新規追加
'UPDATE_UI_STATE': { component: string, property: string, value: any }
```

### PhaseController（フェーズ制御）⭐更新

#### プロパティ
```javascript
// フェーズ定数（2024年8月更新）
phaseController.PHASES: {
    PREPARATION: -1,     // 準備フェーズ
    RESET: 0,           // リセットフェーズ
    DRAW: 1,            // ドローフェーズ
    CHEER: 2,           // エールフェーズ
    MAIN: 3,            // メインフェーズ
    PERFORMANCE: 4,     // パフォーマンスフェーズ
    END: 5              // エンドフェーズ
}

// フェーズ名マッピング ⭐新規追加
phaseController.PHASE_NAMES: {
    [-1]: 'preparation',
    [0]: 'reset',
    [1]: 'draw',
    [2]: 'cheer',
    [3]: 'main',
    [4]: 'performance',
    [5]: 'end'
}
```

#### メソッド
```javascript
// 🔄 フェーズ制御
phaseController.nextPhase(): boolean                     // 次フェーズへ進行
phaseController.canAdvancePhase(): boolean               // フェーズ進行可能判定
phaseController.executePhaseAction(action: string): void // フェーズアクション実行
phaseController.getCurrentPhase(): number                // 現在フェーズ取得
phaseController.getPhaseNameByIndex(index: number): string // フェーズ名取得

// 🛡️ フェーズ検証 ⭐新規追加
phaseController.validatePhaseTransition(from: number, to: number): boolean // フェーズ遷移検証
phaseController.canPerformActionInPhase(action: string, phase: number): boolean // フェーズ内アクション可能判定

// 📢 イベント発行 ⭐新規追加
phaseController.emitPhaseEvent(eventType: string, data: object): void // フェーズイベント発行
phaseController.onPhaseChange(callback: Function): void  // フェーズ変更リスナー登録
```
    PERFORMANCE: 4,
    END: 5
}

// フェーズ制御フラグ
phaseController.phaseInProgress: boolean
phaseController.endStepInProgress: boolean
```

#### メソッド
```javascript
// 次フェーズへ進行
phaseController.nextPhase(): boolean ⭐戻り値追加

// フェーズ名取得
phaseController.getPhaseNameByIndex(phaseIndex: number): string

// フェーズ進行可能判定 ⭐新規追加
phaseController.canAdvancePhase(): boolean

// 指定フェーズに設定 ⭐新規追加
phaseController.setPhase(phase: number): void

// 現在フェーズ取得 ⭐新規追加
phaseController.getCurrentPhase(): number

// フェーズ遷移処理 ⭐新規追加
phaseController.handlePhaseTransition(fromPhase: number, toPhase: number): void

// フェーズアクション検証 ⭐新規追加
phaseController.validatePhaseAction(action: string): boolean
```

#### フェーズ定数
```javascript
const PHASES = {
    PREPARATION: -1,
    RESET: 0,
    DRAW: 1,
    CHEER: 2,
    MAIN: 3,
    PERFORMANCE: 4,
    END: 5
};
```

### HololiveTurnManager

#### メソッド
```javascript
// ターン終了
turnManager.endTurn(): void

// 次ターンへ
turnManager.nextTurn(): void

// 現在プレイヤー取得
turnManager.getCurrentPlayer(): number

// プレイヤー切り替え
turnManager.switchPlayer(): void
```

### HololivePlacementController

#### メソッド
```javascript
// 配置可能判定
placementController.canPlaceCard(card: Card, area: string, position?: number): boolean

// カード配置実行
placementController.placeCard(card: Card, area: string, position?: number): boolean

// 配置可能位置取得
placementController.getAvailablePositions(card: Card): string[]
```

#### 配置エリア定数
```javascript
const AREAS = {
    HAND: 'hand',
    COLLAB: 'collab',
    CENTER: 'center',
    BACK1: 'back1',
    BACK2: 'back2',
    BACK3: 'back3',
    BACK4: 'back4',
    BACK5: 'back5',
    OSHI: 'oshi',
    HOLO_POWER: 'holoPower',
    LIFE: 'life',
    ARCHIVE: 'archive'
};
```

### HandManager

#### メソッド
```javascript
// 手札表示更新
handManager.updateHandDisplay(): void

// 手札にカード追加
handManager.addCardToHand(playerId: number, card: Card): void

// 手札からカード削除
handManager.removeCardFromHand(playerId: number, card: Card): boolean

// 手札枚数取得
handManager.getHandSize(playerId: number): number
```

### CardDisplayManager

#### メソッド
```javascript
// 全カードエリア更新（デバウンス対応） ⭐更新
cardDisplayManager.updateCardAreas(): void

// 指定エリアのカード表示
cardDisplayManager.displayCardsInArea(area: Element, cards: Card[], areaId: string, playerId: number, isMultiple: boolean): void

// カード要素作成
cardDisplayManager.createCardElement(card: Card, areaId: string, cardIndex: number, isPlayerCard: boolean): HTMLElement

// バックスロット更新
cardDisplayManager.updateBackSlots(playerType: string): void

// 個別カード表示更新 ⭐新規追加
cardDisplayManager.updateCardDisplay(card: Card, position: string, playerId: number): void

// コラボエリア個別カード更新 ⭐新規追加
cardDisplayManager.updateCollabCardDisplay(card: Card, playerId: number): void

// バックエリア個別カード更新 ⭐新規追加
cardDisplayManager.updateBackCardDisplay(card: Card, position: string, playerId: number): void

// エリア内イベントリスナークリーンアップ ⭐新規追加
cardDisplayManager.cleanupAreaEventListeners(area: Element): void

// エールカード表示追加
cardDisplayManager.addYellCardsToArea(area: Element, holomenCard: Card, areaId: string, cardIndex: number): void

// カードカウンター更新 ⭐新規追加
cardDisplayManager.updateCardCounter(area: Element, count: number): void

// 表示スタイル適用 ⭐新規追加
cardDisplayManager.applyDisplayTypeStyles(cardElement: HTMLElement, areaId: string, cardIndex: number): void

// 表向き表示判定 ⭐新規追加
cardDisplayManager.shouldCardBeFaceUp(card: Card, areaId: string): boolean

// フェーズハイライト更新 ⭐新規追加
cardDisplayManager.updatePhaseHighlight(): void

// カード数取得 ⭐新規追加
cardDisplayManager.getCardCount(player: PlayerState, areaId: string): number
```

### CardInteractionManager

#### メソッド
```javascript
// カードインタラクション初期化 ⭐新規追加
cardInteractionManager.initializeCardInteractions(): void

// カード情報表示とアクションマーク表示 ⭐更新
cardInteractionManager.showCardInfo(card: Card, position: string): void

// 右側パネルにカード詳細表示 ⭐新規追加
cardInteractionManager.showCardDetailInPanel(card: Card): void

// パネル用カード詳細HTMLフォーマット ⭐新規追加
cardInteractionManager.formatCardDetailForPanel(card: Card): string

// カード上にアクションマーク表示
cardInteractionManager.showActionMarksOnCard(card: Card, position: string): void

// アクションマーククリア
cardInteractionManager.clearActionMarks(): void

// 利用可能アクション取得 ⭐新規追加
cardInteractionManager.getAvailableActions(card: Card, position: string): string[]

// アクション実行 ⭐新規追加
cardInteractionManager.executeAction(actionId: string, cardId: string, position: string): void

// カード効果の手動発動
cardInteractionManager.activateCardEffect(card: Card, position: string): Promise<void>

// 手動発動可能効果チェック ⭐新規追加
cardInteractionManager.hasManualEffect(card: Card): boolean

// 効果発動可能判定
cardInteractionManager.canActivateEffect(card: Card, position: string): boolean

// ブルーム効果発動可能判定 ⭐新規追加
cardInteractionManager.canActivateBloomEffect(card: Card, position: string): boolean

// コラボ効果発動可能判定 ⭐新規追加
cardInteractionManager.canActivateCollabEffect(card: Card, position: string): boolean

// ギフト効果発動可能判定 ⭐新規追加
cardInteractionManager.canActivateGiftEffect(card: Card, position: string): boolean

// 効果使用済みマーク設定 ⭐新規追加
cardInteractionManager.markEffectAsUsed(card: Card, position: string): void

// カード要素検索 ⭐新規追加
cardInteractionManager.findCardElement(cardId: string): HTMLElement | null

// カードオブジェクト検索 ⭐新規追加
cardInteractionManager.findCard(cardId: string): Card | null

// プレイヤーカード判定 ⭐新規追加
cardInteractionManager.isPlayerCard(card: Card, position: string): boolean

// メッセージ表示 ⭐新規追加
cardInteractionManager.showMessage(message: string, type?: string): void
```

### PerformanceManager（パフォーマンス・攻撃処理）⭐新規追加

#### メソッド
```javascript
// ⚔️ パフォーマンス制御
performanceManager.startPerformancePhase(playerId: number): void // パフォーマンスフェーズ開始
performanceManager.hasPerformedThisTurn(playerId: number): boolean // ターン内パフォーマンス実行済み判定
performanceManager.endPerformancePhase(): void          // パフォーマンスフェーズ終了

// 🎯 攻撃システム
performanceManager.highlightAttackableCards(playerId: number): void // 攻撃可能カードハイライト
performanceManager.setCurrentAttacker(card: Card, position: string): void // 攻撃者設定
performanceManager.getValidTargets(attackerCard: Card): Array // 有効攻撃対象取得
performanceManager.executeAttack(target: object): void   // 攻撃実行
performanceManager.hasCardAttackedThisTurn(playerId: number, position: string): boolean // 攻撃済み判定

// 💥 ダメージ処理
performanceManager.calculateDamage(attacker: Card, target: object): number // ダメージ計算
performanceManager.dealDamage(target: object, damage: number): void // ダメージ適用
performanceManager.destroyCard(card: Card, position: string, playerId: number): void // カード撃破処理

// 💖 ライフ・エール処理
performanceManager.lifeToYellPlacement(playerId: number): void // ライフからエール配置
performanceManager.showYellPlacementUI(lifeCard: Card, targetCards: Array, playerId: number): void // エール配置UI表示
performanceManager.placeYellFromLife(lifeCard: Card, targetCard: Card, position: string, playerId: number): void // ライフ→エール実行
performanceManager.clearYellPlacementButtons(): void     // エール配置ボタンクリア

// 🏟️ フィールド管理
performanceManager.getFieldHolomenCards(playerId: number): Array // 場のホロメンカード取得
performanceManager.addTargetButton(target: object): void // ターゲットボタン追加
performanceManager.clearTargetButtons(): void           // ターゲットボタンクリア

// 🎨 UI・エフェクト
performanceManager.showDamageEffect(target: object, damage: number): void // ダメージエフェクト表示
performanceManager.showPerformanceMessage(message: string): void // パフォーマンスメッセージ表示
performanceManager.resetAttackState(): void             // 攻撃状態リセット
```

### ScalableCardEffectManager（新カード効果システム）⭐更新

#### メソッド
```javascript
// 🏗️ システム管理
cardEffectManager.initializeSystem(): Promise<void>     // システム初期化
cardEffectManager.prepareDeckCards(deckData: object): Promise<void> // デッキカード軽量初期化
cardEffectManager.initializeDeckCards(deckData: object): Promise<void> // ゲーム開始時カード効果初期化
cardEffectManager.registerEffectPatterns(): void        // 効果パターン登録

// 📚 動的読み込み
cardEffectManager.loadCardEffect(cardId: string): Promise<object> // カード効果動的読み込み
cardEffectManager.loadCardMetadata(cardId: string): Promise<object> // カードメタデータ読み込み
cardEffectManager.unloadCardEffect(cardId: string): void // カード効果アンロード
cardEffectManager.preloadDeckCards(cardIds: Array): Promise<void> // デッキカード事前読み込み

// 🎭 効果パターン
cardEffectManager.getEffectPattern(patternName: string): object // 効果パターン取得
cardEffectManager.detectEffectPattern(card: Card): string // 効果パターン検出
cardEffectManager.registerPatternEffect(patternName: string, effectConfig: object): void // パターン効果登録

// ⚡ 効果実行
cardEffectManager.executeEffect(card: Card, triggerType: string, context: object): Promise<object> // 効果実行
cardEffectManager.canActivate(card: Card, triggerType: string, context: object): boolean // 効果発動可能判定
cardEffectManager.manualTrigger(cardId: string, playerId: number): Promise<object[]> // 手動効果発動
cardEffectManager.triggerEffects(triggerType: string, context: object): Promise<object[]> // 指定タイプ効果発動

// 🔍 効果検索・管理
cardEffectManager.hasEffect(cardId: string): boolean     // 効果存在判定
cardEffectManager.getEffectMetadata(cardId: string): object // 効果メタデータ取得
cardEffectManager.validateEffectExecution(card: Card, effect: object): boolean // 効果実行検証

// 📊 統計・デバッグ
cardEffectManager.getStats(): object                    // 統計情報取得
cardEffectManager.getLoadedEffects(): Set              // 読み込み済み効果一覧
cardEffectManager.clearCache(): void                    // キャッシュクリア
```

### CardDisplayManager（カード表示管理）⭐更新

#### メソッド
```javascript
// 🎨 表示管理
cardDisplayManager.updateCardAreas(): void              // 全エリア更新（デバウンス対応）
cardDisplayManager.displayCardsInArea(area: HTMLElement, cards: Card[], areaId: string, playerId: number, isMultiple?: boolean): void // エリア別カード表示
cardDisplayManager.createCardElement(card: Card, areaId: string, cardIndex?: number, isPlayerCard?: boolean): HTMLElement // カード要素作成
cardDisplayManager.updateBackSlots(playerType: string): void // バックスロット更新

// 🧹 メンテナンス
cardDisplayManager.cleanupAreaEventListeners(area: HTMLElement): void // エリアイベントリスナークリーンアップ
cardDisplayManager.removeCardFromArea(cardId: string, areaId: string): void // エリアからカード削除

// 🎯 個別更新
cardDisplayManager.updateSpecificArea(areaId: string): void // 特定エリア更新
cardDisplayManager.updatePlayerArea(playerId: number, areaId: string): void // プレイヤーエリア更新
cardDisplayManager.refreshCardElement(cardId: string): void // カード要素再描画

// ✨ 視覚効果
cardDisplayManager.highlightValidDropZones(zones: string[]): void // ドロップゾーンハイライト
cardDisplayManager.showCardAnimation(card: Card, animationType: string): void // カードアニメーション
cardDisplayManager.addCardGlow(cardElement: HTMLElement, glowType: string): void // カード光彩効果

// 🔧 ユーティリティ
cardDisplayManager.getCardElement(cardId: string): HTMLElement | null // カード要素取得
cardDisplayManager.isCardVisible(cardId: string): boolean // カード表示判定
cardDisplayManager.calculateCardPosition(area: string, index: number): object // カード位置計算
```
performanceManager.getAttackableCards(playerId: number): Card[]

// 攻撃対象取得
performanceManager.getAttackTargets(attackerCard: Card, playerId: number): Card[]

// 攻撃実行
performanceManager.executeAttack(attackerCard: Card, targetCard: Card, playerId: number): boolean

// パフォーマンスステップ終了
performanceManager.endPerformanceStep(): void

// パフォーマンスメッセージ表示
performanceManager.showPerformanceMessage(message: string, type?: string): void
```

#### メソッド
```javascript
### ScalableCardEffectManager ⭐更新（新システム）

#### メソッド
```javascript
// システム初期化
cardEffectManager.initializeSystem(): Promise<void>

// デッキカード準備（軽量初期化）
cardEffectManager.prepareDeckCards(deckData: object): Promise<void>

// ゲーム開始時のカード効果初期化
cardEffectManager.initializeDeckCards(deckData: object): Promise<void>

// カード効果動的読み込み
cardEffectManager.loadCardEffect(cardId: string): Promise<object>

// カードメタデータ読み込み
cardEffectManager.loadCardMetadata(cardId: string): Promise<object>

// 効果パターン取得
cardEffectManager.getEffectPattern(patternName: string): object

// カード効果登録
cardEffectManager.registerCardEffect(cardId: string, effectConfig: object): void

// カード効果実行
cardEffectManager.executeEffect(card: Card, triggerType: string, context: object): object

// 効果発動可能判定
cardEffectManager.canActivate(card: Card, triggerType: string, context: object): boolean

// 手動効果発動
cardEffectManager.manualTrigger(cardId: string, playerId: number): Promise<object[]>

// 効果アンロード（メモリ最適化）
cardEffectManager.unloadCardEffect(cardId: string): void
```
```

## データ型定義

### Card
```javascript
interface Card {
    id: string;
    name: string;
    card_type: string;
    color: string[];
    level?: number;
    hp?: number;
    attack?: number;
    description?: string;
    skill_description?: string;
    image_url?: string;
    bloom_level?: number;
    yellCards?: Card[];
    cardState?: {
        bloomedThisTurn?: boolean;
        isResting?: boolean;
        resting?: boolean;
        position?: string;
        bloomEffectUsed?: boolean;
        collabEffectUsed?: boolean;
    };
    isResting?: boolean;
    bloomedTurn?: number;
    collabedTurn?: number;
    bloomEffectUsed?: boolean;
    collabEffectUsed?: boolean;
}
```

### PlayerState
```javascript
interface PlayerState {
    cards: {
        life: Card[];
        collab: Card | null;
        center: Card | null;
        oshi: Card | null;
        holoPower: Card[];
        deck: Card[];
        yellDeck: Card[];
        back1: Card | null;
        back2: Card | null;
        back3: Card | null;
        back4: Card | null;
        back5: Card | null;
        archive: Card[];
        hand: Card[];
    };
    gameState: {
        usedLimitedThisTurn: string[];
        restHolomem: Card[];
        effectStates?: {
            [cardId: string]: {
                bloomEffectUsed?: boolean;
                collabEffectUsed?: boolean;
                bloomedTurn?: number;
                collabedTurn?: number;
            };
        };
    };
    deckInfo: {
        oshiCard: Card;
        mainDeck: Card[];
        yellCards: Card[];
    };
}
```

### GameState
```javascript
interface GameState {
    gameStarted: boolean;
    currentPlayer: number;
    currentPhase: string; // 'setup', 'reset', 'draw', 'cheer', 'main', 'performance'
    turn: number;
    turnCount: number;
    isGameOver: boolean;
    winner: number;
    p1Ready: boolean;
    p2Ready: boolean;
}
```

## イベント

### カスタムイベント
```javascript
// ゲーム状態変更
document.addEventListener('gameStateChanged', (event) => {
    console.log('Game state changed:', event.detail);
});

// フェーズ変更
document.addEventListener('phaseChanged', (event) => {
    console.log('Phase changed to:', event.detail.phase);
});

// ターン変更
document.addEventListener('turnChanged', (event) => {
    console.log('Turn changed to player:', event.detail.player);
});

// カード配置
document.addEventListener('cardPlaced', (event) => {
    console.log('Card placed:', event.detail);
});
```

### DOMイベント
```javascript
// カードクリック
document.addEventListener('click', (event) => {
    if (event.target.classList.contains('card')) {
        // カードクリック処理
    }
});

// カードドラッグ開始
document.addEventListener('dragstart', (event) => {
    if (event.target.classList.contains('card')) {
        // ドラッグ開始処理
    }
});

// カードドロップ
document.addEventListener('drop', (event) => {
    if (event.target.classList.contains('card-area')) {
        // ドロップ処理
    }
});
```

## ユーティリティ関数

### グローバルユーティリティ（utils.js）
```javascript
// テキスト正規化
normalizeText(text: string): string

// デバッグログ
debugLog(message: string, ...args: any[]): void

// エラーログ
errorLog(message: string, ...args: any[]): void

// 警告ログ
warnLog(message: string, ...args: any[]): void

// ダークモード切り替え
toggleDarkMode(): boolean

// 安全なJSON解析
safeJsonParse(jsonString: string, defaultValue: any): any

// LocalStorage安全操作
storageUtils.set(key: string, value: any): boolean
storageUtils.get(key: string, defaultValue: any): any
storageUtils.remove(key: string): boolean
```

### バリデーション
```javascript
// カード検証
validate.card(card: Card): { valid: boolean, errors: string[] }

// プレイヤー状態検証
validate.player(player: PlayerState, playerId: number): { valid: boolean, errors: string[] }

// フェーズ検証
validate.phase(phase: number): { valid: boolean, errors: string[] }
```

## 設定オプション

### デバッグモード
```javascript
// デバッグモードの有効/無効（utils.js内）
const DEBUG_MODE = true; // デバッグログの出力制御
```

### パフォーマンス設定
```javascript
// UI更新の間隔調整
battleEngine.uiUpdateThrottle = 100; // ミリ秒

// アニメーション有効/無効
battleEngine.enableAnimations = true;
```

## エラーコード

```javascript
const ERROR_CODES = {
    INVALID_CARD: 'E001',
    INVALID_PLACEMENT: 'E002',
    PHASE_RESTRICTION: 'E003',
    PLAYER_RESTRICTION: 'E004',
    DECK_NOT_READY: 'E005',
    NETWORK_ERROR: 'E006'
};
```

## 使用例

### 基本的なゲーム開始
```javascript
// ページ読み込み完了後
document.addEventListener('DOMContentLoaded', () => {
    // デッキ選択
    battleEngine.showDeckSelection(1);
    
    // デッキ設定完了後、ゲーム開始
    battleEngine.startGame();
});
```

### カードの手動配置
```javascript
// 手札からセンターにカード配置
const hand = battleEngine.players[1].cards.hand;
const card = hand[0]; // 最初のカード
const success = battleEngine.placementController.placeCard(card, 'center');

if (success) {
    console.log('カード配置成功');
    battleEngine.updateUI();
} else {
    console.log('カード配置失敗');
}
```

### 状態監視
```javascript
// 状態変更の監視
const originalUpdateState = battleEngine.stateManager.updateState;
battleEngine.stateManager.updateState = function(action, payload) {
    console.log('State update:', action, payload);
    return originalUpdateState.call(this, action, payload);
};
```
