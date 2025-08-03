# バトルシミュレーター トラブルシューティングガイド

## マリガン無限ループバグ

### 🚨 症状
- マリガンフェーズで両プレイヤーが永続的にループしてゲームが進行しない
- コンソールに「プレイヤー1がマリガンをスキップ」「プレイヤー2がマリガンをスキップ」が無限に繰り返される
- マリガン完了状態が正しく更新されない

### 📋 典型的なログ例
```javascript
turn-manager.js:231 プレイヤー1がマリガンをスキップ
turn-manager.js:299 CPU: 手札が良いのでマリガンをスキップします
turn-manager.js:231 プレイヤー2がマリガンをスキップ
turn-manager.js:231 プレイヤー1がマリガンをスキップ
turn-manager.js:299 CPU: 手札が良いのでマリガンをスキップします
turn-manager.js:231 プレイヤー2がマリガンをスキップ
// 無限ループ...
```

### 🔍 根本原因
1. **プロキシオブジェクトの配列インデックス代入問題**: `this.gameState.mulliganCompleted[currentPlayerId] = true;` でState Managerプロキシオブジェクトに対して配列インデックス代入ができない
2. **完了状態の更新失敗**: マリガン完了をマークしても実際には更新されず、常に `{1: false, 2: false}` のままになる
3. **State Manager連携不備**: State Manager が期待する `MULLIGAN_COMPLETE` アクションを適切に使用していない

### ⚙️ 修正方法

#### 1. proceedToNextMulliganPlayerメソッドの修正
**問題のあったコード:**
```javascript
// マリガン完了状態をマーク
this.gameState.mulliganCompleted[currentPlayerId] = true; // ★問題：プロキシオブジェクトで動作しない
```

**修正後:**
```javascript
// マリガン完了状態をマーク（State Manager対応）
if (this.engine.stateManager) {
  console.log(`🔍 State Manager使用してプレイヤー${currentPlayerId}を完了マーク`);
  this.engine.stateManager.updateState('MULLIGAN_COMPLETE', {
    player: currentPlayerId,
    count: this.gameState.mulliganCount[currentPlayerId] || 0
  });
} else {
  // フォールバック: 配列全体を更新
  console.log(`🔍 直接更新でプレイヤー${currentPlayerId}を完了マーク`);
  const newCompleted = { ...this.gameState.mulliganCompleted };
  newCompleted[currentPlayerId] = true;
  this.gameState.mulliganCompleted = newCompleted;
}
```

#### 2. 重複処理防止の追加
```javascript
// 既に完了している場合は重複処理を防ぐ
if (this.gameState.mulliganCompleted[playerId]) {
  console.log(`🔍 ⚠️ プレイヤー${playerId}のマリガンは既に完了済み - 重複処理をスキップ`);
  return;
}
```

#### 3. 非同期処理の同期化
**問題のあったコード:**
```javascript
setTimeout(() => {
  this.proceedToNextMulliganPlayer(playerId);
}, 500);
```

**修正後:**
```javascript
// 次のプレイヤーまたはDebut配置フェーズへ（setTimeout削除）
this.proceedToNextMulliganPlayer(playerId);
```

### 🧪 検証方法
1. 新しいゲームを開始してマリガンフェーズに進行
2. 両プレイヤーがマリガンをスキップ
3. コンソールログで完了状態が `{1: true, 2: true}` に更新されることを確認
4. Debut配置フェーズに正常に移行することを確認
5. 無限ループが発生しないことを確認

### 🔗 State Manager連携のポイント
- `gameState.mulliganCompleted` はプロキシオブジェクトでgetter/setterが定義されている
- 配列インデックスへの直接代入は動作しない
- `MULLIGAN_COMPLETE` アクションを使用してState Manager経由で更新する必要がある

### 📝 予防策
1. プロキシオブジェクトに対する配列操作は必ずState Manager経由で行う
2. 非同期処理（setTimeout）は競合状態を引き起こす可能性があるため最小限にする
3. 重複処理防止チェックを各処理の開始時に実装する
4. デバッグログで状態変化を詳細に追跡する

### 🎯 関連ファイル
- `battle_simulator/turn-manager.js`: メインの修正箇所
- `battle_simulator/state-manager.js`: MULLIGAN_COMPLETE アクション処理
- `js/battle_engine.js`: gameState プロキシオブジェクトの定義

---

## フェーズハイライト重複実行バグ

### 🚨 症状
- フェーズハイライト処理が各フェーズで2回実行される
- コンソールに同じフェーズハイライトログが重複して表示される
- `既存のハイライト数: 1` → `既存のハイライト数: 0` の繰り返しパターン

### 📋 典型的なログ例
```javascript
battle_engine.js:2512 === updatePhaseHighlight 呼び出し ===
battle_engine.js:2517 既存のハイライト数: 1
battle_engine.js:2532 新しいハイライト数: 1
battle_engine.js:2512 === updatePhaseHighlight 呼び出し ===  // ★重複実行
battle_engine.js:2517 既存のハイライト数: 0  // ★重複実行
battle_engine.js:2532 新しいハイライト数: 1  // ★重複実行
```

### 🔍 根本原因
`battle_engine.js` に **2つの `updatePhaseHighlight` メソッドが重複定義** されていた：
1. **Line 1013**: Card Display Manager に委譲する短いバージョン（正しい）
2. **Line 2511**: 詳細ログ付きの長いバージョン（重複・不要）

### ⚙️ 修正方法
重複している長いバージョンの `updatePhaseHighlight` メソッドを削除し、Card Display Manager への委譲版のみを残す。

**削除したコード:**
```javascript
// 削除: Line 2511以降の重複メソッド
updatePhaseHighlight() {
  console.log(`=== updatePhaseHighlight 呼び出し ===`);
  // ... 詳細な処理 ...
}
```

**残すコード:**
```javascript
// Line 1013: 正しいバージョン
updatePhaseHighlight() {
  // フェーズハイライト機能をCardDisplayManagerに委譲
  this.cardDisplayManager.updatePhaseHighlight();
}
```

### 🧪 検証方法
1. ゲームを開始してフェーズ進行を確認
2. コンソールログで `updatePhaseHighlight` 重複がないことを確認
3. 各フェーズで1回のみハイライト処理が実行されることを確認

### 📝 予防策
1. 同じクラス内でメソッド名の重複を避ける
2. モジュール分離時は重複定義をチェックする
3. Card Display Manager への委譲が正しく機能していることを確認
4. ファイル統合時は既存メソッドとの競合を注意深く確認

### 🎯 関連ファイル
- `js/battle_engine.js`: 重複メソッドの削除
- `battle_simulator/card-display-manager.js`: フェーズハイライト実装

---

## フェーズ進行の重複実行バグ

### 🚨 症状
- ターン終了処理が2回連続で実行される
- `executeResetStep`が重複して呼び出される
- 無限にフェーズが進行してしまう
- コンソールに同じログが重複して表示される

### 📋 典型的なログ例
```javascript
battle_engine.js:961 === ターン終了処理開始 ===
battle_engine.js:962 現在のプレイヤー: 2 → 切り替え後: 1
battle_engine.js:972 新しいターン - プレイヤー1, ターン数: 2
...
battle_engine.js:961 === ターン終了処理開始 ===  // ★重複実行
battle_engine.js:962 現在のプレイヤー: 1 → 切り替え後: 2  // ★重複実行
```

### 🔍 根本原因
1. **二重ターン終了処理**: `nextPhase()`メソッドでフェーズ6到達時に`endTurn()`を呼び出し、さらに`executeEndStep()`メソッドでも`endTurn()`を呼び出していた
2. **不正なボタンイベント**: `end-turn`ボタンが`nextPhase()`を呼び出していた（本来は`endTurn()`を呼ぶべき）

### ⚙️ 修正方法

#### 1. nextPhaseメソッドの修正
**問題のあったコード:**
```javascript
// エンドステップ（フェーズ5）の次はターン終了
if (this.gameState.currentPhase > 5) {
  console.log(`フェーズ5を超えたためターン終了`);
  this.phaseInProgress = false;
  this.endTurn(); // ★問題：二重実行の原因
  return;
}
```

**修正後:**
```javascript
// エンドステップ（フェーズ5）を超えた場合はフェーズ進行を停止
// （endTurnはexecuteEndStepで処理される）
if (this.gameState.currentPhase > 5) {
  console.log(`フェーズ5を超えました - executeEndStepでターン終了処理が実行されます`);
  this.phaseInProgress = false;
  return; // ★修正：endTurn()呼び出しを削除
}
```

#### 2. ボタンイベントリスナーの修正
**問題のあったコード:**
```javascript
document.getElementById('end-turn').addEventListener('click', () => this.nextPhase());
```

**修正後:**
```javascript
document.getElementById('end-turn').addEventListener('click', () => this.endTurn());
```

### 🧪 検証方法
1. ゲームを開始してエンドステップまで進行
2. コンソールログで重複メッセージがないことを確認
3. ターン切り替えが1回のみ実行されることを確認
4. フェーズ進行が正常に動作することを確認

### 🔗 関連する処理フロー
```
nextPhase() → executePhase() → executeEndStep() → endTurn()
```
- `executeEndStep()`が唯一の`endTurn()`呼び出し元であるべき
- `nextPhase()`は単純にフェーズ番号を更新するだけ

### 📝 予防策
1. ターン終了処理は`executeEndStep()`でのみ実行する
2. フェーズ進行ロジックでは状態変更のみを行い、ターン終了処理は分離する
3. ボタンイベントは対応する処理メソッドを正しく呼び出す
4. デバッグ時はコンソールログの重複チェックを必須とする

### 🎯 関連ファイル
- `js/battle_engine.js`: メインの修正箇所
- `battle_simulator/phase-controller.js`: フェーズ管理の分離後はこちらも要注意

---

## エール配置時のカード画像Unknown表示バグ

### 🚨 症状
- エール配置直後に一瞬センターカードが「unknown」と表示される
- エール配置自体は正常に動作するが、UI更新タイミングでカード情報が一時的に消失
- コンソールに `isHolomenCard判定: undefined = undefined (undefined)` が表示される

### 📋 典型的なログ例
```javascript
battle_engine.js:2655 ✅ [エール配置] プレイヤー1: 雪花ラミィ(center2)に青エールを添付しました
battle_engine.js:2163 isHolomenCard判定: undefined = undefined (undefined)  // ★問題：一瞬undefined
battle_engine.js:2163 isHolomenCard判定: 雪花ラミィ = true (ホロメン)      // ★正常復帰
```

### 🔍 根本原因
1. **UI更新タイミング問題**: エール配置直後にUI更新が即座に走り、State Manager同期完了前にカード参照が発生
2. **nullチェック不備**: `isHolomenCard`メソッドで`undefined`カードを受け取った際の処理不備
3. **非同期処理の競合**: データ同期とUI更新が非同期で実行され、一時的にデータ不整合が発生

### ⚙️ 修正方法

#### 1. isHolomenCardメソッドのnullチェック強化
**問題のあったコード:**
```javascript
isHolomenCard(card) {
  const isHolomen = card.card_type && card.card_type.includes('ホロメン');
  console.log(`isHolomenCard判定: ${card.name} = ${isHolomen} (${card.card_type})`);
  return isHolomen;
}
```

**修正後:**
```javascript
isHolomenCard(card) {
  // nullチェックを追加
  if (!card || !card.card_type) {
    console.log(`isHolomenCard判定: ${card ? card.name || 'unnamed' : 'null'} = false (nullまたはcard_typeなし)`);
    return false;
  }
  
  const isHolomen = card.card_type.includes('ホロメン');
  console.log(`isHolomenCard判定: ${card.name} = ${isHolomen} (${card.card_type})`);
  return isHolomen;
}
```

#### 2. UI更新抑制機能の実装
```javascript
// attachYellCardメソッドでUI更新を一時停止
attachYellCard(playerId, position, yellCard) {
  console.log(`=== エール配置開始 ===`);
  
  // UI更新を一時停止（unknown表示を防ぐ）
  this.isUpdatingYellCard = true;
  
  // エール配置処理...
  
  // データ同期完了後にUI更新を再開
  setTimeout(() => {
    this.isUpdatingYellCard = false;
    this.updateUI();
    this.updateCardAreas();
  }, 50);
}

// updateUIメソッドで抑制チェック
updateUI() {
  if (this.isUpdatingYellCard) {
    console.log(`⏸️ [UI更新抑制] エール更新中のため、カードエリア更新をスキップ`);
    return;
  }
  // 通常のUI更新処理...
}
```

#### 3. State Manager同期完了後のUI更新
```javascript
// データ同期完了後にUI更新を実行
if (statePlayer.cards[position][0] && statePlayer.cards[position][0].yellCards) {
  this.players[playerId][position] = statePlayer.cards[position][0];
  console.log(`🔄 [データ同期] ${position}をState Managerから同期しました`);
  
  // 同期完了後にUI更新を実行
  setTimeout(() => {
    this.isUpdatingYellCard = false;
    this.updateUI();
    this.updateCardAreas();
    console.log(`🎨 [UI更新] 同期完了後のUI更新を実行しました（抑制解除）`);
  }, 50);
}
```

### 🧪 検証方法
1. エール配置を実行
2. コンソールログで `⏸️ [UI更新抑制]` が表示されることを確認
3. 一瞬もunknownが表示されないことを確認
4. `🎨 [UI更新] 同期完了後のUI更新を実行しました（抑制解除）` で正常復帰を確認

### 🔗 State Manager連携のポイント
- エール配置処理中はUI更新を一時停止
- State Managerとの同期完了を待ってからUI更新を再開
- `isUpdatingYellCard`フラグで更新タイミングを制御

### 📝 予防策
1. 非同期データ更新時は必ずUI更新タイミングを制御する
2. null/undefinedチェックを各メソッドで徹底する
3. 重要な処理（エール配置等）では更新抑制フラグを使用
4. データ同期完了を確認してからUI更新を実行

### 🎯 関連ファイル
- `js/battle_engine.js`: `attachYellCard`, `isHolomenCard`, `updateUI`, `updateCardAreas`メソッド
- `battle_simulator/state-manager.js`: State Manager連携
- `battle_simulator/card-display-manager.js`: カード表示処理

---

## その他のよくある問題

### プレイヤーステップの自動進行問題
**症状**: プレイヤーが手動で操作すべきステップが自動で進行してしまう

**原因**: `attachYellCard()`等のメソッドでプレイヤー1とCPUの分岐処理が不正

**修正**: プレイヤーIDによる条件分岐を正しく実装し、プレイヤー1は手動進行、CPU（プレイヤー2）は自動進行を徹底する

### UI要素の重複イベントリスナー
**症状**: ボタンクリック時に意図しない処理が複数回実行される

**原因**: 
- 同じボタンに複数のイベントリスナーが登録されている
- HTMLとJavaScriptで重複してイベントが定義されている

**予防策**: 
- イベントリスナー登録前に既存のものを削除
- レガシーコントロールパネルと通常コントロールパネルの競合に注意
