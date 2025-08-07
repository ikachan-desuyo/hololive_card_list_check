/**
 * hBP04-101 - カード効果定義
 * だいふく (サポート・マスコット)
 */

// カード効果の定義
const cardEffect_hBP04_101 = {
  // カード基本情報
  cardId: 'hBP04-101',
  cardName: 'だいふく',
  cardType: 'サポート・マスコット',
  rarity: 'C',
  
  // 効果定義
  effects: {
    // マスコット効果
    mascotEffect: {
      type: 'mascot',
      name: 'だいふく',
      description: 'このマスコットが付いているホロメンのアーツ+10。◆〈雪花ラミィ〉に付いていたら能力追加：このマスコットが付いているホロメンのHP+20。',
      timing: 'permanent',
      condition: (card, gameState, battleEngine) => {
        // マスコットとして付いている時のみ
        return card.attachedTo && card.attachedTo.position;
      },
      effect: (card, battleEngine) => {
        const attachedHolomem = card.attachedTo;
        if (!attachedHolomem) return { success: false, message: 'ホロメンに付いていません' };
        
        // 基本効果：アーツ+10
        const artBonus = 10;
        
        // 雪花ラミィに付いている場合：HP+20
        let hpBonus = 0;
        if (attachedHolomem.card.name && attachedHolomem.card.name.includes('雪花ラミィ')) {
          hpBonus = 20;
        }
        
        return {
          success: true,
          message: `だいふくの効果でアーツ+${artBonus}${hpBonus > 0 ? `、HP+${hpBonus}` : ''}`,
          artBonus: artBonus,
          hpBonus: hpBonus,
          permanent: true
        };
      }
    },
    
    // サポート使用効果（手札から使用する場合）
    supportPlayEffect: {
      type: 'support',
      name: 'マスコット装着',
      description: 'ホロメン1人にマスコットとして付ける',
      timing: 'manual',
      condition: (card, gameState, battleEngine) => {
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const utils = new CardEffectUtils(battleEngine);
        
        // 手札にある時かつメインステップ
        const phase = battleEngine.gameState.currentPhase;
        return phase === 3; // メインステップ
      },
      effect: async (card, battleEngine) => {
        console.log(`🎀 [サポート] ${card.name || 'hBP04-101'}をマスコットとして装着！`);
        
        const currentPlayer = battleEngine.gameState.currentPlayer;
        const utils = new CardEffectUtils(battleEngine);
        
        // ホロメン選択
        const stageHolomens = utils.getStageHolomens(currentPlayer);
        if (stageHolomens.length === 0) {
          return { success: false, message: 'ステージにホロメンがいません' };
        }
        
        // 装備可能なホロメンをフィルタ
        const availableHolomens = stageHolomens.filter(h => {
          if (!h.card.equipment) h.card.equipment = { fans: [], mascots: [], tools: [] };
          return h.card.equipment.mascots.length === 0; // マスコットは1枚制限
        });
        
        if (availableHolomens.length === 0) {
          return { success: false, message: '全てのホロメンに既にマスコットが装備されています' };
        }
        
        // ホロメン選択UI（簡易実装）
        const targetHolomem = availableHolomens[0].card; // 仮で最初のホロメン
        
        // 装備実行
        const equipResult = utils.attachSupportCard(currentPlayer, targetHolomem, card);
        
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
            message: `${targetHolomem.name}に「だいふく」を装備しました`,
            target: targetHolomem
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
  window.cardEffects['hBP04-101'] = cardEffect_hBP04_101;
  console.log('🔮 [Card Effect] hBP04-101 の効果を登録しました');
} else {
  console.warn('🔮 [Card Effect] cardEffects not available, deferring registration');
  window.pendingCardEffects = window.pendingCardEffects || [];
  window.pendingCardEffects.push({
    cardId: 'hBP04-101',
    effect: cardEffect_hBP04_101
  });
}

// グローバルに公開
window.cardEffect_hBP04_101 = cardEffect_hBP04_101;

// グローバルに公開
window.cardEffect_hBP04_101 = cardEffect_hBP04_101;
