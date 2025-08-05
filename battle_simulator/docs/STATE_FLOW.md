# 状態遷移とフロー詳細

## ゲーム全体の状態遷移

```mermaid
stateDiagram-v2
    [*] --> 初期化
    初期化 --> デッキ選択 : initializeGame()
    デッキ選択 --> 準備完了待ち : デッキ設定完了
    準備完了待ち --> ゲーム開始 : 両プレイヤー準備完了
    ゲーム開始 --> プレイヤー1ターン : startGame()
    
    state プレイヤー1ターン {
        [*] --> リセットフェーズ
        リセットフェーズ --> ドローフェーズ : nextPhase()
        ドローフェーズ --> エールフェーズ : nextPhase()
        エールフェーズ --> メインフェーズ : nextPhase()
        メインフェーズ --> パフォーマンスフェーズ : nextPhase()
        パフォーマンスフェーズ --> [*] : endTurn()
    }
    
    プレイヤー1ターン --> プレイヤー2ターン : ターン終了
    プレイヤー2ターン --> プレイヤー1ターン : ターン終了
    プレイヤー1ターン --> ゲーム終了 : 勝利条件満了
    プレイヤー2ターン --> ゲーム終了 : 勝利条件満了
    ゲーム終了 --> [*]
```

## フェーズ詳細フロー

### リセットフェーズ (Phase: 'reset')
```mermaid
flowchart TD
    A[リセットフェーズ開始] --> B[カード状態リセット]
    B --> C[一時的効果クリア]
    C --> D[ホロメン立たせる]
    D --> E[RESET処理実行]
    E --> F[次フェーズへ]
```

### ドローフェーズ (Phase: 'draw')
```mermaid
flowchart TD
    A[ドローフェーズ開始] --> B{ターン1?}
    B -->|Yes| C[初期手札配布]
    B -->|No| D[カード1枚ドロー]
    C --> E[マリガン選択]
    D --> F[手札上限チェック]
    E --> F
    F --> G[次フェーズへ]
```

### エールフェーズ (Phase: 'cheer')
```mermaid
flowchart TD
    A[エールフェーズ開始] --> B[エールデッキからドロー]
    B --> C[配置先選択]
    C --> D{配置先有効?}
    D -->|Yes| E[エール配置]
    D -->|No| F[アーカイブへ]
    E --> G[次フェーズへ]
    F --> G
```

### メインフェーズ (Phase: 'main')
```mermaid
flowchart TD
    A[メインフェーズ開始] --> B[手札からカード選択]
    B --> C{カードタイプ?}
    C -->|ホロメン| D[配置処理]
    C -->|ツール/イベント| E[効果発動]
    C -->|ホロパワー| F[ホロパワー配置]
    D --> G{配置可能?}
    G -->|Yes| H[配置実行]
    G -->|No| I[エラー表示]
    E --> J[効果処理]
    F --> K[ホロパワー処理]
    H --> L[アクション継続?]
    I --> L
    J --> L
    K --> L
    L -->|Yes| B
    L -->|No| M[次フェーズへ]
```

### パフォーマンスフェーズ (Phase: 'performance')
```mermaid
flowchart TD
    A[パフォーマンスフェーズ開始] --> B[パフォーマンス可能ホロメン確認]
    B --> C{パフォーマンス実行?}
    C -->|Yes| D[ターゲット選択]
    C -->|No| H[ターン終了]
    D --> E[ダメージ計算]
    E --> F[ダメージ適用]
    F --> G[勝利条件チェック]
    G --> H
```
```mermaid
flowchart TD
    A[エンドフェーズ開始] --> B[ターン終了効果発動]
    B --> C[手札上限チェック]
    C --> D{手札超過?}
    D -->|Yes| E[手札調整]
    D -->|No| F[ターン終了処理]
    E --> F
    F --> G[相手ターンへ]
```

## カード配置フロー

```mermaid
flowchart TD
    A[カードドラッグ開始] --> B[ドラッグ可能チェック]
    B --> C{ドラッグ可能?}
    C -->|No| D[ドラッグ無効]
    C -->|Yes| E[ドラッグ中状態]
    E --> F[ドロップエリア判定]
    F --> G{有効なエリア?}
    G -->|No| H[元の位置に戻る]
    G -->|Yes| I[配置ルール検証]
    I --> J{配置可能?}
    J -->|No| K[エラー表示]
    J -->|Yes| L[配置実行]
    L --> M[状態更新]
    M --> N[UI更新]
    K --> H
    H --> O[ドラッグ終了]
    N --> O
    D --> O
```

## AI思考フロー

```mermaid
flowchart TD
    A[CPUターン開始] --> B[現在状況分析]
    B --> C[可能なアクション列挙]
    C --> D[各アクションスコア計算]
    D --> E[最適アクション選択]
    E --> F{フェーズ別処理}
    F -->|ドロー| G[自動ドロー]
    F -->|エール| H[エール配置AI]
    F -->|メイン| I[カード配置AI]
    F -->|パフォーマンス| J[攻撃AI]
    G --> K[次フェーズ判定]
    H --> K
    I --> K
    J --> K
    K --> L{フェーズ継続?}
    L -->|Yes| F
    L -->|No| M[ターン終了]
```

## データフロー

### 状態更新フロー
```mermaid
flowchart LR
    A[ユーザーアクション] --> B[BattleEngine]
    B --> C[StateManager]
    C --> D[状態検証]
    D --> E{検証OK?}
    E -->|No| F[エラー処理]
    E -->|Yes| G[状態更新]
    G --> H[変更通知]
    H --> I[UI更新]
    H --> J[他モジュール通知]
```

### カード表示更新フロー
```mermaid
flowchart LR
    A[状態変更] --> B[CardDisplayManager]
    B --> C[エリア別処理]
    C --> D[カード要素生成]
    D --> E[スタイル適用]
    E --> F[イベントバインド]
    F --> G[DOM更新]
```

## イベント処理チェーン

### カードクリックイベント（新システム）
```mermaid
flowchart TD
    A[カードクリック] --> B[CardInteractionManager.showCardInfo]
    B --> C[右側パネル更新]
    B --> D[アクションマーク表示]
    D --> E{アクション選択}
    E -->|効果発動| F[activateCardEffect]
    E -->|詳細表示| G[カード詳細表示]
    F --> H[CardEffectManager.executeEffect]
    H --> I[効果処理実行]
    I --> J[状態更新]
    J --> K[UI更新]
    G --> L[モーダル表示]
```

### カード効果発動フロー
```mermaid
flowchart TD
    A[効果発動トリガー] --> B{効果発動可能?}
    B -->|No| C[エラーメッセージ]
    B -->|Yes| D[効果実行]
    D --> E{効果タイプ}
    E -->|ブルーム| F[ブルーム効果処理]
    E -->|コラボ| G[コラボ効果処理]
    E -->|ギフト| H[ギフト効果処理]
    F --> I[使用済みマーク設定]
    G --> I
    H --> J[継続効果適用]
    I --> K[UI更新]
    J --> K
```

### カードクリックイベント（レガシー）
1. `card.addEventListener('click')` - カード要素
2. `handleCardClick()` - BattleEngine
3. `validateAction()` - PhaseController
4. `executeAction()` - PlacementController
5. `updateState()` - StateManager
6. `updateUI()` - BattleEngine

### フェーズ進行イベント
1. `nextPhaseBtn.addEventListener('click')` - ボタン
2. `nextPhase()` - PhaseController
3. `executePhase()` - PhaseController
4. `updateState()` - StateManager
5. `updateUI()` - BattleEngine
6. `updatePhaseHighlight()` - UI更新

### ターン終了イベント
1. `endTurnBtn.addEventListener('click')` - ボタン
2. `endTurn()` - TurnManager
3. `switchPlayer()` - TurnManager
4. `resetTurnFlags()` - TurnManager
5. `updateState()` - StateManager
6. `updateUI()` - BattleEngine

## エラーハンドリングフロー

```mermaid
flowchart TD
    A[エラー発生] --> B{エラータイプ}
    B -->|検証エラー| C[ユーザーに通知]
    B -->|システムエラー| D[ログ出力]
    B -->|データエラー| E[データ復旧試行]
    C --> F[処理継続]
    D --> G[フォールバック処理]
    E --> H{復旧成功?}
    H -->|Yes| F
    H -->|No| I[ゲームリセット提案]
    G --> F
    I --> J[ユーザー選択待ち]
```

## パフォーマンス最適化ポイント

1. **状態更新の最適化**
   - 不要な更新の抑制
   - バッチ更新の実装

2. **UI更新の最適化**
   - Virtual DOM的な差分更新
   - アニメーション最適化

3. **メモリ管理**
   - イベントリスナーの適切な削除
   - オブジェクト参照の管理

4. **非同期処理**
   - カードデータ読み込みの最適化
   - 重い処理の分割
