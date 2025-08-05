/**
 * ツートンカラーパソコン (hBP04-089_U) - サポートカード
 */

(function() {
  const cardEffect = {
    cardId: 'hBP04-089_U',
    name: 'ツートンカラーパソコン',
    type: 'support',
    
    execute: async (card, context, battleEngine) => {
      const utils = battleEngine.cardEffectTriggerSystem.utils;
      const currentPlayer = battleEngine.gameState.currentPlayer;
      
      try {
        // サポートカードの基本効果
        const drawResult = utils.drawCards(currentPlayer, 1);
        
        if (drawResult.success) {
          return {
            success: true,
            message: 'ツートンカラーパソコン効果：カードを1枚ドローしました'
          };
        }
        
        return { success: false, reason: 'ドローできませんでした' };
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
