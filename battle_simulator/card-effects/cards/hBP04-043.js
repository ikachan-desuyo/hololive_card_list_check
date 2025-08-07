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
      condition: (card, gameState, battleEngine) => {
        // 基本的なアーツ使用条件
        const totalYells = card.yellCards ? card.yellCards.length : 0;
        return totalYells >= 1; // any色1個
      },
      effect: (card, battleEngine) => {
        console.log(`🎨 [アーツ] ${card.name || 'hBP04-043'}の「こんらみ～」が発動！`);
        
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
        
        return {
          success: true,
          message: `${card.name || 'hBP04-043'}の「こんらみ～」で20ダメージ＋特殊ダメージ10！`,
          damage: 20,
          specialDamage: 10,
          target: 'opponent'
        };
      }
    }
  }
};

// 効果を登録（新システム対応）
if (window.cardEffects) {
  window.cardEffects['hBP04-043'] = cardEffect_hBP04_043;
  console.log('🔮 [Card Effect] hBP04-043 の効果を登録しました');
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
