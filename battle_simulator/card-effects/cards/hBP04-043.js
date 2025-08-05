/**
 * hBP04-043 - カード効果定義
 * ホロメンカード - 雪花ラミィ (Debut)
 */

// カード効果の定義
const cardEffect_hBP04_043 = {
  // カード基本情報
  cardId: 'hBP04-043',
  cardName: '雪花ラミィ',
  cardType: 'ホロメン',
  bloomLevel: 'Debut',
  
  // 効果定義
  effects: {
    // アーツ: こんらみ～
    arts_konrami: {
      type: 'arts',
      timing: 'manual',
      name: 'こんらみ～',
      description: '相手のホロメン1人に特殊ダメージ10を与える。ただし、ダウンしても相手のライフは減らない。',
      damage: 20, // 基本ダメージ
      condition: (card, gameState) => {
        // アーツが使用可能な状況
        return gameState.isMyTurn;
      },
      effect: (card, battleEngine) => {
        console.log(`🎨 [こんらみ～] ${card.name || '雪花ラミィ'}のアーツが発動！`);
        
        const utils = new CardEffectUtils(battleEngine);
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const opponentPlayer = currentPlayer === 1 ? 2 : 1;
        
        // 相手のホロメン1人に特殊ダメージ10を与える
        const opponent = battleEngine.players[opponentPlayer];
        if (opponent && opponent.stage && opponent.stage.length > 0) {
          const target = opponent.stage[0]; // 最初のホロメンを対象
          
          const damage = utils.dealDamage(target, 10, { 
            isSpecial: true, 
            noLifeDamage: true // ダウンしてもライフは減らない
          });
          
          utils.updateDisplay();
          
          return {
            success: true,
            message: `${card.name || '雪花ラミィ'}のアーツ「こんらみ～」で${target.name}に特殊ダメージ10を与えました`,
            damage: damage,
            target: target
          };
        } else {
          return {
            success: false,
            message: '相手にホロメンがいません'
          };
        }
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
