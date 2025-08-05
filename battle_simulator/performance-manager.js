/**
 * パフォーマンス管理システム
 * 攻撃処理とスキル発動を管理
 */

class PerformanceManager {
  constructor(battleEngine) {
    this.battleEngine = battleEngine;
    this.attackInProgress = false;
    this.currentAttacker = null;
    this.availableTargets = [];
  }

  /**
   * パフォーマンスステップの開始
   * @param {number} playerId - 現在のプレイヤーID
   */
  startPerformanceStep(playerId) {
    console.log(`🎭 [Performance] パフォーマンスステップ開始 - プレイヤー${playerId}`);
    console.log(`🎭 [Performance] プレイヤー状態:`, this.battleEngine.players[playerId]);
    
    if (playerId === 1) {
      // プレイヤーの場合：攻撃可能なカードをハイライト
      this.highlightAttackableCards(playerId);
      this.showPerformanceMessage('攻撃するホロメンカードを選択してください（センター・コラボのみ）');
    } else {
      // CPUの場合：AI処理（後で実装）
      this.executeCPUPerformance(playerId);
    }
  }

  /**
   * 攻撃可能なカードをハイライト
   * @param {number} playerId - プレイヤーID
   */
  highlightAttackableCards(playerId) {
    const player = this.battleEngine.players[playerId];
    const attackablePositions = [];

    console.log(`🔍 [Performance] センターカード:`, player.center);
    console.log(`🔍 [Performance] コラボカード:`, player.collab);

    // センターとコラボをチェック
    if (player.center && !player.center.isResting) {
      attackablePositions.push('center');
      console.log(`✅ [Performance] センター攻撃可能: ${player.center.name}`);
    }
    if (player.collab && !player.collab.isResting) {
      attackablePositions.push('collab');
      console.log(`✅ [Performance] コラボ攻撃可能: ${player.collab.name}`);
    }

    console.log(`🎯 [Performance] 攻撃可能ポジション: ${attackablePositions.join(', ')}`);

    // 攻撃可能カードをハイライト
    attackablePositions.forEach(position => {
      console.log(`🔧 [Performance] 攻撃ボタン追加中: ${position}`);
      this.addAttackButton(position, playerId);
    });

    if (attackablePositions.length === 0) {
      console.log(`❌ [Performance] 攻撃可能なカードがありません`);
      this.showPerformanceMessage('攻撃可能なカードがありません');
      setTimeout(() => {
        this.endPerformanceStep();
      }, 2000);
    }
  }

  /**
   * カードに攻撃ボタンを追加
   * @param {string} position - カードポジション
   * @param {number} playerId - プレイヤーID
   */
  addAttackButton(position, playerId) {
    const sectionClass = playerId === 1 ? '.battle-player' : '.battle-opponent';
    const cardArea = document.querySelector(`${sectionClass} .${position}`);
    
    console.log(`🔧 [Performance] カードエリア検索: ${sectionClass} .${position}`, cardArea);
    
    if (!cardArea) {
      console.error(`❌ [Performance] カードエリアが見つかりません: ${sectionClass} .${position}`);
      return;
    }

    // カードエリアの位置指定を確実にする
    if (!cardArea.style.position || cardArea.style.position === 'static') {
      cardArea.style.position = 'relative';
    }

    const attackButton = document.createElement('div');
    attackButton.className = 'performance-attack-button';
    attackButton.innerHTML = '⚔️';
    attackButton.style.cssText = `
      position: absolute;
      top: 5px;
      left: 5px;
      width: 30px;
      height: 30px;
      background: rgba(255, 69, 0, 0.9);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 16px;
      z-index: 9999;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      transition: all 0.2s ease;
      border: 2px solid white;
    `;

    attackButton.addEventListener('mouseenter', () => {
      attackButton.style.transform = 'scale(1.1)';
      attackButton.style.boxShadow = '0 4px 12px rgba(255, 69, 0, 0.5)';
    });

    attackButton.addEventListener('mouseleave', () => {
      attackButton.style.transform = 'scale(1)';
      attackButton.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
    });

    attackButton.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log(`⚔️ [Performance] 攻撃ボタンクリック: ${position}`);
      this.initiateAttack(position, playerId);
    });

    cardArea.appendChild(attackButton);
    console.log(`✅ [Performance] 攻撃ボタン追加完了: ${position}`);
    
    // デバッグ: ボタンの可視性確認
    setTimeout(() => {
      const addedButton = cardArea.querySelector('.performance-attack-button');
      if (addedButton) {
        console.log(`🔍 [Performance] ボタン可視性チェック: ${position}`, {
          display: addedButton.style.display,
          visibility: addedButton.style.visibility,
          zIndex: addedButton.style.zIndex,
          position: addedButton.style.position,
          offsetWidth: addedButton.offsetWidth,
          offsetHeight: addedButton.offsetHeight
        });
      } else {
        console.error(`❌ [Performance] ボタンが見つからない: ${position}`);
      }
    }, 100);
  }

  /**
   * 攻撃開始
   * @param {string} attackerPosition - 攻撃者のポジション
   * @param {number} playerId - プレイヤーID
   */
  initiateAttack(attackerPosition, playerId) {
    const attacker = this.battleEngine.players[playerId][attackerPosition];
    if (!attacker) {
      console.error(`🚨 [Performance] 攻撃者が見つかりません: ${attackerPosition}`);
      return;
    }

    this.currentAttacker = {
      card: attacker,
      position: attackerPosition,
      playerId: playerId
    };

    console.log(`⚔️ [Performance] 攻撃開始: ${attacker.name} (${attackerPosition})`);

    // 攻撃ボタンを削除
    this.clearPerformanceButtons();

    // 攻撃対象を選択
    this.selectAttackTarget(playerId);
  }

  /**
   * 攻撃対象選択
   * @param {number} attackerPlayerId - 攻撃者のプレイヤーID
   */
  selectAttackTarget(attackerPlayerId) {
    console.log(`🎯 [Performance] 攻撃対象選択開始 - 攻撃者プレイヤー${attackerPlayerId}`);
    
    const opponentId = attackerPlayerId === 1 ? 2 : 1;
    const opponent = this.battleEngine.players[opponentId];
    
    console.log(`🔍 [Performance] 相手プレイヤー${opponentId}状態:`, opponent);
    console.log(`🔍 [Performance] 相手センター:`, opponent.center);
    console.log(`🔍 [Performance] 相手コラボ:`, opponent.collab);
    
    this.availableTargets = [];

    // 相手のセンター・コラボをチェック
    if (opponent.center) {
      this.availableTargets.push({
        card: opponent.center,
        position: 'center',
        playerId: opponentId
      });
      console.log(`✅ [Performance] 攻撃対象追加: センター - ${opponent.center.name}`);
    }
    if (opponent.collab) {
      this.availableTargets.push({
        card: opponent.collab,
        position: 'collab',
        playerId: opponentId
      });
      console.log(`✅ [Performance] 攻撃対象追加: コラボ - ${opponent.collab.name}`);
    }

    console.log(`🎯 [Performance] 利用可能な攻撃対象: ${this.availableTargets.length}個`);

    if (this.availableTargets.length === 0) {
      console.log(`❌ [Performance] 攻撃対象がありません`);
      this.showPerformanceMessage('攻撃対象がありません');
      this.endPerformanceStep();
      return;
    }

    // 攻撃対象をハイライト
    console.log(`🎯 [Performance] 攻撃対象ハイライト開始`);
    this.highlightAttackTargets();
    this.showPerformanceMessage('攻撃対象を選択してください');
  }

  /**
   * 攻撃対象をハイライト
   */
  highlightAttackTargets() {
    console.log(`🎯 [Performance] ハイライト対象: ${this.availableTargets.length}個`);
    this.availableTargets.forEach((target, index) => {
      console.log(`🎯 [Performance] ターゲット${index + 1}: ${target.card.name} (${target.position})`);
      this.addTargetButton(target);
    });
  }

  /**
   * 対象に攻撃ボタンを追加
   * @param {Object} target - 攻撃対象情報
   */
  addTargetButton(target) {
    const sectionClass = target.playerId === 1 ? '.battle-player' : '.battle-opponent';
    const cardArea = document.querySelector(`${sectionClass} .${target.position}`);
    
    console.log(`🎯 [Performance] ターゲットボタン追加: ${sectionClass} .${target.position}`, cardArea);
    
    if (!cardArea) {
      console.error(`❌ [Performance] ターゲットカードエリアが見つかりません: ${sectionClass} .${target.position}`);
      return;
    }

    // カードエリアの位置指定を確実にする
    if (!cardArea.style.position || cardArea.style.position === 'static') {
      cardArea.style.position = 'relative';
    }

    const targetButton = document.createElement('div');
    targetButton.className = 'performance-target-button';
    targetButton.innerHTML = '🎯';
    targetButton.style.cssText = `
      position: absolute;
      top: 5px;
      right: 5px;
      width: 30px;
      height: 30px;
      background: rgba(255, 215, 0, 0.9);
      color: #333;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 16px;
      z-index: 9999;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      transition: all 0.2s ease;
      border: 2px solid white;
    `;

    targetButton.addEventListener('mouseenter', () => {
      targetButton.style.transform = 'scale(1.1)';
      targetButton.style.boxShadow = '0 4px 12px rgba(255, 215, 0, 0.5)';
    });

    targetButton.addEventListener('mouseleave', () => {
      targetButton.style.transform = 'scale(1)';
      targetButton.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
    });

    targetButton.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log(`🎯 [Performance] ターゲットボタンクリック: ${target.card.name} (${target.position})`);
      this.executeAttack(target);
    });

    cardArea.appendChild(targetButton);
    console.log(`✅ [Performance] ターゲットボタン追加完了: ${target.position}`);
    
    // デバッグ: ボタンの可視性確認
    setTimeout(() => {
      const addedButton = cardArea.querySelector('.performance-target-button');
      if (addedButton) {
        console.log(`🔍 [Performance] ターゲットボタン可視性チェック: ${target.position}`, {
          display: addedButton.style.display,
          visibility: addedButton.style.visibility,
          zIndex: addedButton.style.zIndex,
          position: addedButton.style.position,
          offsetWidth: addedButton.offsetWidth,
          offsetHeight: addedButton.offsetHeight
        });
      } else {
        console.error(`❌ [Performance] ターゲットボタンが見つからない: ${target.position}`);
      }
    }, 100);
  }

  /**
   * 攻撃実行
   * @param {Object} target - 攻撃対象
   */
  executeAttack(target) {
    if (!this.currentAttacker) {
      console.error('🚨 [Performance] 攻撃者が設定されていません');
      return;
    }

    const attacker = this.currentAttacker.card;
    const defender = target.card;

    console.log(`⚔️ [Performance] 攻撃実行: ${attacker.name} → ${defender.name}`);

    // 攻撃ボタンを削除
    this.clearPerformanceButtons();

    // ダメージ計算
    const attackPower = attacker.atk || 0;
    const currentHP = defender.current_hp || defender.hp || 0;
    const newHP = Math.max(0, currentHP - attackPower);

    console.log(`💥 [Performance] ダメージ: ${attackPower}, HP: ${currentHP} → ${newHP}`);

    // HPを更新
    defender.current_hp = newHP;

    // ダメージエフェクト表示
    this.showDamageEffect(target, attackPower);

    // カード撃破チェック
    if (newHP <= 0) {
      this.destroyCard(defender, target.position, target.playerId);
    }

    // UI更新
    this.battleEngine.updateUI();

    // 攻撃完了メッセージ
    this.showPerformanceMessage(`${attacker.name}が${defender.name}に${attackPower}ダメージ！`);

    // 勝利条件チェック
    this.battleEngine.checkVictoryConditions();

    // 攻撃者をお休み状態にしない（ルール通り）
    
    // 攻撃終了処理
    setTimeout(() => {
      this.currentAttacker = null;
      this.continuePerformanceStep();
    }, 2000);
  }

  /**
   * カード撃破処理
   * @param {Object} card - 撃破されたカード
   * @param {string} position - カードのポジション
   * @param {number} playerId - プレイヤーID
   */
  destroyCard(card, position, playerId) {
    console.log(`💀 [Performance] カード撃破: ${card.name} (${position})`);

    const player = this.battleEngine.players[playerId];

    // カードをアーカイブに移動
    player.archive = player.archive || [];
    player.archive.push(card);
    player[position] = null;

    // ライフからエール配置処理
    this.lifeToYellPlacement(playerId);

    this.showPerformanceMessage(`${card.name}が撃破されました！`);
  }

  /**
   * ライフからエール配置処理
   * @param {number} playerId - カードを失ったプレイヤーID
   */
  lifeToYellPlacement(playerId) {
    const player = this.battleEngine.players[playerId];

    if (!player.life || player.life.length === 0) {
      console.log(`❌ [Performance] ライフカードがありません - プレイヤー${playerId}`);
      return;
    }

    // ライフカードを1枚取得
    const lifeCard = player.life.pop();

    // 場のホロメンカードを取得
    const fieldHolomen = this.getFieldHolomenCards(playerId);

    if (fieldHolomen.length === 0) {
      // 場にホロメンがいない場合はアーカイブへ
      player.archive = player.archive || [];
      player.archive.push(lifeCard);
      console.log(`📁 [Performance] ライフカードをアーカイブへ: ${lifeCard.name}`);
      return;
    }

    if (playerId === 1) {
      // プレイヤーの場合：選択UI表示
      this.showYellPlacementUI(lifeCard, fieldHolomen, playerId);
    } else {
      // CPUの場合：自動選択
      const target = fieldHolomen[0]; // 最初のホロメンに配置
      this.placeYellFromLife(lifeCard, target.card, target.position, playerId);
    }
  }

  /**
   * 場のホロメンカードを取得
   * @param {number} playerId - プレイヤーID
   * @returns {Array} ホロメンカードリスト
   */
  getFieldHolomenCards(playerId) {
    const player = this.battleEngine.players[playerId];
    const fieldCards = [];

    // センター・コラボ・バック全てをチェック
    const positions = ['center', 'collab', 'back1', 'back2', 'back3', 'back4', 'back5'];
    
    positions.forEach(position => {
      if (player[position] && this.battleEngine.isHolomenCard(player[position])) {
        fieldCards.push({
          card: player[position],
          position: position
        });
      }
    });

    return fieldCards;
  }

  /**
   * エール配置UI表示
   * @param {Object} lifeCard - ライフカード
   * @param {Array} targetCards - 配置可能なホロメン
   * @param {number} playerId - プレイヤーID
   */
  showYellPlacementUI(lifeCard, targetCards, playerId) {
    console.log(`🎯 [Performance] エール配置UI表示: ${lifeCard.name}`);

    // 配置可能なカードにボタンを追加
    targetCards.forEach(target => {
      this.addYellPlacementButton(lifeCard, target, playerId);
    });

    this.showPerformanceMessage(`${lifeCard.name}をエールとして配置するホロメンを選択してください`);
  }

  /**
   * エール配置ボタンを追加
   * @param {Object} lifeCard - ライフカード
   * @param {Object} target - 配置対象
   * @param {number} playerId - プレイヤーID
   */
  addYellPlacementButton(lifeCard, target, playerId) {
    const sectionClass = playerId === 1 ? '.battle-player' : '.battle-opponent';
    const cardArea = document.querySelector(`${sectionClass} .${target.position}`);
    
    if (!cardArea) return;

    const yellButton = document.createElement('div');
    yellButton.className = 'yell-placement-button';
    yellButton.innerHTML = '🌟';
    yellButton.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 40px;
      height: 40px;
      background: rgba(0, 191, 255, 0.9);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 20px;
      z-index: 15;
      box-shadow: 0 4px 12px rgba(0, 191, 255, 0.4);
      animation: yellPulse 1.5s infinite;
    `;

    yellButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.placeYellFromLife(lifeCard, target.card, target.position, playerId);
    });

    cardArea.appendChild(yellButton);
  }

  /**
   * ライフからエール配置実行
   * @param {Object} lifeCard - ライフカード
   * @param {Object} targetCard - 配置先ホロメン
   * @param {string} position - ポジション
   * @param {number} playerId - プレイヤーID
   */
  placeYellFromLife(lifeCard, targetCard, position, playerId) {
    console.log(`🌟 [Performance] エール配置: ${lifeCard.name} → ${targetCard.name}`);

    // エールカードとして配置
    if (!targetCard.yellCards) {
      targetCard.yellCards = [];
    }
    targetCard.yellCards.push(lifeCard);

    // UI更新
    this.battleEngine.updateUI();

    // ボタン削除
    this.clearYellPlacementButtons();

    this.showPerformanceMessage(`${lifeCard.name}を${targetCard.name}にエールとして配置しました`);
  }

  /**
   * ダメージエフェクト表示
   * @param {Object} target - 攻撃対象
   * @param {number} damage - ダメージ量
   */
  showDamageEffect(target, damage) {
    const sectionClass = target.playerId === 1 ? '.battle-player' : '.battle-opponent';
    const cardArea = document.querySelector(`${sectionClass} .${target.position}`);
    
    if (!cardArea) return;

    const damageEffect = document.createElement('div');
    damageEffect.innerHTML = `-${damage}`;
    damageEffect.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: #ff4444;
      font-size: 24px;
      font-weight: bold;
      z-index: 20;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
      animation: damageFloat 2s ease-out forwards;
      pointer-events: none;
    `;

    cardArea.appendChild(damageEffect);

    // 2秒後にエフェクトを削除
    setTimeout(() => {
      if (damageEffect.parentNode) {
        damageEffect.parentNode.removeChild(damageEffect);
      }
    }, 2000);
  }

  /**
   * パフォーマンスステップ継続
   */
  continuePerformanceStep() {
    const currentPlayer = this.battleEngine.gameState.currentPlayer;
    
    // まだ攻撃可能なカードがあるかチェック
    const hasMoreAttackers = this.hasAttackableCards(currentPlayer);
    
    if (hasMoreAttackers) {
      // 続けて攻撃可能
      this.highlightAttackableCards(currentPlayer);
      this.showPerformanceMessage('他にも攻撃できます。攻撃するか、パスしてください');
      this.addPassButton();
    } else {
      // 攻撃できるカードがない場合は終了
      this.endPerformanceStep();
    }
  }

  /**
   * 攻撃可能なカードがあるかチェック
   * @param {number} playerId - プレイヤーID
   * @returns {boolean} 攻撃可能かどうか
   */
  hasAttackableCards(playerId) {
    const player = this.battleEngine.players[playerId];
    
    return (player.center && !player.center.isResting) || 
           (player.collab && !player.collab.isResting);
  }

  /**
   * パスボタンを追加
   */
  addPassButton() {
    const passButton = document.createElement('button');
    passButton.className = 'performance-pass-button';
    passButton.innerHTML = 'パス';
    passButton.style.cssText = `
      position: fixed;
      bottom: 100px;
      right: 50px;
      padding: 12px 24px;
      background: rgba(108, 117, 125, 0.9);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      z-index: 20;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;

    passButton.addEventListener('click', () => {
      this.endPerformanceStep();
    });

    document.body.appendChild(passButton);
  }

  /**
   * パフォーマンスステップ終了
   */
  endPerformanceStep() {
    console.log('🎭 [Performance] パフォーマンスステップ終了');
    
    this.clearPerformanceButtons();
    this.clearYellPlacementButtons();
    this.hidePerformanceMessage();
    
    this.currentAttacker = null;
    this.availableTargets = [];
    this.attackInProgress = false;

    // 次のフェーズに進む
    setTimeout(() => {
      this.battleEngine.phaseController.nextPhase();
    }, 1000);
  }

  /**
   * CPU パフォーマンス実行
   * @param {number} playerId - CPUプレイヤーID
   */
  executeCPUPerformance(playerId) {
    console.log(`🤖 [Performance] CPU パフォーマンス開始 - プレイヤー${playerId}`);
    
    // 簡単なAI: 攻撃可能なカードで攻撃
    const player = this.battleEngine.players[playerId];
    const opponentId = playerId === 1 ? 2 : 1;
    const opponent = this.battleEngine.players[opponentId];

    let attacked = false;

    // センターで攻撃
    if (player.center && !player.center.isResting) {
      const target = this.selectCPUTarget(opponentId);
      if (target) {
        this.executeCPUAttack(player.center, 'center', playerId, target);
        attacked = true;
      }
    }

    // コラボで攻撃
    if (!attacked && player.collab && !player.collab.isResting) {
      const target = this.selectCPUTarget(opponentId);
      if (target) {
        this.executeCPUAttack(player.collab, 'collab', playerId, target);
        attacked = true;
      }
    }

    if (!attacked) {
      console.log('🤖 [Performance] CPU: 攻撃対象なし');
    }

    // 終了
    setTimeout(() => {
      this.endPerformanceStep();
    }, 2000);
  }

  /**
   * CPU攻撃対象選択
   * @param {number} opponentId - 相手プレイヤーID
   * @returns {Object|null} 攻撃対象
   */
  selectCPUTarget(opponentId) {
    const opponent = this.battleEngine.players[opponentId];
    
    // センター優先、次にコラボ
    if (opponent.center) {
      return { card: opponent.center, position: 'center', playerId: opponentId };
    }
    if (opponent.collab) {
      return { card: opponent.collab, position: 'collab', playerId: opponentId };
    }
    
    return null;
  }

  /**
   * CPU攻撃実行
   * @param {Object} attacker - 攻撃者
   * @param {string} attackerPosition - 攻撃者ポジション
   * @param {number} attackerPlayerId - 攻撃者プレイヤーID
   * @param {Object} target - 攻撃対象
   */
  executeCPUAttack(attacker, attackerPosition, attackerPlayerId, target) {
    console.log(`🤖 [Performance] CPU攻撃: ${attacker.name} → ${target.card.name}`);

    const attackPower = attacker.atk || 0;
    const currentHP = target.card.current_hp || target.card.hp || 0;
    const newHP = Math.max(0, currentHP - attackPower);

    target.card.current_hp = newHP;

    if (newHP <= 0) {
      this.destroyCard(target.card, target.position, target.playerId);
    }

    this.battleEngine.updateUI();
    this.battleEngine.checkVictoryConditions();
  }

  /**
   * パフォーマンスボタンをクリア
   */
  clearPerformanceButtons() {
    document.querySelectorAll('.performance-attack-button').forEach(btn => btn.remove());
    document.querySelectorAll('.performance-target-button').forEach(btn => btn.remove());
    document.querySelectorAll('.performance-pass-button').forEach(btn => btn.remove());
  }

  /**
   * エール配置ボタンをクリア
   */
  clearYellPlacementButtons() {
    document.querySelectorAll('.yell-placement-button').forEach(btn => btn.remove());
  }

  /**
   * パフォーマンスメッセージ表示
   * @param {string} message - メッセージ
   */
  showPerformanceMessage(message) {
    let messageArea = document.getElementById('performance-message');
    
    if (!messageArea) {
      messageArea = document.createElement('div');
      messageArea.id = 'performance-message';
      messageArea.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 16px;
        z-index: 25;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      `;
      document.body.appendChild(messageArea);
    }

    messageArea.textContent = message;
  }

  /**
   * パフォーマンスメッセージ非表示
   */
  hidePerformanceMessage() {
    const messageArea = document.getElementById('performance-message');
    if (messageArea) {
      messageArea.remove();
    }
  }
}

// CSS アニメーション追加
const style = document.createElement('style');
style.textContent = `
  @keyframes yellPulse {
    0%, 100% { transform: translate(-50%, -50%) scale(1); }
    50% { transform: translate(-50%, -50%) scale(1.1); }
  }
  
  @keyframes damageFloat {
    0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    100% { transform: translate(-50%, -100%) scale(1.5); opacity: 0; }
  }
`;
document.head.appendChild(style);

// グローバルエクスポート
if (typeof window !== 'undefined') {
  window.PerformanceManager = PerformanceManager;
}
