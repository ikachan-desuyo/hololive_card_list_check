/**
 * hY04-001 - カード効果定義
 * エールカード - 青エール
 */

// カード効果の定義
const cardEffect_hY04_001 = {
  // カード基本情報
  cardId: 'hY04-001',
  cardName: '青エール',
  cardType: 'エール',
  color: '青',

  // 効果定義
  effects: {
    // エール効果（基本的なステータス強化）
    yellBonus: {
      type: 'yell_bonus',
      timing: 'passive',
      name: '青エール効果',
      description: '青属性のホロメンにアーツ+10',
      condition: (card, gameState, attachedHolomem) => {
        // 青属性のホロメンに付いている場合
        return attachedHolomem && attachedHolomem.color === '青';
      },
      effect: (card, battleEngine, attachedHolomem) => {
        console.log(`💙 [青エール効果] ${card.name || '青エール'}が${attachedHolomem?.name}に効果を付与`);
        
        // 青属性のホロメンにアーツ+10
        if (attachedHolomem && attachedHolomem.color === '青') {
          attachedHolomem.tempBuffs = attachedHolomem.tempBuffs || {};
          attachedHolomem.tempBuffs.artsBonus = (attachedHolomem.tempBuffs.artsBonus || 0) + 10;
          
          return {
            success: true,
            message: `${card.name || '青エール'}の効果で${attachedHolomem.name}のアーツ+10`,
            artsBonus: 10
          };
        } else {
          return {
            success: false,
            message: '青属性のホロメンではありません'
          };
        }
      }
    },

    // エール基本効果
    basicYellEffect: {
      type: 'basic_yell',
      timing: 'passive',
      name: 'エール基本効果',
      description: 'ホロメンの基本能力向上',
      condition: (card, gameState, attachedHolomem) => {
        return attachedHolomem != null;
      },
      effect: (card, battleEngine, attachedHolomem) => {
        // エールの基本効果（HP+10など）
        if (attachedHolomem) {
          attachedHolomem.tempBuffs = attachedHolomem.tempBuffs || {};
          attachedHolomem.tempBuffs.hpBonus = (attachedHolomem.tempBuffs.hpBonus || 0) + 10;
          
          return {
            success: true,
            message: `${card.name || '青エール'}の基本効果で${attachedHolomem.name}のHP+10`,
            hpBonus: 10
          };
        }
        
        return { success: false };
      }
    }
  }
};

// グローバルスコープに登録
if (typeof window !== 'undefined') {
  window.cardEffectManager = window.cardEffectManager || new ScalableCardEffectManager();
  window.cardEffectManager.registerCardEffect('hY04-001', cardEffect_hY04_001);
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = cardEffect_hY04_001;
}
