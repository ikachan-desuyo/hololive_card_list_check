/**
 * hSD01-016 - カード効果定義
 * 春先のどか (サポート・スタッフ)
 */

// カード効果の定義
const cardEffect_hSD01_016 = {
  // カード基本情報
  cardId: 'hSD01-016',
  cardName: '春先のどか',
  cardType: 'サポート・スタッフ',

  // 効果定義
  effects: {
    // ドロー効果
    supportEffect: {
      type: 'support',
      name: '春先のどか',
      description: '自分のデッキを３枚引く。',
      timing: 'manual',
      limited: true, // LIMITED効果
      condition: (card, gameState, battleEngine) => {
        // メインステップで手札にある時のみ
        const phase = battleEngine.gameState.currentPhase;
        return phase === 3; // メインステップ
      },
      effect: (card, battleEngine) => {
        console.log(`📚 [サポート] ${card.name || 'hSD01-016'}の効果が発動！`);
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const utils = new CardEffectUtils(battleEngine);
        
        // デッキを3枚引く
        const drawnCards = utils.drawCards(currentPlayer, 3);
        
        // このサポートカードをアーカイブ
        const player = battleEngine.players[currentPlayer];
        const handIndex = player.hand.indexOf(card);
        if (handIndex !== -1) {
          player.hand.splice(handIndex, 1);
          player.archive.push(card);
        }
        
        // UI更新
        utils.updateDisplay();
        
        return {
          success: true,
          message: `${card.name || 'hSD01-016'}の効果でデッキを${drawnCards.length}枚引きました`,
          drawnCards: drawnCards
        };
      }
    }
  }
};

// 効果を登録（新システム対応）
if (window.cardEffects) {
  window.cardEffects['hSD01-016'] = cardEffect_hSD01_016;
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hSD01-016',
    effect: cardEffect_hSD01_016
  });
}

// グローバルに公開
window.cardEffect_hSD01_016 = cardEffect_hSD01_016;
