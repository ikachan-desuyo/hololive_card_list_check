/**
 * 作業用パソコン (hBP04-090_U) - サポートカード
 */

(function() {
  const cardEffect = {
    cardId: 'hBP04-090_U',
    name: '作業用パソコン',
    type: 'support',
    
    execute: async (card, context, battleEngine) => {
      const utils = battleEngine.cardEffectTriggerSystem.utils;
      const currentPlayer = battleEngine.gameState.currentPlayer;
      
      try {
        const player = battleEngine.players[currentPlayer];
        
        // 手札枚数チェック（このカードを含まずに6枚以下）
        if (player.hand.length > 7) { // このカード含めて7枚 = このカード除いて6枚
          return {
            success: false,
            reason: '手札が多すぎます（このカードを含まずに6枚以下でなければ使えません）'
          };
        }
        
        // デッキの上から4枚を見る
        if (player.deck.length < 4) {
          return {
            success: false,
            reason: 'デッキに4枚のカードがありません'
          };
        }
        
        const topCards = player.deck.slice(0, 4);
        
        // ホロメン1枚とツール・マスコット・ファン1枚を検索
        const holomens = topCards.filter(card => 
          card.card_type && card.card_type.includes('ホロメン')
        );
        const supportCards = topCards.filter(card => 
          card.card_type && (
            card.card_type.includes('ツール') ||
            card.card_type.includes('マスコット') ||
            card.card_type.includes('ファン')
          )
        );
        
        let addedCards = [];
        
        // ホロメン1枚を手札に加える
        if (holomens.length > 0) {
          const selectedHolomen = holomens[0];
          const deckIndex = player.deck.indexOf(selectedHolomen);
          player.deck.splice(deckIndex, 1);
          player.hand.push(selectedHolomen);
          addedCards.push(selectedHolomen);
        }
        
        // サポートカード1枚を手札に加える
        if (supportCards.length > 0) {
          const selectedSupport = supportCards[0];
          const deckIndex = player.deck.indexOf(selectedSupport);
          if (deckIndex !== -1) { // まだデッキにある場合
            player.deck.splice(deckIndex, 1);
            player.hand.push(selectedSupport);
            addedCards.push(selectedSupport);
          }
        }
        
        // 残りのカードをデッキの下に戻す（簡略化）
        const remainingCards = topCards.filter(card => !addedCards.includes(card));
        for (const card of remainingCards) {
          const deckIndex = player.deck.indexOf(card);
          if (deckIndex !== -1) {
            player.deck.splice(deckIndex, 1);
            player.deck.push(card); // デッキの下に
          }
        }
        
        return {
          success: true,
          message: `作業用パソコン：${addedCards.length}枚のカードを手札に加えました`
        };
        
      } catch (error) {
        return { success: false, reason: 'エラーが発生しました', error };
      }
    }
  };

  // カード効果をグローバルに登録
  if (typeof window !== 'undefined' && window.cardEffects) {
    window.cardEffects[cardEffect.cardId] = cardEffect;
  }

  // Node.js環境でのエクスポート
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = cardEffect;
  }
})();
