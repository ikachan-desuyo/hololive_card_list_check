# ホロライブTCG バトルシステム ステップ処理設計書

## 概要
ホロライブTCGバトルシミュレーターのステップ処理システムの設計と実装仕様について説明します。

## ゲーム全体の流れ

### 基本構造
```
ゲーム開始
├── 先行後攻決定
├── マリガン処理
└── ターンベース処理
    ├── プレイヤーターン
    ├── CPUターン
    └── 勝利条件判定
```

## ターン構造とステップ

### ターンの6ステップ
1. **リセットステップ** (`phase: 0`)
2. **手札ステップ** (`phase: 1`) - ドローステップ
3. **エールステップ** (`phase: 2`)
4. **メインステップ** (`phase: 3`)
5. **パフォーマンスステップ** (`phase: 4`)
6. **エンドステップ** (`phase: 5`)

### フェーズ進行仕様

| ステップ | プレイヤー操作 | CPU操作 | 進行方式 | 主な処理内容 |
|----------|----------------|---------|----------|--------------|
| **リセット** | 🤖 自動 | 🤖 自動 | 自動進行 | コラボ→バック移動、横向きカード復帰 |
| **手札** | 🤖 自動 | 🤖 自動 | 自動進行 | デッキから1枚ドロー |
| **エール** | 🎯 手動 | 🤖 自動 | 選択後手動進行 | エールカード配置選択 |
| **メイン** | 🎯 手動 | 🤖 自動 | 操作後手動進行 | カードプレイ、スキル使用 |
| **パフォーマンス** | 🎯 手動 | 🤖 自動 | 操作後手動進行 | 攻撃、スキル使用 |
| **エンド** | 🤖 自動 | 🤖 自動 | 自動でターン終了 | ターン終了処理、状態リセット |

## 状態管理

### ゲーム状態 (`gameState`)
```javascript
gameState: {
  currentPlayer: 1|2,           // 現在のプレイヤー
  currentPhase: -1~5,           // 現在のフェーズ
  turnCount: number,            // ターン数
  gameStarted: boolean,         // ゲーム開始状態
  gameEnded: boolean,           // ゲーム終了状態
  winner: null|1|2,             // 勝者
  firstPlayer: 1|2,             // 先行プレイヤー
  turnOrderDecided: boolean,    // ターン順決定状態
  mulliganPhase: boolean,       // マリガン中
  mulliganCount: {1: n, 2: n},  // マリガン回数
  mulliganCompleted: {1: b, 2: b} // マリガン完了状態
}
```

### プレイヤー状態 (`players[1|2]`)
```javascript
players[playerId]: {
  // カードエリア
  deck: Card[],                 // デッキ
  hand: Card[],                 // 手札
  life: Card[],                 // ライフ
  yellDeck: Card[],             // エールデッキ
  archive: Card[],              // アーカイブ
  oshi: Card|null,              // 推しホロメン
  collab: Card|null,           // コラボ
  center: Card|null,           // センター
  back1~5: Card|null,           // バックポジション
  holoPower: Card[],            // ホロパワー
  
  // 状態フラグ
  canPlaySupport: boolean,      // サポートカードプレイ可能
  usedLimitedThisTurn: string[] // ターン内使用済み制限カード
}
```

## ステップ処理実装

### 1. リセットステップ (`executeResetStep`)
**目的**: ターン開始時の盤面リセット
**処理内容**:
- コラボのホロメンを横向きにしてバックに移動
- バックの横向きホロメンを縦向きに復帰
- UI更新後、自動でドローステップに進行

**実装場所**: `battle_engine.js:755-829`
**進行**: 2秒後に自動進行

### 2. 手札ステップ (`executeDrawStep`)
**目的**: デッキからカードドロー
**処理内容**:
- デッキから1枚ドロー
- デッキ切れチェック
- UI更新後、自動でエールステップに進行

**実装場所**: `battle_engine.js:835-857`
**進行**: 2秒後に自動進行

### 3. エールステップ (`executeYellStep`)
**目的**: エールカードの配置
**処理内容**:
- エールデッキから1枚ドロー
- 配置可能ターゲット検索
- プレイヤー: 選択UI表示 → 手動進行
- CPU: 自動選択 → 自動進行

**実装場所**: `battle_engine.js:863-948`
**進行**: 
- プレイヤー: 選択完了後手動
- CPU: 2秒後自動

### 4. メインステップ (`executeMainStep`)
**目的**: カードプレイとスキル使用
**処理内容**:
- プレイヤー: 手動操作待機
- CPU: AIロジック実行 → 自動進行

**実装場所**: `battle_engine.js:2722-2752`
**進行**:
- プレイヤー: 完全手動
- CPU: AIロジック完了後自動

### 5. パフォーマンスステップ (`executePerformanceStep`)
**目的**: 攻撃とスキル使用
**処理内容**:
- プレイヤー: 手動操作待機
- CPU: AIロジック実行 → 自動進行

**実装場所**: `battle_engine.js:2757-2777`
**進行**:
- プレイヤー: 完全手動
- CPU: AIロジック完了後自動

### 6. エンドステップ (`executeEndStep`)
**目的**: ターン終了処理
**処理内容**:
- 状態リセット (canPlaySupport、usedLimitedThisTurn)
- 自動でターン終了

**実装場所**: `battle_engine.js:950-955`
**進行**: 1秒後に自動でターン終了

## フェーズ制御システム

### フェーズ進行制御
```javascript
nextPhase() → executePhase() → execute[Specific]Step(playerId)
```

### 進行制御フラグ
- `phaseInProgress`: 重複実行防止
- フェーズ完了後100ms後にリセット

### 自動進行タイミング
- **即座**: なし
- **1秒後**: エンドステップ→ターン終了
- **1.5秒後**: エール配置完了後
- **2秒後**: リセット、ドロー、CPU処理

## UI連携

### フェーズハイライト
- `updatePhaseHighlight()`: 現在フェーズを視覚的に表示
- CSS `.phase-highlight`クラスを動的適用

### 情報パネル連携
- `updateTurnInfo()`: ターン情報表示とパネル更新
- `window.updateGameStep()`: 情報パネルのステップ情報更新

### ログ出力
- 各ステップ開始/完了時のログ
- `window.logGameEvent()`: 情報パネルログ連携

## 特殊処理

### エール配置処理
1. **ターゲット検索**: センター、バックのホロメン
2. **UI表示**: `showYellTargetSelection()`
3. **配置実行**: `attachYellCard()`
4. **進行制御**: プレイヤー手動、CPU自動

### ターン終了処理
1. **状態切り替え**: currentPlayer変更
2. **フェーズリセット**: currentPhase = 0
3. **ターンカウント**: プレイヤー1時にインクリメント
4. **UI更新**: 全エリア表示更新

## エラーハンドリング

### デッキ切れ
- `checkVictoryConditions()`: 勝利条件判定
- ゲーム終了処理

### CPU処理エラー
- try-catch でエラーキャッチ
- エラー時も進行継続

## 今後の分離計画

### 分離対象
1. **StepProcessor**: ステップ実行ロジック
2. **PhaseController**: フェーズ進行制御
3. **GameStateManager**: 状態管理
4. **UICoordinator**: UI連携

### 分離メリット
- 責任分離による保守性向上
- テスタビリティ向上
- 機能拡張の容易性
- コードの再利用性

### 依存関係
```
BattleEngine
├── StepProcessor
│   ├── ResetStepHandler
│   ├── DrawStepHandler
│   ├── YellStepHandler
│   ├── MainStepHandler
│   ├── PerformanceStepHandler
│   └── EndStepHandler
├── PhaseController
└── GameStateManager
```

## 設計原則

1. **単一責任**: 各ステップは独立した処理
2. **開放閉鎖**: 新ステップ追加時の既存コード変更最小化
3. **依存性逆転**: 具体実装への依存を避け、抽象に依存
4. **関心の分離**: UI、ロジック、状態の分離

---

*この設計書は実装の分離作業前の現状把握と、将来の拡張性を考慮した設計指針として作成されました。*
