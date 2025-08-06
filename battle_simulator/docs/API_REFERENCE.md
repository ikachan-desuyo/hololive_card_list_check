# API リファレンス

## グローバルオブジェクト

### battleEngine (HololiveBattleEngine)
メインのゲームエンジンインスタンス。すべての機能へのエントリーポイント。

```javascript
// アクセス方法
window.battleEngine
// または単に
battleEngine
```

## 主要APIクラス

### HololiveBattleEngine

#### プロパティ
```javascript
// ゲーム状態（StateManagerから取得）
battleEngine.gameState: {
    gameStarted: boolean,
    currentPlayer: number,
    currentPhase: number, // -1: 準備, 0-5: リセット〜エンド
    turn: number,
    isGameOver: boolean,
    winner: number,
    // その他StateManager管理の状態
}

// プレイヤー状態（StateManagerから取得）
battleEngine.players: {
    1: PlayerState,
    2: PlayerState
}

// 各種管理クラス
battleEngine.stateManager: HololiveStateManager
battleEngine.phaseController: PhaseController
battleEngine.turnManager: HololiveTurnManager
battleEngine.placementController: HololivePlacementController
battleEngine.setupManager: HololiveGameSetupManager
battleEngine.cpuLogic: HololiveCPULogic
battleEngine.handManager: HandManager
battleEngine.cardDisplayManager: CardDisplayManager
battleEngine.cardInteractionManager: CardInteractionManager
battleEngine.infoPanelManager: InfoPanelManager
battleEngine.performanceManager: PerformanceManager ⭐新規追加
battleEngine.cardEffectManager: ScalableCardEffectManager ⭐更新（新システム）
```

#### メソッド

##### ゲーム制御
```javascript
// ゲーム開始
battleEngine.startGame(): void

// ゲームリセット
battleEngine.resetGame(): void

// UI全体更新
battleEngine.updateUI(): void
```

##### カード操作
```javascript
// カードドロー
battleEngine.drawCard(playerId: number): boolean

// カード配置（基本的にはPlacementControllerを使用）
battleEngine.placeCard(card: Card, area: string, playerId?: number): boolean

// デッキシャッフル
battleEngine.shuffleDeck(playerId: number): void
```

##### ユーティリティ
```javascript
// ホロメンカード判定
battleEngine.isHolomenCard(card: Card): boolean

// テストデッキ作成
battleEngine.createTestDeckIfNeeded(): void

// デッキ選択UI表示
battleEngine.showDeckSelection(playerId: number = 1): void
```

### HololiveStateManager

#### メソッド
```javascript
// 状態取得
stateManager.getState(): GameState

// 状態更新
stateManager.updateState(action: string, payload: any): void

// パス指定状態取得
stateManager.getStateByPath(path: string): any

// 状態保存
stateManager.saveState(): void

// 状態復元
stateManager.loadState(): GameState | null
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
```

### PhaseController

#### プロパティ
```javascript
// フェーズ定数（2024年8月更新）
phaseController.PHASES: {
    PREPARATION: -1,
    RESET: 0,
    DRAW: 1,
    CHEER: 2,
    MAIN: 3,
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

### PerformanceManager ⭐新規追加

#### メソッド
```javascript
// パフォーマンスステップ開始
performanceManager.startPerformanceStep(playerId: number): void

// パフォーマンス実行済みチェック
performanceManager.hasPerformedThisTurn(playerId: number): boolean

// 攻撃可能なカード取得
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
