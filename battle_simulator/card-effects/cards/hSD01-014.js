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
      auto_trigger: 'arts', // アーツ使用時に自動モーダル表示
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
      effect: async (card, battleEngine) => {
        console.log(`🎨 [アーツ] ${card.name || 'hSD01-014'}の「へい」が発動可能！`);
        
        return new Promise((resolve) => {
          battleEngine.modalUI.showCardEffectModal({
            cardName: card.name || '天音かなた',
            effectName: 'へい',
            effectDescription: 'ダメージ30',
            effectType: 'art'
          }, async (confirmed) => {
            if (!confirmed) {
              resolve({
                success: false,
                message: 'アーツ効果の発動をキャンセルしました'
              });
              return;
            }
            
            try {
              console.log(`🎨 [アーツ] 「へい」を実行中...`);
              
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
              
              resolve({
                success: true,
                message: `${card.name || 'hSD01-014'}の「へい」で30ダメージ！`,
                damage: 30,
                target: 'opponent'
              });
            } catch (error) {
              console.error('アーツ効果実行エラー:', error);
              resolve({
                success: false,
                message: 'アーツ効果の実行中にエラーが発生しました'
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
  window.cardEffects['hSD01-014'] = cardEffect_hSD01_014;
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hSD01-014',
    effect: cardEffect_hSD01_014
  });
}

// グローバルに公開
window.cardEffect_hSD01_014 = cardEffect_hSD01_014;
