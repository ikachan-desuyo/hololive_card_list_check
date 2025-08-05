/**
 * hBP02-076 - カード効果定義
 * エールカード
 */

// カード効果の定義
const cardEffect_hBP02_076 = {
  // カード基本情報
  cardId: 'hBP02-076',
  cardName: 'カスタムパソコン',
  cardType: 'エール',
  
  // 効果定義
  effects: {
    // エール効果
    yellEffect: {
      type: 'yell',
      timing: 'attached',
      name: 'エール効果',
      description: 'このエールが付いている間の効果',
      condition: (card, gameState, battleEngine) => {
        // エールとして付いている時のみ
        return true;
      },
      effect: (card, battleEngine) => {
        console.log(`🎵 [エール効果] ${card.name || 'hBP02-076'}のエール効果が適用中`);
        
        // エールによる能力値上昇やスキル付与など
        return {
          success: true,
          message: 'エール効果が適用されています',
          statBonus: {
            attack: 10,
            hp: 10
          }
        };
      }
    }
  }
};

// 効果を登録（新システム対応）
if (window.cardEffects) {
  window.cardEffects['hBP02-076'] = cardEffect_hBP02_076;
  console.log('🔮 [Card Effect] hBP02-076 の効果を登録しました');
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP02-076',
    effect: cardEffect_hBP02_076
  });
}

// グローバルに公開
window.cardEffect_hBP02_076 = cardEffect_hBP02_076;
