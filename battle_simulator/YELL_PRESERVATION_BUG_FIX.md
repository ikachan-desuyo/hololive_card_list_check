# エール保持バグ修正ログ

## 🐛 バグ概要
エールがついているバックホロメンカードをコラボする際に、エールカードが別のカードに置き換わってしまう問題。

## 🔍 原因分析

### 1. Hand Manager: `createCardCopy`メソッドの問題
```javascript
// 問題のあるコード（修正前）
cardCopy.yellCards = []; // 常に空配列で初期化→エール情報が失われる
```

### 2. コラボ移動処理の問題
```javascript
// 問題のあるコード（修正前）
const updatedSourceCard = this.battleEngine.stateManager.recordCollabMove(sourceCard, playerId);
player[targetPosition] = updatedSourceCard; // 直接代入→エール情報が保持されない
```

### 3. エール情報の引き継ぎ不備
- コラボ移動時にエール情報を明示的に保持する処理がなかった
- SWAP_CARDS処理を経由せず直接カード置換していた

## ✅ 修正内容

### 1. `createCardCopy`メソッドの修正
```javascript
// 修正後: 既存エール情報を保持
if (!cardCopy.yellCards) {
  cardCopy.yellCards = [];
}
```

### 2. コラボ移動処理の強化
```javascript
// 修正後: Battle Engineプレイヤーオブジェクトを直接使用
const battleEnginePlayer = this.battleEngine.players[playerId];
const originalCard = battleEnginePlayer[sourcePosition];

// エラーハンドリング強化
if (!originalCard) {
  console.error(`❌ コラボ移動エラー: ${sourcePosition}にカードがありません`);
  console.log(`� Battle Engine Player${playerId} 全体:`, battleEnginePlayer);
  return false;
}
```

### 3. データ整合性の確保
```javascript
// Battle EngineとHand Manager間のplayerオブジェクト統一
// Hand Manager内でthis.battleEngine.players[playerId]を直接使用
// State Managerではなく、Battle Engineの実際のプレイヤーデータを参照
```

### 4. **追加修正: データソース統一**
**問題**: Hand ManagerとBattle Engineで異なるplayerオブジェクトを参照していた
**原因**: Hand Managerで`player`（State Manager）とBattle Engineの`players[playerId]`が異なるオブジェクト
**解決**: Battle Engineのplayerオブジェクトを統一的に使用

### 3. SWAP_CARDS処理の強化
```javascript
// デバッグログ追加でエール情報の移動を確認可能
console.log(`🔄 SWAP_CARDS: ${payload.sourcePosition} ↔ ${payload.targetPosition}`);
if (sourceCard?.yellCards?.length > 0) {
  console.log(`- ソースカードエール: ${sourceCard.yellCards.length}枚`);
}
```

### 4. 保険的な再設定処理
```javascript
// エール情報が確実に反映されるよう再度設定
setTimeout(() => {
  const collabCard = player.cards[targetPosition] || player[targetPosition];
  if (collabCard && originalCard?.yellCards?.length > 0) {
    collabCard.yellCards = [...originalCard.yellCards];
    this.battleEngine.updateUI();
  }
}, 10);
```

## 🔧 修正ファイル

1. **hand-manager.js**
   - `createCardCopy()`: エール情報保持の改善
   - `swapCards()`: コラボ移動時のエール引継ぎ処理追加

2. **state-manager.js**
   - `SWAP_CARDS`: エール情報移動のデバッグログ追加

## 📋 テスト項目

### ✅ 基本動作確認
- [ ] エールありバックホロメン→コラボ移動
- [ ] エール枚数の保持確認
- [ ] コラボ後のエール表示確認

### ✅ エッジケース確認
- [ ] 複数エール付きカードの移動
- [ ] エールなしカードの正常動作
- [ ] ターン終了時のエール状態維持

### ✅ UI確認
- [ ] エール表示の更新タイミング
- [ ] コンソールログでの追跡確認

## 🎯 期待される結果

- エール付きホロメンをコラボに移動しても、エール情報が完全に保持される
- コンソールログでエール引継ぎ過程を確認できる
- UI上でエール表示が正しく更新される

## 🚨 関連する可能性のある問題

1. ブルーム時のエール保持（既に対応済み）
2. リセットステップでのエール状態管理
3. 他の位置移動時のエール保持（センター↔バック等）

**重要な発見**: Battle EngineとState Managerで異なるplayerオブジェクトを参照していることが根本原因だった。

## 🔧 技術的解決策

### データソース統一
- Hand Manager: `this.battleEngine.players[playerId]` を使用
- Battle Engine: `this.players[playerId]` を使用  
- State Manager: Battle Engineと同期された状態を管理

### エラーハンドリング
- カード存在チェックの強化
- 詳細なデバッグログ出力
- データ構造の可視化

### 同期メカニズム
- SWAP_CARDS処理でのエール保持確認
- timeout処理による確実な反映
- UI更新タイミングの最適化

これらの修正により、エール付きカードのコラボ移動時にデータ不整合が発生する問題が解決される。
