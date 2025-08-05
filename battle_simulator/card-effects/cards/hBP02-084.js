/**
 * hBP02-084 - カード効果定義
 * カード名: (カード名をここに記載)
 */

// カード効果の定義
const cardEffect_hBP02_084 = {
  // カード基本情報
  cardId: 'hBP02-084',
  cardName: 'みっころね24',
  
  // 効果定義
  effects: {
    // 複合効果
    comboEffect: {
      type: 'combo',
      timing: 'manual',
      name: '複合効果',
      description: 'ドローとエール付与を同時に行う効果',
      condition: (card, gameState) => {
        // 効果発動条件
        return true;
      },
      effect: (card, battleEngine) => {
        console.log(`🎪 [複合効果] ${card.name || 'hBP02-084'}の効果が発動！`);
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const utils = new CardEffectUtils(battleEngine);
        
        // 1枚ドロー
        const drawResult = utils.drawCards(currentPlayer, 1);
        
        // センターにエール1枚
        const player = battleEngine.players[currentPlayer];
        let yellResult = { success: false };
        
        if (player.center && player.yellDeck && player.yellDeck.length > 0) {
          const yellCard = player.yellDeck.shift();
          yellResult = utils.attachYell(currentPlayer, 'center', [yellCard]);
        }
        
        if (drawResult.success || yellResult.success) {
          utils.updateDisplay();
          
          return {
            success: true,
            message: `${card.name || 'hBP02-084'}の効果でドローとエール付与を実行`,
            cardsDrawn: drawResult.success ? drawResult.cards.length : 0,
            yellAttached: yellResult.success ? 1 : 0
          };
        } else {
          return {
            success: false,
            message: 'ドローもエール付与もできませんでした'
          };
        }
      }
    }
  }
};

// 効果を登録
if (window.cardEffectManager) {
  window.cardEffectManager.registerCardEffect('hBP02-084', cardEffect_hBP02_084);
  console.log('🔮 [Card Effect] hBP02-084 効果を登録しました');
} else {
  console.warn('🔮 [Card Effect] CardEffectManager not found, deferring registration');
}

// グローバルに公開
window.cardEffect_hBP02_084 = cardEffect_hBP02_084;
