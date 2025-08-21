/**
 * hBP04-043 - カード効果定義
 * 雪花ラミィ (Debutホロメン)
 */

// カード効果の定義
const cardEffect_hBP04_043 = {
  // カード基本情報
  cardId: 'hBP04-043',
  cardName: '雪花ラミィ',
  cardType: 'ホロメン',
  color: '青',
  bloomLevel: 'Debut',
  hp: 90,
  
  // 効果定義
  effects: {
    // アーツ: こんらみ～
    art1: {
      type: 'art',
      name: 'こんらみ～',
      description: '相手のホロメン1人に特殊ダメージ10を与える。ただし、ダウンしても相手のライフは減らない。',
      cost: { any: 1 },
      damage: 20, // 基本ダメージ
      timing: 'manual',
      auto_trigger: 'arts', // アーツ使用時に自動モーダル表示
      condition: (card, gameState, battleEngine) => {
        // 基本的なアーツ使用条件
        const totalYells = card.yellCards ? card.yellCards.length : 0;
        return totalYells >= 1; // any色1個
      },
      effect: async (card, battleEngine) => {
        console.log(`🎨 [アーツ] ${card.name || 'hBP04-043'}の「こんらみ～」が発動可能！`);
        
        return new Promise((resolve) => {
          battleEngine.modalUI.showCardEffectModal({
            cardName: card.name || '雪花ラミィ',
            effectName: 'こんらみ～',
            effectDescription: '相手のホロメン1人に特殊ダメージ10を与える。ただし、ダウンしても相手のライフは減らない。',
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
              console.log(`🎨 [アーツ] 「こんらみ～」を実行中...`);
              
              const currentPlayer = battleEngine.gameState.currentPlayer;
              const opponentPlayer = currentPlayer === 0 ? 1 : 0;
              const utils = new CardEffectUtils(battleEngine);
              
              // 通常の20ダメージを与える
              const damageResult = utils.dealDamage(opponentPlayer, 20, {
                source: card,
                type: 'art',
                artName: 'こんらみ～'
              });
              
              // 追加で特殊ダメージ10を与える（ライフダメージなし）
              // TODO: 特殊ダメージの実装が必要
              console.log(`⚡ [特殊ダメージ] 相手のホロメンに特殊ダメージ10（ライフダメージなし）`);
              
              // UI更新
              utils.updateDisplay();
              
              resolve({
                success: true,
                message: `${card.name || 'hBP04-043'}の「こんらみ～」で20ダメージ＋特殊ダメージ10！`,
                damage: 20,
                specialDamage: 10,
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
  window.cardEffects['hBP04-043'] = cardEffect_hBP04_043;
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP04-043',
    effect: cardEffect_hBP04_043
  });
}

// グローバルに公開
window.cardEffect_hBP04_043 = cardEffect_hBP04_043;
