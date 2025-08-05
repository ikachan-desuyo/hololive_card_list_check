/**
 * カード効果トリガーシステム
 * 様々な発動タイミングを管理する
 */

class CardEffectTriggerSystem {
  constructor(battleEngine) {
    this.battleEngine = battleEngine;
    this.triggerListeners = new Map(); // トリガータイプ → リスナー配列
    this.cardTriggers = new Map();     // カードID → トリガー情報
    this.activeEffects = new Map();    // アクティブな効果
    
    // ユーティリティクラスのインスタンスを作成
    this.utils = new CardEffectUtils(battleEngine);
    
    this.initializeTriggerTypes();
  }

  /**
   * トリガータイプの定義
   */
  initializeTriggerTypes() {
    this.triggerTypes = {
      // プレイ時
      ON_PLAY: 'on_play',                    // カードをプレイした時
      ON_SUPPORT_PLAY: 'on_support_play',    // サポートカードをプレイした時
      
      // 配置・移動時
      ON_STAGE_ENTER: 'on_stage_enter',      // ステージに出た時
      ON_COLLAB: 'on_collab',                // コラボした時
      ON_BLOOM: 'on_bloom',                  // ブルームした時
      ON_BATON_TOUCH: 'on_baton_touch',      // バトンタッチした時
      
      // フェーズ・ターン時
      ON_TURN_START: 'on_turn_start',        // ターン開始時
      ON_TURN_END: 'on_turn_end',            // ターン終了時
      ON_MAIN_STEP: 'on_main_step',          // メインステップ開始時
      ON_PERFORMANCE_STEP: 'on_performance_step', // パフォーマンスステップ開始時
      ON_RESET_STEP: 'on_reset_step',        // リセットステップ時
      
      // 任意タイミング
      ACTIVATE: 'activate',                  // 好きな時に使える起動効果
      MANUAL_TRIGGER: 'manual_trigger',      // プレイヤーが任意で発動
      
      // リアクション系
      ON_DAMAGE_RECEIVE: 'on_damage_receive', // ダメージを受けた時
      ON_HOLOMEM_LEAVE: 'on_holomem_leave',   // ホロメンがステージを離れた時
      ON_YELL_ATTACH: 'on_yell_attach',       // エールが付いた時
      
      // 条件系
      CONDITION_MET: 'condition_met',         // 特定条件を満たした時
      WHILE_PRESENT: 'while_present'          // ステージにいる間の常在効果
    };
  }

  /**
   * カードにトリガーを登録
   * @param {string} cardId - カードID
   * @param {Object} triggerConfig - トリガー設定
   */
  registerCardTrigger(cardId, triggerConfig) {
    this.cardTriggers.set(cardId, {
      cardId,
      ...triggerConfig
    });

    // 各トリガータイプにリスナーとして登録
    for (const triggerType of triggerConfig.triggers || []) {
      if (!this.triggerListeners.has(triggerType)) {
        this.triggerListeners.set(triggerType, []);
      }
      this.triggerListeners.get(triggerType).push({
        cardId,
        config: triggerConfig
      });
    }
  }

  /**
   * トリガーイベントを発火
   * @param {string} triggerType - トリガータイプ
   * @param {Object} eventData - イベントデータ
   */
  async fireTrigger(triggerType, eventData = {}) {

    const listeners = this.triggerListeners.get(triggerType) || [];
    const results = [];

    for (const listener of listeners) {
      try {
        // カードがステージにあるかチェック（必要な場合）
        if (listener.config.requireOnStage) {
          const card = this.findCardOnStage(listener.cardId, eventData.playerId);
          if (!card) continue;
        }

        // 発動条件をチェック
        if (listener.config.condition) {
          const canActivate = await listener.config.condition(eventData, this.battleEngine);
          if (!canActivate) continue;
        }

        // 効果を実行
        const result = await this.executeCardEffect(
          listener.cardId, 
          triggerType, 
          eventData
        );
        
        results.push(result);
      } catch (error) {
      }
    }

    return results;
  }

  /**
   * カード効果の実行
   * @param {string} cardId - カードID
   * @param {string} triggerType - トリガータイプ
   * @param {Object} eventData - イベントデータ
   */
  async executeCardEffect(cardId, triggerType, eventData) {
    const card = this.findCard(cardId, eventData.playerId);
    if (!card) {
      return { success: false, reason: 'カードが見つかりません' };
    }

    // カード効果マネージャーに委譲
    if (this.battleEngine.cardEffectManager) {
      return await this.battleEngine.cardEffectManager.executeEffect(
        card, 
        triggerType, 
        eventData
      );
    }

    return { success: false, reason: '効果システムが初期化されていません' };
  }

  /**
   * ステージ上のカードを検索
   * @param {string} cardId - カードID
   * @param {number} playerId - プレイヤーID
   */
  findCardOnStage(cardId, playerId) {
    const player = this.battleEngine.players[playerId];
    if (!player) return null;

    // ステージの各エリアを検索
    const areas = ['center', 'collab', 'back1', 'back2', 'back3', 'back4', 'back5'];
    
    for (const area of areas) {
      const card = player[area];
      if (card && card.id === cardId) {
        return card;
      }
    }

    return null;
  }

  /**
   * プレイヤーの全エリアからカードを検索
   * @param {string} cardId - カードID
   * @param {number} playerId - プレイヤーID
   */
  findCard(cardId, playerId) {
    const player = this.battleEngine.players[playerId];
    if (!player) return null;

    // 全エリアを検索
    const areas = ['center', 'collab', 'back1', 'back2', 'back3', 'back4', 'back5', 'hand', 'archive'];
    
    for (const area of areas) {
      if (Array.isArray(player[area])) {
        // 配列の場合（hand, archive等）
        const card = player[area].find(c => c && c.id === cardId);
        if (card) return card;
      } else if (player[area] && player[area].id === cardId) {
        // 単一カードの場合
        return player[area];
      }
    }

    return null;
  }

  /**
   * Battle Engineイベントとの統合
   */
  integrateWithBattleEngine() {
    const originalThis = this;

    // コラボ移動時のトリガー
    const originalSwapCards = this.battleEngine.swapCards;
    this.battleEngine.swapCards = async function(sourcePosition, targetPosition, playerId) {
      const result = originalSwapCards?.call(this, sourcePosition, targetPosition, playerId);
      
      // コラボトリガーをチェック
      if (targetPosition === 'collab') {
        await originalThis.fireTrigger(originalThis.triggerTypes.ON_COLLAB, {
          playerId,
          sourcePosition,
          targetPosition,
          card: this.players[playerId][targetPosition]
        });
      }

      return result;
    };

    // ブルーム時のトリガー
    const originalPlaceCard = this.battleEngine.placeCard;
    this.battleEngine.placeCard = async function(card, position, playerId, isBloom = false) {
      const result = originalPlaceCard?.call(this, card, position, playerId, isBloom);
      
      if (isBloom) {
        await originalThis.fireTrigger(originalThis.triggerTypes.ON_BLOOM, {
          playerId,
          position,
          card,
          isBloom: true
        });
      }

      return result;
    };

    // フェーズ変更時のトリガー
    if (this.battleEngine.stateManager) {
      const originalUpdateState = this.battleEngine.stateManager.updateState;
      this.battleEngine.stateManager.updateState = async function(action, payload) {
        const result = originalUpdateState.call(this, action, payload);

        // フェーズ変更を検知
        if (action === 'CHANGE_PHASE') {
          const phase = payload.phase;
          let triggerType = null;

          switch (phase) {
            case 3: // メインステップ
              triggerType = originalThis.triggerTypes.ON_MAIN_STEP;
              break;
            case 4: // パフォーマンスステップ
              triggerType = originalThis.triggerTypes.ON_PERFORMANCE_STEP;
              break;
            case 1: // リセットステップ
              triggerType = originalThis.triggerTypes.ON_RESET_STEP;
              break;
          }

          if (triggerType) {
            await originalThis.fireTrigger(triggerType, {
              phase,
              playerId: payload.playerId || this.state.turn.currentPlayer
            });
          }
        }

        return result;
      };
    }
  }

  /**
   * 手動トリガー（プレイヤーが任意で発動）
   * @param {string} cardId - カードID
   * @param {number} playerId - プレイヤーID
   */
  async manualTrigger(cardId, playerId) {
    return await this.fireTrigger(this.triggerTypes.MANUAL_TRIGGER, {
      cardId,
      playerId,
      isManual: true
    });
  }

  /**
   * 常在効果の管理
   * @param {string} cardId - カードID
   * @param {number} playerId - プレイヤーID
   * @param {boolean} enable - 有効/無効
   */
  togglePassiveEffect(cardId, playerId, enable) {
    const key = `${cardId}_${playerId}`;
    
    if (enable) {
      this.activeEffects.set(key, {
        cardId,
        playerId,
        type: this.triggerTypes.WHILE_PRESENT,
        startedAt: new Date()
      });
    } else {
      this.activeEffects.delete(key);
    }
  }

  /**
   * デバッグ情報の取得
   */
  getDebugInfo() {
    return {
      registeredTriggers: this.cardTriggers.size,
      activeListeners: Array.from(this.triggerListeners.entries())
        .map(([type, listeners]) => ({ type, count: listeners.length })),
      activeEffects: this.activeEffects.size
    };
  }
}

// グローバルエクスポート
if (typeof window !== 'undefined') {
  window.CardEffectTriggerSystem = CardEffectTriggerSystem;
}
