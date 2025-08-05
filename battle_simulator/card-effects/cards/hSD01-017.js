/**
 * hSD01-017 - カード効果定義
 * カード名: マネちゃん
 */

// カード効果の定義
const cardEffect_hSD01_017 = {
  // カード基本情報
  cardId: 'hSD01-017',
  cardName: 'マネちゃん',
  
  // 効果定義
  effects: {
    // 手札リフレッシュ効果
    handRefresh: {
      type: 'support',
      timing: 'manual',
      name: '手札リフレッシュ',
      description: '自分の手札すべてをデッキに戻してシャッフルする。そして自分のデッキを5枚引く。',
      limited: true, // LIMITED効果
      condition: (card, gameState, battleEngine) => {
        // 使用条件: 自分の手札がこのカードを含まずに1枚以上なければ使えない
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const player = battleEngine.players[currentPlayer];
        
        if (!player || !player.hand) return false;
        
        // このカードを除いた手札が1枚以上あるかチェック
        const otherCards = player.hand.filter(handCard => handCard.id !== card.id);
        return otherCards.length >= 1;
      },
      effect: (card, battleEngine) => {
        console.log(`🔄 [手札リフレッシュ] ${card.name || 'マネちゃん'}の効果が発動！`);
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const player = battleEngine.players[currentPlayer];
        const utils = new CardEffectUtils(battleEngine);
        
        try {
          // 1. このカードを除いた手札をすべてデッキに戻す
          const otherCards = player.hand.filter(handCard => handCard.id !== card.id);
          if (otherCards.length === 0) {
            return {
              success: false,
              message: '手札にこのカード以外のカードがありません'
            };
          }
          
          // 手札をデッキに戻す
          player.deck = player.deck || [];
          player.deck.push(...otherCards);
          
          // 手札からカードを削除（このカード以外）
          player.hand = player.hand.filter(handCard => handCard.id === card.id);
          
          console.log(`📚 [手札リフレッシュ] ${otherCards.length}枚の手札をデッキに戻しました`);
          
          // 2. デッキをシャッフル
          utils.shuffleDeck(currentPlayer);
          console.log(`🔀 [手札リフレッシュ] デッキをシャッフルしました`);
          
          // 3. 5枚ドロー
          const drawnCards = [];
          for (let i = 0; i < 5; i++) {
            if (player.deck.length > 0) {
              const drawnCard = player.deck.shift();
              player.hand.push(drawnCard);
              drawnCards.push(drawnCard);
            }
          }
          
          console.log(`🎴 [手札リフレッシュ] ${drawnCards.length}枚ドローしました`);
          
          // NOTE: アーカイブ移動は CardInteractionManager で自動処理される
          
          // UI更新
          utils.updateDisplay();
          
          return {
            success: true,
            message: `${card.name}の効果で手札をリフレッシュし、${drawnCards.length}枚ドローしました`,
            cardsReturned: otherCards.length,
            cardsDrawn: drawnCards.length,
            autoArchive: true // 自動アーカイブ移動を指示
          };
          
        } catch (error) {
          console.error('🚨 [手札リフレッシュ] エラー:', error);
          return {
            success: false,
            message: '手札リフレッシュ中にエラーが発生しました'
          };
        }
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
