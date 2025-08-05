/**
 * 青エール (hY04-002_SY)
 */

(function() {
  const cardEffect = {
    cardId: 'hY04-002_SY',
    name: '青エール',
    type: 'yell',
    
    execute: async (card, context, battleEngine) => {
      return {
        success: true,
        message: '青エールが付きました'
      };
    }
  };

  // カード効果をグローバルに登録
  if (typeof window !== 'undefined' && window.cardEffects) {
    window.cardEffects[cardEffect.cardId] = cardEffect;
  }

  // Node.js環境でのエクスポート
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = cardEffect;
  }
})();
