/**
 * だいふく (hBP04-101_C) - マスコットカード
 */

(function() {
  const cardEffect = {
    cardId: 'hBP04-101_C',
    name: 'だいふく',
    type: 'mascot',
    triggers: [{ type: 'mascot', timing: 'continuous' }], // マスコット効果（常時発動）
    
    // マスコット効果（付けられたホロメンのアーツ+10）
    execute: async (card, context, battleEngine) => {
      const utils = battleEngine.cardEffectTriggerSystem.utils;
      const currentPlayer = battleEngine.gameState.currentPlayer;
      
      try {
        // マスコットが付いているホロメンの情報を取得
        if (context.targetCard && context.targetCard.card_type?.includes('ホロメン')) {
          const targetCard = context.targetCard;
          
          // 基本効果：アーツ+10
          let artsBuff = 10;
          let hpBuff = 0;
          
          // 雪花ラミィに付いている場合の追加効果：HP+20
          if (targetCard.name && targetCard.name.includes('雪花ラミィ')) {
            hpBuff = 20;
          }
          
          return {
            success: true,
            message: `だいふくの効果：アーツ+${artsBuff}${hpBuff > 0 ? `、HP+${hpBuff}` : ''}`,
            effects: {
              artsBuff: artsBuff,
              hpBuff: hpBuff
            }
          };
        }
        
        return {
          success: true,
          message: 'だいふくのマスコット効果が発動中'
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
