/**
 * カード効果ビルダー - テンプレートと共通処理の組み合わせ
 * 簡単にカード効果を作成するためのヘルパークラス
 */

class CardEffectBuilder {
  constructor(cardId, name, type = 'support') {
    this.cardData = {
      cardId,
      name,
      type,
      triggers: [],
      conditions: [],
      effects: []
    };
  }

  // 発動条件を追加
  addCondition(conditionType, params = {}) {
    this.cardData.conditions.push({ type: conditionType, params });
    return this;
  }

  // 効果を追加
  addEffect(effectType, params = {}) {
    this.cardData.effects.push({ type: effectType, params });
    return this;
  }

  // トリガーを追加
  addTrigger(triggerType, timing = 'manual') {
    this.cardData.triggers.push({ type: triggerType, timing });
    return this;
  }

  // カード効果オブジェクトを生成
  build() {
    const { cardId, name, type, conditions, effects, triggers } = this.cardData;

    return {
      cardId,
      name,
      type,
      triggers,

      // 条件チェック関数を自動生成
      canActivate: (card, context, battleEngine) => {
        const utils = battleEngine.cardEffectTriggerSystem?.utils;
        if (!utils) return false;

        const currentPlayer = battleEngine.gameState.currentPlayer;

        // 全ての条件をチェック
        return conditions.every(condition => {
          switch (condition.type) {
            case 'phase':
              return battleEngine.gameState.currentPhase === condition.params.phase;
            
            case 'handSize':
              const player = battleEngine.players[currentPlayer];
              const handSize = player.hand.length;
              if (condition.params.min !== undefined && handSize < condition.params.min) return false;
              if (condition.params.max !== undefined && handSize > condition.params.max) return false;
              return true;
            
            case 'stageColors':
              return utils.checkConditions(currentPlayer, {
                minColors: condition.params.minColors,
                maxColors: condition.params.maxColors
              });
            
            case 'custom':
              return condition.params.checkFunction(card, context, battleEngine);
            
            default:
              return true;
          }
        });
      },

      // 効果実行関数を自動生成
      execute: async (card, context, battleEngine) => {
        const utils = battleEngine.cardEffectTriggerSystem.utils;
        const currentPlayer = battleEngine.gameState.currentPlayer;
        let results = [];

        try {
          // 全ての効果を順番に実行
          for (const effect of effects) {
            let result;

            switch (effect.type) {
              case 'draw':
                result = utils.drawCards(currentPlayer, effect.params.count || 1);
                if (result.success) {
                  results.push(`${result.cards.length}枚ドローしました`);
                }
                break;

              case 'damage':
                const target = effect.params.target === 'opponent' ? 
                  (currentPlayer === 1 ? 2 : 1) : currentPlayer;
                result = utils.dealDamage(target, effect.params.amount || 1, {
                  source: card,
                  type: 'effect'
                });
                if (result.success) {
                  results.push(`${result.damage}ダメージを与えました`);
                }
                break;

              case 'search':
                result = await utils.selectCardsFromDeck(currentPlayer, {
                  count: effect.params.count || 1,
                  types: effect.params.types || [],
                  colors: effect.params.colors || [],
                  bloomLevel: effect.params.bloomLevel,
                  description: effect.params.description || 'カードを選択してください',
                  allowLess: effect.params.allowLess !== false
                });
                
                if (result.success && result.cards.length > 0) {
                  const addResult = utils.addCardsToHand(currentPlayer, result.cards, true);
                  results.push(`${addResult.cards.map(c => c.name).join('、')}を手札に加えました`);
                }
                break;

              case 'shuffle':
                result = utils.shuffleDeck(currentPlayer);
                if (result.success) {
                  results.push('デッキをシャッフルしました');
                }
                break;

              case 'archive':
                result = await utils.selectCardsFromDeck(currentPlayer, {
                  count: effect.params.count || 1,
                  types: effect.params.types || [],
                  description: effect.params.description || 'アーカイブするカードを選択してください'
                });
                
                if (result.success && result.cards.length > 0) {
                  const archiveResult = utils.archiveCards(currentPlayer, result.cards);
                  results.push(`${archiveResult.cards.map(c => c.name).join('、')}をアーカイブに送りました`);
                }
                break;

              case 'custom':
                result = await effect.params.executeFunction(card, context, battleEngine, utils);
                if (result && result.message) {
                  results.push(result.message);
                }
                break;

              default:
            }
          }

          // UI更新
          utils.updateDisplay();

          return {
            success: true,
            message: results.join('、'),
            results
          };

        } catch (error) {
          return { success: false, reason: 'エラーが発生しました', error };
        }
      }
    };
  }
}

// === ビルダーを使用したカード実装例 ===

// シンプルなドローカード
const SimpleDrawCard = new CardEffectBuilder('simple_draw', 'シンプルドロー')
  .addCondition('phase', { phase: 3 }) // メインフェーズのみ
  .addEffect('draw', { count: 2 })
  .build();

// 条件付きサーチカード
const ConditionalSearchCard = new CardEffectBuilder('conditional_search', '条件付きサーチ')
  .addCondition('phase', { phase: 3 })
  .addCondition('stageColors', { minColors: 2 })
  .addEffect('search', {
    count: 1,
    types: ['ホロメン'],
    bloomLevel: '1st',
    description: '1stホロメンを選択してください'
  })
  .build();

// 複合効果カード
const ComboEffectCard = new CardEffectBuilder('combo_effect', '複合効果')
  .addCondition('handSize', { max: 5 })
  .addEffect('draw', { count: 1 })
  .addEffect('damage', { target: 'opponent', amount: 1 })
  .addEffect('shuffle')
  .build();

// カスタム効果カード
const CustomEffectCard = new CardEffectBuilder('custom_effect', 'カスタム効果')
  .addCondition('custom', {
    checkFunction: (card, context, battleEngine) => {
      // カスタム条件：ステージに特定の色のホロメンがいる
      const utils = battleEngine.cardEffectTriggerSystem?.utils;
      const currentPlayer = battleEngine.gameState.currentPlayer;
      const stageHolomens = utils.getStageHolomens(currentPlayer);
      return stageHolomens.some(h => h.card.card_color === '青');
    }
  })
  .addEffect('custom', {
    executeFunction: async (card, context, battleEngine, utils) => {
      // カスタム効果：特定の条件下でのみ実行される複雑な処理
      const currentPlayer = battleEngine.gameState.currentPlayer;
      const player = battleEngine.players[currentPlayer];
      
      // 手札の青いカードを全てドロー効果に変換
      const blueCards = player.hand.filter(c => c.card_color === '青');
      const drawCount = blueCards.length;
      
      if (drawCount > 0) {
        const drawResult = utils.drawCards(currentPlayer, drawCount);
        return {
          success: true,
          message: `青いカード${drawCount}枚分のドロー効果で${drawResult.cards.length}枚ドローしました`
        };
      }
      
      return { success: false, message: '青いカードがありません' };
    }
  })
  .build();

// グローバル登録
if (typeof window !== 'undefined') {
  if (!window.cardEffects) window.cardEffects = {};
  
  window.cardEffects['simple_draw'] = SimpleDrawCard;
  window.cardEffects['conditional_search'] = ConditionalSearchCard;
  window.cardEffects['combo_effect'] = ComboEffectCard;
  window.cardEffects['custom_effect'] = CustomEffectCard;
  
  // ビルダークラスも公開
  window.CardEffectBuilder = CardEffectBuilder;
}

// Node.js用のエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CardEffectBuilder };
}
