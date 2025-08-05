# バトルシミュレーター トラブルシューティングガイド

## よくある問題と解決方法

### 1. ゲームが開始できない

#### 症状
- 「ゲーム開始」ボタンが無効のまま
- エラーメッセージが表示される

#### 原因と解決方法

**原因1: デッキが設定されていない**
```
解決方法: 
1. 「デッキ選択」ボタンをクリック
2. プレイヤー1、プレイヤー2両方のデッキを設定
3. 推しホロメンが設定されていることを確認
```

**原因2: カードデータが読み込まれていない**
```
解決方法:
1. ブラウザの開発者ツールでコンソールエラーを確認
2. card_data.jsonが正しく読み込まれているかチェック
3. ネットワークエラーがある場合はページをリロード
```

**原因3: 必要なJavaScriptファイルが読み込まれていない**
```
解決方法:
1. 開発者ツールでネットワークタブを確認
2. 404エラーがあるJSファイルを特定
3. ファイルパスを修正するかファイルを復旧
```

### 2. カードが配置できない

#### 症状
- ドラッグ&ドロップが動作しない
- カードをドロップしても元の位置に戻る

#### 原因と解決方法

**原因1: 配置ルール違反**
```
確認ポイント:
- ホロメンカードは適切なポジションか？
- センターポジションにはデビューカードのみ配置可能
- バックポジションにはセンターにカードがある状態で配置
- コラボポジションがある場合のバック制限
```

**原因2: フェーズ制限**
```
解決方法:
- メインフェーズ中のみカード配置可能
- 現在のフェーズを確認
- 必要に応じて「次のフェーズ」で進行
```

**原因3: プレイヤーターンでない**
```
解決方法:
- 現在のプレイヤーターンを確認
- プレイヤー1のターン中のみカード配置可能
```

### 4. カード効果が発動しない

#### 症状
- カードをクリックしても効果発動マークが表示されない
- 効果発動ボタンをクリックしても効果が実行されない

#### 原因と解決方法

**原因1: カード効果が登録されていない**
```
確認方法:
1. 開発者ツールで以下を実行:
   window.cardEffects && window.cardEffects[cardId]
2. カード効果定義ファイルが読み込まれているかチェック
3. card-effects/cards/フォルダに該当カードのJSファイルがあるか確認

解決方法:
- カード効果を定義するJSファイルを作成
- EffectRegistryに効果を登録
```

**原因2: 効果発動条件を満たしていない**
```
確認ポイント:
- ブルーム効果: ブルームしたターンかどうか
- コラボ効果: コラボエリアにいるかどうか、コラボしたターンかどうか
- フェーズ制限: メインフェーズ中かどうか
- 既に効果を使用済みでないか

デバッグ方法:
1. 開発者ツールで以下を実行:
   battleEngine.cardInteractionManager.canActivateEffect(card, position)
2. 条件チェック結果を確認
```

**原因3: CardEffectSystemが初期化されていない**
```
解決方法:
1. 開発者ツールで以下を確認:
   battleEngine.cardEffectTriggerSystem
2. nullの場合は該当システムの初期化が必要
3. ページリロードで解決する場合が多い
```

### 5. カードインタラクションの問題

#### 症状
- カードクリック時に右側パネルに情報が表示されない
- アクションマークが表示されない

#### 原因と解決方法

**原因1: CardInteractionManagerが初期化されていない**
```
確認方法:
開発者ツールで以下を実行:
battleEngine.cardInteractionManager

解決方法:
- BattleEngineの初期化時にCardInteractionManagerが作成されているか確認
- 初期化順序の問題の可能性
```

**原因2: InfoPanelManagerが見つからない**
```
確認方法:
1. battleEngine.infoPanelManager が存在するかチェック
2. 右側パネルのDOM要素が存在するかチェック

解決方法:
- HTMLに適切なパネル要素があるか確認
- InfoPanelManagerの初期化を確認
```

**原因3: カード要素が見つからない**
```
デバッグ方法:
1. 開発者ツールで以下を実行:
   document.querySelectorAll('[data-card-id="カードID"]')
2. カード要素にdata-card-id属性が設定されているか確認

解決方法:
- CardDisplayManagerでのカード要素作成時の属性設定を確認
- DOM構造の整合性をチェック
```

### 4. パフォーマンスの問題

#### 症状
- 動作が重い
- フェーズ切り替えが遅い
- UI更新が遅延する

#### 原因と解決方法

**原因1: 過剰なUI更新**
```
解決方法:
1. 開発者ツールのパフォーマンスタブで分析
2. updateUI()の呼び出し頻度を確認
3. 不要な更新を抑制するロジックを追加
```

**原因2: メモリリーク**
```
解決方法:
1. 開発者ツールのメモリタブで確認
2. イベントリスナーが適切に削除されているかチェック
3. 長時間使用後は一度ページをリロード
```

### 5. 状態管理の問題

#### 症状
- ゲーム状態が不整合
- カードの位置がおかしい
- プレイヤー切り替えが正しく動作しない

#### 原因と解決方法

**原因1: 状態の同期エラー**
```
解決方法:
1. StateManagerの状態を確認
   console.log(battleEngine.stateManager.getState())
2. プロキシオブジェクトの更新が正しく反映されているかチェック
3. 必要に応じてresetGame()でリセット
```

**原因2: 非同期処理の競合**
```
解決方法:
1. 連続した操作を避ける
2. 処理完了を待ってから次の操作を実行
3. isUpdating系のフラグを確認
```

## デバッグ方法

### 1. 基本的なデバッグ手順

1. **開発者ツールを開く** (F12)
2. **コンソールタブでエラーを確認**
3. **ネットワークタブでリソース読み込みを確認**
4. **要素タブでDOM構造を確認**

### 2. ゲーム状態の確認方法

```javascript
// 現在のゲーム状態を確認
console.log('Game State:', battleEngine.gameState);

// プレイヤー状態を確認
console.log('Player 1:', battleEngine.players[1]);
console.log('Player 2:', battleEngine.players[2]);

// StateManagerの内部状態を確認
console.log('State Manager:', battleEngine.stateManager.getState());

// 現在のフェーズを確認
console.log('Current Phase:', battleEngine.gameState.currentPhase);
console.log('Current Player:', battleEngine.gameState.currentPlayer);
```

### 3. カードデータの確認方法

```javascript
// カードデータベースの確認
console.log('Card Database:', battleEngine.cardDatabase);

// 特定のカードを検索
const card = battleEngine.cardDatabase.find(c => c.name === 'カード名');
console.log('Found Card:', card);

// プレイヤーの手札を確認
console.log('Player 1 Hand:', battleEngine.players[1].cards.hand);
```

### 4. UI要素の確認方法

```javascript
// 特定のDOM要素を確認
const element = document.getElementById('element-id');
console.log('Element:', element);

// カードエリアの内容を確認
const cardAreas = document.querySelectorAll('.card-area');
cardAreas.forEach((area, index) => {
    console.log(`Area ${index}:`, area.innerHTML);
});
```

## 緊急時の対処法

### 1. 完全リセット手順

1. **ブラウザをリロード** (F5)
2. **キャッシュクリア** (Ctrl+Shift+R)
3. **ローカルストレージクリア**
   ```javascript
   localStorage.clear();
   location.reload();
   ```

### 2. 状態復旧手順

```javascript
// ゲーム状態をリセット
battleEngine.resetGame();

// 強制的にUI更新
battleEngine.updateUI();

// 状態管理をリセット
battleEngine.stateManager = new HololiveStateManager(battleEngine);
```

### 3. 手動でのゲーム状態設定

```javascript
// 手動でゲーム状態を設定（テスト用）
battleEngine.gameState.gameStarted = true;
battleEngine.gameState.currentPlayer = 1;
battleEngine.gameState.currentPhase = 3; // メインフェーズ
battleEngine.updateUI();
```

## パフォーマンス監視

### 1. 重要な監視項目

- **メモリ使用量**: 長時間使用でのメモリリークチェック
- **DOM要素数**: 不要な要素の蓄積チェック
- **イベントリスナー数**: リスナーの適切な削除チェック
- **ネットワーク要求**: 不要な通信の発生チェック

### 2. 監視用コード

```javascript
// メモリ使用量監視
setInterval(() => {
    if (performance.memory) {
        console.log('Memory Usage:', {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB',
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + ' MB'
        });
    }
}, 10000); // 10秒ごと

// DOM要素数監視
console.log('Total DOM Elements:', document.getElementsByTagName('*').length);
```

## 既知の制限事項

1. **ブラウザ互換性**
   - Chrome, Firefox, Safari, Edge (最新版) で動作確認済み
   - IE11以下は非対応

2. **パフォーマンス制限**
   - 長時間の連続使用ではメモリ使用量が増加する可能性
   - 大量のカード表示時にはパフォーマンスが低下する可能性

3. **機能制限**
   - ネットワーク対戦機能は未実装
   - 一部の特殊効果カードは手動処理が必要

## サポート情報

問題が解決しない場合は、以下の情報を含めて報告してください：

1. **環境情報**
   - ブラウザ名とバージョン
   - OS名とバージョン

2. **再現手順**
   - 問題が発生するまでの具体的な操作手順

3. **エラー情報**
   - 開発者ツールのコンソールエラー
   - 表示される警告メッセージ

4. **期待する動作**
   - 本来どのような動作を期待していたか
