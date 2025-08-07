# バトルシミュレーター 状態管理ガイド

## 概要

このドキュメントは、ホロライブTCGバトルシミュレーターの複雑化した状態管理システムの正規手順を記載します。
プロキシパターンとState Managerを使用した統合システムにより、データの整合性を保ちながら安全な状態更新を実現しています。

## アーキテクチャ概要

### 主要コンポーネント

1. **HololiveStateManager** - 中央状態管理システム
2. **HololiveBattleEngine** - メインエンジン（プロキシ統合）
3. **各種Manager** - 機能別管理（Hand, Phase, Turn, Setup, Placement）
4. **Proxy System** - 互換性のための状態アクセス層

### 状態管理フロー

```
UI/User Action → Manager → State Manager → State Update → Proxy → Battle Engine → UI Update
```

## 正規の状態更新手順

### 1. 基本原則

#### ✅ 正しい手順
```javascript
// State Managerを通じた状態更新
battleEngine.stateManager.updateState('ACTION_TYPE', {
  player: playerId,
  // ... payload
});

// Proxy経由でのアクセス（読み取り）
const currentPlayer = battleEngine.gameState.currentPlayer;
const playerCard = battleEngine.players[1].center;
```

#### ❌ 避けるべき手順
```javascript
// 直接的な状態操作（データ不整合の原因）
battleEngine.gameState.currentPlayer = 2; // これは実際にはProxyで処理されるが、明示的にState Managerを使うべき
battleEngine.players[1].center = newCard; // これも同様
```

### 2. カード情報の更新

#### プレイヤーカードエリアの更新

```javascript
// 正規手順：State Manager経由
battleEngine.stateManager.updateState('UPDATE_PLAYER_CARDS', {
  player: playerId,        // 1 or 2
  area: 'center',         // 'center', 'collab', 'back1'-'back5', 'hand', 'deck', etc.
  cards: newCardData      // 新しいカードデータ
});

// 実例：センターにカードを配置
battleEngine.stateManager.updateState('PLACE_CARD', {
  player: 1,
  card: cardObject,
  position: 'center'
});
```

#### カード状態の更新

```javascript
// カードの状態情報を更新（お休み、ダメージ、エールなど）
battleEngine.stateManager.updateState('UPDATE_CARD_STATE', {
  playerId: 1,
  position: 'center',
  cardState: {
    resting: false,
    damage: 2,
    yellCards: [yellCard1, yellCard2]
  }
});
```

### 3. プレイヤー情報の更新

#### ゲーム状態の更新

```javascript
// プレイヤーのゲーム状態を更新
battleEngine.stateManager.updateState('UPDATE_PLAYER_GAME_STATE', {
  player: 1,
  property: 'collabMovedThisTurn',
  value: true
});
```

#### デッキ情報の更新

```javascript
// デッキ情報を更新
battleEngine.stateManager.updateState('UPDATE_PLAYER_DECK', {
  player: 1,
  property: 'mainDeck',
  value: newDeckArray
});
```

### 4. ゲーム進行の更新

#### ターン・フェーズ管理

```javascript
// フェーズ変更
battleEngine.stateManager.updateState('PHASE_CHANGE', {
  phase: 3  // メインステップ
});

// プレイヤー変更
battleEngine.stateManager.updateState('PLAYER_CHANGE', {
  player: 2
});

// ターン数更新
battleEngine.stateManager.updateState('UPDATE_PLAYER_TURN', {
  player: 2,
  turnCount: 3
});
```

#### ゲーム状態変更

```javascript
// ゲーム開始
battleEngine.stateManager.updateState('GAME_START', {});

// ゲーム終了
battleEngine.stateManager.updateState('GAME_END', {
  winner: 1
});

// マリガン完了
battleEngine.stateManager.updateState('MULLIGAN_COMPLETE', {
  player: 1,
  count: 2
});
```

## Manager別の責任範囲

### HandManager
- **責任**: 手札の表示、ドラッグ&ドロップ、カードプレイ
- **正規更新方法**:
```javascript
// 手札からカードを除去
const newHand = [...player.hand];
newHand.splice(cardIndex, 1);
battleEngine.stateManager.updateState('UPDATE_PLAYER_CARDS', {
  player: 1,
  area: 'hand',
  cards: newHand
});
```

### PhaseController
- **責任**: フェーズ進行、ステップ実行
- **正規更新方法**:
```javascript
// PhaseController内でのフェーズ進行
battleEngine.stateManager.updateState('PHASE_CHANGE', {
  phase: nextPhase
});
```

### TurnManager
- **責任**: ターン管理、マリガン処理
- **正規更新方法**:
```javascript
// ターン終了時の状態リセット
battleEngine.stateManager.updateState('RESET_TURN_FLAGS', {
  player: currentPlayer
});
```

### PlacementController
- **責任**: カード配置制御、ルール検証
- **正規更新方法**:
```javascript
// 配置有効性のチェック（状態変更なし）
const validity = battleEngine.stateManager.checkDropValidity(card, position, playerId);
```

### CardEffectManager / ScalableCardEffectManager
- **責任**: 個別カード効果の管理・実行、大規模カード対応
- **正規更新方法**:
```javascript
// カード効果の実行（内部でState Managerを使用）
const result = battleEngine.cardEffectManager.executeEffect(card, 'execute', context);

// カード効果の登録（システム初期化時）
battleEngine.cardEffectManager.registerCardEffect(cardId, effectConfig);
```

### PerformanceManager
- **責任**: 攻撃処理、スキル発動管理
- **正規更新方法**:
```javascript
// 攻撃実行時の状態更新は内部でState Manager経由
battleEngine.performanceManager.executeAttack(attackerCard, targetCard);
```

### InfoPanelManager
- **責任**: UI表示、ログ管理
- **正規更新方法**:
```javascript
// UI更新は読み取り専用のため、State Managerとの連携は不要
battleEngine.infoPanelManager.updateStepInfo(phase, player, turn);
```

## データ同期メカニズム

### State Manager ↔ Battle Engine 同期

1. **State Manager**: 正規の状態を保持
2. **Proxy System**: Battle Engineの既存コードとの互換性を維持
3. **自動同期**: State Manager更新時にProxyが自動的に反映

### 同期確認方法

```javascript
// 状態の一貫性を確認
const stateManagerData = battleEngine.stateManager.getState();
const proxyData = {
  currentPlayer: battleEngine.gameState.currentPlayer,
  player1Center: battleEngine.players[1].center
};

// デバッグ用：状態比較
console.log('State Manager:', stateManagerData.turn.currentPlayer);
console.log('Proxy:', proxyData.currentPlayer);
```

## エラーハンドリング

### 状態更新エラー

```javascript
const result = battleEngine.stateManager.updateState('ACTION_TYPE', payload);
if (!result.success) {
  console.error('状態更新エラー:', result.reason);
  // 適切なエラー処理
}
```

### 状態遷移中のエラー

State Managerは状態遷移中フラグ（`transitionInProgress`）を使用して、
競合状態を防止します。

```javascript
// 安全な状態更新（State Managerが自動的に制御）
battleEngine.stateManager.updateState('SAFE_ACTION', payload);

// UPDATE_PLAYER_CARDSは状態遷移中でも安全に実行可能
battleEngine.stateManager.updateState('UPDATE_PLAYER_CARDS', {
  player: 1,
  area: 'hand',
  cards: newHand
});
```

## デバッグ・監視

### 状態履歴の確認

```javascript
// デバッグ情報の取得
const debugInfo = battleEngine.stateManager.getDebugInfo();
console.log('状態履歴:', debugInfo.history);
console.log('リスナー数:', debugInfo.listenerCount);
```

### イベントリスナーの活用

```javascript
// 状態変更の監視
battleEngine.stateManager.addListener('PLAYER_CHANGE', (payload, oldState, newState) => {
  console.log('プレイヤー変更:', payload.player);
});

// 全般的な状態変更の監視
battleEngine.stateManager.addListener('*', (actionType, payload, oldState, newState) => {
  console.log('状態変更:', actionType, payload);
});
```

## 実装時の注意点

### 1. 必ずState Managerを経由する

カード情報やプレイヤー情報を更新する際は、必ずState Managerの`updateState`メソッドを使用してください。

### 2. 適切なアクションタイプを使用する

State Managerは定義されたアクションタイプのみを受け付けます。新しいアクションが必要な場合は、State Managerに追加してください。

### 3. エラーハンドリングの実装

`updateState`メソッドは常に結果オブジェクトを返すため、必ず成功/失敗をチェックしてください。

### 4. 非同期処理への配慮

UIの更新やアニメーションが含まれる場合は、適切なタイミングで状態更新を行ってください。

### 5. プロキシの活用

既存コードとの互換性のため、読み取り操作にはプロキシ経由でのアクセスを活用できます。ただし、更新は必ずState Manager経由で行ってください。

### 6. カード効果システムとの連携

カード効果システム（ScalableCardEffectManager）は内部でState Managerと連携しています。カード効果の実装時も、適切な更新手順に従ってください。

```javascript
// カード効果内での状態更新例
const cardEffect = {
  execute: (card, context, battleEngine) => {
    // 正規手順：State Manager経由でカード情報を更新
    battleEngine.stateManager.updateState('UPDATE_PLAYER_CARDS', {
      player: context.player,
      area: 'hand', 
      cards: newHandCards
    });
    
    return { success: true, message: '効果を実行しました' };
  }
};
```

## まとめ

このガイドに従って実装することで、データの整合性を保ちながら、安全で予測可能な状態管理が実現できます。新しい機能を追加する際やバグ修正を行う際は、必ずこの手順に従ってください。
