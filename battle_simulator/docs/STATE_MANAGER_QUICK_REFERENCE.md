# State Manager クイックリファレンス

## 🚀 基本的な状態更新パターン

### カード情報の更新
```javascript
// カードを配置
battleEngine.stateManager.updateState('PLACE_CARD', {
  player: 1, card: cardObject, position: 'center'
});

// カードエリアを更新
battleEngine.stateManager.updateState('UPDATE_PLAYER_CARDS', {
  player: 1, area: 'hand', cards: newHandArray
});

// カード状態を更新（お休み、ダメージ等）
battleEngine.stateManager.updateState('UPDATE_CARD_STATE', {
  playerId: 1, position: 'center', cardState: { resting: false, damage: 2 }
});
```

### プレイヤー情報の更新
```javascript
// プレイヤーゲーム状態
battleEngine.stateManager.updateState('UPDATE_PLAYER_GAME_STATE', {
  player: 1, property: 'collabMovedThisTurn', value: true
});

// デッキ情報
battleEngine.stateManager.updateState('UPDATE_PLAYER_DECK', {
  player: 1, property: 'mainDeck', value: newDeckArray
});
```

### ゲーム進行の更新
```javascript
// フェーズ変更
battleEngine.stateManager.updateState('PHASE_CHANGE', { phase: 3 });

// プレイヤー変更  
battleEngine.stateManager.updateState('PLAYER_CHANGE', { player: 2 });

// ターン数更新
battleEngine.stateManager.updateState('UPDATE_PLAYER_TURN', {
  player: 2, turnCount: 3
});
```

## 🔍 データの読み取り

### プロキシ経由（推奨）
```javascript
// ゲーム状態
const currentPlayer = battleEngine.gameState.currentPlayer;
const currentPhase = battleEngine.gameState.currentPhase;

// プレイヤーカード
const centerCard = battleEngine.players[1].center;
const handCards = battleEngine.players[1].hand;
```

### State Manager直接取得
```javascript
// 状態パス指定
const player = battleEngine.stateManager.getStateByPath('turn.currentPlayer');
const handCards = battleEngine.stateManager.getStateByPath('players.1.cards.hand');

// 全状態取得
const fullState = battleEngine.stateManager.getState();
```

## ⚠️ 避けるべきパターン

```javascript
// ❌ 直接更新（データ不整合の原因）
battleEngine.gameState.currentPlayer = 2;
battleEngine.players[1].center = newCard;
battleEngine.players[1].hand.push(newCard);

// ✅ 正しい方法
battleEngine.stateManager.updateState('PLAYER_CHANGE', { player: 2 });
battleEngine.stateManager.updateState('UPDATE_PLAYER_CARDS', {
  player: 1, area: 'center', cards: newCard
});
```

## 🛡️ エラーハンドリング

```javascript
const result = battleEngine.stateManager.updateState('ACTION_TYPE', payload);
if (!result.success) {
  console.error('更新失敗:', result.reason);
  // 適切なエラー処理
}
```

## 📋 主要アクションタイプ一覧

| アクション | 用途 |
|-----------|------|
| `PLACE_CARD` | カード配置 |
| `UPDATE_PLAYER_CARDS` | カードエリア更新 |
| `UPDATE_CARD_STATE` | カード状態更新 |
| `SWAP_CARDS` | カード位置交換 |
| `PHASE_CHANGE` | フェーズ変更 |
| `PLAYER_CHANGE` | プレイヤー変更 |
| `UPDATE_PLAYER_TURN` | ターン数更新 |
| `GAME_START` / `GAME_END` | ゲーム状態 |
| `MULLIGAN_COMPLETE` | マリガン完了 |
| `RESET_TURN_FLAGS` | ターン制限リセット |

この参考資料に従って実装すれば、データの整合性を保ちながら安全な状態管理が可能です。
