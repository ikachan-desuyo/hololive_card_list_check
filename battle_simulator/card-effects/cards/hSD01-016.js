/**
 * hSD01-016 - カード効果定義
 * サポート・スタッフカード - 春先のどか
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
    drawEffect: {
      type: 'support',
      timing: 'manual',
      name: 'ドロー効果',
      description: '自分のデッキを３枚引く',
      limited: true, // LIMITED効果
      condition: (card, gameState, battleEngine) => {
        // 春先のどかは特別な発動条件はなし（メインステップで手札にあれば発動可能）
        return true;
      },
      effect: (card, battleEngine) => {
        console.log(`📚 [ドロー効果] ${card.name || '春先のどか'}の効果が発動！`);
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const player = battleEngine.players[currentPlayer];
        const utils = new CardEffectUtils(battleEngine);
        
        // デッキを3枚引く
        const drawnCards = utils.drawCards(currentPlayer, 3);
        
        // NOTE: アーカイブ移動は CardInteractionManager で自動処理される
        
        if (drawnCards.length > 0) {
          utils.updateDisplay();
          
          return {
            success: true,
            message: `${card.name || '春先のどか'}の効果でデッキを${drawnCards.length}枚引きました`,
            drawnCards: drawnCards,
            autoArchive: true // 自動アーカイブ移動を指示
          };
        } else {
          return {
            success: false,
            message: 'デッキにカードがありません'
          };
        }
      }
    }
  }
};

// 効果を登録（新システム対応）
if (window.cardEffects) {
  window.cardEffects['hSD01-016'] = cardEffect_hSD01_016;
  console.log('🔮 [Card Effect] hSD01-016 春先のどか の効果を登録しました');
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
