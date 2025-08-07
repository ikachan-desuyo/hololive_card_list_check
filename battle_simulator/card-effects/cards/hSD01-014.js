/**
 * hSD01-014 - カード効果定義
 * 天音かなた (Spotホロメン)
 */

// カード効果の定義
const cardEffect_hSD01_014 = {
  // カード基本情報
  cardId: 'hSD01-014',
  cardName: '天音かなた',
  cardType: 'ホロメン',
  color: '無色',
  bloomLevel: 'Spot',
  hp: 150,

  // 効果定義
  effects: {
    // アーツ: へい
    art1: {
      type: 'art',
      name: 'へい',
      description: 'ダメージ30',
      cost: { white: 1, green: 1 },
      damage: 30,
      timing: 'manual',
      condition: (card, gameState, battleEngine) => {
        // エールの色チェック（白1個、緑1個必要）
        if (!card.yellCards) return false;
        
        const colorCounts = {};
        card.yellCards.forEach(yell => {
          const color = yell.card_color || yell.color;
          colorCounts[color] = (colorCounts[color] || 0) + 1;
        });
        
        return (colorCounts['白'] >= 1 || colorCounts['white'] >= 1) && 
               (colorCounts['緑'] >= 1 || colorCounts['green'] >= 1);
      },
      effect: (card, battleEngine) => {
        console.log(`🎨 [アーツ] ${card.name || 'hSD01-014'}の「へい」が発動！`);
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const opponentPlayer = currentPlayer === 0 ? 1 : 0;
        const utils = new CardEffectUtils(battleEngine);
        
        // 30ダメージを相手に与える
        const damageResult = utils.dealDamage(opponentPlayer, 30, {
          source: card,
          type: 'art',
          artName: 'へい'
        });
        
        // UI更新
        utils.updateDisplay();
        
        return {
          success: true,
          message: `${card.name || 'hSD01-014'}の「へい」で30ダメージ！`,
          damage: 30,
          target: 'opponent'
        };
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
