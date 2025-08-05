/**
 * hBP04-047 - カード効果定義
 * ホロメンカード - 雪花ラミィ (1st)
 */

// カード効果の定義
const cardEffect_hBP04_047 = {
  // カード基本情報
  cardId: 'hBP04-047',
  cardName: '雪花ラミィ',
  cardType: 'ホロメン',
  bloomLevel: '1st',
  
  // 効果定義
  effects: {
    // コラボエフェクト: fleur
    collabEffect_fleur: {
      type: 'collab',
      timing: 'on_collab',
      name: 'fleur',
      description: '自分の〈雪民〉が付いている〈雪花ラミィ〉がいる時、相手のホロメン1人に特殊ダメージ20を与える。ただし、ダウンしても相手のライフは減らない。',
      condition: (card, gameState, battleEngine) => {
        // コラボポジションにいるかチェック
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const player = battleEngine.players[currentPlayer];
        if (!player || !player.cards) return false;
        
        // コラボポジションにこのカードがいるかチェック
        if (player.cards.collab?.id !== card.id) return false;
        
        // 〈雪民〉が付いている〈雪花ラミィ〉がいるかチェック
        const stage = player.stage || [];
        const hasYukiminLamii = stage.some(holomem => 
          holomem.name?.includes('雪花ラミィ') && 
          holomem.attachedFans?.some(fan => fan.name?.includes('雪民'))
        );
        
        return hasYukiminLamii;
      },
      effect: (card, battleEngine) => {
        console.log(`❄️ [fleur] ${card.name || '雪花ラミィ'}のコラボエフェクトが発動！`);
        
        const utils = new CardEffectUtils(battleEngine);
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const opponentPlayer = currentPlayer === 1 ? 2 : 1;
        
        // 相手のホロメン1人に特殊ダメージ20を与える
        const opponent = battleEngine.players[opponentPlayer];
        if (opponent && opponent.stage && opponent.stage.length > 0) {
          const target = opponent.stage[0]; // 最初のホロメンを対象
          
          const damage = utils.dealDamage(target, 20, { 
            isSpecial: true, 
            noLifeDamage: true // ダウンしてもライフは減らない
          });
          
          utils.updateDisplay();
          
          return {
            success: true,
            message: `${card.name || '雪花ラミィ'}のコラボエフェクト「fleur」で${target.name}に特殊ダメージ20を与えました`,
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

// グローバルスコープに登録
if (typeof window !== 'undefined') {
  window.cardEffectManager = window.cardEffectManager || new ScalableCardEffectManager();
  window.cardEffectManager.registerCardEffect('hBP04-047', cardEffect_hBP04_047);
}

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = cardEffect_hBP04_047;
}
