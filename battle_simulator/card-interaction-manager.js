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
   * カードインタラクションの初期化
   */
  initializeCardInteractions() {
    // battle engineにshowCardModal関数を追加
    this.battleEngine.showCardModal = (card, position = null) => {
      this.showCardInfo(card, position);
    };
  }

  /**
   * カード情報を右側パネルに表示し、アクションマークをカード上に表示
   * @param {Object} card - カードオブジェクト
   * @param {string} position - カードの位置（hand, center, collab等）
   */
  showCardInfo(card, position = null) {
    // 右側パネルにカード詳細を表示
    this.showCardDetailInPanel(card);
    
    // カード上にアクションマークを表示
    this.showActionMarksOnCard(card, position);
  }

  /**
   * 右側パネルにカード詳細を表示
   * @param {Object} card - カードオブジェクト
   */
  showCardDetailInPanel(card) {
    // InfoPanelManagerを使用してカード詳細を表示
    if (this.battleEngine.infoPanelManager) {
      const cardDetailHtml = this.formatCardDetailForPanel(card);
      this.battleEngine.infoPanelManager.cardDetailElement.innerHTML = cardDetailHtml;
    }
  }

  /**
   * パネル用のカード詳細HTMLをフォーマット
   * @param {Object} card - カードオブジェクト
   */
  formatCardDetailForPanel(card) {
    let html = `
      <h3>📋 カード詳細</h3>
      <div class="card-name">${card.name || 'Unknown'}</div>
    `;

    if (card.card_type) {
      html += `<div class="card-type">種類: ${card.card_type}</div>`;
    }

    if (card.card_color) {
      html += `<div class="card-color">色: ${card.card_color}</div>`;
    }

    if (card.bloom_level) {
      html += `<div class="card-bloom">ブルーム: ${card.bloom_level}</div>`;
    }

    if (card.hp) {
      html += `<div class="card-hp">HP: ${card.hp}</div>`;
    }

    if (card.rarity) {
      html += `<div class="card-rarity">レアリティ: ${card.rarity}</div>`;
    }

    if (card.skills && card.skills.length > 0) {
      html += `<div class="card-skills"><strong>🎯 スキル:</strong><br>`;
      card.skills.forEach(skill => {
        const skillText = skill.text || skill.name || skill.description || 'スキル詳細なし';
        html += `<div class="skill-item">• ${skillText}</div>`;
      });
      html += `</div>`;
    }

    if (card.skill_description) {
      html += `<div class="card-description"><strong>📝 効果:</strong><br>${card.skill_description}</div>`;
    }

    return html;
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
    if (isPlayerCard && this.hasManualEffect(card)) {
      const canActivate = this.canActivateEffect(card, position);
      if (canActivate) {
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
   * カード効果の手動発動
   */
  async activateCardEffect(card, position) {
    const currentPlayer = this.battleEngine.gameState.currentPlayer;
    
    try {
      console.log(`🔍 [効果発動] カード詳細:`, card);
      console.log(`🔍 [効果発動] カードID: ${card.id}, number: ${card.number}`);
      
      // カード効果定義を直接取得
      const cardEffect = window.cardEffects[card.id];
      console.log(`🔍 [効果発動] 効果定義[${card.id}]:`, cardEffect);
      
      // card.idで見つからない場合は card.number で試行
      let finalCardEffect = cardEffect;
      if (!finalCardEffect && card.number) {
        finalCardEffect = window.cardEffects[card.number];
        console.log(`🔍 [効果発動] 効果定義[${card.number}]:`, finalCardEffect);
      }
      
      if (!finalCardEffect || !finalCardEffect.effects) {
        console.log(`❌ [効果発動] 効果定義が見つかりません: ${card.id} / ${card.number}`);
        this.showMessage('このカードには効果がありません', 'info');
        return;
      }

      // 手動発動可能な効果を検索
      const manualEffects = Object.values(finalCardEffect.effects).filter(effect => 
        effect.timing === 'manual'
      );

      if (manualEffects.length === 0) {
        this.showMessage('手動発動可能な効果がありません', 'info');
        return;
      }

      console.log(`✅ [効果発動] 手動効果見つかりました: ${manualEffects.length}個`);

      // 最初の手動効果を発動（複数ある場合は選択UIが必要）
      const effect = manualEffects[0];
      
      // LIMITED制限チェック（ダブルチェック）
      if (effect.limited && !this.canUseLimitedEffect(card, position)) {
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
      console.log(`🎯 [効果実行開始] カード: ${card.name || card.id}, 効果: ${effect.name}`);
      const result = await effect.effect(card, this.battleEngine);
      console.log(`✅ [効果実行完了] 結果:`, result);
      
      if (result && result.success !== false) {
        // LIMITED効果の使用回数をカウント
        if (effect.limited) {
          this.recordLimitedEffectUsage();
        }
        
        // サポートカードの自動アーカイブ処理
        if (position === 'hand' && card.card_type?.includes('サポート')) {
          console.log(`🗄️ [自動アーカイブ] サポートカード ${card.name} をアーカイブに移動`);
          this.moveCardToArchive(card, position);
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

    for (const trigger of cardEffect.triggers) {
      switch (trigger.timing) {
        case 'on_bloom':
          card.bloomEffectUsed = true;
          break;
        case 'on_collab':
          card.collabEffectUsed = true;
          break;
        // ギフトは常時効果なので使用済みマークなし
        // アーツは未実装
        // 推しホロメンは未実装
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
      const manualEffects = Object.values(cardEffect.effects).filter(effect => 
        effect.timing === 'manual' || effect.timing === 'activate'
      );
      return manualEffects.length > 0;
    }
    
    // 古い形式のトリガーシステム（後方互換性）
    if (cardEffect.triggers && cardEffect.triggers.some(t => t.timing === 'manual_trigger')) {
      return true;
    }
    
    // コラボエフェクト
    if (cardEffect.collabEffect) {
      return true;
    }
    
    // ブルームエフェクト
    if (cardEffect.bloomEffect) {
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
      for (const effect of Object.values(cardEffect.effects)) {
        if (effect.timing === 'manual') {
          // LIMITED制限チェック（システム側で統一処理）
          if (effect.limited && !this.canUseLimitedEffect(card, position)) {
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
        console.log(`❌ [推しスキル] 自分のターンではメインステップ・パフォーマンスステップでのみ使用可能 (現在フェーズ: ${currentPhase})`);
        return false;
      }
    } else {
      // 相手のターン：効果によって発動可能かチェック
      if (oshiSkill.timing !== 'reactive') {
        console.log(`❌ [推しスキル] 相手のターンではreactiveタイミングの効果のみ使用可能`);
        return false;
      }
    }
    
    // コスト不足チェック
    if (!this.canPayHoloPowerCost(oshiSkill.holoPowerCost || 0)) {
      console.log(`❌ [推しスキル] ホロパワー不足 (必要: ${oshiSkill.holoPowerCost || 0})`);
      return false;
    }
    
    // ターン制限チェック
    if (!this.canUseOshiSkillThisTurn(card, oshiSkill)) {
      console.log(`❌ [推しスキル] ターン使用制限`);
      return false;
    }
    
    // ゲーム制限チェック（SP推しスキル）
    if (!this.canUseOshiSkillThisGame(card, oshiSkill)) {
      console.log(`❌ [推しスキル] ゲーム使用制限`);
      return false;
    }
    
    // 条件チェック（reactiveタイミングの場合）
    if (oshiSkill.timing === 'reactive' && oshiSkill.condition) {
      const conditionMet = oshiSkill.condition(card, this.battleEngine.gameState, this.battleEngine);
      console.log(`🔍 [推しスキル] 条件チェック結果: ${conditionMet}`);
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
    
    // usedLimitedThisTurnの型を強制修正（数値0をfalseに変換）
    if (typeof player.usedLimitedThisTurn !== 'boolean') {
      Object.defineProperty(player, 'usedLimitedThisTurn', {
        value: false,
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
    
    // 1ターンに1回制限（フラグベース）
    if (player.usedLimitedThisTurn === true) {
      this.showMessage('LIMITED効果は1ターンに1回しか使用できません', 'warning');
      return false;
    }
    
    // 先行プレイヤーの最初のターン（個人ターン1回目）のみ使用不可
    const playerTurnCount = this.battleEngine.stateManager.getStateByPath(`turn.playerTurnCount.${currentPlayer}`) || 0;
    if (player.isFirstPlayer === true && playerTurnCount <= 1) {
      this.showMessage('先行プレイヤーの最初のターンではLIMITED効果は使用できません', 'warning');
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
    
    player.usedLimitedThisTurn = true;
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
   */
  canActivateBloomEffect(card, position) {
    // 場にいるカードのみ
    if (position === 'hand') return false;
    
    // ブルームしたターンかチェック
    const gameState = this.battleEngine.gameState;
    const currentTurn = gameState.turnCount;
    
    // カードにブルームしたターンの情報があるかチェック
    if (card.bloomedTurn && card.bloomedTurn === currentTurn) {
      // まだ効果を使用していないかチェック
      return !card.bloomEffectUsed;
    }
    
    return false;
  }

  /**
   * コラボエフェクト発動可能かチェック
   */
  canActivateCollabEffect(card, position) {
    // コラボエリアにいるカードのみ
    if (position !== 'collab') {
      return false;
    }
    
    // コラボしたターンかチェック
    const gameState = this.battleEngine.gameState;
    const currentTurn = gameState.turnCount;
    
    // デバッグログ（重要な情報のみ）
    if (card.collabedTurn !== currentTurn) {
      return false;
    }
    
    // カードにコラボしたターンの情報があるかチェック
    if (card.collabedTurn && card.collabedTurn === currentTurn) {
      // まだ効果を使用していないかチェック
      const canActivate = !card.collabEffectUsed;
      if (canActivate) {
      }
      return canActivate;
    }
    
    return false;
  }

  /**
   * ギフト効果発動可能かチェック
   */
  canActivateGiftEffect(card, position) {
    // 手札からは発動不可
    if (position === 'hand') return false;
    
    // 場にいる間は常に発動可能
    const fieldPositions = ['center', 'collab', 'back1', 'back2', 'back3', 'back4', 'back5'];
    return fieldPositions.includes(position);
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
      
      console.log(`📊 [推しスキル] SP推しスキル使用記録: ${skillKey} = ${player.gameState.usedOshiSkillsThisGame[skillKey]}/${oshiSkill.gameLimit}`);
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
