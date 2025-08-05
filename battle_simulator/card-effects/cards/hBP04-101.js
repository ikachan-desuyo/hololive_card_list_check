/**
 * hBP04-101 - カード効果定義
 * サポートカード
 */

// カード効果の定義
const cardEffect_hBP04_101 = {
  // カード基本情報
  cardId: 'hBP04-101',
  cardName: 'だいふく',
  cardType: 'サポート',
  
  // 効果定義
  effects: {
    // エール強化サポート
    yellSupportEffect: {
      type: 'support',
      timing: 'manual',
      name: 'エール強化',
      description: 'エールを強化するサポート効果',
      condition: (card, gameState, battleEngine) => {
        // メインステップで手札にある時のみ
        const currentPhase = battleEngine.gameState.currentPhase;
        return currentPhase === 3; // メインステップ
      },
      effect: (card, battleEngine) => {
        console.log(`💫 [エール強化] ${card.name || 'hBP04-101'}の効果が発動！`);
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const player = battleEngine.players[currentPlayer];
        const utils = new CardEffectUtils(battleEngine);
        
        // エールデッキから2枚をセンターに付ける
        if (!player.yellDeck || player.yellDeck.length < 2) {
          return {
            success: false,
            message: 'エールデッキに2枚以上のカードがありません'
          };
        }
        
        const centerCard = player.center;
        if (!centerCard) {
          return {
            success: false,
            message: 'センターにカードがありません'
          };
        }
        
        const yellCards = [
          player.yellDeck.shift(),
          player.yellDeck.shift()
        ];
        
        const attachResult = utils.attachYell(currentPlayer, 'center', yellCards);
        
        if (attachResult.success) {
          // このサポートカードをアーカイブ
          const handIndex = player.hand.indexOf(card);
          if (handIndex !== -1) {
            player.hand.splice(handIndex, 1);
            player.archive.push(card);
          }
          
          utils.updateDisplay();
          
          return {
            success: true,
            message: `${card.name || 'hBP04-101'}の効果でセンターにエール2枚を付けました`,
            yellAttached: 2
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

// 効果を登録（新システム対応）
if (window.cardEffects) {
  window.cardEffects['hBP04-101'] = cardEffect_hBP04_101;
  console.log('🔮 [Card Effect] hBP04-101 の効果を登録しました');
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP04-101',
    effect: cardEffect_hBP04_101
  });
}

// グローバルに公開
window.cardEffect_hBP04_101 = cardEffect_hBP04_101;

// グローバルに公開
window.cardEffect_hBP04_101 = cardEffect_hBP04_101;
