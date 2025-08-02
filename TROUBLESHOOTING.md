# バトルシミュレーター トラブルシューティングガイド

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
