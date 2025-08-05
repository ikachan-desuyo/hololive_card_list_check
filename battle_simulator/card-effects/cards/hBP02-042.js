/**
 * hBP02-042 - カード効果定義
 * ホロメンカード
 */

// カード効果の定義
const cardEffect_hBP02_042 = {
    // カード基本情報
  cardId: 'hBP02-042',
  cardName: '紫咲シオン',
  cardType: 'ホロメン',
  
  // 効果定義
  effects: {
    // アーカイブ操作効果
    archiveEffect: {
      type: 'archive',
      timing: 'manual',
      name: 'アーカイブ操作',
      description: 'アーカイブを操作する効果',
      condition: (card, gameState, battleEngine) => {
        // メインステップでステージにいる時のみ
        const currentPhase = battleEngine.gameState.currentPhase;
        return currentPhase === 3; // メインステップ
      },
      effect: (card, battleEngine) => {
        console.log(`📁 [アーカイブ操作] ${card.name || 'hBP02-042'}の効果が発動！`);
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const player = battleEngine.players[currentPlayer];
        const utils = new CardEffectUtils(battleEngine);
        
        // 手札から1枚アーカイブし、1枚ドロー
        if (player.hand.length === 0) {
          return {
            success: false,
            message: '手札にカードがありません'
          };
        }
        
        // 手札の最初のカードをアーカイブ（本来は選択させる）
        const cardToArchive = player.hand[0];
        const archiveResult = utils.archiveCards(currentPlayer, [cardToArchive], 'hand');
        
        if (archiveResult.success) {
          // 1枚ドロー
          const drawResult = utils.drawCards(currentPlayer, 1);
          
          if (drawResult.success) {
            utils.updateDisplay();
            
            return {
              success: true,
              message: `${card.name || 'hBP02-042'}の効果で手札を入れ替えました`,
              archived: archiveResult.cards.length,
              drawn: drawResult.cards.length
            };
          } else {
            return {
              success: false,
              message: drawResult.reason
            };
          }
        } else {
          return {
            success: false,
            message: archiveResult.reason
          };
        }
      }
    }
  }
};

// 効果を登録
if (window.cardEffectManager) {
  window.cardEffectManager.registerCardEffect('hBP02-042', cardEffect_hBP02_042);
  console.log('🔮 [Card Effect] hBP02-042 の効果を登録しました');
} else {
  console.warn('🔮 [Card Effect] CardEffectManager not found, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP02-042',
    effect: cardEffect_hBP02_042
  });
}

// グローバルに公開
window.cardEffect_hBP02_042 = cardEffect_hBP02_042;
