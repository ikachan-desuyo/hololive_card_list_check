/**
 * カードインタラクション管理システム
 * カードクリック時の動作を統一管理
 */

class CardInteractionManager {
  constructor(battleEngine) {
    this.battleEngine = battleEngine;
    this.currentActionMarks = null;
    this.initializeCardInteractions();
  }

  /**
   * LIMITEDカード判定（効果メタ + card_type + 名前）
   */
  isLimitedCard(card) {
    if (!card) return false;
    const typeMatch = card.card_type?.includes('LIMITED');
    const nameMatch = (card.name && /LIMITED/i.test(card.name));
    // 効果定義側の limited フラグ
    let effectLimited = false;
    if (window.cardEffects && window.cardEffects[card.id]?.effects) {
      effectLimited = Object.values(window.cardEffects[card.id].effects).some(e => e.limited === true);
    }
    return !!(typeMatch || nameMatch || effectLimited);
  }

  /**
   * カードインタラクションの初期化
   */
  initializeCardInteractions() {
    // battle engineにshowCardModal関数を追加
    this.battleEngine.showCardModal = (card, position = null) => {
      this.showCardInfo(card, position);
    };
  }

    /**
   * カード詳細情報を表示
   * @param {Object} card - カードオブジェクト
   * @param {string} position - カードの位置（hand, center, collab等）
   */
  showCardInfo(card, position = null) {
    // カード詳細モーダルを表示
    if (window.showCardDetailModal) {
      window.showCardDetailModal(card);
    } else {
      console.log('📋 [CardInfo] カード詳細:', card);
    }
    
    // カード上にアクションマークを表示
    this.showActionMarksOnCard(card, position);
  }

  /**
   * カード上にアクションマークを表示
   * @param {Object} card - カードオブジェクト
   * @param {string} position - カードの位置
   */
  showActionMarksOnCard(card, position) {
    // 既存のアクションマークを削除
    this.clearActionMarks();

    const cardElement = this.findCardElement(card.id);
    if (!cardElement) return;

    const availableActions = this.getAvailableActions(card, position);
    // 効果発動のみを対象とし、発動可能な場合のみ表示
    const actionableActions = availableActions.filter(action => 
      action.type === 'effect' && !action.disabled
    );

    if (actionableActions.length === 0) return;

    // アクションマークコンテナを作成
    const actionContainer = document.createElement('div');
    actionContainer.className = 'card-action-marks';
    actionContainer.style.cssText = `
      position: absolute;
      top: 5px;
      right: 5px;
      display: flex;
      gap: 3px;
      z-index: 10;
      pointer-events: none;
    `;

    actionableActions.forEach(action => {
      const actionMark = document.createElement('div');
      actionMark.className = `action-mark action-${action.type}`;
      actionMark.style.cssText = `
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        cursor: pointer;
        pointer-events: auto;
        transition: transform 0.2s;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      `;

      // アクションタイプに応じたアイコン
      switch (action.type) {
        case 'effect':
          actionMark.textContent = '💥';
          actionMark.title = '効果を発動';
          break;
        case 'bloom':
          actionMark.textContent = '🌸';
          actionMark.title = 'ブルームする';
          break;
        case 'play':
          actionMark.textContent = '▶️';
          actionMark.title = 'カードをプレイ';
          break;
        case 'move':
          actionMark.textContent = '🔄';
          actionMark.title = 'カードを移動';
          break;
        case 'baton':
          actionMark.textContent = '🏃';
          actionMark.title = 'バトンタッチ';
          break;
        default:
          actionMark.textContent = '⚡';
          break;
      }

      // ホバー効果
      actionMark.addEventListener('mouseenter', () => {
        actionMark.style.transform = 'scale(1.2)';
      });

      actionMark.addEventListener('mouseleave', () => {
        actionMark.style.transform = 'scale(1)';
      });

      // クリックイベント
      actionMark.addEventListener('click', (e) => {
        e.stopPropagation();
        this.executeAction(action.id, card.id, position);
      });

      actionContainer.appendChild(actionMark);
    });

    // カード要素に相対位置を設定
    if (cardElement.style.position !== 'relative' && cardElement.style.position !== 'absolute') {
      cardElement.style.position = 'relative';
    }

    cardElement.appendChild(actionContainer);
    this.currentActionMarks = actionContainer;
  }

  /**
   * アクションマークをクリア
   */
  clearActionMarks() {
    if (this.currentActionMarks) {
      this.currentActionMarks.remove();
      this.currentActionMarks = null;
    }
    
    // 全てのアクションマークを削除（念のため）
    document.querySelectorAll('.card-action-marks').forEach(mark => {
      mark.remove();
    });
  }

  /**
   * カード要素を検索
   * @param {string} cardId - カードID
   */
  findCardElement(cardId) {
    // data-card-id属性でカード要素を検索
    const elements = document.querySelectorAll(`[data-card-id="${cardId}"]`);
    
    // 複数見つかった場合は最初のものを返す
    // （同じカードが複数枚ある場合を考慮）
    return elements.length > 0 ? elements[0] : null;
  }

  /**
   * アクションを実行（効果発動のみ）
   * @param {string} actionId - アクションID
   * @param {string} cardId - カードID
   * @param {string} position - カードの位置
   */
  async executeAction(actionId, cardId, position) {
    const card = this.findCard(cardId);
    if (!card) {
      return;
    }

    try {
      if (actionId === 'activate_effect') {
        await this.activateCardEffect(card, position);
      }
    } catch (error) {
      this.showMessage('アクションの実行中にエラーが発生しました', 'error');
    }
  }

  /**
   * 利用可能なアクションを取得（効果発動のみに簡素化）
   * @param {Object} card - カードオブジェクト
   * @param {string} position - カードの位置
   */
  getAvailableActions(card, position) {
    const actions = [];
    const currentPlayer = this.battleEngine.gameState.currentPlayer;
    const isPlayerCard = this.isPlayerCard(card, position);

    // 詳細表示（常に利用可能）
    actions.push({
      id: 'view_details',
      label: '詳細を見る',
      type: 'info',
      disabled: false
    });

    // プレイヤーのカードで効果発動可能な場合のみ
    // サポートカード、ギフト効果持ちホロメンカードのみ対象
    if (isPlayerCard && this.hasManualEffect(card)) {
      const canActivate = this.canActivateEffect(card, position);
      
      // 効果発動ボタンを表示する条件を厳密化
      const shouldShowEffectButton = this.shouldShowEffectButton(card, position);
      
      if (canActivate && shouldShowEffectButton) {
        actions.push({
          id: 'activate_effect',
          label: '効果を発動',
          type: 'effect',
          disabled: false
        });
      }
    }

    return actions;
  }

  /**
   * カードの所有者を取得
   * @param {Object} card - カードオブジェクト
   * @param {string} position - カードの位置
   * @returns {number} プレイヤー番号 (0 or 1)
   */
  getCardOwner(card, position) {
    // positionから所有者を判定
    if (position?.includes('player0') || position?.includes('p0')) {
      return 0;
    } else if (position?.includes('player1') || position?.includes('p1')) {
      return 1;
    }
    
    // フィールド上のカードの場合、位置から判定
    const currentPlayer = this.battleEngine.gameState.currentPlayer;
    
    // ステージのカードをチェック（安全なアクセス）
    const player0Stage = (this.battleEngine.players && this.battleEngine.players[0] && this.battleEngine.players[0].stage) || [];
    const player1Stage = (this.battleEngine.players && this.battleEngine.players[1] && this.battleEngine.players[1].stage) || [];
    
    // player0のステージにあるかチェック
    if (player0Stage.some(stageCard => stageCard === card || stageCard.id === card.id)) {
      return 0;
    }
    
    // player1のステージにあるかチェック
    if (player1Stage.some(stageCard => stageCard === card || stageCard.id === card.id)) {
      return 1;
    }
    
    // デフォルトは現在のプレイヤー
    return currentPlayer;
  }

  /**
   * 効果発動ボタンを表示すべきかチェック
   * @param {Object} card - カードオブジェクト
   * @param {string} position - カードの位置
   */
  shouldShowEffectButton(card, position) {
    // 自分のターンでない場合は表示しない
    const currentPlayer = this.battleEngine.gameState.currentPlayer;
    const cardOwner = this.getCardOwner(card, position);
    
    if (cardOwner !== currentPlayer) {
      return false;
    }
    
    const cardType = card.card_type || '';
    
    // サポートカードは自分のターンかつメインフェーズで表示
    if (cardType.includes('サポート')) {
      const currentPhase = this.battleEngine.gameState.currentPhase;
      return currentPhase === 3; // メインフェーズ
    }
    
    // ホロメンカードの場合、手動発動可能な効果のみチェック
    if (cardType.includes('ホロメン')) {
      const cardEffect = window.cardEffects[card.id];
      
      if (!cardEffect || !cardEffect.effects) {
        return false;
      }
      
      // 新形式の効果定義で手動発動可能な効果をチェック
      const automaticTimings = ['on_collab', 'arts', 'on_bloom', 'on_center', 'on_stage'];
      const manualEffects = Object.values(cardEffect.effects).filter(effect => {
        const isAutomatic = automaticTimings.includes(effect.timing) || effect.auto_trigger;
        // Snow flower と うぅ… は強制的に自動効果として扱う
        const isSnowFlowerOrUuu = effect.name === 'Snow flower' || effect.name === 'うぅ…';
        const isManual = !isAutomatic && !isSnowFlowerOrUuu && (effect.timing === 'manual' || effect.timing === 'activate' || effect.timing === 'gift');
        
        return isManual;
      });
      
      // 手動発動可能な効果がある場合のみ表示
      const hasManualEffects = manualEffects.length > 0;
      
      // 旧形式のトリガーシステムとの互換性チェック
      if (!hasManualEffects && cardEffect.triggers) {
        const hasGift = cardEffect.triggers.some(trigger => trigger.timing === 'gift');
        return hasGift;
      }
      
      return hasManualEffects;
    }
    
    // 推しホロメンカードは推しスキルがある場合のみ表示
    if (cardType.includes('推しホロメン')) {
      const cardEffect = window.cardEffects[card.id];
      const hasOshiSkill = cardEffect && cardEffect.effects && cardEffect.effects.oshiSkill;
      return hasOshiSkill;
    }
    
    // その他のカードは表示しない
    return false;
  }

  /**
   * カード効果の手動発動
   */
  async activateCardEffect(card, position) {
    const currentPlayer = this.battleEngine.gameState.currentPlayer;
    
    try {
      // カード効果定義を直接取得
      const cardEffect = window.cardEffects[card.id];
      
      // card.idで見つからない場合は card.number で試行
      let finalCardEffect = cardEffect;
      if (!finalCardEffect && card.number) {
        finalCardEffect = window.cardEffects[card.number];
      }
      
      if (!finalCardEffect || !finalCardEffect.effects) {
        this.showMessage('このカードには効果がありません', 'info');
        return;
      }

      // 手動発動可能な効果を検索（自動効果を除外）
      const automaticTimings = ['on_collab', 'arts', 'on_bloom', 'on_center', 'on_stage'];
      const manualEffects = Object.values(finalCardEffect.effects).filter(effect => {
        const isAutomatic = automaticTimings.includes(effect.timing) || effect.auto_trigger;
        // Snow flower と うぅ… は強制的に自動効果として扱う
        const isSnowFlowerOrUuu = effect.name === 'Snow flower' || effect.name === 'うぅ…';
        const isManual = !isAutomatic && !isSnowFlowerOrUuu && (effect.timing === 'manual' || effect.timing === 'activate' || effect.timing === 'gift');
        return isManual;
      });

      if (manualEffects.length === 0) {
        this.showMessage('手動発動可能な効果がありません', 'info');
        return;
      }

      // 最初の手動効果を発動（複数ある場合は選択UIが必要）
      const effect = manualEffects[0];
      
      // LIMITED制限チェック（効果に limited フラグがなくてもカードタイプがLIMITEDなら適用）
      const isLimitedCard = card.card_type?.includes('LIMITED');
      if ((effect.limited || isLimitedCard) && !this.canUseLimitedEffect(card, position)) {
        return; // 制限により発動不可
      }
      
      // 条件チェック（カード固有の条件のみ）
      if (effect.condition && typeof effect.condition === 'function') {
        try {
          const conditionResult = effect.condition(card, this.battleEngine.gameState, this.battleEngine);
          if (conditionResult === false) {
            this.showMessage('効果の発動条件を満たしていません', 'warning');
            return;
          }
        } catch (conditionError) {
          console.error('🚨 [CardInteraction] 条件チェックエラー:', conditionError);
          this.showMessage('効果の発動条件チェック中にエラーが発生しました', 'error');
          return;
        }
      }

      // 効果を実行（非同期対応）
      const result = await effect.effect(card, this.battleEngine);
      
      if (result && result.success !== false) {
        // LIMITED効果の使用回数をカウント
        if (effect.limited || isLimitedCard) {
          this.recordLimitedEffectUsage();
        }
        
        // 効果使用済みマークを設定
        this.markEffectAsUsed(card, position);
        
        // サポートカードの自動アーカイブ処理
        // 装備可能なサポート（ファン / ツール / マスコット）は装備モードに移行するため即時アーカイブしない
        if (position === 'hand' && card.card_type?.includes('サポート')) {
          const isEquippable = ['ファン','ツール','マスコット'].some(t => card.card_type.includes(t));
          if (!isEquippable) {
            this.moveCardToArchive(card, position);
          } else {
            console.log('🛠 装備可能サポート: 自動アーカイブをスキップ (装備モード経由)');
          }
        }
        
        this.showMessage(result.message || 'カード効果を発動しました', 'success');
        this.clearActionMarks();
        
        // UI更新
        this.battleEngine.updateUI();
      } else {
        // 結果に応じてメッセージタイプを決定
        const messageType = this.determineMessageType(result);
        this.showMessage(result?.message || 'カード効果を発動できませんでした', messageType);
      }
      
    } catch (error) {
      console.error('🚨 [CardInteraction] Card effect activation error:', error);
      this.showMessage('効果の発動中にエラーが発生しました: ' + error.message, 'error');
    }
  }

  /**
   * 特定タイプの効果を直接実行（ブルーム/コラボ用の自動発動パス）
   * @param {Object} card - カード
   * @param {('bloom'|'collab')} effectType - 実行する効果タイプ
   * @param {string} position - カードの位置
   */
  async executeSpecificEffect(card, effectType, position) {
    try {
      const cardEffect = window.cardEffects?.[card.id] || (card.number ? window.cardEffects?.[card.number] : null);
      if (!cardEffect) {
        this.showMessage('このカードには効果がありません', 'info');
        return;
      }

      // 新形式: effects内に { type: 'bloom'|'collab' } を持つ項目がある前提
      let targetEffect = null;
      if (cardEffect.effects) {
        // まずは effects.bloomEffect/collabEffect を優先
        if (effectType === 'bloom' && cardEffect.effects.bloomEffect) {
          targetEffect = cardEffect.effects.bloomEffect;
        } else if (effectType === 'collab' && cardEffect.effects.collabEffect) {
          targetEffect = cardEffect.effects.collabEffect;
        }
        // 見つからなければ type マッチで探す
        if (!targetEffect) {
          targetEffect = Object.values(cardEffect.effects).find(e => e?.type === effectType);
        }
      }

      if (!targetEffect) {
        // 後方互換: トップレベルに {bloomEffect|collabEffect} がある場合
        const legacyKey = effectType === 'bloom' ? 'bloomEffect' : 'collabEffect';
        if (cardEffect[legacyKey]) {
          targetEffect = cardEffect[legacyKey];
        }
      }
      if (!targetEffect) {
        this.showMessage(`${effectType === 'bloom' ? 'ブルーム' : 'コラボ'}効果が見つかりません`, 'info');
        return;
      }

      // 条件チェック（存在すれば）
      if (typeof targetEffect.condition === 'function') {
        try {
          const ok = targetEffect.condition(card, this.battleEngine.gameState, this.battleEngine);
          if (!ok) {
            this.showMessage('効果の発動条件を満たしていません', 'warning');
            return;
          }
        } catch (condErr) {
          console.error('🚨 [CardInteraction] 条件チェックエラー:', condErr);
          this.showMessage('効果の発動条件チェック中にエラーが発生しました', 'error');
          return;
        }
      }

      // 実行
      if (typeof targetEffect.effect === 'function') {
        const result = await targetEffect.effect(card, this.battleEngine);
        if (result && result.success !== false) {
          this.showMessage(result.message || '効果を発動しました', 'success');
          // UI更新
          this.battleEngine.updateUI();
        } else {
          const messageType = this.determineMessageType(result);
          this.showMessage(result?.message || '効果を発動できませんでした', messageType);
        }
      } else {
        console.warn(`[CardInteraction] 指定効果にeffect関数がありません type=${effectType}`);
      }
    } catch (error) {
      console.error('🚨 [CardInteraction] executeSpecificEffect error:', error);
      this.showMessage('効果の発動中にエラーが発生しました: ' + error.message, 'error');
    }
  }

  /**
   * ヘルパーメソッド群
   */
  isPlayerCard(card, position) {
    const currentPlayer = this.battleEngine.gameState.currentPlayer;
    return currentPlayer === 1; // プレイヤー1のカードかどうか
  }

  /**
   * 効果結果に基づいてメッセージタイプを決定
   */
  determineMessageType(result) {
    if (!result || !result.message) {
      return 'error';
    }
    
    const message = result.message.toLowerCase();
    
    // 警告として扱うべきメッセージパターン
    const warningPatterns = [
      'ライフは既に最大',
      'エールは既に最大',
      '既に最大',
      '対象が見つかりません',
      '選択できるカードがありません',
      'カードがありません'
    ];
    
    // 情報として扱うべきメッセージパターン
    const infoPatterns = [
      '効果を使用しました',
      '選択をキャンセル',
      'キャンセル'
    ];
    
    for (const pattern of warningPatterns) {
      if (message.includes(pattern)) {
        return 'warning';
      }
    }
    
    for (const pattern of infoPatterns) {
      if (message.includes(pattern)) {
        return 'info';
      }
    }
    
    return 'error';
  }

  /**
   * 効果使用済みマークを設定
   */
  markEffectAsUsed(card, position) {
    const cardEffect = window.cardEffects[card.id];
    if (!cardEffect) return;

    // 新形式の効果定義の場合
    if (cardEffect.effects) {
      for (const effect of Object.values(cardEffect.effects)) {
        if (effect.timing === 'manual') {
          // ギフト効果の場合
          if (effect.name?.includes('ギフト')) {
            card.giftEffectUsed = true;
            break;
          }
        }
      }
      return;
    }

    // 古い形式のトリガーシステム（後方互換性）
    if (cardEffect.triggers && Array.isArray(cardEffect.triggers)) {
      for (const trigger of cardEffect.triggers) {
        switch (trigger.timing) {
          case 'on_bloom':
            card.bloomEffectUsed = true;
            break;
          case 'on_collab':
            card.collabEffectUsed = true;
            break;
          case 'gift':
            // ギフト効果は1度使用したら使用済みマークを付ける
            card.giftEffectUsed = true;
            break;
          // アーツは未実装
          // 推しホロメンは未実装
        }
      }
    }
  }

  initiateMoveCard(card, position) {
    this.showMessage('移動先をクリックしてください', 'info');
    this.clearActionMarks();
  }

  initiateBloom(card, position) {
    this.showMessage('ブルーム先のカードを選択してください', 'info');
    this.clearActionMarks();
  }

  initiateBatonTouch(card) {
    this.showMessage('バトンタッチ先のホロメンを選択してください', 'info');
    this.clearActionMarks();
  }

  /**
   * ヘルパーメソッド群
   */
  isPlayerCard(card, position) {
    const currentPlayer = this.battleEngine.gameState.currentPlayer;
    return currentPlayer === 1; // プレイヤー1のカードかどうか
  }

  hasManualEffect(card) {
    // カードに手動発動可能な効果があるかチェック
    if (!window.cardEffects || !window.cardEffects[card.id]) {
      return false;
    }
    
    const cardEffect = window.cardEffects[card.id];
    
    // 新形式の効果定義をチェック
    if (cardEffect.effects) {
      const automaticTimings = ['on_collab', 'arts', 'on_bloom', 'on_center', 'on_stage'];
      const manualEffects = Object.values(cardEffect.effects).filter(effect => {
        const isAutomatic = automaticTimings.includes(effect.timing) || effect.auto_trigger;
        // Snow flower と うぅ… は強制的に自動効果として扱う
        const isSnowFlowerOrUuu = effect.name === 'Snow flower' || effect.name === 'うぅ…';
        const isManual = !isAutomatic && !isSnowFlowerOrUuu && (effect.timing === 'manual' || effect.timing === 'activate' || effect.timing === 'gift');
        return isManual;
      });
      return manualEffects.length > 0;
    }
    
    // 古い形式のトリガーシステム（後方互換性）
    if (cardEffect.triggers && cardEffect.triggers.some(t => t.timing === 'manual_trigger' || t.timing === 'gift')) {
      return true;
    }
    
    return false;
  }

  /**
   * 効果発動可能かチェック（正しいタイミング判定）
   * @param {Object} card - カードオブジェクト
   * @param {string} position - カードの位置
   */
  canActivateEffect(card, position) {
    const currentPhase = this.battleEngine.gameState.currentPhase;
    const gameState = this.battleEngine.gameState;
    
    if (!this.hasManualEffect(card)) {
      return false;
    }

    const cardEffect = window.cardEffects[card.id];
    if (!cardEffect) return false;

    // 新形式の効果定義（サポートカード対応）
    if (cardEffect.effects) {
      const automaticTimings = ['on_collab', 'arts', 'on_bloom', 'on_center', 'on_stage'];
      for (const effect of Object.values(cardEffect.effects)) {
        const isAutomatic = automaticTimings.includes(effect.timing) || effect.auto_trigger;
        // Snow flower と うぅ… は強制的に自動効果として扱う
        const isSnowFlowerOrUuu = effect.name === 'Snow flower' || effect.name === 'うぅ…';
        const isManual = !isAutomatic && !isSnowFlowerOrUuu && (effect.timing === 'manual' || effect.timing === 'activate' || effect.timing === 'gift');
        
        if (isManual) {
          // LIMITED制限チェック（効果にlimitedが無くてもカードタイプがLIMITEDなら適用）
          const isLimitedCard = card.card_type?.includes('LIMITED');
          if ((effect.limited || isLimitedCard) && !this.canUseLimitedEffect(card, position)) {
            return false;
          }
          
          // カード固有の条件チェック
          if (effect.condition) {
            return effect.condition(card, gameState, this.battleEngine);
          }
          
          // サポートカードの場合は手札からの発動をチェック
          if (card.card_type?.includes('サポート')) {
            return this.canActivateSupportEffect(card, position);
          }
          
          return true;
        }
      }
    }

    // 新しい形式のコラボエフェクト
    if (cardEffect.collabEffect && position === 'collab') {
      return this.canActivateCollabEffect(card, position);
    }
    
    // 新しい形式のブルームエフェクト
    if (cardEffect.bloomEffect) {
      return this.canActivateBloomEffect(card, position);
    }

    // 古い形式のトリガーシステム（後方互換性）
    if (cardEffect.triggers) {
      for (const trigger of cardEffect.triggers) {
        switch (trigger.timing) {
          case 'on_bloom':
            // ブルームエフェクト：ブルームしたターンのみ発動可能
            return this.canActivateBloomEffect(card, position);
            
          case 'on_collab':
            // コラボエフェクト：コラボしたターンのみ発動可能
            return this.canActivateCollabEffect(card, position);
            
          case 'gift':
            // ギフト：場にいる間は常に発揮（手札からは不可）
            return this.canActivateGiftEffect(card, position);
            
          case 'arts':
          // アーツ：パフォーマンスステップのみ（未実装）
          return false;
          
        case 'oshi_holomen':
          // 推しホロメン：推しスキル発動チェック
          return this.canActivateOshiSkill(card, position);
          
        case 'manual_trigger':
          // 汎用手動トリガー（従来の実装）
          return currentPhase === 3; // メインフェーズのみ
        }
      }
    }
    
    return false;
  }

  /**
   * 推しスキル発動可能かチェック
   */
  canActivateOshiSkill(card, position) {
    // 推しホロメンカードでない場合は不可
    if (!card.card_type?.includes('推しホロメン')) {
      return false;
    }
    
    // 推しホロメンは常にプレイヤー1のもの
    const myPlayerId = 1;
    const currentPlayer = this.battleEngine.gameState.currentPlayer;
    const currentPhase = this.battleEngine.gameState.currentPhase;
    
    // カード効果の確認
    if (!window.cardEffects || !window.cardEffects[card.id]) {
      return false;
    }
    
    const cardEffect = window.cardEffects[card.id];
    
    // 推しスキルがあるかチェック
    if (!cardEffect.effects || !cardEffect.effects.oshiSkill) {
      return false;
    }
    
    const oshiSkill = cardEffect.effects.oshiSkill;
    
    // 基本的な発動タイミングチェック
    if (currentPlayer === myPlayerId) {
      // 自分のターン：メインステップ(3)またはパフォーマンスステップ(4)でのみ発動可能
      if (currentPhase !== 3 && currentPhase !== 4) {
        return false;
      }
    } else {
      // 相手のターン：効果によって発動可能かチェック
      if (oshiSkill.timing !== 'reactive') {
        return false;
      }
    }
    
    // コスト不足チェック
    if (!this.canPayHoloPowerCost(oshiSkill.holoPowerCost || 0)) {
      return false;
    }
    
    // ターン制限チェック
    if (!this.canUseOshiSkillThisTurn(card, oshiSkill)) {
      return false;
    }
    
    // ゲーム制限チェック（SP推しスキル）
    if (!this.canUseOshiSkillThisGame(card, oshiSkill)) {
      return false;
    }
    
    // 条件チェック（reactiveタイミングの場合）
    if (oshiSkill.timing === 'reactive' && oshiSkill.condition) {
      const conditionMet = oshiSkill.condition(card, this.battleEngine.gameState, this.battleEngine);
      return conditionMet;
    }
    
    // 手動発動スキルの場合は基本的に発動可能
    return true;
  }

  /**
   * ホロパワーコストを支払えるかチェック
   */
  canPayHoloPowerCost(cost) {
    if (cost <= 0) return true;
    
    const currentPlayer = this.battleEngine.gameState.currentPlayer;
    const player = this.battleEngine.players[currentPlayer];
    
    // ホロパワーエリアのカード数をチェック
    const holoPowerCount = player.holoPower ? player.holoPower.length : 0;
    return holoPowerCount >= cost;
  }

  /**
   * 推しスキルをこのターンに使用可能かチェック
   */
  canUseOshiSkillThisTurn(card, oshiSkill) {
    // ターン制限がない場合は使用可能
    if (!oshiSkill.turnLimit) return true;
    
    const currentPlayer = this.battleEngine.gameState.currentPlayer;
    const player = this.battleEngine.players[currentPlayer];
    
    // 使用履歴の確認（推しスキルは基本的にターン1制限）
    const usedOshiSkillsThisTurn = player.gameState?.usedOshiSkillsThisTurn || 0;
    return usedOshiSkillsThisTurn < oshiSkill.turnLimit;
  }

  /**
   * 推しスキルをこのゲーム中に使用可能かチェック（SP推しスキル用）
   */
  canUseOshiSkillThisGame(card, oshiSkill) {
    // SP推しスキルの場合はゲーム制限をチェック
    if (oshiSkill.gameLimit) {
      const currentPlayer = this.battleEngine.gameState.currentPlayer;
      const player = this.battleEngine.players[currentPlayer];
      
      // ゲーム内使用履歴の確認
      if (!player.gameState) {
        player.gameState = {};
      }
      if (!player.gameState.usedOshiSkillsThisGame) {
        player.gameState.usedOshiSkillsThisGame = {};
      }
      
      const skillKey = `${card.id}_${oshiSkill.name}`;
      const usedThisGame = player.gameState.usedOshiSkillsThisGame[skillKey] || 0;
      
      return usedThisGame < oshiSkill.gameLimit;
    }
    
    // 通常の推しスキルの場合は制限なし
    return true;
  }

  /**
   * サポート効果発動可能かチェック
   */
  canActivateSupportEffect(card, position) {
    // 手札からのみ発動可能
    if (position !== 'hand') {
      return false;
    }
    
    // LIMITED制限チェックは上位の canActivateEffect で処理済み
    return true;
  }

  /**
   * LIMITED効果使用可能かチェック（システム統一制御）
   */
  canUseLimitedEffect(card, position) {
    const currentPlayer = this.battleEngine.gameState.currentPlayer;
    const player = this.battleEngine.players[currentPlayer];
    
    const stateManager = this.battleEngine.stateManager;
    const debug = window.BATTLE_ENGINE_DEBUG;
    const limitedDetected = this.isLimitedCard(card);
    if (!limitedDetected) {
      if (debug) console.debug('[LIMITED] 判定: false (cardId:', card.id, ')');
      return true; // LIMITEDでなければ制限なし
    }

    if (debug) {
      const smFlag = stateManager?.state?.players?.[currentPlayer]?.gameState?.usedLimitedThisTurn;
      console.debug('[LIMITED] pre-check flag smFlag=', smFlag);
    }

    // 統一ヘルパーで判定
    if (stateManager && typeof stateManager.canUseLimitedNow === 'function') {
      const check = stateManager.canUseLimitedNow(currentPlayer);
      if (debug) console.debug('[LIMITED] canUseLimitedNow=', check, 'playerTurnCount= ', stateManager.state.turn.playerTurnCount[currentPlayer]);
      if (!check.canUse) {
        if (check.reason === 'first_player_first_turn') {
          console.warn('[LIMITED] Blocked: first_player_first_turn');
          this.showMessage('先行1ターン目はLIMITED効果を使用できません', 'warning');
        } else if (check.reason === 'already_used_this_turn') {
          console.warn('[LIMITED] Blocked: already_used_this_turn');
          this.showMessage('このターンには既にLIMITED効果を使用しています', 'warning');
        } else {
          console.warn('[LIMITED] Blocked: generic reason');
          this.showMessage('LIMITED効果を現在使用できません', 'warning');
        }
        return false;
      }
    } else {
      // フォールバック（念のため）
      const playerTurnCount = (stateManager?.state?.turn?.playerTurnCount?.[currentPlayer]) || 0;
      if (player.isFirstPlayer && playerTurnCount <= 1) {
        console.warn('[LIMITED] Blocked (fallback): first_player_first_turn');
        this.showMessage('先行1ターン目はLIMITED効果を使用できません', 'warning');
        return false;
      }
      // fallback path no longer uses local flag (only state manager path expected)
    }
    // 最終ガード： state manager flag only
    if (stateManager?.state?.players?.[currentPlayer]?.gameState?.usedLimitedThisTurn === true) {
      console.warn('[LIMITED] Blocked (already_used_final)');
      this.showMessage('このターンには既にLIMITED効果を使用しています', 'warning');
      return false;
    }
    return true;
  }

  /**
   * LIMITED効果の使用回数を記録
   */
  recordLimitedEffectUsage() {
    const currentPlayer = this.battleEngine.gameState.currentPlayer;
    const player = this.battleEngine.players[currentPlayer];
    
    if (this.battleEngine.stateManager) {
      try {
        this.battleEngine.stateManager.updateState('UPDATE_PLAYER_GAME_STATE', {
          player: currentPlayer,
          property: 'usedLimitedThisTurn',
          value: true
        });
        if (window.BATTLE_ENGINE_DEBUG) {
          const smFlag = this.battleEngine.stateManager.state.players[currentPlayer].gameState.usedLimitedThisTurn;
          console.debug('[LIMITED] usage recorded smFlag=', smFlag);
        }
      } catch (e) {
        console.warn('[LIMITED] StateManager update failed while recording usage', e);
      }
    }
  }

  /**
   * LIMITED効果かチェック
   */
  isLimitedEffect(card) {
    if (!window.cardEffects || !window.cardEffects[card.id]) {
      return false;
    }
    
    const cardEffect = window.cardEffects[card.id];
    if (cardEffect.effects) {
      return Object.values(cardEffect.effects).some(effect => effect.limited);
    }
    
    return false;
  }

  /**
   * ブルームエフェクト発動可能かチェック
   * ブルームした直後のタイミングでのみ発動可能
   */
  canActivateBloomEffect(card, position) {
    // ブルームエフェクトは自動発動なので手動では発動不可
    // ブルーム直後のモーダル表示でのみ発動される
    return false;
  }

  /**
   * コラボエフェクト発動可能かチェック
   * コラボした直後のタイミングでのみ発動可能
   */
  canActivateCollabEffect(card, position) {
    // コラボエフェクトは自動発動なので手動では発動不可
    // コラボ直後のモーダル表示でのみ発動される
    return false;
  }

  /**
   * ギフト効果発動可能かチェック
   * メインステップ時にいつでも発動可能、ただし1度のみ
   */
  canActivateGiftEffect(card, position) {
    // 手札からは発動不可
    if (position === 'hand') return false;
    
    // メインステップ（フェーズ3）でのみ発動可能
    const currentPhase = this.battleEngine.gameState.currentPhase;
    if (currentPhase !== 3) return false;
    
    // 場にいる間は発動可能
    const fieldPositions = ['center', 'collab', 'back1', 'back2', 'back3', 'back4', 'back5'];
    if (!fieldPositions.includes(position)) return false;
    
    // まだギフト効果を使用していないかチェック
    return !card.giftEffectUsed;
  }

  findCard(cardId) {
    const currentPlayer = this.battleEngine.gameState.currentPlayer;
    const player = this.battleEngine.players[currentPlayer];
    
    // 全エリアからカードを検索
    const areas = ['center', 'collab', 'back1', 'back2', 'back3', 'back4', 'back5', 'hand', 'archive'];
    
    for (const area of areas) {
      if (Array.isArray(player[area])) {
        const card = player[area].find(c => c && c.id === cardId);
        if (card) return card;
      } else if (player[area] && player[area].id === cardId) {
        return player[area];
      }
    }
    
    return null;
  }

  /**
   * メッセージ表示メソッド
   */
  showMessage(message, type = 'info') {
    const messageHtml = `
      <div class="card-action-message ${type}" id="card-action-message">
        <div class="message-content">
          ${message}
        </div>
      </div>
    `;

    // 既存のメッセージを削除
    const existingMsg = document.getElementById('card-action-message');
    if (existingMsg) {
      existingMsg.remove();
    }

    document.body.insertAdjacentHTML('beforeend', messageHtml);
    
    // 3秒後に自動で消去
    setTimeout(() => {
      const msgElement = document.getElementById('card-action-message');
      if (msgElement) {
        msgElement.remove();
      }
    }, 3000);
  }

  /**
   * カードがアーカイブ移動対象かチェック
   */
  isArchivableCard(card, position) {
    // 手札のサポートカード（イベント・スタッフ・LIMITED）のみアーカイブ対象
    if (position !== 'hand') {
      return false;
    }
    
    // カードタイプでチェック
    const cardType = card.card_type || '';
    return cardType.includes('サポート') && 
           (cardType.includes('イベント') || 
            cardType.includes('スタッフ') || 
            cardType.includes('LIMITED'));
  }

  /**
   * カードをアーカイブに移動
   */
  moveCardToArchive(card, position) {
    const currentPlayer = this.battleEngine.gameState.currentPlayer;
    const player = this.battleEngine.players[currentPlayer];
    
    if (position === 'hand') {
      // 手札からアーカイブに移動
      const cardIndex = player.hand.findIndex(handCard => handCard.id === card.id);
      if (cardIndex !== -1) {
        const supportCard = player.hand.splice(cardIndex, 1)[0];
        player.archive = player.archive || [];
        player.archive.push(supportCard);
        return true;
      }
    }
    
    console.warn(`⚠️ [自動アーカイブ] カードが見つかりません: ${card.id} in ${position}`);
    return false;
  }

  /**
   * 推しスキル発動処理
   */
  async activateOshiSkill(card, cardEffect) {
    const oshiSkill = cardEffect.effects?.oshiSkill;
    if (!oshiSkill) {
      return { success: false, message: '推しスキルが見つかりません' };
    }
    
    // ホロパワーコストを支払う
    if (!this.payHoloPowerCost(oshiSkill.holoPowerCost || 0)) {
      return { success: false, message: 'ホロパワーが不足しています' };
    }
    
    // ターン使用回数を記録
    this.markOshiSkillUsed(card, oshiSkill);
    
    // 効果実行
    if (oshiSkill.effect) {
      return await oshiSkill.effect(card, this.battleEngine);
    }
    
    return { success: false, message: '効果が定義されていません' };
  }

  /**
   * ホロパワーコストを支払う
   */
  payHoloPowerCost(cost) {
    if (cost <= 0) return true;
    
    const currentPlayer = this.battleEngine.gameState.currentPlayer;
    const player = this.battleEngine.players[currentPlayer];
    
    if (!player.holoPower || player.holoPower.length < cost) {
      return false;
    }
    
    // ホロパワーエリアからカードを取り除く
    for (let i = 0; i < cost; i++) {
      const holoPowerCard = player.holoPower.pop();
      if (holoPowerCard) {
        player.archive.push(holoPowerCard);
      }
    }
    
    return true;
  }

  /**
   * 推しスキル使用履歴を記録
   */
  markOshiSkillUsed(card, oshiSkill) {
    const currentPlayer = this.battleEngine.gameState.currentPlayer;
    const player = this.battleEngine.players[currentPlayer];
    
    if (!player.gameState) {
      player.gameState = {};
    }
    
    // ターン使用回数を記録
    if (!player.gameState.usedOshiSkillsThisTurn) {
      player.gameState.usedOshiSkillsThisTurn = 0;
    }
    player.gameState.usedOshiSkillsThisTurn++;
    
    // SP推しスキルの場合はゲーム使用回数も記録
    if (oshiSkill.gameLimit) {
      if (!player.gameState.usedOshiSkillsThisGame) {
        player.gameState.usedOshiSkillsThisGame = {};
      }
      
      const skillKey = `${card.id}_${oshiSkill.name}`;
      if (!player.gameState.usedOshiSkillsThisGame[skillKey]) {
        player.gameState.usedOshiSkillsThisGame[skillKey] = 0;
      }
      player.gameState.usedOshiSkillsThisGame[skillKey]++;
    }
  }

  /**
   * 推しホロメン効果発動の統合処理
   */
  async activateOshiHolomenEffect(card, position = 'oshi') {
    if (!card.card_type?.includes('推しホロメン')) {
      this.showMessage('推しホロメンカードではありません', 'error');
      return;
    }

    if (!window.cardEffects || !window.cardEffects[card.id]) {
      this.showMessage('推しスキルが定義されていません', 'error');
      return;
    }

    const cardEffect = window.cardEffects[card.id];
    
    try {
      // 推しスキル発動
      const result = await this.activateOshiSkill(card, cardEffect);
      
      if (result && result.success) {
        this.showMessage(result.message || '推しスキルを発動しました！', 'success');
        
        // UI更新
        this.battleEngine.updateUI();
      } else {
        this.showMessage(result?.message || '推しスキルの発動に失敗しました', 'error');
      }
      
    } catch (error) {
      console.error('推しスキル発動エラー:', error);
      this.showMessage('推しスキルの実行中にエラーが発生しました', 'error');
    }
  }
}

// グローバルエクスポート
if (typeof window !== 'undefined') {
  window.CardInteractionManager = CardInteractionManager;
}
