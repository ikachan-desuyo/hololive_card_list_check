/**
 * hBP04-091 - カード効果定義
 * 限界飯
 */

// カード効果の定義
const cardEffect_hBP04_091 = {
  // カード基本情報
  cardId: 'hBP04-091',
  cardName: '限界飯',
  cardType: 'サポート・イベント',
  rarity: 'U',
  
  // 効果定義
  effects: {
    // サポート効果
    supportEffect: {
      type: 'support',
      timing: 'manual',
      name: 'サポート効果',
      description: 'このターンの間、自分の〈一条莉々華〉1人のアーツに必要な◇-1。自分の〈限界飯〉はターンに1回しか使えない。',
      condition: (card, gameState, battleEngine) => {
        // TODO: 使用条件を実装
        return true;
      },
      effect: (card, battleEngine) => {
        console.log(`📋 [サポート効果] ${card.name || 'hBP04-091'}が発動！`);
        
        // TODO: 効果処理を実装
        
        return {
          success: true,
          message: `${card.name || 'hBP04-091'}のサポート効果が発動しました`
        };
      }
    },
  }
};

// 効果を登録（新システム対応）
if (window.cardEffects) {
  window.cardEffects['hBP04-091'] = cardEffect_hBP04_091;
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP04-091',
    effect: cardEffect_hBP04_091
  });
}

// グローバルに公開
window.cardEffect_hBP04_091 = cardEffect_hBP04_091;
