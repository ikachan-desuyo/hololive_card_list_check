/**
 * hBP02-042 - カード効果定義
 * 紫咲シオン (Debutホロメン)
 */

// カード効果の定義
const cardEffect_hBP02_042 = {
  // カード基本情報
  cardId: 'hBP02-042',
  cardName: '紫咲シオン',
  cardType: 'ホロメン',
  color: '紫',
  bloomLevel: 'Debut',
  hp: 130,
  
  // 効果定義
  effects: {
    // アーツ: どうも～
    art1: {
      type: 'art',
      name: 'どうも～',
      description: 'ダメージ20',
      cost: { any: 1 },
      damage: 20,
      timing: 'manual',
      auto_trigger: 'arts', // アーツ使用時に自動モーダル表示
      condition: (card, gameState, battleEngine) => {
        // 基本的なアーツ使用条件
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const player = battleEngine.players[currentPlayer];
        
        // エールが付いているかチェック（必要エール数分）
        const totalYells = card.yellCards ? card.yellCards.length : 0;
        return totalYells >= 1; // any色1個
      },
      effect: (card, battleEngine) => {
        console.log(`🎨 [アーツ] ${card.name || 'hBP02-042'}の「どうも～」が発動！`);
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const opponentPlayer = currentPlayer === 0 ? 1 : 0;
        const utils = new CardEffectUtils(battleEngine);
        
        // 20ダメージを相手に与える
        const damageResult = utils.dealDamage(opponentPlayer, 20, {
          source: card,
          type: 'art',
          artName: 'どうも～'
        });
        
        // UI更新
        utils.updateDisplay();
        
        return {
          success: true,
          message: `${card.name || 'hBP02-042'}の「どうも～」で20ダメージ！`,
          damage: 20,
          target: 'opponent'
        };
      }
    }
  }
};// 効果を登録（新システム対応）
if (window.cardEffects) {
  window.cardEffects['hBP02-042'] = cardEffect_hBP02_042;
  console.log('🔮 [Card Effect] hBP02-042 の効果を登録しました');
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP02-042',
    effect: cardEffect_hBP02_042
  });
}

// グローバルに公開
window.cardEffect_hBP02_042 = cardEffect_hBP02_042;

// グローバルに公開
window.cardEffect_hBP02_042 = cardEffect_hBP02_042;
