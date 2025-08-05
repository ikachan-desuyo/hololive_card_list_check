/**
 * hBP04-045 - カード効果定義
 * ホロメンカード
 */

// カード効果の定義
const cardEffect_hBP04_045 = {
    // カード基本情報
  cardId: 'hBP04-045',
  cardName: '雪花ラミィ',
  cardType: 'ホロメン',
  
  // 効果定義
  effects: {
    // 条件効果
    conditionalEffect: {
      type: 'conditional',
      timing: 'manual',
      name: '条件効果',
      description: '特定の条件下で発動する効果',
      condition: (card, gameState, battleEngine) => {
        // メインステップで、ステージに2色以上のホロメンがいる時
        const currentPhase = battleEngine.gameState.currentPhase;
        if (currentPhase !== 3) return false; // メインステップチェック
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const utils = new CardEffectUtils(battleEngine);
        
        return utils.checkConditions(currentPlayer, {
          minColors: 2
        });
      },
      effect: (card, battleEngine) => {
        console.log(`🌈 [条件効果] ${card.name || 'hBP04-045'}の効果が発動！`);
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const utils = new CardEffectUtils(battleEngine);
        
        // 2枚ドロー効果
        const drawResult = utils.drawCards(currentPlayer, 2);
        
        if (drawResult.success) {
          utils.updateDisplay();
          
          return {
            success: true,
            message: `${card.name || 'hBP04-045'}の効果で2枚ドローしました`,
            cardsDrawn: drawResult.cards.length
          };
        } else {
          return {
            success: false,
            message: drawResult.reason
          };
        }
      }
    }
  }
};

// 効果を登録
if (window.cardEffectManager) {
  window.cardEffectManager.registerCardEffect('hBP04-045', cardEffect_hBP04_045);
  console.log('🔮 [Card Effect] hBP04-045 の効果を登録しました');
} else {
  console.warn('🔮 [Card Effect] CardEffectManager not found, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP04-045',
    effect: cardEffect_hBP04_045
  });
}

// グローバルに公開
window.cardEffect_hBP04_045 = cardEffect_hBP04_045;
