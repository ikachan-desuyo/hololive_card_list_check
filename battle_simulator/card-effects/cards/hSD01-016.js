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
      effect: async (card, battleEngine) => {
        console.log(`📚 [サポート] ${card.name || 'hSD01-016'}の効果が発動可能！`);
        
        return new Promise((resolve) => {
          battleEngine.modalUI.showCardEffectModal({
            cardName: card.name || 'カナゴマ',
            effectName: 'サポート効果',
            effectDescription: '自分のデッキを3枚引く。',
            effectType: 'support'
          }, async (confirmed) => {
            if (!confirmed) {
              resolve({
                success: false,
                message: 'サポート効果の発動をキャンセルしました'
              });
              return;
            }
            
            try {
              console.log(`📚 [サポート効果] 「カナゴマ」を実行中...`);
              
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
              
              resolve({
                success: true,
                message: `${card.name || 'hSD01-016'}の効果でデッキを${drawnCards.length}枚引きました`,
                drawnCards: drawnCards
              });
            } catch (error) {
              console.error('サポート効果実行エラー:', error);
              resolve({
                success: false,
                message: 'サポート効果の実行中にエラーが発生しました'
              });
            }
          });
        });
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
