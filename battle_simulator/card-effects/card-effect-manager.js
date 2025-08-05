/**
 * カード効果管理システム
 * 各カードの個別効果を統一的に管理・実行する
 */

class CardEffectManager {
  constructor(battleEngine) {
    this.battleEngine = battleEngine;
    this.effectRegistry = new Map(); // カードID → 効果関数のマップ
    this.activeEffects = new Map();  // 現在アクティブな効果
    this.temporaryEffects = [];      // 一時的な効果（ターン終了時等で削除）
  }

  /**
   * カード効果を登録
   * @param {string} cardId - カードID (例: "hBP04-089_U")
   * @param {Object} effectConfig - 効果設定
   */
  registerCardEffect(cardId, effectConfig) {
    this.effectRegistry.set(cardId, effectConfig);
  }

  /**
   * カード効果を実行
   * @param {Object} card - カードオブジェクト
   * @param {string} triggerType - 発動タイプ (play, activate, bloom, etc.)
   * @param {Object} context - 実行コンテキスト
   */
  executeEffect(card, triggerType, context = {}) {
    const effectConfig = this.effectRegistry.get(card.id);
    if (!effectConfig) {
      return { success: false, reason: '効果未実装' };
    }

    const effectFunction = effectConfig[triggerType];
    if (!effectFunction) {
      return { success: false, reason: '該当効果なし' };
    }

    try {
      // 効果実行前のチェック
      if (effectConfig.canActivate && !effectConfig.canActivate(card, context, this.battleEngine)) {
        return { success: false, reason: '発動条件を満たしていません' };
      }

      // 効果実行
      const result = effectFunction(card, context, this.battleEngine);
      
      // 結果のログ出力
      
      return result;
    } catch (error) {
      return { success: false, reason: 'エラーが発生しました', error };
    }
  }

  /**
   * 条件チェック (使用可能かどうか)
   * @param {Object} card - カードオブジェクト
   * @param {string} triggerType - 発動タイプ
   * @param {Object} context - チェックコンテキスト
   */
  canActivateEffect(card, triggerType, context = {}) {
    const effectConfig = this.effectRegistry.get(card.id);
    if (!effectConfig || !effectConfig[triggerType]) {
      return false;
    }

    if (effectConfig.canActivate) {
      return effectConfig.canActivate(card, context, this.battleEngine);
    }

    return true; // デフォルトでは発動可能
  }

  /**
   * 一時効果を追加 (ターン終了時等で削除される効果)
   * @param {Object} effect - 効果オブジェクト
   */
  addTemporaryEffect(effect) {
    this.temporaryEffects.push(effect);
  }

  /**
   * 一時効果をクリア
   * @param {string} timing - クリアタイミング ('turn_end', 'phase_end', etc.)
   */
  clearTemporaryEffects(timing) {
    this.temporaryEffects = this.temporaryEffects.filter(effect => 
      effect.clearTiming !== timing
    );
  }
}

// グローバルに使用できるようにエクスポート
if (typeof window !== 'undefined') {
  window.CardEffectManager = CardEffectManager;
}
