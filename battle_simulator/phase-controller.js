/**
 * フェーズ管理コントローラー
 * ゲームのフェーズ進行とステップ実行を管理する
 */
class PhaseController {
  constructor(battleEngine) {
    this.battleEngine = battleEngine;
    
    this.phaseNames = [
      '準備ステップ', // -1
      'リセットステップ', // 0
      '手札ステップ', // 1
      'エールステップ', // 2
      'メインステップ', // 3
      'パフォーマンスステップ', // 4
      'エンドステップ' // 5
    ];
    
    this.phaseInProgress = false; // フェーズ進行制御フラグ
    this.endStepInProgress = false; // エンドステップ重複実行防止フラグ
  }
  
  /**
   * フェーズ名をインデックスから取得
   * @param {number} phaseIndex - フェーズインデックス
   * @returns {string} フェーズ名
   */
  getPhaseNameByIndex(phaseIndex) {
    if (phaseIndex < 0) return '準備ステップ';
    return this.phaseNames[phaseIndex] || '不明なフェーズ';
  }

  /**
   * 次のフェーズに進む
   */
  nextPhase() {
    console.trace();
    
    if (!this.battleEngine.gameState.gameStarted || this.battleEngine.gameState.gameEnded) return;
    
    // 既にフェーズ進行中の場合は実行を避ける
    if (this.phaseInProgress) {
      return;
    }
    
    this.phaseInProgress = true;
    
    // 前のステップ名を記録
    const previousPhase = this.battleEngine.gameState.currentPhase;
    const previousStepName = this.getPhaseNameByIndex(previousPhase);
    
    // 次のフェーズへ移行
    this.battleEngine.gameState.currentPhase++;
    
    
    // 新しいステップ名を取得
    const currentStepName = this.getPhaseNameByIndex(this.battleEngine.gameState.currentPhase);
    const playerName = this.battleEngine.gameState.currentPlayer === 1 ? 'プレイヤー' : '対戦相手';
    
    // ステップ遷移ログを削除（統合ログで処理されるため）
    // if (window.infoPanelManager && previousPhase >= 0) {
    //   window.infoPanelManager.logStepTransition(
    //     playerName, 
    //     previousStepName, 
    //     currentStepName, 
    //     this.battleEngine.gameState.turnCount
    //   );
    // }
    
    // フェーズハイライトを更新
    this.battleEngine.updatePhaseHighlight();
    
    // エンドステップ（フェーズ5）を超えた場合はフェーズ進行を停止
    // （endTurnはexecuteEndStepで処理される）
    if (this.battleEngine.gameState.currentPhase > 5) {
      this.phaseInProgress = false;
      return;
    }
    
    // UI更新（フェーズ情報を先に更新）
    this.battleEngine.updateTurnInfo();
    this.battleEngine.updateUI();
    
    // フェーズ進行フラグをリセット（非同期処理完了後）
    setTimeout(() => {
      this.phaseInProgress = false;
    }, 100);
    
    // 現在のフェーズの処理を実行
    this.executePhase();
  }

  /**
   * 現在のフェーズを実行
   */
  executePhase() {
    const currentPlayer = this.battleEngine.gameState.currentPlayer;
    const phase = this.battleEngine.gameState.currentPhase;
    
    
    // 統合ログは各executeXXXStep()で個別に処理
    
    switch (phase) {
      case -1: // 準備ステップ
        // ゲーム開始前の準備段階、何もしない
        break;
      case 0: // リセットステップ
        this.executeResetStep(currentPlayer);
        break;
      case 1: // 手札ステップ
        this.executeDrawStep(currentPlayer);
        break;
      case 2: // エールステップ
        this.executeYellStep(currentPlayer);
        break;
      case 3: // メインステップ
        this.executeMainStep(currentPlayer);
        break;
      case 4: // パフォーマンスステップ
        this.executePerformanceStep(currentPlayer);
        break;
      case 5: // エンドステップ
        this.executeEndStep(currentPlayer);
        break;
    }
  }

  /**
   * リセットステップの実行
   * @param {number} playerId - プレイヤーID
   */
  executeResetStep(playerId) {
    
    // 統合ログを記録
    if (window.infoPanelManager) {
      const playerName = playerId === 1 ? 'プレイヤー' : '対戦相手';
      window.infoPanelManager.logStepProgress(this.battleEngine.gameState.turnCount, 'リセットステップ', playerName, 'カードをリセット');
    }
    
    // フェーズハイライトを明示的に更新
    this.battleEngine.updatePhaseHighlight();
    
    const player = this.battleEngine.players[playerId];
    
    // 0. センター空きチェックと補充処理（最優先）
    this.checkAndFillCenterSlot(playerId);
    
    // 1. まず、バックにお休みになっているホロメンカードを通常に戻す
    const backPositions = ['back1', 'back2', 'back3', 'back4', 'back5'];
    let resetCount = 0;
    
    backPositions.forEach(pos => {
      if (player[pos] && player[pos].isResting) {
        const playerCard = this.battleEngine.players[playerId][pos];
        
        // Object.definePropertyを使用して確実にリセット
        Object.defineProperty(playerCard, 'isResting', {
          value: false,
          writable: true,
          enumerable: true,
          configurable: true
        });
        
        if (!playerCard.cardState) {
          playerCard.cardState = {};
        }
        Object.defineProperty(playerCard.cardState, 'resting', {
          value: false,
          writable: true,
          enumerable: true,
          configurable: true
        });
        
        // player[pos]も同じオブジェクトを参照するように強制更新
        player[pos] = playerCard;
        
        // player[pos]のプロパティも直接強制設定（ダブル保険）
        Object.defineProperty(player[pos], 'isResting', {
          value: false,
          writable: true,
          enumerable: true,
          configurable: true
        });
        
        if (!player[pos].cardState) {
          player[pos].cardState = {};
        }
        Object.defineProperty(player[pos].cardState, 'resting', {
          value: false,
          writable: true,
          enumerable: true,
          configurable: true
        });
        
        // State Manager経由でも状態を更新
        if (this.battleEngine.stateManager) {
          this.battleEngine.stateManager.updateState('UPDATE_CARD_STATE', {
            playerId: playerId,
            position: pos,
            cardState: { 
              resting: false,
              isResting: false,
              bloomedThisTurn: playerCard.cardState.bloomedThisTurn || false,
              justPlayed: playerCard.cardState.justPlayed || false,
              collabLocked: playerCard.cardState.collabLocked || false,
              playedTurn: playerCard.cardState.playedTurn || 1
            }
          });
        }
        
        resetCount++;
      }
    });
    
    
    // バック状態更新後のUI更新
    if (resetCount > 0) {
      
      // Card Display Manager更新
      if (this.battleEngine.cardDisplayManager) {
        this.battleEngine.cardDisplayManager.updateBackSlots('player');
        this.battleEngine.cardDisplayManager.updateBackSlots('opponent');
      }
      
      // 全体UI更新
      this.battleEngine.updateUI();
      
      // 遅延UI更新で確実に表示反映
      setTimeout(() => {
        if (this.battleEngine.cardDisplayManager) {
          this.battleEngine.cardDisplayManager.updateBackSlots('player');
          this.battleEngine.cardDisplayManager.updateBackSlots('opponent');
        }
        this.battleEngine.updateUI();
      }, 100);
    }
    
    // 2. コラボのホロメンカードを横向きにしてバックに移動
    if (player.collab) {
      const collabCard = player.collab;
      collabCard.isResting = true; // 横向き状態をマーク
      
      // cardState.restingも同期
      if (collabCard.cardState) {
        collabCard.cardState.resting = true;
        // コラボロック状態を解除
        collabCard.cardState.collabLocked = false;
      } else {
        collabCard.cardState = { 
          resting: true,
          collabLocked: false
        };
      }
      
      
      // 空いているバックスロットを探す
      let movedToPos = null;
      for (let pos of backPositions) {
        if (!player[pos]) {
          player[pos] = collabCard;
          player.collab = null;
          movedToPos = pos;
          
          // State Managerを通じても状態を更新
          if (this.battleEngine.stateManager) {
            this.battleEngine.stateManager.updateState('UPDATE_CARD_STATE', {
              playerId: playerId,
              position: pos,
              cardState: { 
                resting: true,
                collabLocked: false // コラボロック解除
              }
            });
          }
          
          // カード表示を即座に更新
          if (window.cardDisplayManager) {
            window.cardDisplayManager.updateCardDisplay(collabCard, pos, playerId);
          }
          
          break;
        }
      }
      
      if (movedToPos) {
        this.battleEngine.updateUI();
      }
    }
    
    // 3. State Managerのコラボ移動フラグをリセット
    if (this.battleEngine.stateManager) {
      // プレイヤーのコラボ移動フラグをリセット
      this.battleEngine.stateManager.updateState('RESET_COLLAB_MOVE', {
        playerId: playerId
      });
    }
    
    // 4. LIMITED効果の使用回数をリセット（player直下と gameState の両方）
    player.usedLimitedThisTurn = false;
    if (player.gameState) {
      player.gameState.usedLimitedThisTurn = false;
    }
    
    // UI更新
    this.battleEngine.updateUI();
    
    // リセットステップは自動で完了し、次のステップへ移行
    setTimeout(() => {
      this.nextPhase();
    }, 2000); // プレイヤーがフェーズを確認できるよう2秒に延長
  }

  /**
   * 手札ステップの実行
   * @param {number} playerId - プレイヤーID
   */
  executeDrawStep(playerId) {
    
    // 統合ログを記録
    if (window.infoPanelManager) {
      const playerName = playerId === 1 ? 'プレイヤー' : '対戦相手';
      window.infoPanelManager.logStepProgress(this.battleEngine.gameState.turnCount, '手札ステップ', playerName, 'カードをドロー');
    }
    
    // デッキからカードを1枚引く
    const drawnCard = this.battleEngine.drawCard(playerId);
    if (drawnCard) {
    } else {
      // デッキ切れの処理
      this.battleEngine.checkVictoryConditions();
      return;
    }
    
    // UI更新
    this.battleEngine.updateUI();
    
    // ドローステップは自動で完了し、次のステップへ移行（プレイヤー・CPU共通）
    setTimeout(() => {
      this.nextPhase();
    }, 2000); // プレイヤーがフェーズを確認できるよう2秒に延長
  }

  /**
   * エールステップの実行
   * @param {number} playerId - プレイヤーID
   */
  executeYellStep(playerId) {
    
    // 統合ログを記録
    if (window.infoPanelManager) {
      const playerName = playerId === 1 ? 'プレイヤー' : '対戦相手';
      window.infoPanelManager.logStepProgress(this.battleEngine.gameState.turnCount, 'エールステップ', playerName, 'エールを配置');
    }
    
    const player = this.battleEngine.players[playerId];
    
    if (player.yellDeck.length === 0) {
      // プレイヤー1・CPU共に自動進行
      if (playerId === 1) {
        setTimeout(() => {
          this.nextPhase();
        }, 1000);
      } else {
        // 自動で次のステップへ移行
        setTimeout(() => {
          this.nextPhase();
        }, 1000);
      }
      return;
    }
    
    // エールデッキからカードを1枚引く
    const yellCard = player.yellDeck.pop();
    
    // 場のホロメンカード（推しホロメン除く）にエールをセット
    const availableTargets = [];
    
    // センターのホロメンをチェック
    if (player.collab) availableTargets.push({ position: 'collab', card: player.collab });
    if (player.center) availableTargets.push({ position: 'center', card: player.center });
    
    // バックのホロメンをチェック
    const backPositions = ['back1', 'back2', 'back3', 'back4', 'back5'];
    backPositions.forEach(pos => {
      if (player[pos]) {
        availableTargets.push({ position: pos, card: player[pos] });
      }
    });
    
    availableTargets.forEach((target, index) => {
    });
    
    if (availableTargets.length > 0) {
      // プレイヤーの場合は選択UI表示、CPUの場合は自動選択
      if (playerId === 1) {
        this.battleEngine.showYellTargetSelection(playerId, yellCard, availableTargets);
        // プレイヤーの場合は選択UIで処理するため、ここでは自動進行しない
      } else {
        // CPUの場合は自動選択
        const target = availableTargets[0];
        this.battleEngine.attachYellCard(playerId, target.position, yellCard);
        
        // UI更新（エール表示を反映）
        this.battleEngine.updateUI();
        this.battleEngine.updateCardAreas();
        
        // 自動で次のステップへ移行
        setTimeout(() => {
          this.nextPhase();
        }, 2000); // フェーズ確認のため2秒に延長
      }
    } else {
      // ホロメンがいない場合はアーカイブへ
      player.archive.push(yellCard);
      
      // UI更新
      this.battleEngine.updateUI();
      
      // プレイヤー1・CPU共に自動進行
      if (playerId === 1) {
        setTimeout(() => {
          this.nextPhase();
        }, 2000);
      } else {
        // 自動で次のステップへ移行
        setTimeout(() => {
          this.nextPhase();
        }, 2000); // フェーズ確認のため2秒に延長
      }
    }
  }

  /**
   * メインステップの実行
   * @param {number} playerId - プレイヤーID
   */
  executeMainStep(playerId) {
    
    // メインステップ開始時にターン制限フラグをリセット（確実にリセットするため）
    if (this.battleEngine.stateManager) {
      this.battleEngine.stateManager.updateState('RESET_TURN_FLAGS', {
        player: playerId
      });
    }
    
    // 統合ログを記録
    if (window.infoPanelManager) {
      const playerName = playerId === 1 ? 'プレイヤー' : '対戦相手';
      const action = playerId === 1 ? 'カードをプレイ' : 'CPU実行中';
      window.infoPanelManager.logStepProgress(this.battleEngine.gameState.turnCount, 'メインステップ', playerName, action);
    }
    
    if (playerId === 1) {
      // プレイヤーの場合は手動操作を待つ（自動進行しない）
      
      // 操作待ちログは統合ログで処理されるため削除
      
      // プレイヤーがフェーズを確認できるよう少し待機
      setTimeout(() => {
      }, 1000);
    } else {
      // CPUの場合は自動進行（CPU AIロジックを呼び出し）
      setTimeout(async () => {
        try {
          if (this.battleEngine.cpuLogic) {
            await this.battleEngine.cpuLogic.cpuMainPhase();
          }
          this.nextPhase();
        } catch (error) {
          this.nextPhase(); // エラーでも進行は続ける
        }
      }, 2000); // フェーズ確認のため2秒に延長
    }
  }

  /**
   * パフォーマンスステップの実行
   * @param {number} playerId - プレイヤーID
   */
  executePerformanceStep(playerId) {
    
    // 統合ログを記録
    if (window.infoPanelManager) {
      const playerName = playerId === 1 ? 'プレイヤー' : '対戦相手';
      const action = playerId === 1 ? '攻撃・スキル使用' : 'CPU実行中';
      window.infoPanelManager.logStepProgress(this.battleEngine.gameState.turnCount, 'パフォーマンスステップ', playerName, action);
    }
    
    // Performance Managerでパフォーマンスステップを実行
    if (this.battleEngine.performanceManager) {
      this.battleEngine.performanceManager.startPerformanceStep(playerId);
    } else {
      console.error('🚨 [Phase] PerformanceManager が初期化されていません');
      // フォールバック：従来の処理
      if (playerId === 1) {
        // プレイヤーの場合は手動操作を待つ（自動進行しない）
        
        // 操作待ちログは統合ログで処理されるため削除
        
        // 手動操作を待つため、ここでは自動進行しない
      } else {
        // CPUの場合は自動進行（CPU AIロジックを呼び出し）
        setTimeout(async () => {
          try {
            if (this.battleEngine.cpuLogic) {
              await this.battleEngine.cpuLogic.cpuPerformancePhase();
            }
            this.nextPhase();
          } catch (error) {
            this.nextPhase(); // エラーでも進行は続ける
          }
        }, 2000);
      }
    }
  }

  /**
   * エンドステップの実行
   * @param {number} playerId - プレイヤーID
   */
  executeEndStep(playerId) {
    
    // 重複実行防止チェック
    if (this.endStepInProgress) {
      return;
    }
    
    this.endStepInProgress = true;
    
    // 統合ログを記録
    if (window.infoPanelManager) {
      const playerName = playerId === 1 ? 'プレイヤー' : '対戦相手';
      window.infoPanelManager.logStepProgress(this.battleEngine.gameState.turnCount, 'エンドステップ', playerName, 'ターン終了処理');
    }
    
    // ターン終了時の処理（LIMITED効果の使用回数をリセット）
    this.battleEngine.stateManager.updateState('UPDATE_PLAYER_GAME_STATE', {
      player: playerId,
      property: 'usedLimitedThisTurn',
      value: false
    });
    
    // エンドステップは自動で完了し、相手のターンに移行（プレイヤー・CPU共通）
    setTimeout(() => {
      this.endStepInProgress = false;
      this.battleEngine.endTurn();
    }, 1000);
  }

  /**
   * センタースロットの空きチェックと補充処理
   * @param {number} playerId - プレイヤーID
   */
  checkAndFillCenterSlot(playerId) {
    const player = this.battleEngine.players[playerId];
    
    // センターが空でない場合は何もしない
    if (player.center) {
      return;
    }

    console.log(`🏠 [PhaseController] センター空き検出 - プレイヤー${playerId}`);

    // 1. バックホロメンから選択して配置
    const backPositions = ['back1', 'back2', 'back3', 'back4', 'back5'];
    const backCards = backPositions
      .map(pos => ({ card: player[pos], position: pos }))
      .filter(item => item.card && item.card.card_type === 'ホロメン');

    if (backCards.length > 0) {
      // バックの最初のホロメンをセンターに移動
      const selectedBack = backCards[0];
      player.center = selectedBack.card;
      player[selectedBack.position] = null;
      
      console.log(`⬆️ [PhaseController] バックからセンターに移動: ${selectedBack.card.name} (${selectedBack.position})`);
      
      // HP情報をStateManagerで保持
      if (this.battleEngine.stateManager && selectedBack.card.id) {
        const currentHP = this.battleEngine.stateManager.getCurrentHP(selectedBack.card, playerId);
        this.battleEngine.stateManager.setCurrentHP(selectedBack.card, playerId, currentHP);
      }
      
      // UI更新
      this.battleEngine.updateUI();
      return;
    }

    // 2. コラボカードをお休み状態でセンターに配置
    if (player.collab) {
      player.center = player.collab;
      player.collab = null;
      
      // お休み状態に設定
      player.center.isResting = true;
      if (!player.center.cardState) {
        player.center.cardState = {};
      }
      player.center.cardState.resting = true;
      
      console.log(`😴 [PhaseController] コラボからセンターにお休み状態で移動: ${player.center.name}`);
      
      // HP情報をStateManagerで保持
      if (this.battleEngine.stateManager && player.center.id) {
        const currentHP = this.battleEngine.stateManager.getCurrentHP(player.center, playerId);
        this.battleEngine.stateManager.setCurrentHP(player.center, playerId, currentHP);
      }
      
      // UI更新
      this.battleEngine.updateUI();
      return;
    }

    console.log(`❌ [PhaseController] センター補充不可 - プレイヤー${playerId}（バック・コラボとも空）`);
  }
}

// PhaseControllerをグローバルで利用可能にする
if (typeof window !== 'undefined') {
  window.PhaseController = PhaseController;
}
