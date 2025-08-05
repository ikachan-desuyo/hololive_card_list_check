/**
 * テスト用カード効果登録
 * バトルシミュレーター起動時に自動で読み込まれます
 */

// カード効果のグローバルストレージを初期化
if (typeof window !== 'undefined') {
  if (!window.cardEffects) {
    window.cardEffects = {};
  }
}

// テスト用の手動発動効果カード
const TestManualEffectCard = {
  cardId: 'test_manual_effect',
  name: 'テスト手動効果カード',
  type: 'support',
  triggers: [{ type: 'manual_trigger', timing: 'manual_trigger' }],
  
  canActivate: (card, context, battleEngine) => {
    const currentPhase = battleEngine.gameState.currentPhase;
    return currentPhase === 3; // メインフェーズのみ
  },
  
  execute: async (card, context, battleEngine) => {
    const utils = battleEngine.cardEffectTriggerSystem.utils;
    const currentPlayer = battleEngine.gameState.currentPlayer;
    
    try {
      // 1枚ドロー
      const result = utils.drawCards(currentPlayer, 1);
      utils.updateDisplay();
      
      return {
        success: true,
        message: `${result.cards.length}枚ドローしました（テスト効果）`
      };
    } catch (error) {
      return {
        success: false,
        reason: 'エラーが発生しました',
        error
      };
    }
  }
};

// カードビルダーを使用したテストカード
const TestBuilderCard = new (window.CardEffectBuilder || class {
  constructor() { this.cardData = {}; }
  addCondition() { return this; }
  addEffect() { return this; }
  build() { return this.cardData; }
})('test_builder_card', 'テストビルダーカード')
  .addCondition('phase', { phase: 3 })
  .addEffect('draw', { count: 2 })
  .build();

// 常在効果テストカード
const TestPassiveCard = {
  cardId: 'test_passive_effect',
  name: 'テスト常在効果カード',
  type: 'holomen',
  triggers: [{ type: 'while_present', timing: 'while_present' }],
  
  execute: async (card, context, battleEngine) => {
    // 常在効果の処理（ステージにいる間継続）
    return {
      success: true,
      message: '常在効果が発動中です'
    };
  }
};

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
  window.cardEffects['test_manual_effect'] = TestManualEffectCard;
  if (TestBuilderCard.cardId) {
    window.cardEffects[TestBuilderCard.cardId] = TestBuilderCard;
  }
  window.cardEffects['test_passive_effect'] = TestPassiveCard;
  window.cardEffects['hBP04-089_U'] = TwoToneColorPC;
  
}

// Node.js環境でのエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TestManualEffectCard,
    TestBuilderCard,
    TestPassiveCard,
    TwoToneColorPC
  };
}
