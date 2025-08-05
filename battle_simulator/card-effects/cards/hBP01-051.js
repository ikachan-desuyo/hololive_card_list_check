// 風真いろは (hBP01-051_RR/UR)
(() => {
  if (!window.cardEffects) {
    window.cardEffects = {};
  }

  // 風真いろは RR版の効果
  window.cardEffects['hBP01-051_RR'] = {
    cardId: 'hBP01-051_RR',
    name: '風真いろは',
    type: 'ホロメン',
    color: '緑',
    
    // アーツ: エールを束ねて
    skill1: {
      name: 'エールを束ねて',
      type: 'アーツ',
      cost: ['緑', '無'],
      baseDamage: 50,
      description: '[コラボポジション限定]このホロメンのエール１枚につき、このアーツ+20（エールは最大５枚まで）。',
      canActivate: function(card, context, battleEngine) {
        // コラボポジション限定
        const player = battleEngine.players[context.playerId];
        return player && player.collab && player.collab.id === card.id;
      },
      async execute(card, context, battleEngine) {
        const baseDamage = 50;
        
        // エール枚数を数える
        const yellCount = card.yellCards ? Math.min(card.yellCards.length, 5) : 0;
        const bonusDamage = yellCount * 20;
        const totalDamage = baseDamage + bonusDamage;
        
        
        return {
          success: true,
          damage: totalDamage,
          description: `エールを束ねて: ${totalDamage}ダメージ (エール${yellCount}枚)`
        };
      }
    },
    
    // アーツ: 風華の輝き
    skill2: {
      name: '風華の輝き',
      type: 'アーツ',
      cost: ['緑', '無', '無'],
      damage: 70,
      description: '70ダメージを与える',
      async execute(card, context, battleEngine) {
        
        return {
          success: true,
          damage: 70,
          description: '風華の輝き: 70ダメージ'
        };
      }
    }
  };

  // UR版も同じ効果を使用
  window.cardEffects['hBP01-051_UR'] = {
    ...window.cardEffects['hBP01-051_RR'],
    cardId: 'hBP01-051_UR'
  };

})();
