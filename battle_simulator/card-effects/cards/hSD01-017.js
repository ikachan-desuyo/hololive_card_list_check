/**
 * hSD01-017 - カード効果定義
 * カード名: (カード名をここに記載)
 */

// カード効果の定義
const cardEffect_hSD01_017 = {
  // カード基本情報
  cardId: 'hSD01-017',
  cardName: 'マネちゃん',
  
  // 効果定義
  effects: {
    // 回復効果
    healEffect: {
      type: 'heal',
      timing: 'manual',
      name: '回復効果',
      description: 'ライフを回復する効果',
      condition: (card, gameState) => {
        // 効果発動条件
        return true;
      },
      effect: (card, battleEngine) => {
        console.log(`❤️ [回復効果] ${card.name || 'hSD01-017'}の効果が発動！`);
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const player = battleEngine.players[currentPlayer];
        const utils = new CardEffectUtils(battleEngine);
        
        // ライフ1回復（簡易実装）
        if (player.life !== undefined) {
          const maxLife = player.oshi?.life || 6;
          const currentLife = player.life || 0;
          
          if (currentLife < maxLife) {
            player.life = Math.min(maxLife, currentLife + 1);
            utils.updateDisplay();
            
            return {
              success: true,
              message: `${card.name || 'hSD01-017'}の効果でライフが1回復しました`,
              lifeHealed: 1
            };
          } else {
            return {
              success: false,
              message: 'ライフは既に最大です'
            };
          }
        } else {
          return {
            success: false,
            message: 'ライフシステムが初期化されていません'
          };
        }
      }
    }
  }
};

// 効果を登録
if (window.cardEffectManager) {
  window.cardEffectManager.registerCardEffect('hSD01-017', cardEffect_hSD01_017);
  console.log('🔮 [Card Effect] hSD01-017 効果を登録しました');
} else {
  console.warn('🔮 [Card Effect] CardEffectManager not found, deferring registration');
}

// グローバルに公開
window.cardEffect_hSD01_017 = cardEffect_hSD01_017;
