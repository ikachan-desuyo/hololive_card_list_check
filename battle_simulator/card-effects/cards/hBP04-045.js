/**
 * hBP04-045 - カード効果定義
 * 雪花ラミィ (1stホロメン)
 */

// カード効果の定義
const cardEffect_hBP04_045 = {
  // カード基本情報
  cardId: 'hBP04-045',
  cardName: '雪花ラミィ',
  cardType: 'ホロメン',
  color: '青',
  bloomLevel: '1st',
  hp: 150,
  
  // 効果定義
  effects: {
    // アーツ: おつらみ
    art1: {
      type: 'art',
      name: 'おつらみ',
      description: 'ダメージ30',
      cost: { blue: 1 },
      damage: 30,
      timing: 'manual',
      auto_trigger: 'arts', // アーツ使用時に自動モーダル表示
      condition: (card, gameState, battleEngine) => {
        // 青色1個のエール必要
        if (!card.yellCards) return false;
        
        const blueCount = card.yellCards.filter(yell => 
          yell.card_color === '青' || yell.color === 'blue'
        ).length;
        
        return blueCount >= 1;
      },
      effect: async (card, battleEngine) => {
        console.log(`🎨 [アーツ] ${card.name || 'hBP04-045'}の「おつらみ」が発動可能！`);
        
        return new Promise((resolve) => {
          battleEngine.modalUI.showCardEffectModal({
            cardName: card.name || '雪花ラミィ',
            effectName: 'おつらみ',
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
              console.log(`🎨 [アーツ] 「おつらみ」を実行中...`);
              
              const currentPlayer = battleEngine.gameState.currentPlayer;
              const opponentPlayer = currentPlayer === 0 ? 1 : 0;
              const utils = new CardEffectUtils(battleEngine);
              
              // 30ダメージを相手に与える
              const damageResult = utils.dealDamage(opponentPlayer, 30, {
                source: card,
                type: 'art',
                artName: 'おつらみ'
              });
              
              // UI更新
              utils.updateDisplay();
              
              resolve({
                success: true,
                message: `${card.name || 'hBP04-045'}の「おつらみ」で30ダメージ！`,
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
    },
    
    // アーツ: ボスが攻略できな～い
    art2: {
      type: 'art',
      name: 'ボスが攻略できな～い',
      description: 'ダメージ50',
      cost: { blue: 1, any: 1 },
      damage: 50,
      timing: 'manual',
      auto_trigger: 'arts', // アーツ使用時に自動モーダル表示
      condition: (card, gameState, battleEngine) => {
        // 青色1個とany色1個のエール必要
        if (!card.yellCards) return false;
        
        const blueCount = card.yellCards.filter(yell => 
          yell.card_color === '青' || yell.color === 'blue'
        ).length;
        
        return blueCount >= 1 && card.yellCards.length >= 2;
      },
      effect: async (card, battleEngine) => {
        console.log(`🎨 [アーツ] ${card.name || 'hBP04-045'}の「ボスが攻略できな～い」が発動可能！`);
        
        return new Promise((resolve) => {
          battleEngine.modalUI.showCardEffectModal({
            cardName: card.name || '雪花ラミィ',
            effectName: 'ボスが攻略できな～い',
            effectDescription: 'ダメージ50',
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
              console.log(`🎨 [アーツ] 「ボスが攻略できな～い」を実行中...`);
              
              const currentPlayer = battleEngine.gameState.currentPlayer;
              const opponentPlayer = currentPlayer === 0 ? 1 : 0;
              const utils = new CardEffectUtils(battleEngine);
              
              // 50ダメージを相手に与える
              const damageResult = utils.dealDamage(opponentPlayer, 50, {
                source: card,
                type: 'art',
                artName: 'ボスが攻略できな～い'
              });
              
              // UI更新
              utils.updateDisplay();
              
              resolve({
                success: true,
                message: `${card.name || 'hBP04-045'}の「ボスが攻略できな～い」で50ダメージ！`,
                damage: 50,
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
  window.cardEffects['hBP04-045'] = cardEffect_hBP04_045;
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP04-045',
    effect: cardEffect_hBP04_045
  });
}

// グローバルに公開
window.cardEffect_hBP04_045 = cardEffect_hBP04_045;

// グローバルに公開
window.cardEffect_hBP04_045 = cardEffect_hBP04_045;
