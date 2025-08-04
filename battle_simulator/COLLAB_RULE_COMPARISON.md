# コラボルール vs 実装比較分析

## 📋 公式ルール（User提供）

### 🤝 コラボとは？
- バックポジションのホロメンをコラボポジションに移動することで「コラボ」が成立
- コラボすることで：
  - ホロパワーを溜める（推しスキルやSP推しスキルの発動に必要）
  - アーツを使用可能（センターポジションと同様に）

### 🔁 コラボの手順
1. デッキの一番上のカード1枚を裏向きでホロパワーに置く
2. バックポジションのホロメン1人をコラボポジションへ移動

### 🚫 コラボできない条件
- お休み状態のホロメンはコラボ不可
- デッキが0枚でホロパワーを置けない場合、コラボ不可
- コラボできるホロメンがいない場合、ホロパワーを置くことも不可

### 📦 コラボによるホロパワーの扱い
- ホロパワーは推しスキルやSP推しスキルの発動に使用される
- 使用する際は、新しく置かれたホロパワーから順にアーカイブする

### 💡 関連ルール・補足
- コラボポジションに移動したホロメンは、パフォーマンスステップでアーツを使用可能
- コラボホロメンは、リセットステップでバックポジションに戻され、お休み状態になる
- コラボによって得たホロパワーは、推しホロメンの能力発動に不可欠なリソース

---

## 🔧 現在の実装状況

### ✅ 実装済み機能

#### 1. コラボ移動の基本処理
```javascript
// hand-manager.js: line 412
const isCollabMove = targetPosition === 'collab' && sourcePosition.startsWith('back');

// hand-manager.js: line 463-469
if (isCollabMove) {
  // コラボ移動の記録とホロパワー配置（カード状態ベース）
  const updatedSourceCard = this.battleEngine.stateManager.recordCollabMove(sourceCard, playerId);
  
  // ホロパワーカード配置を強制実行
  this.placeHoloPowerFromDeck(playerId);
}
```

#### 2. コラボ移動の条件チェック
```javascript
// state-manager.js: canMoveToCollab()
// ✅ ホロメンカードのみ移動可能
// ✅ 1ターンに1度のみ制限
// ✅ お休み状態チェック
// ✅ コラボポジション使用状況チェック
```

#### 3. ホロパワー配置処理
```javascript
// hand-manager.js: placeHoloPowerFromDeck()
// ✅ デッキ先頭からカード取得
// ✅ ホロパワーエリアに配置
// ✅ UI更新とエフェクト表示
```

#### 4. コラボ後の状態管理
```javascript
// state-manager.js: recordCollabMove()
// ✅ collabMovedThisTurn フラグ設定
// ✅ collabLocked 状態付与（移動制限）
```

#### 5. リセットステップでの処理
```javascript
// phase-controller.js: line 166-177
// ✅ コラボのホロメンカードを横向きにしてバックに移動
// ✅ お休み状態の設定
```

### ⚠️ 不完全な実装

#### 1. デッキ0枚時の制限チェック
```javascript
// 現在の実装: hand-manager.js: line 498
if (player.deck && player.deck.length > 0) {
  const holoPowerCard = player.deck.shift();
  // ...
} else {
  console.error(`プレイヤー${playerId}のデッキが空です`);
  return; // ⚠️ エラー表示のみ、移動は阻止されない
}
```

**問題点**: デッキが空の場合、ホロパワー配置は失敗するが、コラボ移動自体は実行される

#### 2. コラボ移動の順序問題
**公式ルール**: 
1. 先にホロパワー配置
2. 後でホロメン移動

**現在の実装**:
1. 先にホロメン移動
2. 後でホロパワー配置

#### 3. ホロパワー使用時のアーカイブ順序
**公式ルール**: 新しく置かれたホロパワーから順にアーカイブ
**現在の実装**: 未実装（ホロパワー使用機能自体が未実装）

### ❌ 未実装機能

#### 1. 事前チェック機能
- コラボ実行前にデッキ枚数チェック
- ホロパワー配置可能性の確認

#### 2. 推しスキル・SP推しスキル機能
- ホロパワー消費機能
- スキル発動システム

#### 3. アーツ使用機能
- コラボホロメンのアーツ使用
- パフォーマンスステップでの処理

---

## 🚨 優先修正項目

### 1. **最重要**: デッキ0枚時の制限実装
```javascript
// 修正要: canMoveToCollab() に追加
// 5. デッキ残り枚数チェック
if (playerState.cards.deck.length === 0) {
  return {
    valid: false,
    reason: 'デッキが空のためホロパワーを置けません'
  };
}
```

### 2. **重要**: コラボ実行順序の修正
```javascript
// 修正要: 手順の順序変更
// 1. 先にホロパワー配置可能性チェック
// 2. ホロパワー配置実行
// 3. コラボ移動実行
```

### 3. **中程度**: コラボできるホロメンがいない場合の制限
```javascript
// 修正要: コラボ可能ホロメンの存在チェック
// バックポジションにアクティブなホロメンが1枚もない場合の制限
```

### 4. **低優先度**: ホロパワー使用機能
- 推しスキル実装と連動
- アーカイブ順序管理

---

## 📊 実装完成度（修正後）

| 機能 | 実装状況 | 完成度 |
|------|---------|--------|
| バック→コラボ移動 | ✅ | 95% |
| ホロパワー配置 | ✅ | 95% |
| お休み状態チェック | ✅ | 100% |
| 1ターン1回制限 | ✅ | 100% |
| リセットステップ処理 | ✅ | 100% |
| **デッキ0枚制限** | ✅ | **100%** |
| **実行順序** | ✅ | **100%** |
| **ターン制限リセット** | ✅ | **100%** |
| アーツ使用 | ❌ | 0% |
| 推しスキル連動 | ❌ | 0% |

**総合完成度: 約85%** (前回70%から改善)

---

## 🔧 実施済み修正内容

### ✅ Phase 1: 緊急修正（完了）

#### 1. デッキ0枚制限の実装
```javascript
// state-manager.js: canMoveToCollab()に追加
// 5. デッキ残り枚数チェック（ホロパワー配置のため）
if (!playerState.cards.deck || playerState.cards.deck.length === 0) {
  return {
    valid: false,
    reason: 'デッキが空のためホロパワーを置けません'
  };
}
```

#### 2. コラボ実行順序の修正
```javascript
// hand-manager.js: 公式ルール準拠の実行順序
if (isCollabMove) {
  // 1. 先にホロパワーカード配置を実行
  const holoPowerPlaced = this.placeHoloPowerFromDeck(playerId);
  
  if (!holoPowerPlaced) {
    // ホロパワー配置に失敗した場合、コラボ移動を中止
    return false;
  }
  
  // 2. ホロパワー配置成功後、コラボ移動の記録
  const updatedSourceCard = this.battleEngine.stateManager.recordCollabMove(sourceCard, playerId);
}
```

#### 3. **ターン制限リセット問題の修正**
```javascript
// turn-manager.js: RESET_TURN_FLAGS呼び出し
// 前のプレイヤーのブルームフラグ・ターン制限フラグをリセット
this.engine.stateManager.updateState('RESET_TURN_FLAGS', {
  player: previousPlayer
});

// state-manager.js: ターン制限フラグのリセット処理追加
case 'RESET_TURN_FLAGS':
  // ターン制限フラグもリセット
  if (player.gameState) {
    player.gameState.collabMovedThisTurn = false;
  }
  console.log(`プレイヤー${payload.player}のターン制限フラグをリセット`);
```

#### 4. コラボ可能ホロメン存在チェック
```javascript
// state-manager.js: canPlayerCollab()追加
// バックポジションにコラボ可能なホロメンが存在するかチェック
const availableHolomen = backPositions.some(pos => {
  const backCard = playerState.cards[pos];
  if (!backCard || !backCard.card_type?.includes('ホロメン')) {
    return false;
  }
  const cardState = this.getCardState(backCard);
  return !cardState.resting; // お休み状態でないホロメンが存在
});
```

#### 5. デバッグログの追加
- コラボ可能性チェック時の詳細ログ
- ターン制限リセット時のログ
- コラボ移動記録時のログ

---

## 🚨 **解決した問題**

### ❌ → ✅ 問題: コラボのターン1制限が1度実施後にずっと設定されたままになっている

**原因**: `RESET_BLOOM_FLAGS`処理で`bloomedThisTurn`のみリセットし、`collabMovedThisTurn`がリセットされていなかった

**修正内容**:
1. `RESET_BLOOM_FLAGS` → `RESET_TURN_FLAGS`に名称変更
2. ターン制限フラグ (`collabMovedThisTurn`) のリセット処理追加
3. 新旧両プレイヤーのフラグを確実にリセット
4. デバッグログでリセット動作を確認可能に

**検証方法**:
- コラボ実行後、次のターンでコラボ可能かチェック
- コンソールログで`collabMovedThisTurn`の状態変化を確認
**検証方法**:
- コラボ実行後、次のターンでコラボ可能かチェック
- コンソールログで`collabMovedThisTurn`の状態変化を確認

---

## 🔜 今後の拡張予定

### Phase 2: 機能拡張
1. アーツ使用システム
2. 推しスキル基盤  
3. ホロパワー管理システム

### Phase 3: 最適化
1. UI/UX改善
2. エラーハンドリング強化
3. パフォーマンス最適化

---

## 📋 テスト項目

### ✅ 基本コラボ機能
- [x] バック→コラボ移動
- [x] ホロパワー自動配置
- [x] 1ターン1回制限
- [x] お休み状態制限

### ✅ エラーケース
- [x] デッキ0枚時の制限
- [x] コラボポジション使用済み
- [x] コラボ可能ホロメンなし

### ✅ ターン管理
- [x] ターン制限フラグのリセット
- [x] リセットステップでの状態復帰

### ⏳ 未実装機能
- [ ] アーツ使用
- [ ] 推しスキル連動
- [ ] ホロパワー消費管理
