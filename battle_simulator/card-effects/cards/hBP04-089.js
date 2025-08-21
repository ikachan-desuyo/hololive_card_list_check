/**
 * hBP04-089 - カード効果定義
 * ツートンカラーパソコン
 */

// カード効果の定義
const cardEffect_hBP04_089 = {
  // カード基本情報
  cardId: 'hBP04-089',
  cardName: 'ツートンカラーパソコン',
  cardType: 'サポート・アイテム・LIMITED',
  rarity: 'U',
  
  // 効果定義
  effects: {
    // サポート効果
    supportEffect: {
      type: 'support',
      timing: 'manual',
      name: 'サポート効果',
      description: 'このカードは、自分のステージに色が1色で異なる色のホロメンが2人以上いなければ使えない。\n\n自分のステージの色が1色で異なる色のホロメン2人を選ぶ。自分のデッキから、Buzz以外のそれぞれ選んだホロメンと同色の1stホロメン1枚ずつを公開し、手札に加える。そしてデッキをシャッフルする。\n\nLIMITED：ターンに１枚しか使えない。',
      condition: (card, gameState, battleEngine) => {
        // TODO: 使用条件を実装
        return true;
      },
      effect: (card, battleEngine) => {
        console.log(`📋 [サポート効果] ${card.name || 'hBP04-089'}が発動！`);
        
        // TODO: 効果処理を実装
        
        return {
          success: true,
          message: `${card.name || 'hBP04-089'}のサポート効果が発動しました`
        };
      }
    },
  }
};

// 効果を登録（新システム対応）
if (window.cardEffects) {
  window.cardEffects['hBP04-089'] = cardEffect_hBP04_089;
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP04-089',
    effect: cardEffect_hBP04_089
  });
}

// グローバルに公開
window.cardEffect_hBP04_089 = cardEffect_hBP04_089;
