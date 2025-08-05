/**
 * コラボエフェクトサンプル (hBP04-999_SAMPLE)
 * コラボエフェクト例：バックからコラボに移動した時のみ発動
 */

(function() {
  const cardEffect = {
    cardId: 'hBP04-999_SAMPLE',
    name: 'コラボエフェクトサンプル',
    type: 'holomen',
    triggers: [{ type: 'on_collab', timing: 'on_collab' }], // コラボエフェクト
    
    // コラボエフェクト（バックからコラボに移動した時のみ発動）
    execute: async (card, context, battleEngine) => {
      const utils = battleEngine.cardEffectTriggerSystem.utils;
      const currentPlayer = battleEngine.gameState.currentPlayer;
      
      try {
        // デッキからカードをドロー
        const drawResult = utils.drawCards(currentPlayer, 1);
        
        if (drawResult.success) {
          return {
            success: true,
            message: 'コラボエフェクト：カードを1枚ドローしました'
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
