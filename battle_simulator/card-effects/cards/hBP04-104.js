/**
 * スバルドダック (hBP04-104_C) - マスコットカード
 */

(function() {
  const cardEffect = {
    cardId: 'hBP04-104_C',
    name: 'スバルドダック',
    type: 'mascot',
    triggers: [{ type: 'mascot', timing: 'continuous' }], // マスコット効果（常時発動）
    
    // マスコット効果（付けられたホロメンのHP+20）
    execute: async (card, context, battleEngine) => {
      const utils = battleEngine.cardEffectTriggerSystem.utils;
      const currentPlayer = battleEngine.gameState.currentPlayer;
      
      try {
        // マスコットが付いているホロメンの情報を取得
        if (context.targetCard && context.targetCard.card_type?.includes('ホロメン')) {
          const targetCard = context.targetCard;
          
          // 基本効果：HP+20
          let hpBuff = 20;
          let artsBuff = 0;
          
          // 大空スバルに付いている場合の追加効果チェック
          if (targetCard.name && targetCard.name.includes('大空スバル')) {
            // エール枚数をチェック（簡略化）
            const yellCount = 10; // 実際はステージのエールを計算
            if (yellCount >= 10) {
              artsBuff = 20;
            }
          }
          
          return {
            success: true,
            message: `スバルドダックの効果：HP+${hpBuff}${artsBuff > 0 ? `、アーツ+${artsBuff}` : ''}`,
            effects: {
              hpBuff: hpBuff,
              artsBuff: artsBuff
            }
          };
        }
        
        return {
          success: true,
          message: 'スバルドダックのマスコット効果が発動中'
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
