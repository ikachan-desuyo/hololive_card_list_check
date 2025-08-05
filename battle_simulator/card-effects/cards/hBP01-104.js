/**
 * hBP01-104 - カード効果定義
 * エールカード
 */

// カード効果の定義
const cardEffect_hBP01_104 = {
  // カード基本情報
  cardId: 'hBP01-104',
  cardName: 'ふつうのパソコン',
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
        console.log(`🎶 [エール効果] ${card.name || 'hBP01-104'}のエール効果が適用中`);
        
        // エールによる能力値上昇
        return {
          success: true,
          message: 'エール効果が適用されています',
          statBonus: {
            attack: 20,
            hp: 0
          }
        };
      }
    },
    
    // 特殊エール効果
    specialYellEffect: {
      type: 'special',
      timing: 'manual',
      name: '特殊エール効果',
      description: 'エールとして付いている時に発動できる特殊効果',
      condition: (card, gameState, battleEngine) => {
        // 特定の条件下でのみ発動可能
        return true;
      },
      effect: (card, battleEngine) => {
        console.log(`⭐ [特殊エール効果] ${card.name || 'hBP01-104'}の特殊効果が発動！`);
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const utils = new CardEffectUtils(battleEngine);
        
        // このエールが付いているホロメンの攻撃力を一時的に大幅上昇
        return {
          success: true,
          message: 'ホロメンの攻撃力が大幅上昇しました！',
          temporaryBonus: {
            attack: 50
          }
        };
      }
    }
  }
};

// 効果を登録
if (window.cardEffectManager) {
  window.cardEffectManager.registerCardEffect('hBP01-104', cardEffect_hBP01_104);
  console.log('🔮 [Card Effect] hBP01-104 の効果を登録しました');
} else {
  console.warn('🔮 [Card Effect] CardEffectManager not found, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP01-104',
    effect: cardEffect_hBP01_104
  });
}

// グローバルに公開
window.cardEffect_hBP01_104 = cardEffect_hBP01_104;
