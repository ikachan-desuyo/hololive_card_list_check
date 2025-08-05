/**
 * 雪民 (hBP04-106_U) - ファンカード
 * ギフト効果
 */

(function() {
  const cardEffect = {
    cardId: 'hBP04-106_U',
    name: '雪民',
    type: 'fan',
    triggers: [{ type: 'gift', timing: 'gift' }], // ギフト効果
    
    // ギフト効果（場にいる間常時発動）
    execute: async (card, context, battleEngine) => {
      const utils = battleEngine.cardEffectTriggerSystem.utils;
      const currentPlayer = battleEngine.gameState.currentPlayer;
      
      try {
        // 付けられたホロメンが〈雪花ラミィ〉の場合の特殊効果
        if (context.targetCard && context.targetCard.name && context.targetCard.name.includes('雪花ラミィ')) {
          // ラミィに雪民が付いた時の効果（将来的に実装予定）
          return {
            success: true,
            message: '雪民が雪花ラミィに付きました（ギフト効果有効）'
          };
        }
        
        return {
          success: true,
          message: '雪民のギフト効果が発動中'
        };
    } catch (error) {
      return { success: false, reason: 'エラーが発生しました', error };
    }
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
