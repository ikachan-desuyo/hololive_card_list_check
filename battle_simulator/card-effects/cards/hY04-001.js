/**
 * hY04-001 - カード効果定義
 * 青エール (エールカード)
 */

// カード効果の定義
const cardEffect_hY04_001 = {
  // カード基本情報
  cardId: 'hY04-001',
  cardName: '青エール',
  cardType: 'エール',
  color: '青',

  // 効果定義
  effects: {
    // エール効果（パッシブ効果）
    yellEffect: {
      type: 'yell',
      name: '青エール',
      description: '青属性のホロメンにアーツダメージ向上効果',
      timing: 'passive',
      condition: (card, gameState, attachedHolomem) => {
        // ホロメンに付いている場合
        return attachedHolomem != null;
      },
      effect: (card, battleEngine, attachedHolomem) => {
        console.log(`💙 [青エール] ${card.name || 'hY04-001'}が${attachedHolomem?.name}に付着`);
        
        // 青エールとしての基本効果
        if (attachedHolomem) {
          // 青属性のホロメンの場合は追加効果
          if (attachedHolomem.color === '青') {
            return {
              success: true,
              message: `${card.name || '青エール'}が青属性ホロメンに最適化効果を付与`,
              colorMatch: true
            };
          } else {
            return {
              success: true,
              message: `${card.name || '青エール'}が基本エール効果を付与`,
              colorMatch: false
            };
          }
        }
        
        return { success: false };
      }
    }
  }
};

// 効果を登録（新システム対応）
if (window.cardEffects) {
  window.cardEffects['hY04-001'] = cardEffect_hY04_001;
  console.log('🔮 [Card Effect] hY04-001 の効果を登録しました');
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hY04-001',
    effect: cardEffect_hY04_001
  });
}

// グローバルに公開
window.cardEffect_hY04_001 = cardEffect_hY04_001;
