/**
 * hBP02-045 - カード効果定義
 * ホロメンカード
 */

// カード効果の定義
const cardEffect_hBP02_045 = {
  // カード基本情報
  cardId: 'hBP02-045',
  cardName: '紫咲シオン',
  cardType: 'ホロメン',
  
  // 効果定義
  effects: {
    // 攻撃効果
    attackEffect: {
      type: 'attack',
      timing: 'manual',
      name: '攻撃効果',
      description: '相手にダメージを与える効果',
      condition: (card, gameState, battleEngine) => {
        // メインステップでステージにいる時のみ
        const currentPhase = battleEngine.gameState.currentPhase;
        return currentPhase === 3; // メインステップ
      },
      effect: (card, battleEngine) => {
        console.log(`⚔️ [攻撃効果] ${card.name || 'hBP02-045'}の効果が発動！`);
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const opponentPlayer = currentPlayer === 1 ? 2 : 1;
        const utils = new CardEffectUtils(battleEngine);
        
        // 相手に1ダメージ
        const damageResult = utils.dealDamage(opponentPlayer, 1, {
          source: card,
          type: 'effect'
        });
        
        if (damageResult.success) {
          utils.updateDisplay();
          
          return {
            success: true,
            message: `${card.name || 'hBP02-045'}の効果で相手に1ダメージ！`,
            damage: damageResult.damage
          };
        } else {
          return {
            success: false,
            message: damageResult.reason
          };
        }
      }
    }
  }
};

// 効果を登録
if (window.cardEffectManager) {
  window.cardEffectManager.registerCardEffect('hBP02-045', cardEffect_hBP02_045);
  console.log('🔮 [Card Effect] hBP02-045 の効果を登録しました');
} else {
  console.warn('🔮 [Card Effect] CardEffectManager not found, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP02-045',
    effect: cardEffect_hBP02_045
  });
}

// グローバルに公開
window.cardEffect_hBP02_045 = cardEffect_hBP02_045;
