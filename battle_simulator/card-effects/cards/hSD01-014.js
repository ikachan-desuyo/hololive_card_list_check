/**
 * hSD01-014 - カード効果定義
 * ホロメンカード - 天音かなた
 */

// カード効果の定義
const cardEffect_hSD01_014 = {
  // カード基本情報
  cardId: 'hSD01-014',
  cardName: '天音かなた',
  cardType: 'ホロメン',

  // 効果定義
  effects: {
    // シャッフル効果
    shuffleEffect: {
      type: 'shuffle',
      timing: 'manual',
      name: 'デッキシャッフル',
      description: 'デッキをシャッフルする効果',
      condition: (card, gameState) => {
        // 効果発動条件
        return true;
      },
      effect: (card, battleEngine) => {
        console.log(`🔀 [シャッフル効果] ${card.name || '天音かなた'}の効果が発動！`);
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const player = battleEngine.players[currentPlayer];
        const utils = new CardEffectUtils(battleEngine);
        
        // デッキをシャッフル
        if (player.deck && player.deck.length > 0) {
          utils.shuffleDeck(currentPlayer);
          utils.updateDisplay();
          
          return {
            success: true,
            message: `${card.name || '天音かなた'}の効果でデッキをシャッフルしました`,
            shuffled: true
          };
        } else {
          return {
            success: false,
            message: 'デッキが空です'
          };
        }
      }
    }
  }
};

// グローバルスコープに登録
if (typeof window !== 'undefined') {
  window.cardEffectManager = window.cardEffectManager || new ScalableCardEffectManager();
  window.cardEffectManager.registerCardEffect('hSD01-014', cardEffect_hSD01_014);
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = cardEffect_hSD01_014;
}
