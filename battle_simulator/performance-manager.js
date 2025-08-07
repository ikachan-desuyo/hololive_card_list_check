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
    
    // パフォーマンス実行済みチェック
    if (this.hasPerformedThisTurn(playerId)) {
      console.log(`❌ [Performance] このターンは既にパフォーマンスを実行済み - プレイヤー${playerId}`);
      this.showPerformanceMessage('このターンは既にパフォーマンスを実行しました');
      setTimeout(() => {
        this.endPerformanceStep();
      }, 2000);
      return;
    }
    
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
   * このターンにパフォーマンスを実行済みかチェック
   * @param {number} playerId - プレイヤーID
   * @returns {boolean} 実行済みかどうか
   */
  hasPerformedThisTurn(playerId) {
    const player = this.battleEngine.players[playerId];
    const currentTurn = this.battleEngine.gameState.turnCount || 1;
    
    // 攻撃済みカード配列を初期化
    if (!player.attackedCardsThisTurn || player.attackedCardsTurn !== currentTurn) {
      player.attackedCardsThisTurn = [];
      player.attackedCardsTurn = currentTurn;
    }
    
    // センターとコラボの両方が攻撃済みかチェック
    const hasCenter = player.center && !player.center.isResting;
    const hasCollab = player.collab && !player.collab.isResting;
    const centerAttacked = player.attackedCardsThisTurn.includes('center');
    const collabAttacked = player.attackedCardsThisTurn.includes('collab');
    
    // 攻撃可能なカードが全て攻撃済みかどうか
    if (hasCenter && hasCollab) {
      return centerAttacked && collabAttacked;
    } else if (hasCenter) {
      return centerAttacked;
    } else if (hasCollab) {
      return collabAttacked;
    }
    
    return true; // 攻撃可能なカードがない場合は実行済みとみなす
  }

  /**
   * カードの攻撃済みフラグを設定
   * @param {number} playerId - プレイヤーID
   * @param {string} position - 攻撃したカードのポジション
   */
  markCardAttacked(playerId, position) {
    const player = this.battleEngine.players[playerId];
    const currentTurn = this.battleEngine.gameState.turnCount || 1;
    
    // 攻撃済みカード配列を初期化
    if (!player.attackedCardsThisTurn || player.attackedCardsTurn !== currentTurn) {
      player.attackedCardsThisTurn = [];
      player.attackedCardsTurn = currentTurn;
    }
    
    // 攻撃済みカードに追加
    if (!player.attackedCardsThisTurn.includes(position)) {
      player.attackedCardsThisTurn.push(position);
    }
    
    console.log(`🎭 [Performance] カード攻撃済みマーク設定 - プレイヤー${playerId}, ${position}, ターン${currentTurn}`, player.attackedCardsThisTurn);
  }

  /**
   * 特定のカードが攻撃済みかチェック
   * @param {number} playerId - プレイヤーID
   * @param {string} position - カードのポジション
   * @returns {boolean} 攻撃済みかどうか
   */
  hasCardAttackedThisTurn(playerId, position) {
    const player = this.battleEngine.players[playerId];
    const currentTurn = this.battleEngine.gameState.turnCount || 1;
    
    if (!player.attackedCardsThisTurn || player.attackedCardsTurn !== currentTurn) {
      return false;
    }
    
    return player.attackedCardsThisTurn.includes(position);
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

    // センターとコラボをチェック（お休み状態、攻撃済み状態、アーツ使用可能をチェック）
    if (player.center && !player.center.isResting && !this.hasCardAttackedThisTurn(playerId, 'center')) {
      const availableArts = this.getAvailableArts(player.center);
      if (availableArts.length > 0) {
        attackablePositions.push('center');
        console.log(`✅ [Performance] センター攻撃可能: ${player.center.name} (${availableArts.length}個のアーツ)`);
      } else {
        console.log(`❌ [Performance] センター使用可能アーツなし: ${player.center.name}`);
      }
    } else if (player.center && player.center.isResting) {
      console.log(`😴 [Performance] センターお休み状態: ${player.center.name}`);
    } else if (player.center && this.hasCardAttackedThisTurn(playerId, 'center')) {
      console.log(`❌ [Performance] センター攻撃済み: ${player.center.name}`);
    } else if (!player.center) {
      console.log(`🏠 [Performance] センター空き状態`);
    }
    
    if (player.collab && !player.collab.isResting && !this.hasCardAttackedThisTurn(playerId, 'collab')) {
      const availableArts = this.getAvailableArts(player.collab);
      if (availableArts.length > 0) {
        attackablePositions.push('collab');
        console.log(`✅ [Performance] コラボ攻撃可能: ${player.collab.name} (${availableArts.length}個のアーツ)`);
      } else {
        console.log(`❌ [Performance] コラボ使用可能アーツなし: ${player.collab.name}`);
      }
    } else if (player.collab && player.collab.isResting) {
      console.log(`😴 [Performance] コラボお休み状態: ${player.collab.name}`);
    } else if (player.collab && this.hasCardAttackedThisTurn(playerId, 'collab')) {
      console.log(`❌ [Performance] コラボ攻撃済み: ${player.collab.name}`);
    }

    console.log(`🎯 [Performance] 攻撃可能ポジション: ${attackablePositions.join(', ')}`);

    // 攻撃可能カードをハイライト
    attackablePositions.forEach(position => {
      console.log(`🔧 [Performance] 攻撃ボタン追加中: ${position}`);
      this.addAttackButton(position, playerId);
    });

    // パスボタンを追加（攻撃しないでスキップすることも可能）
    this.addPassButton();

    if (attackablePositions.length === 0) {
      console.log(`❌ [Performance] 攻撃可能なカードがありません`);
      this.showPerformanceMessage('攻撃可能なカードがありません。パフォーマンスステップを終了します');
      
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
    
    // バックポジションの場合は特別な処理
    let cardArea;
    if (position.startsWith('back')) {
      const backSlot = position.replace('back', ''); // back1 -> 1
      const slotIndex = parseInt(backSlot) - 1; // 1 -> 0 (0-based index)
      cardArea = document.querySelector(`${sectionClass} .backs .back-slot[data-slot="${slotIndex}"]`);
    } else {
      cardArea = document.querySelector(`${sectionClass} .${position}`);
    }
    
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

    // アーツ選択を開始
    this.selectArtsForAttack(attacker, playerId);
  }

  /**
   * アーツ選択
   * @param {Object} attacker - 攻撃者カード
   * @param {number} playerId - プレイヤーID
   */
  selectArtsForAttack(attacker, playerId) {
    console.log(`🎨 [Performance] アーツ選択開始: ${attacker.name}`);
    
    // カードのアーツを取得
    const availableArts = this.getAvailableArts(attacker);
    
    if (availableArts.length === 0) {
      console.log(`❌ [Performance] 使用可能なアーツがありません`);
      this.showPerformanceMessage('このカードには使用可能なアーツがありません');
      setTimeout(() => {
        this.endPerformanceStep();
      }, 2000);
      return;
    }

    if (availableArts.length === 1) {
      // アーツが1つの場合は自動選択
      this.currentAttacker.selectedArts = availableArts[0];
      console.log(`🎨 [Performance] アーツ自動選択: ${availableArts[0].name}`);
      this.selectAttackTarget(playerId);
    } else {
      // 複数のアーツがある場合は選択UI表示
      this.showArtsSelectionUI(availableArts, playerId);
    }
  }

  /**
   * 使用可能なアーツを取得
   * @param {Object} card - カード
   * @returns {Array} 使用可能なアーツリスト
   */
  getAvailableArts(card) {
    console.log(`🔍 [Performance] アーツチェック開始: ${card.name}`);
    console.log(`🔍 [Performance] カードスキル:`, card.skills);
    
    if (!card.skills || !Array.isArray(card.skills)) {
      console.log(`❌ [Performance] スキルデータが無効: ${card.skills}`);
      return [];
    }

    const arts = card.skills.filter(skill => skill.type === 'アーツ');
    console.log(`🎨 [Performance] アーツ抽出: ${arts.length}個のアーツを発見`);
    arts.forEach((art, index) => {
      console.log(`  アーツ${index + 1}: ${art.name} (必要: ${art.icons?.main?.join(', ') || '不明'})`);
    });

    const availableArts = [];

    arts.forEach((art, index) => {
      console.log(`🔍 [Performance] アーツ${index + 1}条件チェック: ${art.name}`);
      if (this.canUseArts(card, art)) {
        availableArts.push(art);
        console.log(`✅ [Performance] アーツ${index + 1}使用可能: ${art.name}`);
      } else {
        console.log(`❌ [Performance] アーツ${index + 1}使用不可: ${art.name}`);
      }
    });

    console.log(`🎨 [Performance] アーツチェック結果: ${availableArts.length}/${arts.length}個使用可能`);
    return availableArts;
  }

  /**
   * アーツ使用可能かチェック
   * @param {Object} card - カード
   * @param {Object} arts - アーツ
   * @returns {boolean} 使用可能かどうか
   */
  canUseArts(card, arts) {
    console.log(`🔍 [Performance] ${arts.name}の使用条件チェック開始`);
    
    // お休み状態のカードはアーツ宣言できない
    if (card.isResting || (card.cardState && card.cardState.resting)) {
      console.log(`😴 [Performance] お休み状態のためアーツ宣言不可: ${card.name}`);
      return false;
    }

    if (!arts.icons || !arts.icons.main) {
      console.log(`❌ [Performance] アーツアイコン情報なし: ${arts.name}`);
      console.log(`🔍 [Performance] アーツデータ:`, arts);
      return false;
    }

    const requiredIcons = arts.icons.main;
    const attachedYells = card.yellCards || [];
    
    console.log(`🎨 [Performance] アーツ条件チェック: ${arts.name}`);
    console.log(`🎨 [Performance] 必要エール: ${requiredIcons.join(', ')}`);
    console.log(`🎨 [Performance] 付いているエール: ${attachedYells.length}枚`);
    console.log(`🎨 [Performance] エール詳細:`, attachedYells);

    // エール数チェック
    if (attachedYells.length < requiredIcons.length) {
      console.log(`❌ [Performance] エール不足: 必要${requiredIcons.length}枚、実際${attachedYells.length}枚`);
      return false;
    }

    // 色条件チェック
    const yellColors = attachedYells.map(yell => {
      // StateManagerの色変換メソッドを使用
      if (this.battleEngine.stateManager && this.battleEngine.stateManager.getYellCardColor) {
        return this.battleEngine.stateManager.getYellCardColor(yell);
      } else {
        // フォールバック処理
        const color = yell.color || 'colorless';
        const colorMap = {
          '白': 'white', '緑': 'green', '赤': 'red', 
          '青': 'blue', '黄': 'yellow', '紫': 'purple'
        };
        return colorMap[color] || color.toLowerCase();
      }
    });
    console.log(`🎨 [Performance] エール色配列: [${yellColors.join(', ')}]`);
    
    const result = this.checkColorRequirements(requiredIcons, yellColors);
    console.log(`🎨 [Performance] ${arts.name}色条件チェック結果: ${result ? '✅成功' : '❌失敗'}`);
    
    return result;
  }

  /**
   * 色条件チェック
   * @param {Array} required - 必要な色配列
   * @param {Array} available - 利用可能な色配列
   * @returns {boolean} 条件を満たすかどうか
   */
  checkColorRequirements(required, available) {
    console.log(`🔍 [Color] 色条件チェック開始`);
    console.log(`🔍 [Color] 必要色: [${required.join(', ')}]`);
    console.log(`🔍 [Color] 利用可能色: [${available.join(', ')}]`);
    
    const availableCopy = [...available];
    
    for (let i = 0; i < required.length; i++) {
      const requiredColor = required[i];
      console.log(`🔍 [Color] ステップ${i + 1}: "${requiredColor}"を検索, 残り: [${availableCopy.join(', ')}]`);
      
      if (requiredColor === 'any') {
        // 任意の色でOK
        if (availableCopy.length > 0) {
          const consumed = availableCopy.shift();
          console.log(`✅ [Color] any条件: "${consumed}"を消費`);
          continue;
        } else {
          console.log(`❌ [Color] any条件: エール不足`);
          return false;
        }
      } else {
        // 特定の色が必要
        const colorIndex = availableCopy.indexOf(requiredColor);
        if (colorIndex >= 0) {
          availableCopy.splice(colorIndex, 1);
          console.log(`✅ [Color] 特定色条件: "${requiredColor}"を消費`);
        } else {
          // 代替として 'colorless' や 'any' エールがあるかチェック
          const anyIndex = availableCopy.findIndex(color => color === 'colorless' || color === 'any');
          if (anyIndex >= 0) {
            const substitute = availableCopy[anyIndex];
            availableCopy.splice(anyIndex, 1);
            console.log(`✅ [Color] 代替色使用: "${substitute}"で"${requiredColor}"を代用`);
          } else {
            console.log(`❌ [Color] 色条件不満足: "${requiredColor}"が不足`);
            console.log(`❌ [Color] 探索対象: [${availableCopy.join(', ')}]`);
            return false;
          }
        }
      }
    }
    
    console.log(`✅ [Color] 色条件満足, 残りエール: [${availableCopy.join(', ')}]`);
    return true;
  }

  /**
   * 色条件チェックのテスト用関数（デバッグ用）
   */
  testColorRequirements() {
    console.log('🧪 [Performance] エール色条件テスト開始');
    
    // テストケース1: ["blue", "any", "any"] vs ["blue", "red", "green"]
    const test1 = this.checkColorRequirements(["blue", "any", "any"], ["blue", "red", "green"]);
    console.log(`テスト1 ["blue", "any", "any"] vs ["blue", "red", "green"]: ${test1 ? '✅' : '❌'}`);
    
    // テストケース2: ["blue", "any", "any"] vs ["red", "green", "blue"]
    const test2 = this.checkColorRequirements(["blue", "any", "any"], ["red", "green", "blue"]);
    console.log(`テスト2 ["blue", "any", "any"] vs ["red", "green", "blue"]: ${test2 ? '✅' : '❌'}`);
    
    // テストケース3: ["blue", "any", "any"] vs ["red", "green"] (不足)
    const test3 = this.checkColorRequirements(["blue", "any", "any"], ["red", "green"]);
    console.log(`テスト3 ["blue", "any", "any"] vs ["red", "green"]: ${test3 ? '✅' : '❌'}`);
    
    // テストケース4: ["blue", "any", "any"] vs ["colorless", "red", "green"]
    const test4 = this.checkColorRequirements(["blue", "any", "any"], ["colorless", "red", "green"]);
    console.log(`テスト4 ["blue", "any", "any"] vs ["colorless", "red", "green"]: ${test4 ? '✅' : '❌'}`);
    
    console.log('🧪 [Performance] エール色条件テスト完了');
  }

  /**
   * アーツ選択UI表示
   * @param {Array} arts - 使用可能なアーツリスト
   * @param {number} playerId - プレイヤーID
   */
  showArtsSelectionUI(arts, playerId) {
    console.log(`🎨 [Performance] アーツ選択UI表示: ${arts.length}個のアーツ`);
    
    // アーツ選択パネルを作成
    const selectionPanel = document.createElement('div');
    selectionPanel.id = 'arts-selection-panel';
    selectionPanel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 20px;
      border-radius: 12px;
      z-index: 30;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
      max-width: 500px;
      text-align: center;
    `;

    const title = document.createElement('h3');
    title.textContent = 'アーツを選択してください';
    title.style.marginTop = '0';
    selectionPanel.appendChild(title);

    arts.forEach((art, index) => {
      const artButton = document.createElement('button');
      artButton.style.cssText = `
        display: block;
        width: 100%;
        margin: 8px 0;
        padding: 12px;
        background: rgba(255, 69, 0, 0.8);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s ease;
      `;
      
      const iconsText = art.icons?.main ? art.icons.main.join(' + ') : '';
      const damageText = art.dmg ? `ダメージ: ${art.dmg}` : '';
      
      artButton.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 4px;">${art.name}</div>
        <div style="font-size: 12px; opacity: 0.9;">必要エール: ${iconsText}</div>
        <div style="font-size: 12px; opacity: 0.9;">${damageText}</div>
      `;

      artButton.addEventListener('mouseenter', () => {
        artButton.style.background = 'rgba(255, 69, 0, 1)';
        artButton.style.transform = 'scale(1.02)';
      });

      artButton.addEventListener('mouseleave', () => {
        artButton.style.background = 'rgba(255, 69, 0, 0.8)';
        artButton.style.transform = 'scale(1)';
      });

      artButton.addEventListener('click', () => {
        this.selectArts(art, playerId);
      });

      selectionPanel.appendChild(artButton);
    });

    document.body.appendChild(selectionPanel);
  }

  /**
   * アーツ選択実行
   * @param {Object} selectedArts - 選択されたアーツ
   * @param {number} playerId - プレイヤーID
   */
  selectArts(selectedArts, playerId) {
    console.log(`🎨 [Performance] アーツ選択: ${selectedArts.name}`);
    
    this.currentAttacker.selectedArts = selectedArts;
    
    // アーツ選択パネルを削除
    const panel = document.getElementById('arts-selection-panel');
    if (panel) {
      panel.remove();
    }
    
    this.showPerformanceMessage(`${selectedArts.name}を選択しました`);
    
    // 攻撃対象選択に進む
    setTimeout(() => {
      this.selectAttackTarget(playerId);
    }, 1000);
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
    
    // バックポジションの場合は特別な処理
    let cardArea;
    if (target.position.startsWith('back')) {
      const backSlot = target.position.replace('back', ''); // back1 -> 1
      const slotIndex = parseInt(backSlot) - 1; // 1 -> 0 (0-based index)
      cardArea = document.querySelector(`${sectionClass} .backs .back-slot[data-slot="${slotIndex}"]`);
    } else {
      cardArea = document.querySelector(`${sectionClass} .${target.position}`);
    }
    
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

    if (!this.currentAttacker.selectedArts) {
      console.error('🚨 [Performance] アーツが選択されていません');
      return;
    }

    const attacker = this.currentAttacker.card;
    const defender = target.card;
    const selectedArts = this.currentAttacker.selectedArts;

    console.log(`⚔️ [Performance] 攻撃実行: ${attacker.name} → ${defender.name}`);
    console.log(`🎨 [Performance] 使用アーツ: ${selectedArts.name}`);

    // カード攻撃済みフラグを設定
    this.markCardAttacked(this.currentAttacker.playerId, this.currentAttacker.position);

    // 攻撃ボタンを削除
    this.clearPerformanceButtons();

    // アーツベースのダメージ計算
    const baseDamage = parseInt(selectedArts.dmg) || 0;
    let totalDamage = baseDamage;

    // 特攻ダメージチェック
    if (selectedArts.icons && selectedArts.icons.tokkou) {
      const tokkoeDamage = this.calculateTokkoeDamage(selectedArts.icons.tokkou, defender);
      totalDamage += tokkoeDamage;
      if (tokkoeDamage > 0) {
        console.log(`💥 [Performance] 特攻ダメージ: +${tokkoeDamage}`);
      }
    }

    // 現在HPを取得・計算（StateManagerを使用）
    const stateManager = this.battleEngine.stateManager;
    const currentHP = stateManager.getCurrentHP(defender, target.playerId);
    const maxHP = stateManager.getMaxHP(defender);
    const newHP = Math.max(0, currentHP - totalDamage);

    console.log(`💥 [Performance] ダメージ: ${totalDamage} (基本:${baseDamage}), HP: ${currentHP} → ${newHP}`);

    // StateManagerでHPを更新
    stateManager.setCurrentHP(defender, target.playerId, newHP);

    // ダメージエフェクト表示
    this.showDamageEffect(target, totalDamage);

    // カード撃破チェック
    if (newHP <= 0) {
      this.destroyCard(defender, target.position, target.playerId);
    }

    // HP表示を即座に更新
    if (this.battleEngine.cardDisplayManager) {
      this.battleEngine.cardDisplayManager.updateCardHPDisplay(defender, target.playerId);
    }

    // UI更新
    this.battleEngine.updateUI();

    // 攻撃完了メッセージ
    this.showPerformanceMessage(`${attacker.name}の${selectedArts.name}で${defender.name}に${totalDamage}ダメージ！`);

    // 勝利条件チェック
    this.battleEngine.checkVictoryConditions();

    // 攻撃者をお休み状態にしない（ルール通り）
    
    // 攻撃終了処理
    setTimeout(() => {
      this.currentAttacker = null;
      this.continuePerformanceStep(); // 他にも攻撃可能なカードがあるかチェック
    }, 2000);
  }

  /**
   * 特攻ダメージ計算
   * @param {Array} tokkoeTags - 特攻タグ配列
   * @param {Object} target - 攻撃対象
   * @returns {number} 追加ダメージ
   */
  calculateTokkoeDamage(tokkoeTags, target) {
    let extraDamage = 0;

    tokkoeTags.forEach(tag => {
      // 特攻タグの解析 (例: "赤+50", "青+30")
      const match = tag.match(/^(.+)\+(\d+)$/);
      if (match) {
        const targetColor = match[1];
        const damage = parseInt(match[2]);
        
        // 対象カードの色チェック
        if (target.color === targetColor) {
          extraDamage += damage;
          console.log(`🎯 [Performance] 特攻発動: ${targetColor}色に対して+${damage}ダメージ`);
        }
      }
    });

    return extraDamage;
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
    const stateManager = this.battleEngine.stateManager;

    // 撃破されたカードに付いていたエールをアーカイブに送る
    if (card.yellCards && card.yellCards.length > 0) {
      console.log(`🎯 [Performance] 撃破エール処理: ${card.name}から${card.yellCards.length}枚のエールをアーカイブ`);
      
      player.archive = player.archive || [];
      card.yellCards.forEach(yellCard => {
        player.archive.push(yellCard);
        console.log(`📁 [Performance] エールアーカイブ: ${yellCard.name}`);
      });
      
      // エール情報をクリア
      card.yellCards = [];
    }

    // カードをアーカイブに移動
    player.archive = player.archive || [];
    player.archive.push(card);
    player[position] = null;

    // StateManagerからもHP情報を削除（uniqueIdベース対応）
    if (stateManager && card) {
      const cardKey = (card.cardState && card.cardState.uniqueId) ? card.cardState.uniqueId : card.id;
      if (player.cardHP && player.cardHP[cardKey] !== undefined) {
        delete player.cardHP[cardKey];
        console.log(`🗑️ [Performance] HP情報削除: ${card.name} [${cardKey}]`);
      }
    }

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
    
    // バックポジションの場合は特別な処理
    let cardArea;
    if (target.position.startsWith('back')) {
      const backSlot = target.position.replace('back', ''); // back1 -> 1
      const slotIndex = parseInt(backSlot) - 1; // 1 -> 0 (0-based index)
      cardArea = document.querySelector(`${sectionClass} .backs .back-slot[data-slot="${slotIndex}"]`);
    } else {
      cardArea = document.querySelector(`${sectionClass} .${target.position}`);
    }
    
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
    console.log(`🌟 [Performance] エール配置: ${lifeCard.name} → ${targetCard.name} (${position})`);

    // エールカードとして配置
    if (!targetCard.yellCards) {
      targetCard.yellCards = [];
    }
    
    // ライフカードにエール情報を設定（色情報など）
    const yellCard = {
      ...lifeCard,
      card_type: 'エール' // エールカードとしてマーク
    };
    
    targetCard.yellCards.push(yellCard);
    
    console.log(`✅ [Performance] エール配置完了: ${targetCard.name}に${targetCard.yellCards.length}枚目のエール`);
    console.log(`🎨 [Performance] エール詳細:`, yellCard);

    // StateManagerでカード状態を更新
    if (this.battleEngine.stateManager) {
      try {
        this.battleEngine.stateManager.updateState('UPDATE_CARD_STATE', {
          playerId: playerId,
          position: position,
          card: targetCard,
          stateInfo: {
            yellCards: [...targetCard.yellCards]
          }
        });
      } catch (error) {
        console.warn(`⚠️ [Performance] StateManager更新失敗:`, error);
      }
    }

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
    
    // バックポジションの場合は特別な処理
    let cardArea;
    if (target.position.startsWith('back')) {
      const backSlot = target.position.replace('back', ''); // back1 -> 1
      const slotIndex = parseInt(backSlot) - 1; // 1 -> 0 (0-based index)
      cardArea = document.querySelector(`${sectionClass} .backs .back-slot[data-slot="${slotIndex}"]`);
    } else {
      cardArea = document.querySelector(`${sectionClass} .${target.position}`);
    }
    
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
    if (!this.hasPerformedThisTurn(currentPlayer)) {
      // 続けて攻撃可能
      this.highlightAttackableCards(currentPlayer);
      this.showPerformanceMessage('他にも攻撃できるカードがあります。続けて攻撃するか、パスしてください');
    } else {
      // 攻撃できるカードがない場合は終了
      this.endPerformanceStep();
    }
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
      console.log('🎭 [Performance] パフォーマンスをパス');
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
    
    const player = this.battleEngine.players[playerId];
    let attackCount = 0;

    // センターで攻撃
    if (player.center && !player.center.isResting && !this.hasCardAttackedThisTurn(playerId, 'center')) {
      const availableArts = this.getAvailableArts(player.center);
      if (availableArts.length > 0) {
        const target = this.selectCPUTarget(playerId === 1 ? 2 : 1);
        if (target) {
          const selectedArts = availableArts[0]; // 最初のアーツを選択
          this.executeCPUAttack(player.center, 'center', playerId, target, selectedArts);
          this.markCardAttacked(playerId, 'center');
          attackCount++;
        }
      }
    }

    // コラボで攻撃
    if (player.collab && !player.collab.isResting && !this.hasCardAttackedThisTurn(playerId, 'collab')) {
      const availableArts = this.getAvailableArts(player.collab);
      if (availableArts.length > 0) {
        const target = this.selectCPUTarget(playerId === 1 ? 2 : 1);
        if (target) {
          const selectedArts = availableArts[0]; // 最初のアーツを選択
          this.executeCPUAttack(player.collab, 'collab', playerId, target, selectedArts);
          this.markCardAttacked(playerId, 'collab');
          attackCount++;
        }
      }
    }

    if (attackCount === 0) {
      console.log('🤖 [Performance] CPU: 攻撃対象なし');
    } else {
      console.log(`🤖 [Performance] CPU: ${attackCount}回攻撃実行`);
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
   * @param {Object} selectedArts - 選択されたアーツ
   */
  executeCPUAttack(attacker, attackerPosition, attackerPlayerId, target, selectedArts) {
    console.log(`🤖 [Performance] CPU攻撃: ${attacker.name} → ${target.card.name}`);
    console.log(`🎨 [Performance] CPU使用アーツ: ${selectedArts.name}`);

    // アーツベースのダメージ計算
    const baseDamage = parseInt(selectedArts.dmg) || 0;
    let totalDamage = baseDamage;

    // 特攻ダメージチェック
    if (selectedArts.icons && selectedArts.icons.tokkou) {
      const tokkoeDamage = this.calculateTokkoeDamage(selectedArts.icons.tokkou, target.card);
      totalDamage += tokkoeDamage;
    }

    const currentHP = target.card.current_hp || target.card.hp || 0;
    const newHP = Math.max(0, currentHP - totalDamage);

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
    
    // アーツ選択パネルもクリア
    const artsPanel = document.getElementById('arts-selection-panel');
    if (artsPanel) {
      artsPanel.remove();
    }
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
