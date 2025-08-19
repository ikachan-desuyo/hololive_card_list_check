/**
 * hBP04-106 - カード効果定義
 * 雪民 (サポート・ファン)
 */

// カード効果の定義
const cardEffect_hBP04_106 = {
  // カード基本情報
  cardId: 'hBP04-106',
  cardName: '雪民',
  cardType: 'サポート・ファン',
  rarity: 'U',
  
  // 効果定義
  effects: {
    // ファン効果
    fanEffect: {
      type: 'fan',
      name: '雪民',
      description: 'このファンが付いているホロメンが、相手のセンターホロメンに与える特殊ダメージ+10。このファンは、自分の〈雪花ラミィ〉だけに付けられ、1人につき何枚でも付けられる。',
      timing: 'permanent',
      condition: (card, gameState, battleEngine) => {
        // ファンとして付いている時のみ
        return card.attachedTo && card.attachedTo.position;
      },
      effect: (card, battleEngine) => {
        const attachedHolomem = card.attachedTo;
        if (!attachedHolomem) return { success: false, message: 'ホロメンに付いていません' };
        
        // 雪花ラミィに付いている場合のみ有効
        if (!attachedHolomem.card.name || !attachedHolomem.card.name.includes('雪花ラミィ')) {
          return { success: false, message: '雪花ラミィ以外には付けられません' };
        }
        
        // 相手のセンターホロメンに与える特殊ダメージ+10
        return {
          success: true,
          message: `雪民の効果で特殊ダメージ+10`,
          specialDamageBonus: 10,
          targetType: 'opponent_center',
          permanent: true
        };
      }
    },
    
    // サポート使用効果（手札から使用する場合）
    supportPlayEffect: {
      type: 'support',
      name: 'ファン装着',
      description: '雪花ラミィにファンとして付ける',
      timing: 'manual',
      condition: (card, gameState, battleEngine) => {
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const utils = new CardEffectUtils(battleEngine);
        
        // 手札にある時かつメインステップ
        const phase = battleEngine.gameState.currentPhase;
        if (phase !== 3) return false; // メインステップ以外は無効
        
        // 雪花ラミィがステージにいるかチェック
        const stageHolomens = utils.getStageHolomens(currentPlayer);
        return stageHolomens.some(h => h.card.name && h.card.name.includes('雪花ラミィ'));
      },
      effect: async (card, battleEngine) => {
        console.log(`❄️ [サポート] ${card.name || 'hBP04-106'}をファンとして装着！`);
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const utils = new CardEffectUtils(battleEngine);
        
        // 雪花ラミィを選択
        const stageHolomens = utils.getStageHolomens(currentPlayer);
        const lamyHolomens = stageHolomens.filter(h => 
          h.card.name && h.card.name.includes('雪花ラミィ')
        );
        
        if (lamyHolomens.length === 0) {
          return { success: false, message: 'ステージに雪花ラミィがいません' };
        }
        
        // 装備対象選択（複数の雪花ラミィがいる場合は最初の一人）
        const targetLamy = lamyHolomens[0].card;
        
        // 装備実行（雪民は複数枚装備可能）
        const equipResult = utils.attachSupportCard(currentPlayer, targetLamy, card);
        
        if (equipResult.success) {
          // 手札からカードを削除（装備として移動）
          const player = battleEngine.players[currentPlayer];
          const handIndex = player.hand.indexOf(card);
          if (handIndex !== -1) {
            player.hand.splice(handIndex, 1);
          }
          
          // UI更新
          utils.updateDisplay();
          
          return {
            success: true,
            message: `${targetLamy.name}に「雪民」を装備しました`,
            target: targetLamy
          };
        } else {
          return equipResult;
        }
      }
    }
  }
};

// 効果を登録（新システム対応）
if (window.cardEffects) {
  window.cardEffects['hBP04-106'] = cardEffect_hBP04_106;
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP04-106',
    effect: cardEffect_hBP04_106
  });
}

// グローバルに公開
window.cardEffect_hBP04_106 = cardEffect_hBP04_106;

// グローバルに公開
window.cardEffect_hBP04_106 = cardEffect_hBP04_106;
