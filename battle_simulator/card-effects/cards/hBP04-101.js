/**
 * hBP04-101 - だいふく (マスコット装備カード)
 * サポート・マスコット - 汎用装備
 */

// カード効果の定義
const cardEffect_hBP04_101 = {
  cardId: 'hBP04-101',
  name: 'だいふく',
  cardType: 'サポート・マスコット',
  
  effects: {
    // 装備効果（ギフト効果）
    equipmentEffect: {
      type: 'equipment',
      name: 'サポート効果',
      description: 'このマスコットが付いているホロメンのアーツ+10。◆〈雪花ラミィ〉に付いていたら能力追加 このマスコットが付いているホロメンのHP+20。マスコットは、自分のホロメン1人につき1枚だけ付けられる。',
      timing: 'passive',
      condition: function(card, gameState, battleEngine) {
        return card.attachedTo !== null;
      },
      effect: function(card, gameState, battleEngine) {
        const effects = { artBonus: 10 };
        
        // 雪花ラミィの場合はHP+20
        if (card.attachedTo && card.attachedTo.name && card.attachedTo.name.includes('雪花ラミィ')) {
          effects.hpBonus = 20;
        }
        
        return effects;
      }
    },
    
    // 手札からの効果発動（装備処理を実行）
    supportEffect: {
      name: 'だいふくを装備',
      timing: 'manual',
      limited: false,
      condition: function(card, gameState, battleEngine) {
        // 手札にある場合のみ効果発動可能（装備処理のため）
        const currentPlayer = battleEngine.gameState?.currentPlayer ?? battleEngine.currentPlayer ?? 0;
        const utils = new CardEffectUtils(battleEngine);
        const stageHolomens = utils.getStageHolomens(currentPlayer);
        
        // 装備可能なホロメンがいるかチェック
        return stageHolomens.length > 0;
      },
      effect: async function(card, battleEngine) {
        console.log('🍡 だいふくの装備処理開始 (装備モード経由 - 遅延)');
        const currentPlayer = battleEngine.gameState?.currentPlayer ?? battleEngine.currentPlayer ?? 0;
        const player = battleEngine.players[currentPlayer];
        const handIndex = player.hand.findIndex(handCard => handCard.id === card.id || handCard.number === card.number || handCard.name === card.name);
        if (handIndex === -1) {
          return { success: false, message: '手札にカードが見つかりません' };
        }
        if (!battleEngine.handManager) {
          return { success: false, message: '装備システムが利用できません' };
        }
        setTimeout(() => {
          try {
            if (battleEngine?.handManager) {
              battleEngine.handManager.showSupportCardEquipmentDialog(player.hand[handIndex], handIndex);
            }
          } catch (e) {
            console.warn('だいふく 装備モード開始エラー:', e);
          }
        }, 0);
        return { success: true, message: '装備対象を選択してください' };
      }
    }
  }
};

// グローバルに登録
if (typeof window !== 'undefined') {
  window.cardEffects = window.cardEffects || {};
  window.cardEffects['hBP04-101'] = cardEffect_hBP04_101;
  window.cardEffects['hBP04-101_U'] = cardEffect_hBP04_101; // フルIDでも登録
  console.log(`📝 カード効果登録: だいふく (hBP04-101)`);
}

// Node.js環境でのエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = cardEffect_hBP04_101;
}
