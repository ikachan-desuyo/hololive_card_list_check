/**
 * カード効果の登録・管理システム
 * 全てのカード効果をここで一元管理
 */

class EffectRegistry {
  constructor() {
    this.effects = new Map();
    this.effectTypes = {
      SUPPORT: 'support',      // サポート効果
      ABILITY: 'ability',      // アビリティ
      BLOOM: 'bloom',          // ブルーム効果
      COLLAB: 'collab',        // コラボ効果
      ACTIVATION: 'activation', // 起動効果
      PASSIVE: 'passive'       // 常在効果
    };
  }

  /**
   * 効果を登録
   * @param {string} cardId - カードID
   * @param {Object} effectConfig - 効果設定
   */
  register(cardId, effectConfig) {
    this.effects.set(cardId, {
      cardId,
      ...effectConfig,
      registeredAt: new Date()
    });
  }

  /**
   * 効果を取得
   * @param {string} cardId - カードID
   */
  get(cardId) {
    return this.effects.get(cardId);
  }

  /**
   * 全ての効果を取得
   */
  getAll() {
    return Array.from(this.effects.values());
  }

  /**
   * タイプ別の効果を取得
   * @param {string} effectType - 効果タイプ
   */
  getByType(effectType) {
    return this.getAll().filter(effect => effect.type === effectType);
  }

  /**
   * 効果が登録されているかチェック
   * @param {string} cardId - カードID
   */
  has(cardId) {
    return this.effects.has(cardId);
  }
}

// 標準的な効果テンプレート
const EffectTemplates = {
  /**
   * サポートカード効果のテンプレート
   */
  supportCard: {
    type: 'support',
    canActivate: (card, context, battleEngine) => {
      // 基本的な発動条件チェック
      const currentPlayer = battleEngine.gameState.currentPlayer;
      const phase = battleEngine.stateManager.state.turn.currentPhase;
      
      // メインフェーズでのみ使用可能
      if (phase !== 3) {
        return false;
      }

      // LIMITED制限チェック
      if (card.card_type?.includes('LIMITED')) {
        // TODO: ターン中の使用回数制限チェック
      }

      return true;
    },
    execute: (card, context, battleEngine) => {
      // 個別カードで実装される
      throw new Error('execute メソッドは個別カードで実装してください');
    }
  },

  /**
   * ホロメンアビリティのテンプレート
   */
  holomenAbility: {
    type: 'ability',
    canActivate: (card, context, battleEngine) => {
      // アビリティの基本条件チェック
      return true; // 個別カードで詳細実装
    },
    execute: (card, context, battleEngine) => {
      throw new Error('execute メソッドは個別カードで実装してください');
    }
  },

  /**
   * ブルーム効果のテンプレート
   */
  bloomEffect: {
    type: 'bloom',
    canActivate: (card, context, battleEngine) => {
      // ブルーム時のみ発動
      return context.isBloom === true;
    },
    execute: (card, context, battleEngine) => {
      throw new Error('execute メソッドは個別カードで実装してください');
    }
  }
};

// グローバルに使用できるようにエクスポート
if (typeof window !== 'undefined') {
  window.EffectRegistry = EffectRegistry;
  window.EffectTemplates = EffectTemplates;
}
