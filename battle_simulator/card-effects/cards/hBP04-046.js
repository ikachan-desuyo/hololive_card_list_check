/**
 * hBP04-046 - カード効果定義
 * ホロメンカード
 */

// カード効果の定義
const cardEffect_hBP04_046 = {
    // カード基本情報
  cardId: 'hBP04-046',
  cardName: '雪花ラミィ',
  cardType: 'ホロメン',
  
  // 効果定義
  effects: {
    // エール操作効果
    yellEffect: {
      type: 'yell',
      timing: 'manual',
      name: 'エール操作',
      description: 'エールを操作する効果',
      condition: (card, gameState, battleEngine) => {
        // メインステップでステージにいる時のみ
        const currentPhase = battleEngine.gameState.currentPhase;
        return currentPhase === 3; // メインステップ
      },
      effect: (card, battleEngine) => {
        console.log(`✨ [エール操作] ${card.name || 'hBP04-046'}の効果が発動！`);
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const player = battleEngine.players[currentPlayer];
        const utils = new CardEffectUtils(battleEngine);
        
        // エールデッキから1枚取ってセンターに付ける
        if (!player.yellDeck || player.yellDeck.length === 0) {
          return {
            success: false,
            message: 'エールデッキにカードがありません'
          };
        }
        
        const centerCard = player.center;
        if (!centerCard) {
          return {
            success: false,
            message: 'センターにカードがありません'
          };
        }
        
        const yellCard = player.yellDeck.shift();
        const attachResult = utils.attachYell(currentPlayer, 'center', [yellCard]);
        
        if (attachResult.success) {
          utils.updateDisplay();
          
          return {
            success: true,
            message: `${card.name || 'hBP04-046'}の効果でセンターにエールを付けました`,
            yellAttached: 1
          };
        } else {
          return {
            success: false,
            message: attachResult.reason
          };
        }
      }
    }
  }
};

// 効果を登録
if (window.cardEffectManager) {
  window.cardEffectManager.registerCardEffect('hBP04-046', cardEffect_hBP04_046);
  console.log('🔮 [Card Effect] hBP04-046 の効果を登録しました');
} else {
  console.warn('🔮 [Card Effect] CardEffectManager not found, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP04-046',
    effect: cardEffect_hBP04_046
  });
}

// グローバルに公開
window.cardEffect_hBP04_046 = cardEffect_hBP04_046;
