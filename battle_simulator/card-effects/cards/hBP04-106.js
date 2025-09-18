/**
 * hBP04-106 - 雪民 (ファン装備カード)
 * サポート・ファン - 雪花ラミィ専用装備
 */

// カード効果の定義
const cardEffect_hBP04_106 = {
  cardId: 'hBP04-106',
  name: '雪民',
  cardType: 'サポート・ファン',
  
  effects: {
    // 装備効果（ギフト効果）
    equipmentEffect: {
      type: 'equipment',
      name: 'サポート効果',
      description: 'このファンが付いているホロメンが、相手のセンターホロメンに与える特殊ダメージ+10。このファンは、自分の〈雪花ラミィ〉だけに付けられ、1人につき何枚でも付けられる。',
      timing: 'passive',
      condition: function(card, gameState, battleEngine) {
        // 雪花ラミィに装備されている時のみ効果発動
        return card.attachedTo && card.attachedTo.name && card.attachedTo.name.includes('雪花ラミィ');
      },
      effect: function(card, gameState, battleEngine) {
        // 装備効果オブジェクトを返す
        return {
          specialDamageBonus: 10,
          targetType: 'opponent_center'
        };
      }
    },
    
    // 手札からの効果発動（装備処理を実行）
    supportEffect: {
      name: '雪民を装備',
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
        console.log('❄️ 雪民の装備処理開始 (装備モード経由 - 遅延)');
        const currentPlayer = battleEngine.gameState?.currentPlayer ?? battleEngine.currentPlayer ?? 0;
        const player = battleEngine.players[currentPlayer];
        const handIndex = player.hand.findIndex(handCard => handCard.id === card.id || handCard.number === card.number || handCard.name === card.name);
        if (handIndex === -1) {
          return { success: false, message: '手札にカードが見つかりません' };
        }
        if (!battleEngine.handManager) {
          return { success: false, message: '装備システムが利用できません' };
        }
        // UI再描画後に装備モードを開始（クリックハンドラーが消されないように微遅延）
        setTimeout(() => {
          try {
            if (battleEngine?.handManager) {
              battleEngine.handManager.showSupportCardEquipmentDialog(player.hand[handIndex], handIndex);
            }
          } catch (e) {
            console.warn('雪民 装備モード開始エラー:', e);
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
  window.cardEffects['hBP04-106'] = cardEffect_hBP04_106;
  window.cardEffects['hBP04-106_C'] = cardEffect_hBP04_106; // フルIDでも登録
  console.log(`📝 カード効果登録: 雪民 (hBP04-106)`);
}

// Node.js環境でのエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = cardEffect_hBP04_106;
}
