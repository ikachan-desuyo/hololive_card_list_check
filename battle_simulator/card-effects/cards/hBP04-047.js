/**
 * hBP04-047 - カード効果定義
 * 雪花ラミィ (1stホロメン)
 */

// カード効果の定義
const cardEffect_hBP04_047 = {
  // カード基本情報
  cardId: 'hBP04-047',
  cardName: '雪花ラミィ',
  cardType: 'ホロメン',
  color: '青',
  bloomLevel: '1st',
  hp: 120,
  
  // 効果定義
  effects: {
    // コラボエフェクト: fleur
    collabEffect: {
      type: 'collab',
      name: 'fleur',
      description: '自分の〈雪民〉が付いている〈雪花ラミィ〉がいる時、相手のホロメン1人に特殊ダメージ20を与える。ただし、ダウンしても相手のライフは減らない。',
      timing: 'manual',
      auto_trigger: 'on_collab', // コラボ時に自動モーダル表示
      condition: (card, gameState, battleEngine) => {
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const utils = new CardEffectUtils(battleEngine);
        
        // 〈雪民〉が付いている〈雪花ラミィ〉がいるかチェック
        const stageHolomens = utils.getStageHolomens(currentPlayer);
        const hasYukiminLamii = stageHolomens.some(h => {
          if (h.card.name && h.card.name.includes('雪花ラミィ') && h.card.yellCards) {
            return h.card.yellCards.some(yell => yell.name && yell.name.includes('雪民'));
          }
          return false;
        });
        
        return hasYukiminLamii;
      },
      effect: async (card, battleEngine) => {
        console.log(`❄️ [コラボエフェクト] ${card.name || 'hBP04-047'}の「fleur」が発動可能！`);
        
        return new Promise((resolve) => {
          battleEngine.modalUI.showCardEffectModal({
            cardName: card.name || '雪花ラミィ',
            effectName: 'fleur',
            effectDescription: '自分の〈雪民〉が付いている〈雪花ラミィ〉がいる時、相手のホロメン1人に特殊ダメージ20を与える。ただし、ダウンしても相手のライフは減らない。',
            effectType: 'collab'
          }, async (confirmed) => {
            if (!confirmed) {
              resolve({
                success: false,
                message: 'コラボエフェクトの発動をキャンセルしました'
              });
              return;
            }
            
            try {
              console.log(`❄️ [コラボエフェクト] 「fleur」を実行中...`);
              
              const currentPlayer = battleEngine.gameState.currentPlayer;
              const opponentPlayer = currentPlayer === 0 ? 1 : 0;
              const utils = new CardEffectUtils(battleEngine);
              
              // 相手のホロメン1人に特殊ダメージ20を与える
              // TODO: 特殊ダメージ（ライフダメージなし）の実装
              console.log(`⚡ [特殊ダメージ] 相手のホロメンに特殊ダメージ20（ライフダメージなし）`);
              
              // UI更新
              utils.updateDisplay();
              
              resolve({
                success: true,
                message: `${card.name || 'hBP04-047'}のコラボエフェクト「fleur」で相手のホロメンに特殊ダメージ20！`,
                specialDamage: 20,
                target: 'opponent_holomem'
              });
            } catch (error) {
              console.error('コラボエフェクト実行エラー:', error);
              resolve({
                success: false,
                message: 'コラボエフェクトの実行中にエラーが発生しました'
              });
            }
          });
        });
      }
    },
    
    // アーツ: 雪が煌く花束
    art1: {
      type: 'art',
      name: '雪が煌く花束',
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
        console.log(`🎨 [アーツ] ${card.name || 'hBP04-047'}の「雪が煌く花束」が発動可能！`);
        
        return new Promise((resolve) => {
          battleEngine.modalUI.showCardEffectModal({
            cardName: card.name || '雪花ラミィ',
            effectName: '雪が煌く花束',
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
              console.log(`🎨 [アーツ] 「雪が煌く花束」を実行中...`);
              
              const currentPlayer = battleEngine.gameState.currentPlayer;
              const opponentPlayer = currentPlayer === 0 ? 1 : 0;
              const utils = new CardEffectUtils(battleEngine);
              
              // 50ダメージを相手に与える
              const damageResult = utils.dealDamage(opponentPlayer, 50, {
                source: card,
                type: 'art',
                artName: '雪が煌く花束'
              });
              
              // UI更新
              utils.updateDisplay();
              
              resolve({
                success: true,
                message: `${card.name || 'hBP04-047'}の「雪が煌く花束」で50ダメージ！`,
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
  window.cardEffects['hBP04-047'] = cardEffect_hBP04_047;
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP04-047',
    effect: cardEffect_hBP04_047
  });
}

// グローバルに公開
window.cardEffect_hBP04_047 = cardEffect_hBP04_047;
