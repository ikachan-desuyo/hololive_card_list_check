/**
 * 基本エール (hY04-001_C)
 */

(function() {
  const cardEffect = {
    cardId: 'hY04-001_C',
    name: '基本エール',
    type: 'yell',
    
    execute: async (card, context, battleEngine) => {
      return {
        success: true,
        message: '基本エールが付きました'
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
