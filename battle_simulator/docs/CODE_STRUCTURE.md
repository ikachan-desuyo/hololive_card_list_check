# バトルシミュレーター コード構成詳細

## ファイル構成マップ

### 📁 メインディレクトリ構造
```
battle_simulator/
├── 🎮 メインエンジン
│   └── js/battle_engine.js (HololiveBattleEngine)
├── 🔄 状態・制御管理
│   ├── state-manager.js (HololiveStateManager)
│   ├── phase-controller.js (PhaseController)
│   ├── turn-manager.js (HololiveTurnManager)
│   ├── placement-controller.js (HololivePlacementController)
│   └── game-setup-manager.js (HololiveGameSetupManager)
├── 🤖 AI処理
│   └── cpu_logic.js (HololiveCPULogic)
├── 🎨 UI管理
│   ├── card-display-manager.js (CardDisplayManager)
│   ├── card-interaction-manager.js (CardInteractionManager)
│   ├── hand-manager.js (HandManager)
│   └── info-panel-manager.js (InfoPanelManager)
├── ⚔️ バトル処理
│   └── performance-manager.js (PerformanceManager)
├── 🃏 カード効果システム
│   ├── card-effects/
│   │   ├── scalable-card-effect-manager.js (主要管理)
│   │   ├── card-effect-manager.js (レガシー互換)
│   │   ├── card-metadata.js (メタデータ定義)
│   │   ├── card-effect-utils.js (ユーティリティ)
│   │   ├── effect-pattern-templates.js (パターン)
│   │   ├── battle-engine-integration.js (統合)
│   │   ├── cards/ (個別カード効果ファイル)
│   │   └── IMPLEMENTATION_GUIDE.md
└── 📚 ドキュメント
    └── docs/
        ├── ARCHITECTURE.md
        ├── STATE_FLOW.md
        ├── API_REFERENCE.md
        ├── METHODS.md
        └── TROUBLESHOOTING.md
```

## 🎮 メインエンジン層

### HololiveBattleEngine (js/battle_engine.js)
**役割**: システム全体の統括・初期化・UI統合  
**主要機能**:
- 全モジュールの初期化と管理
- ゲーム開始・リセット処理
- UI更新の統括制御
- イベント処理の中継

**重要メソッド**:
```javascript
// システム初期化
initializeGame()              // ゲーム初期化
startGame()                   // ゲーム開始
resetGame()                   // ゲームリセット
updateUI()                    // UI全体更新

// カード操作
drawCard(playerId)            // カードドロー
placeCard(card, area)         // カード配置
showCardModal(card, position) // カード詳細表示
```

## 🔄 状態・制御管理層

### HololiveStateManager (state-manager.js) 
**役割**: ゲーム状態の一元管理・永続化・変更追跡  
**主要機能**:
- 包括的なゲーム状態管理（プレイヤー・ターン・UI・カード状態）
- プロキシベースの自動更新システム
- 状態変更の履歴追跡とリアルタイム監視
- 配置ルール・バトンタッチ検証

**重要メソッド**:
```javascript
// 状態管理
getState()                    // 現在状態取得
updateState(action, payload)  // 状態更新
saveState()                   // 状態保存
loadState()                   // 状態復元

// ルール検証
validatePlacement(card, area, player) // 配置ルール検証
checkBatonTouch(source, target)       // バトンタッチ検証
canPerformAction(action, context)     // アクション実行可能性

// 効果状態管理
markEffectAsUsed(cardId, effectType)  // 効果使用済みマーク
getEffectState(cardId)                // カード効果状態取得
```

### PhaseController (phase-controller.js)
**役割**: フェーズ進行制御・フェーズルール管理  
**主要機能**:
- フェーズ間の遷移制御
- フェーズ固有処理の実行
- フェーズ進行可能性の判定

**重要メソッド**:
```javascript
nextPhase()                   // 次フェーズへ進行
canAdvancePhase()             // フェーズ進行可能判定
executePhaseAction(action)    // フェーズアクション実行
getPhaseNameByIndex(index)    // フェーズ名取得
```

### HololiveTurnManager (turn-manager.js)
**役割**: ターン制御・マリガン処理・ターン終了処理  
**主要機能**:
- ターン進行とプレイヤー切り替え
- マリガン処理
- ターン終了時のクリーンアップ

### HololivePlacementController (placement-controller.js)
**役割**: カード配置ロジック・ドラッグ&ドロップ制御  
**主要機能**:
- カード配置ルールの検証
- ドラッグ&ドロップのハンドリング
- 配置エリアの管理

### HololiveGameSetupManager (game-setup-manager.js)
**役割**: ゲーム初期化・デッキ設定・テストデッキ生成  
**主要機能**:
- デッキデータの読み込みと設定
- カード効果の事前読み込み
- テストデッキの自動生成
- ゲーム開始前の準備処理

## 🎨 UI管理層

### CardDisplayManager (card-display-manager.js)
**役割**: カード表示・UI更新・視覚効果管理  
**主要機能**:
- カード要素の生成と表示
- デバウンス処理による更新最適化
- アニメーション・視覚効果
- エリア別カード表示制御

**重要メソッド**:
```javascript
// 表示管理
updateCardAreas()             // 全エリア更新（デバウンス）
displayCardsInArea(area, cards, areaId, playerId) // エリア別表示
createCardElement(card, areaId, cardIndex) // カード要素作成

// 視覚効果
highlightValidDropZones(zones) // ドロップゾーンハイライト
showCardAnimation(card, type)  // カードアニメーション
updateBackSlots(playerType)    // バックスロット更新
```

### CardInteractionManager (card-interaction-manager.js)
**役割**: カードクリック・インタラクション・アクションマーク管理  
**主要機能**:
- カードクリック時の動作制御
- カード詳細情報の表示
- アクションマーク（効果発動可能表示）
- カード効果の手動発動

**重要メソッド**:
```javascript
// インタラクション
showCardInfo(card, position)   // カード情報表示
showActionMarks(card, actions) // アクションマーク表示
activateCardEffect(card, effectType) // カード効果発動

// 状態判定
hasManualEffect(card)          // 手動効果の有無
isPlayerCard(card, position)   // プレイヤーカード判定
```

### HandManager (hand-manager.js)
**役割**: 手札表示・手札操作・配置制限管理  
**主要機能**:
- 手札の表示と管理
- カードの手札からの配置
- 手札上限の管理

### InfoPanelManager (info-panel-manager.js)
**役割**: 情報パネル・ログ表示・ゲーム情報管理  
**主要機能**:
- ゲーム情報の表示
- ログメッセージの管理
- プレイヤー情報の更新

## ⚔️ バトル処理層

### PerformanceManager (performance-manager.js)
**役割**: パフォーマンスステップ・攻撃・スキル・ダメージ処理  
**主要機能**:
- パフォーマンスフェーズの制御
- 攻撃処理とダメージ計算
- カード撃破処理
- ライフからエール配置

**重要メソッド**:
```javascript
// パフォーマンス制御
startPerformancePhase(playerId) // パフォーマンス開始
highlightAttackableCards(playerId) // 攻撃可能カードハイライト
executeAttack(attacker, target)    // 攻撃実行

// ダメージ処理
calculateDamage(attacker, target)  // ダメージ計算
dealDamage(target, damage)         // ダメージ適用
destroyCard(card, position, playerId) // カード撃破

// ライフカード処理
lifeToYellPlacement(playerId)      // ライフからエール配置
showYellPlacementUI(lifeCard, targets) // エール配置UI表示
```

## 🃏 カード効果システム

### ScalableCardEffectManager (主要管理)
**役割**: 1000枚以上対応の大規模カード効果管理  
**主要機能**:
- カード効果の遅延読み込み
- 効果パターンの自動認識
- メタデータによる軽量化
- バッチ処理による最適化

**重要メソッド**:
```javascript
// システム管理
initializeSystem()             // システム初期化
prepareDeckCards(deckData)     // デッキカード軽量初期化
initializeDeckCards(deckData)  // ゲーム開始時初期化

// 動的読み込み
loadCardEffect(cardId)         // カード効果読み込み
loadCardMetadata(cardId)       // メタデータ読み込み
unloadCardEffect(cardId)       // 効果アンロード

// 効果実行
executeEffect(card, triggerType, context) // 効果実行
canActivate(card, triggerType) // 発動可能判定
manualTrigger(cardId, playerId) // 手動効果発動
```

### CardEffectManager (レガシー互換)
**役割**: 従来システムとの互換性・基本的な効果実行  
**主要機能**:
- レガシーコードとの互換性維持
- 基本的なカード効果の登録・実行

### サポートモジュール

#### CardMetadata (card-metadata.js)
- カード効果パターンの定義
- メタデータテンプレート
- 複雑度とタグの管理

#### CardEffectUtils (card-effect-utils.js)
- カード効果共通ユーティリティ
- ヘルパー関数群
- 汎用処理関数

#### EffectPatternTemplates (effect-pattern-templates.js)
- 汎用効果パターンテンプレート
- パターンマッチングシステム
- テンプレートの再利用

## 🤖 AI処理層

### HololiveCPULogic (cpu_logic.js)
**役割**: CPU思考・自動プレイ・AI戦略  
**主要機能**:
- CPUの思考ロジック
- 状況判断と行動選択
- フェーズ別AI処理

## 📊 データフロー概要

### 1. ゲーム開始フロー
```
User Action → BattleEngine → GameSetupManager → StateManager → UI Update
```

### 2. カード配置フロー
```
Drag & Drop → PlacementController → StateManager → CardDisplayManager → UI Update
```

### 3. カード効果発動フロー
```
Card Click → CardInteractionManager → ScalableCardEffectManager → StateManager → UI Update
```

### 4. フェーズ進行フロー
```
Phase Button → PhaseController → TurnManager → StateManager → PerformanceManager → UI Update
```

### 5. 攻撃処理フロー
```
Attack Action → PerformanceManager → StateManager → CardDisplayManager → UI Update
```

## 🔧 最適化ポイント

### パフォーマンス最適化
- **遅延読み込み**: カード効果は必要時のみ読み込み
- **デバウンス処理**: UI更新を最適化
- **メタデータキャッシュ**: 軽量データで高速判定
- **バッチ処理**: 複数操作をまとめて実行

### メモリ最適化
- **効果のアンロード**: 使用しない効果は解放
- **イベントリスナー管理**: 適切な削除処理
- **オブジェクト参照管理**: メモリリークの防止

### 拡張性確保
- **モジュラー設計**: 独立したモジュール構成
- **プラグイン形式**: カード効果の独立実装
- **イベント駆動**: 疎結合なコンポーネント間通信

## 🐛 デバッグ・保守性

### ログシステム
- **段階的ログレベル**: ERROR、WARN、INFO、DEBUG
- **モジュール別識別**: `[Performance]`, `[StateManager]` 等のタグ
- **状態変更追跡**: リアルタイム状態監視

### エラーハンドリング
- **段階的フォールバック**: 部分的障害時の継続動作
- **詳細エラー情報**: デバッグに必要な情報の保持
- **ユーザーフレンドリー**: 分かりやすいエラーメッセージ

## 🚀 今後の拡張計画

### 短期目標
- ネットワーク対戦機能の追加
- リプレイ機能の実装
- カスタムルール設定

### 長期目標
- モバイル対応の強化
- 3Dカード表示機能
- AIレベルの向上
- マルチプレイヤー対応
