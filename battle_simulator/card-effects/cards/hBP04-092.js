/**
 * hBP04-092 - カード効果定義
 * ねぽらぼ
 */

// カード効果の定義
const cardEffect_hBP04_092 = {
  // カード基本情報
  cardId: 'hBP04-092',
  cardName: 'ねぽらぼ',
  cardType: 'サポート・イベント・LIMITED',
  rarity: 'U',
  
  // 効果定義
  effects: {
    // サポート効果
    supportEffect: {
      type: 'support',
      timing: 'manual',
      name: 'サポート効果',
      description: 'このカードは、自分の手札がこのカードを含まずに6枚以下でなければ使えない。\n\n自分のデッキの上から4枚を見る。その中から、#5期生を持つホロメンを好きな枚数公開し、公開したホロメンを手札に加える。そして残ったカードを好きな順でデッキの下に戻す。\n\nLIMITED：ターンに１枚しか使えない。',
      condition: (card, gameState, battleEngine) => {
        // TODO: 使用条件を実装
        return true;
      },
      effect: (card, battleEngine) => {
        console.log(`📋 [サポート効果] ${card.name || 'hBP04-092'}が発動！`);
        
        // TODO: 効果処理を実装
        
        return {
          success: true,
          message: `${card.name || 'hBP04-092'}のサポート効果が発動しました`
        };
      }
    },
  }
};

// 効果を登録（新システム対応）
if (window.cardEffects) {
  window.cardEffects['hBP04-092'] = cardEffect_hBP04_092;
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP04-092',
    effect: cardEffect_hBP04_092
  });
}

// グローバルに公開
window.cardEffect_hBP04_092 = cardEffect_hBP04_092;
