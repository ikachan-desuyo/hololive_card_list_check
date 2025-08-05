/**
 * カード効果実装ガイド
 * 新しいカード効果を実装する際の手順書
 */

# カード効果実装ガイド

## 概要
このシステムは1000枚以上のカードの効果を効率的に実装・管理するために設計されています。

## 実装レベル別ガイド

### レベル1: 基本的な効果（推奨）
基本的なドロー、サーチ、ダメージ効果など。`CardEffectBuilder`を使用して簡単に実装できます。

```javascript
// 例：2枚ドローするカード
const MyDrawCard = new CardEffectBuilder('my_draw_card', 'マイドローカード')
  .addCondition('phase', { phase: 3 }) // メインフェーズのみ
  .addEffect('draw', { count: 2 })
  .build();
```

### レベル2: 条件付き効果
特定の条件下で発動する効果。既存のテンプレートを活用できます。

```javascript
// 例：2色以上いる時のサーチ効果
const ConditionalCard = new CardEffectBuilder('conditional_card', '条件付きカード')
  .addCondition('stageColors', { minColors: 2 })
  .addEffect('search', {
    count: 1,
    types: ['ホロメン'],
    description: 'ホロメンを選択してください'
  })
  .build();
```

### レベル3: カスタム効果
独自の処理が必要な効果。`CardEffectUtils`の共通メソッドを活用します。

```javascript
const CustomCard = {
  cardId: 'custom_card',
  name: 'カスタムカード',
  type: 'support',
  
  execute: async (card, context, battleEngine) => {
    const utils = battleEngine.cardEffectTriggerSystem.utils;
    const currentPlayer = battleEngine.gameState.currentPlayer;
    
    // カスタム処理をここに実装
    const result = utils.drawCards(currentPlayer, 1);
    utils.updateDisplay();
    
    return {
      success: true,
      message: '効果を実行しました'
    };
  }
};
```

## 実装手順

### 1. カードメタデータの登録
`card-metadata.js`にカード情報を追加します：

```javascript
'your_card_id': {
  pattern: EFFECT_PATTERNS.SIMPLE_DRAW,  // 効果パターン
  complexity: 'low',                     // 複雑さ
  tags: ['draw', 'basic'],              // タグ
  description: 'カードの説明',
  effectConfig: {
    drawCount: 2,
    conditions: []
  }
}
```

### 2. 効果の実装
実装方法を選択：

#### A) CardEffectBuilder を使用（推奨）
```javascript
const MyCard = new CardEffectBuilder('card_id', 'カード名')
  .addCondition('phase', { phase: 3 })
  .addEffect('draw', { count: 2 })
  .build();
```

#### B) 直接実装
```javascript
const MyCard = {
  cardId: 'card_id',
  name: 'カード名',
  canActivate: (card, context, battleEngine) => { /* 条件 */ },
  execute: async (card, context, battleEngine) => { /* 効果 */ }
};
```

### 3. グローバル登録
```javascript
if (typeof window !== 'undefined') {
  if (!window.cardEffects) window.cardEffects = {};
  window.cardEffects['card_id'] = MyCard;
}
```

## 利用可能なユーティリティメソッド

### `CardEffectUtils`の主要メソッド

#### デッキ操作
- `selectCardsFromDeck(player, options)` - デッキからカードを選択
- `shuffleDeck(player)` - デッキをシャッフル
- `drawCards(player, count)` - カードをドロー

#### 手札操作
- `addCardsToHand(player, cards, shuffle)` - 手札にカードを追加

#### ダメージ・回復
- `dealDamage(player, amount, options)` - ダメージを与える
- `attachYell(target, yellCard)` - エールを付ける

#### 条件チェック
- `checkConditions(player, conditions)` - 各種条件をチェック
- `getStageHolomens(player)` - ステージのホロメンを取得

#### UI更新
- `updateDisplay()` - 画面表示を更新

## 効果パターンテンプレート

### ドロー効果
```javascript
.addEffect('draw', { count: 2 })
```

### サーチ効果
```javascript
.addEffect('search', {
  count: 1,
  types: ['ホロメン'],
  colors: ['青'],
  bloomLevel: '1st',
  description: '青の1stホロメンを選択してください'
})
```

### ダメージ効果
```javascript
.addEffect('damage', {
  target: 'opponent',
  amount: 1
})
```

### アーカイブ効果
```javascript
.addEffect('archive', {
  count: 1,
  types: ['ホロメン'],
  description: 'アーカイブするホロメンを選択してください'
})
```

## 条件パターン

### フェーズ条件
```javascript
.addCondition('phase', { phase: 3 }) // メインフェーズのみ
```

### 手札枚数条件
```javascript
.addCondition('handSize', { min: 1, max: 5 })
```

### ステージ色条件
```javascript
.addCondition('stageColors', { minColors: 2 })
```

### カスタム条件
```javascript
.addCondition('custom', {
  checkFunction: (card, context, battleEngine) => {
    // カスタム条件をここに実装
    return true; // 条件を満たす場合
  }
})
```

## トリガー設定

### 手動発動
```javascript
// デフォルトで手動発動（メインフェーズ等）
```

### 自動発動
```javascript
const AutoCard = {
  cardId: 'auto_card',
  triggers: [{ type: 'collab', timing: 'on_collab' }],
  // ...
};

// 登録時にトリガーシステムに自動登録される
```

## パフォーマンス考慮事項

1. **遅延読み込み**: カード効果は必要時のみ読み込まれます
2. **メタデータキャッシュ**: カード情報は事前にキャッシュされます
3. **共通処理**: 繰り返し処理は`CardEffectUtils`で統一
4. **パターン認識**: 似た効果は自動的にパターン化されます

## デバッグ情報

### ログ出力
```javascript
console.log('カード効果実行:', {
  cardId: card.id,
  result: result,
  timing: Date.now()
});
```

### エラーハンドリング
```javascript
try {
  // 効果処理
} catch (error) {
  console.error('カード効果エラー:', error);
  return { success: false, reason: 'エラーが発生しました', error };
}
```

## 実装例集

### 単純なドロー
```javascript
const SimpleDrawCard = new CardEffectBuilder('simple_draw', 'シンプルドロー')
  .addEffect('draw', { count: 2 })
  .build();
```

### 条件付きサーチ
```javascript
const ConditionalSearchCard = new CardEffectBuilder('conditional_search', '条件サーチ')
  .addCondition('stageColors', { minColors: 2 })
  .addEffect('search', { count: 1, types: ['ホロメン'] })
  .build();
```

### 複合効果
```javascript
const ComboCard = new CardEffectBuilder('combo_card', '複合カード')
  .addEffect('draw', { count: 1 })
  .addEffect('damage', { target: 'opponent', amount: 1 })
  .build();
```

### コラボトリガー
```javascript
const CollabCard = {
  cardId: 'collab_card',
  triggers: [{ type: 'collab', timing: 'on_collab' }],
  execute: async (card, context, battleEngine) => {
    const utils = battleEngine.cardEffectTriggerSystem.utils;
    return utils.drawCards(battleEngine.gameState.currentPlayer, 1);
  }
};
```

## 注意事項

1. **カードID**: 必ず一意のIDを使用してください
2. **非同期処理**: ユーザー選択が必要な効果は`async/await`を使用
3. **エラーハンドリング**: 必ず適切なエラー処理を実装
4. **UI更新**: 効果実行後は`utils.updateDisplay()`を呼び出し
5. **テスト**: 実装後は必ず動作確認を行ってください

## トラブルシューティング

### よくある問題

1. **効果が発動しない**
   - `canActivate`の条件を確認
   - カード登録が正しいか確認

2. **選択UIが表示されない**
   - `selectCardsFromDeck`のパラメータを確認
   - プレースホルダー実装の可能性

3. **エラーが発生する**
   - 非同期処理の`await`忘れ
   - `utils`の存在チェック忘れ

### デバッグ方法

1. ブラウザの開発者ツールでコンソールを確認
2. `battleEngine.cardEffectTriggerSystem`の状態を確認
3. `window.cardEffects`に正しく登録されているか確認

---

このガイドに従って、効率的にカード効果を実装してください。
質問や不明な点があれば、既存の実装例を参考にしてください。
