/**
 * hSD01-017 - カード効果定義
 * マネちゃん (サポート・スタッフ)
 */

// カード効果の定義
const cardEffect_hSD01_017 = {
  // カード基本情報
  cardId: 'hSD01-017',
  cardName: 'マネちゃん',
  cardType: 'サポート・スタッフ',
  
  // 効果定義
  effects: {
    // 手札リフレッシュ効果
    supportEffect: {
      type: 'support',
      name: 'マネちゃん',
      description: '自分の手札すべてをデッキに戻してシャッフルする。そして自分のデッキを5枚引く。',
      timing: 'manual',
      limited: true, // LIMITED効果
      condition: (card, gameState, battleEngine) => {
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const player = battleEngine.players[currentPlayer];
        
        // メインステップで手札にある時のみ
        const phase = battleEngine.gameState.currentPhase;
        if (phase !== 3) return false; // メインステップ以外は無効
        
        // このカードを除いた手札が1枚以上あるかチェック
        if (!player || !player.hand) return false;
        const otherCards = player.hand.filter(handCard => handCard.id !== card.id);
        return otherCards.length >= 1;
      },
      effect: (card, battleEngine) => {
        console.log(`🔄 [サポート] ${card.name || 'hSD01-017'}の効果が発動！`);
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const player = battleEngine.players[currentPlayer];
        const utils = new CardEffectUtils(battleEngine);
        
        // このカードを除いた手札をすべてデッキに戻す
        const otherCards = player.hand.filter(handCard => handCard.id !== card.id);
        if (otherCards.length === 0) {
          return {
            success: false,
            message: '手札にこのカード以外のカードがありません'
          };
        }
        
        // 手札をデッキに戻す
        if (!player.deck) player.deck = [];
        player.deck.push(...otherCards);
        
        // 手札からカードを削除（このカード以外）
        player.hand = player.hand.filter(handCard => handCard.id === card.id);
        
        // デッキをシャッフル
        utils.shuffleDeck(currentPlayer);
        
        // 5枚ドロー
        const drawnCards = utils.drawCards(currentPlayer, 5);
        
        // このサポートカードをアーカイブ
        const handIndex = player.hand.indexOf(card);
        if (handIndex !== -1) {
          player.hand.splice(handIndex, 1);
          player.archive.push(card);
        }
        
        // UI更新
        utils.updateDisplay();
        
        return {
          success: true,
          message: `${card.name || 'hSD01-017'}の効果で手札をリフレッシュし、${drawnCards.length}枚ドローしました`,
          cardsReturned: otherCards.length,
          cardsDrawn: drawnCards.length
        };
      }
    }
  }
};

// 効果を登録（新システム対応）
if (window.cardEffects) {
  window.cardEffects['hSD01-017'] = cardEffect_hSD01_017;
  console.log('🔮 [Card Effect] hSD01-017 効果を登録しました');
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hSD01-017',
    effect: cardEffect_hSD01_017
  });
}

// グローバルに公開
window.cardEffect_hSD01_017 = cardEffect_hSD01_017;

// グローバルに公開
window.cardEffect_hSD01_017 = cardEffect_hSD01_017;
