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

> ⚠️ 2026-06 更新: 旧手順（card-metadata.js / CardEffectBuilder）は廃止されました。
> 現在は「カードID.js を作成 → implemented-cards.js に登録」の2ステップです。

### 1. カード効果ファイルの作成

`cards/<カードID>.js` を作成します（既存の `cards/hSD01-016.js` 等が実例）：

```javascript
/**
 * <カードID> - カード効果定義
 * <カード名> (<カードタイプ>)
 */
const cardEffect_カードID = {  // 例: cardEffect_hSD01_016（"-" は "_" に置換）
  cardId: '<カードID>',
  cardName: '<カード名>',
  cardType: '<カードタイプ>',

  effects: {
    supportEffect: {
      type: 'support',          // support / bloom / collab / art など
      name: '<効果名>',
      description: '<効果テキスト>',
      timing: 'manual',         // manual（手動発動）/ auto（自動発動）
      limited: false,           // LIMITED効果なら true
      condition: (card, gameState, battleEngine) => {
        return battleEngine.gameState.currentPhase === 3; // 発動条件
      },
      effect: async (card, battleEngine) => {
        const utils = new CardEffectUtils(battleEngine);
        // utils.drawCards() などで効果を実装
        return { success: true, message: '効果を実行しました' };
      }
    }
  }
};

// 登録（このブロックは全カード共通の定型）
if (window.cardEffects) {
  window.cardEffects['<カードID>'] = cardEffect_カードID;
} else {
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({ cardId: '<カードID>', effect: cardEffect_カードID });
}
window.cardEffect_カードID = cardEffect_カードID;
```

### 2. 実装済みインデックスへの登録

`cards/implemented-cards.js` の `window.IMPLEMENTED_CARD_EFFECTS` 配列にカードIDを追加します。
**これを忘れると効果ファイルが動的読み込みされません。**

### 3. 動作確認

- `test-effects.html` の `testCards` 配列にIDを追加してブラウザで実行
- `scripts/tools/smoke-test-battle-sim.ps1` でページ全体の読み込みを確認

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
