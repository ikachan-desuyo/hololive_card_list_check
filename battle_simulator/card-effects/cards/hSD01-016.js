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
      type: 'draw',
      timing: 'manual',
      name: 'ドロー効果',
      description: '自分のデッキを３枚引く',
      limited: true, // LIMITED効果
      condition: (card, gameState) => {
        // LIMITED：ターンに１枚しか使えない
        return true;
      },
      effect: (card, battleEngine) => {
        console.log(`📚 [ドロー効果] ${card.name || '春先のどか'}の効果が発動！`);
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const utils = new CardEffectUtils(battleEngine);
        
        // デッキを3枚引く
        const drawnCards = utils.drawCards(currentPlayer, 3);
        
        if (drawnCards.length > 0) {
          utils.updateDisplay();
          
          return {
            success: true,
            message: `${card.name || '春先のどか'}の効果でデッキを${drawnCards.length}枚引きました`,
            drawnCards: drawnCards
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

// グローバルスコープに登録
if (typeof window !== 'undefined') {
  window.cardEffectManager = window.cardEffectManager || new ScalableCardEffectManager();
  window.cardEffectManager.registerCardEffect('hSD01-016', cardEffect_hSD01_016);
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = cardEffect_hSD01_016;
}
