/**
 * hBP04-106 - カード効果定義
 * サポートカード
 */

// カード効果の定義
const cardEffect_hBP04_106 = {
  // カード基本情報
  cardId: 'hBP04-106',
  cardName: '雪民',
  cardType: 'サポート',
  
  // 効果定義
  effects: {
    // サポート効果
    supportEffect: {
      type: 'support',
      timing: 'manual',
      name: 'サポート効果',
      description: 'サポートカードの効果',
      condition: (card, gameState, battleEngine) => {
        // メインステップで手札にある時のみ
        const currentPhase = battleEngine.gameState.currentPhase;
        return currentPhase === 3; // メインステップ
      },
      effect: async (card, battleEngine) => {
        console.log(`🎯 [サポート効果] ${card.name || 'hBP04-106'}の効果が発動！`);
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const utils = new CardEffectUtils(battleEngine);
        
        // デッキから好きなカードを1枚手札に加える
        const searchResult = await utils.selectCardsFromDeck(currentPlayer, {
          count: 1,
          description: 'デッキから好きなカードを1枚選択してください',
          allowLess: true
        });
        
        if (searchResult.success && searchResult.cards.length > 0) {
          // 選択したカードを手札に加える
          const addResult = utils.addCardsToHand(currentPlayer, searchResult.cards, true);
          
          if (addResult.success) {
            // このサポートカードをアーカイブ
            const player = battleEngine.players[currentPlayer];
            const handIndex = player.hand.indexOf(card);
            if (handIndex !== -1) {
              player.hand.splice(handIndex, 1);
              player.archive.push(card);
            }
            
            utils.updateDisplay();
            
            return {
              success: true,
              message: `${card.name || 'hBP04-106'}の効果でカードをサーチしました`,
              cardsAdded: addResult.cards.length
            };
          } else {
            return {
              success: false,
              message: addResult.reason
            };
          }
        } else {
          return {
            success: false,
            message: searchResult.reason || 'カードの選択がキャンセルされました'
          };
        }
      }
    }
  }
};

// 効果を登録
if (window.cardEffectManager) {
  window.cardEffectManager.registerCardEffect('hBP04-106', cardEffect_hBP04_106);
  console.log('🔮 [Card Effect] hBP04-106 の効果を登録しました');
} else {
  console.warn('🔮 [Card Effect] CardEffectManager not found, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP04-106',
    effect: cardEffect_hBP04_106
  });
}

// グローバルに公開
window.cardEffect_hBP04_106 = cardEffect_hBP04_106;
