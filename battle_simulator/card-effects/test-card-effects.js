/**
 * 実用カード効果登録
 * バトルシミュレーター起動時に自動で読み込まれます
 */

// カード効果のグローバルストレージを初期化
if (typeof window !== 'undefined') {
  if (!window.cardEffects) {
    window.cardEffects = {};
  }
}

// 実際のホロライブカードの例（ツートンカラーパソコン）
const TwoToneColorPC = {
  cardId: 'hBP04-089_U',
  name: 'ツートンカラーパソコン',
  type: 'support',
  triggers: [{ type: 'manual_trigger', timing: 'manual_trigger' }],
  
  canActivate: (card, context, battleEngine) => {
    const utils = battleEngine.cardEffectTriggerSystem?.utils;
    if (!utils) return false;
    
    const currentPlayer = battleEngine.gameState.currentPlayer;
    const currentPhase = battleEngine.gameState.currentPhase;
    
    // メインフェーズ & 2色以上のホロメンがステージにいる
    return currentPhase === 3 && utils.checkConditions(currentPlayer, {
      minColors: 2
    });
  },
  
  execute: async (card, context, battleEngine) => {
    const utils = battleEngine.cardEffectTriggerSystem.utils;
    const currentPlayer = battleEngine.gameState.currentPlayer;
    
    try {
      // ステージから2色のホロメンを参照
      const stageHolomens = utils.getStageHolomens(currentPlayer);
      const colors = stageHolomens
        .map(h => h.card.card_color)
        .filter(color => color && color !== '無' && !color.includes('/'))
        .slice(0, 2);
      
      if (colors.length < 2) {
        return { success: false, reason: '2色以上のホロメンが必要です' };
      }
      
      // デッキから該当色の1stホロメンをサーチ
      const searchResult = await utils.selectCardsFromDeck(currentPlayer, {
        count: 2,
        types: ['ホロメン'],
        colors: colors,
        bloomLevel: '1st',
        description: `${colors.join('と')}の1stホロメンを選択してください`,
        allowLess: true
      });
      
      if (searchResult.success && searchResult.cards.length > 0) {
        const addResult = utils.addCardsToHand(currentPlayer, searchResult.cards, true);
        utils.updateDisplay();
        
        return {
          success: true,
          message: `${addResult.cards.map(c => c.name).join('、')}を手札に加えました`
        };
      }
      
      return { success: false, reason: '条件に合うカードがありませんでした' };
      
    } catch (error) {
      return { success: false, reason: 'エラーが発生しました', error };
    }
  }
};

// カード効果を登録
if (typeof window !== 'undefined') {
  window.cardEffects['hBP04-089_U'] = TwoToneColorPC;
}

// Node.js環境でのエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TwoToneColorPC
  };
}
