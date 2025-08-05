/**
 * Battle Engineとトリガーシステムの統合
 * 既存のBattle Engineにトリガーシステムを組み込む
 */

class BattleEngineTriggerIntegration {
  constructor(battleEngine) {
    this.battleEngine = battleEngine;
    this.triggerSystem = new CardEffectTriggerSystem(battleEngine);
    
    this.integrateTriggers();
    this.battleEngine.cardEffectTriggerSystem = this.triggerSystem;
  }

  /**
   * 既存のBattle Engineメソッドにトリガーを統合
   */
  integrateTriggers() {
    this.integrateCardPlacement();
    this.integrateCardMovement();
    this.integratePhaseChanges();
    this.integrateSupportCardPlay();
    this.integrateManualTriggers();
  }

  /**
   * カード配置時のトリガー統合
   */
  integrateCardPlacement() {
    const originalPlaceCard = this.battleEngine.placeCardFromHand;
    const triggerSystem = this.triggerSystem;

    this.battleEngine.placeCardFromHand = async function(card, handIndex, dropZone) {
      // 元の処理を実行
      const result = originalPlaceCard?.call(this, card, handIndex, dropZone);

      if (result !== false) {
        const playerId = this.gameState.currentPlayer;

        // ステージ配置時のトリガー
        await triggerSystem.fireTrigger('on_stage_enter', {
          playerId,
          card,
          position: dropZone.type,
          fromHand: true
        });

        // ブルーム判定
        if (dropZone.type !== 'support' && this.stateManager) {
          const targetCard = this.getCardAtPosition(dropZone.type, dropZone.index, playerId);
          if (targetCard && this.stateManager.isBloom(card, targetCard)) {
            await triggerSystem.fireTrigger('on_bloom', {
              playerId,
              card,
              targetCard,
              position: dropZone.type,
              isBloom: true
            });
          }
        }
      }

      return result;
    };
  }

  /**
   * カード移動時のトリガー統合
   */
  integrateCardMovement() {
    const triggerSystem = this.triggerSystem;

    // Hand Managerのカード移動処理に統合
    if (this.battleEngine.handManager) {
      const originalSwapCards = this.battleEngine.handManager.swapCardsWithSwap;
      
      this.battleEngine.handManager.swapCardsWithSwap = async function(
        sourceCard, sourcePosition, targetCard, targetPosition, playerId
      ) {
        // 元の処理を実行
        const result = originalSwapCards?.call(this, sourceCard, sourcePosition, targetCard, targetPosition, playerId);

        if (result) {
          // コラボ移動のトリガー
          if (targetPosition === 'collab') {
            await triggerSystem.fireTrigger('on_collab', {
              playerId,
              card: sourceCard,
              sourcePosition,
              targetPosition,
              fromPosition: sourcePosition
            });
          }

          // バトンタッチのトリガー
          if (sourcePosition === 'center' && targetPosition.startsWith('back')) {
            await triggerSystem.fireTrigger('on_baton_touch', {
              playerId,
              card: sourceCard,
              sourcePosition,
              targetPosition
            });
          }
        }

        return result;
      };
    }
  }

  /**
   * フェーズ変更時のトリガー統合
   */
  integratePhaseChanges() {
    const triggerSystem = this.triggerSystem;

    if (this.battleEngine.stateManager) {
      const originalUpdateState = this.battleEngine.stateManager.updateState;

      this.battleEngine.stateManager.updateState = async function(action, payload) {
        const result = originalUpdateState.call(this, action, payload);

        // フェーズ変更の検知
        if (action === 'CHANGE_PHASE') {
          const currentPlayer = this.state.turn.currentPlayer;
          
          switch (payload.phase) {
            case 1: // リセットステップ
              await triggerSystem.fireTrigger('on_reset_step', {
                playerId: currentPlayer,
                phase: payload.phase
              });
              break;
            case 3: // メインステップ
              await triggerSystem.fireTrigger('on_main_step', {
                playerId: currentPlayer,
                phase: payload.phase
              });
              break;
            case 4: // パフォーマンスステップ
              await triggerSystem.fireTrigger('on_performance_step', {
                playerId: currentPlayer,
                phase: payload.phase
              });
              break;
          }
        }

        // ターン変更の検知
        if (action === 'CHANGE_TURN') {
          await triggerSystem.fireTrigger('on_turn_start', {
            playerId: payload.player,
            turn: payload.turn
          });
          
          // 前のプレイヤーのターン終了
          const previousPlayer = payload.player === 1 ? 2 : 1;
          await triggerSystem.fireTrigger('on_turn_end', {
            playerId: previousPlayer,
            turn: payload.turn - 1
          });
        }

        return result;
      };
    }
  }

  /**
   * サポートカード使用時のトリガー統合
   */
  integrateSupportCardPlay() {
    const triggerSystem = this.triggerSystem;
    const originalPlaySupportCard = this.battleEngine.playSupportCard;

    this.battleEngine.playSupportCard = async function(card, handIndex) {
      const playerId = this.gameState.currentPlayer;

      // プレイ前のトリガー
      await triggerSystem.fireTrigger('on_support_play', {
        playerId,
        card,
        handIndex,
        timing: 'before'
      });

      // 元の処理を実行
      let result;
      if (originalPlaySupportCard) {
        result = originalPlaySupportCard.call(this, card, handIndex);
      } else if (this.cardEffectManager) {
        result = await this.cardEffectManager.executeEffect(card, 'execute', {
          source: 'hand',
          handIndex: handIndex
        });
      }

      // プレイ後のトリガー
      if (result && result.success) {
        await triggerSystem.fireTrigger('on_play', {
          playerId,
          card,
          result,
          timing: 'after'
        });
      }

      return result;
    };
  }

  /**
   * 手動トリガーの統合
   */
  integrateManualTriggers() {
    const triggerSystem = this.triggerSystem;

    // 手動で効果を発動させるメソッドを追加
    this.battleEngine.activateCardEffect = async function(cardId, playerId) {
      return await triggerSystem.manualTrigger(cardId, playerId);
    };

    // UIから呼び出せる起動効果メソッドを追加
    this.battleEngine.useActivateEffect = async function(cardElement) {
      const cardId = cardElement.dataset.cardId;
      const playerId = this.gameState.currentPlayer;
      
      // 起動効果が使用可能かチェック
      const card = triggerSystem.findCard(cardId, playerId);
      if (!card) {
        alert('カードが見つかりません');
        return;
      }

      // 発動条件をチェック
      const canActivate = await triggerSystem.fireTrigger('activate', {
        cardId,
        playerId,
        isCheck: true // チェックのみ
      });

      if (canActivate.length === 0) {
        alert('現在この効果は使用できません');
        return;
      }

      // 効果を実行
      const result = await triggerSystem.manualTrigger(cardId, playerId);
      
      if (result.length > 0 && result[0].success) {
        alert(result[0].message || '効果を発動しました');
        this.updateDisplay();
      } else {
        alert(result[0]?.reason || '効果の発動に失敗しました');
      }
    };
  }

  /**
   * 指定位置のカードを取得
   */
  getCardAtPosition(position, index, playerId) {
    const player = this.battleEngine.players[playerId];
    if (!player) return null;

    if (position === 'center') return player.center;
    if (position === 'collab') return player.collab;
    if (position === 'back') return player[`back${index + 1}`];
    
    return null;
  }

  /**
   * 条件効果のチェック（定期実行）
   */
  checkConditionalEffects() {
    // 定期的に条件効果をチェック
    for (const [cardId, config] of this.triggerSystem.cardTriggers) {
      if (config.triggers.includes('condition_met') && config.checkCondition) {
        for (let playerId = 1; playerId <= 2; playerId++) {
          if (config.checkCondition(this.battleEngine, playerId)) {
            this.triggerSystem.fireTrigger('condition_met', {
              cardId,
              playerId,
              conditionMet: true
            });
          }
        }
      }
    }
  }
}

// グローバルエクスポート
if (typeof window !== 'undefined') {
  window.BattleEngineTriggerIntegration = BattleEngineTriggerIntegration;
}
