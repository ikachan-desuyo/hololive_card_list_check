# Battle Simulator モジュール分割ログ

このファイルは、`battle_engine.js`から分離されたモジュールとその機能の一覧を記録しています。

## 分割完了モジュール

### 1. Phase Controller (`phase-controller.js`)
**説明**: ゲームフェーズの管理と実行を担当

**分割されたメソッド (14個)**:
- `nextPhase()` - 次のフェーズに進む
- `executePhase()` - 現在のフェーズを実行
- `executeResetStep(playerId)` - リセットステップ実行
- `executeDrawStep(playerId)` - ドローステップ実行
- `executeYellStep(playerId)` - エールステップ実行
- `executeMainStep(playerId)` - メインステップ実行
- `executePerformanceStep(playerId)` - パフォーマンスステップ実行
- `executeEndStep(playerId)` - エンドステップ実行
- `endTurn()` - ターン終了処理
- `switchToNextPlayer()` - 次のプレイヤーに切り替え
- `handleTurnEnd(playerId)` - ターン終了ハンドリング
- `canPlayCard(card)` - カードがプレイ可能かチェック
- `canPerformAction(action)` - アクションが実行可能かチェック
- `getPhaseDescription(phase)` - フェーズの説明取得

**ファイルサイズ**: 約580行

### 2. Game Setup Manager (`game-setup-manager.js`)
**説明**: ゲーム開始時のセットアップ処理を担当

**分割されたメソッド (15個)**:
- `createTestDeckIfNeeded()` - テストデッキ必要性チェック
- `createAndSaveTestDeck()` - テストデッキ作成・保存
- `startGame()` - ゲーム開始処理
- `validateGameSetup()` - ゲーム開始前検証
- `executeGameSetup()` - ゲームセットアップ実行
- `createTestDecks()` - テストデッキ作成
- `getTestCards()` - テスト用カードセット取得
- `setupLifeCards()` - ライフカード設定
- `logGameStatus()` - ゲーム状況ログ出力
- `placeOshiCards()` - 推しホロメン配置
- `dealInitialHands()` - 初期手札配布
- `shuffleDeck(playerId)` - デッキシャッフル
- `decideTurnOrder()` - 先行後攻決定
- `showTurnOrderPopup(suggestedPlayer)` - 先行後攻選択ポップアップ
- `setFirstPlayer(playerId, isManual)` - 先行プレイヤー設定

**ファイルサイズ**: 約380行

### 3. Hand Manager (`hand-manager.js`)
**説明**: 手札の表示と管理を担当

**分割されたメソッド**:
- 手札UI の作成と更新
- 手札カードの表示
- 手札の動的レイアウト

**ファイルサイズ**: 約150行

### 4. Card Display Manager (`card-display-manager.js`)
**説明**: カード表示とUI管理を担当

**分割されたメソッド**:
- カード詳細表示
- フェーズハイライト
- UI要素の更新

**ファイルサイズ**: 約200行

### 5. Info Panel Manager (`info-panel-manager.js`)
**説明**: 情報パネルの管理を担当

**分割されたメソッド**:
- プレイヤー情報表示
- ゲーム状況表示
- 統計情報管理

**ファイルサイズ**: 約150行

### 6. CPU Logic (`cpu_logic.js`)
**説明**: CPU対戦相手のAI ロジックを担当

**分割されたメソッド**:
- CPUの意思決定
- 自動プレイ機能
- AI戦略実装

**ファイルサイズ**: 約300行

## 分割予定モジュール

### 次の分割候補:

1. **Turn Order & Mulligan Manager** (~150-200行)
   - ターン順決定処理
   - マリガン処理

2. **Modal & UI Manager** (~150-200行)
   - モーダル表示管理
   - UI制御機能

3. **Drag & Drop Manager** (~100-150行)
   - ドラッグ&ドロップ処理
   - カード移動管理

4. **Card Effects Manager** (~100-150行)
   - カード効果処理
   - 特殊能力実装

## 分割の効果

### battle_engine.js のサイズ変化:
- **分割前**: 約2,600行
- **現在**: 約2,360行 (Phase Controller + Game Setup Manager 分割後)
- **削減量**: 約240行

### アーキテクチャの改善:
- ✅ 責任の分離
- ✅ コードの可読性向上
- ✅ メンテナンス性向上
- ✅ 再利用性向上
- ✅ テストの容易性向上

## 統合パターン

各モジュールは以下のパターンで統合されています:

```javascript
// battle_engine.js での初期化
this.phaseController = new PhaseController(this);
this.setupManager = new HololiveGameSetupManager(this);

// メソッドの委譲
methodName() {
  // ModuleManagerに委譲
  return this.moduleManager.methodName();
}
```

## ファイル構成

```
battle_simulator/
├── MODULE_SEPARATION_LOG.md     # このファイル
├── phase-controller.js          # フェーズ管理
├── game-setup-manager.js        # ゲームセットアップ
├── hand-manager.js              # 手札管理
├── card-display-manager.js      # カード表示
├── info-panel-manager.js        # 情報パネル
└── cpu_logic.js                 # CPU AI
```

---

**最終更新**: 2025年8月3日
**分割完了モジュール**: 6個
**削減コード行数**: 約800行以上
