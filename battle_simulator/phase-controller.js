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
    console.log(`=== nextPhase 呼び出し ===`);
    console.log(`gameStarted: ${this.battleEngine.gameState.gameStarted}, gameEnded: ${this.battleEngine.gameState.gameEnded}`);
    console.log(`現在のプレイヤー: ${this.battleEngine.gameState.currentPlayer}`);
    console.log(`現在のフェーズ: ${this.battleEngine.gameState.currentPhase}`);
    console.log(`ターン数: ${this.battleEngine.gameState.turnCount}`);
    console.log(`呼び出し元のスタックトレース:`);
    console.trace();
    console.log(`========================`);
    
    if (!this.battleEngine.gameState.gameStarted || this.battleEngine.gameState.gameEnded) return;
    
    // 既にフェーズ進行中の場合は実行を避ける
    if (this.phaseInProgress) {
      console.log('フェーズ進行中のため、次のフェーズ呼び出しをスキップします');
      return;
    }
    
    this.phaseInProgress = true;
    
    // 前のステップ名を記録
    const previousPhase = this.battleEngine.gameState.currentPhase;
    const previousStepName = this.getPhaseNameByIndex(previousPhase);
    
    // 次のフェーズへ移行
    this.battleEngine.gameState.currentPhase++;
    
    console.log(`フェーズ更新後: ${this.battleEngine.gameState.currentPhase}`);
    
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
      console.log(`フェーズ5を超えました - executeEndStepでターン終了処理が実行されます`);
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
    
    console.log(`=== executePhase デバッグ ===`);
    console.log(`currentPlayer: ${currentPlayer}, phase: ${phase}`);
    console.log(`turnCount: ${this.battleEngine.gameState.turnCount}`);
    console.log(`window.infoPanelManager exists: ${!!window.infoPanelManager}`);
    console.log(`==========================`);
    
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
    console.log(`=== executeResetStep ===`);
    console.log(`プレイヤー${playerId}のリセットステップを実行`);
    console.log(`現在のcurrentPlayer: ${this.battleEngine.gameState.currentPlayer}`);
    console.log(`現在のcurrentPhase: ${this.battleEngine.gameState.currentPhase}`);
    console.log(`ターン数: ${this.battleEngine.gameState.turnCount}`);
    console.log(`======================`);
    
    // 統合ログを記録
    if (window.infoPanelManager) {
      const playerName = playerId === 1 ? 'プレイヤー' : '対戦相手';
      window.infoPanelManager.logStepProgress(this.battleEngine.gameState.turnCount, 'リセットステップ', playerName, 'カードをリセット');
    }
    
    // フェーズハイライトを明示的に更新
    this.battleEngine.updatePhaseHighlight();
    
    const player = this.battleEngine.players[playerId];
    
    // コラボのホロメンカードを横向きにしてバックに移動
    if (player.collab) {
      const collabCard = player.collab
      collabCard.isResting = true; // 横向き状態をマーク
      
      // 空いているバックスロットを探す
      const backPositions = ['back1', 'back2', 'back3', 'back4', 'back5'];
      for (let pos of backPositions) {
        if (!player[pos]) {
          player[pos] = collabCard;
          player.collab= null;
          console.log(`${collabCard.name}をコラボからバック(${pos})に移動（横向き）`);
          break;
        }
      }
    }
    
    // コラボが空の場合：バックの横向きホロメンカードをチェック
    if (!player.collab) {
      const backPositions = ['back1', 'back2', 'back3', 'back4', 'back5'];
      let hasRestingCard = false;
      
      // 横向きのホロメンカードがあるかチェック
      backPositions.forEach(pos => {
        if (player[pos] && player[pos].isResting) {
          hasRestingCard = true;
        }
      });
      
      if (hasRestingCard) {
        // 横向きカードがある場合は縦に戻す
        backPositions.forEach(pos => {
          if (player[pos] && player[pos].isResting) {
            player[pos].isResting = false;
            console.log(`${player[pos].name}を縦向きに戻しました`);
          }
        });
      } else {
        // 横向きカードがない場合は特に処理なし
        console.log('横向きのホロメンカードがないため、特に処理を行いません');
      }
    } else {
      // コラボにカードがある場合は通常通りバックの横向きカードを縦に戻す
      const backPositions = ['back1', 'back2', 'back3', 'back4', 'back5'];
      backPositions.forEach(pos => {
        if (player[pos] && player[pos].isResting) {
          player[pos].isResting = false;
          console.log(`${player[pos].name}を縦向きに戻しました`);
        }
      });
    }
    
    // UI更新
    this.battleEngine.updateUI();
    
    // リセットステップは自動で完了し、次のステップへ移行
    console.log('リセットステップ完了 - 自動でドローステップに進みます');
    setTimeout(() => {
      this.nextPhase();
    }, 2000); // プレイヤーがフェーズを確認できるよう2秒に延長
  }

  /**
   * 手札ステップの実行
   * @param {number} playerId - プレイヤーID
   */
  executeDrawStep(playerId) {
    console.log(`=== executeDrawStep ===`);
    console.log(`プレイヤー${playerId}の手札ステップを実行`);
    console.log(`現在のcurrentPlayer: ${this.battleEngine.gameState.currentPlayer}`);
    console.log(`ターン数: ${this.battleEngine.gameState.turnCount}`);
    console.log(`======================`);
    
    // 統合ログを記録
    if (window.infoPanelManager) {
      const playerName = playerId === 1 ? 'プレイヤー' : '対戦相手';
      window.infoPanelManager.logStepProgress(this.battleEngine.gameState.turnCount, '手札ステップ', playerName, 'カードをドロー');
    }
    
    // デッキからカードを1枚引く
    const drawnCard = this.battleEngine.drawCard(playerId);
    if (drawnCard) {
      console.log(`プレイヤー${playerId}がカードを1枚引きました:`, drawnCard.name);
    } else {
      console.log(`プレイヤー${playerId}のデッキが空です`);
      // デッキ切れの処理
      this.battleEngine.checkVictoryConditions();
      return;
    }
    
    // UI更新
    this.battleEngine.updateUI();
    
    // ドローステップは自動で完了し、次のステップへ移行（プレイヤー・CPU共通）
    console.log('ドローステップ完了 - 自動でエールステップに進みます');
    setTimeout(() => {
      this.nextPhase();
    }, 2000); // プレイヤーがフェーズを確認できるよう2秒に延長
  }

  /**
   * エールステップの実行
   * @param {number} playerId - プレイヤーID
   */
  executeYellStep(playerId) {
    console.log(`=== executeYellStep ===`);
    console.log(`プレイヤー${playerId}のエールステップを実行`);
    console.log(`現在のcurrentPlayer: ${this.battleEngine.gameState.currentPlayer}`);
    console.log(`ターン数: ${this.battleEngine.gameState.turnCount}`);
    console.log(`======================`);
    
    // 統合ログを記録
    if (window.infoPanelManager) {
      const playerName = playerId === 1 ? 'プレイヤー' : '対戦相手';
      window.infoPanelManager.logStepProgress(this.battleEngine.gameState.turnCount, 'エールステップ', playerName, 'エールを配置');
    }
    
    const player = this.battleEngine.players[playerId];
    
    if (player.yellDeck.length === 0) {
      console.log(`プレイヤー${playerId}のエールデッキが空です`);
      // プレイヤー1・CPU共に自動進行
      if (playerId === 1) {
        console.log('エールデッキが空です - 自動でメインステップに進みます');
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
    console.log(`プレイヤー${playerId}がエールカードを引きました:`, yellCard.name);
    
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
    
    console.log(`エール配置可能なターゲット数: ${availableTargets.length}`);
    availableTargets.forEach((target, index) => {
      console.log(`ターゲット${index}: ${target.position} - ${target.card.name}`);
    });
    
    if (availableTargets.length > 0) {
      // プレイヤーの場合は選択UI表示、CPUの場合は自動選択
      if (playerId === 1) {
        console.log('プレイヤー用エール選択UIを表示します');
        this.battleEngine.showYellTargetSelection(playerId, yellCard, availableTargets);
        // プレイヤーの場合は選択UIで処理するため、ここでは自動進行しない
      } else {
        // CPUの場合は自動選択
        console.log('CPU用自動エール配置を実行します');
        const target = availableTargets[0];
        console.log(`CPU選択ターゲット: ${target.position} - ${target.card.name}`);
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
      console.log(`エールカードをアーカイブに送りました: ${yellCard.name}`);
      
      // UI更新
      this.battleEngine.updateUI();
      
      // プレイヤー1・CPU共に自動進行
      if (playerId === 1) {
        console.log('エールカードをアーカイブに送りました - 自動でメインステップに進みます');
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
    console.log(`プレイヤー${playerId}のメインステップ`);
    
    // 統合ログを記録
    if (window.infoPanelManager) {
      const playerName = playerId === 1 ? 'プレイヤー' : '対戦相手';
      const action = playerId === 1 ? 'カードをプレイ' : 'CPU実行中';
      window.infoPanelManager.logStepProgress(this.battleEngine.gameState.turnCount, 'メインステップ', playerName, action);
    }
    
    if (playerId === 1) {
      // プレイヤーの場合は手動操作を待つ（自動進行しない）
      console.log('メインステップです。カードをプレイした後、「次のフェーズ」ボタンを押してください。');
      
      // 操作待ちログは統合ログで処理されるため削除
      
      // プレイヤーがフェーズを確認できるよう少し待機
      setTimeout(() => {
        console.log('プレイヤーのメインステップ - 操作をお待ちしています');
      }, 1000);
    } else {
      // CPUの場合は自動進行（CPU AIロジックを呼び出し）
      console.log('CPU用メインステップ処理を開始します');
      setTimeout(async () => {
        try {
          if (this.battleEngine.cpuLogic) {
            console.log('CPUメインフェーズ実行中...');
            await this.battleEngine.cpuLogic.cpuMainPhase();
            console.log('CPUメインフェーズ完了');
          }
          console.log('CPUメインステップからパフォーマンスステップへ移行');
          this.nextPhase();
        } catch (error) {
          console.error('CPUメインステップでエラー:', error);
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
    console.log(`プレイヤー${playerId}のパフォーマンスステップ`);
    
    // 統合ログを記録
    if (window.infoPanelManager) {
      const playerName = playerId === 1 ? 'プレイヤー' : '対戦相手';
      const action = playerId === 1 ? '攻撃・スキル使用' : 'CPU実行中';
      window.infoPanelManager.logStepProgress(this.battleEngine.gameState.turnCount, 'パフォーマンスステップ', playerName, action);
    }
    
    if (playerId === 1) {
      // プレイヤーの場合は手動操作を待つ（自動進行しない）
      console.log('パフォーマンスステップです。攻撃やスキルを使用した後、「ターン終了」ボタンを押してください。');
      
      // 操作待ちログは統合ログで処理されるため削除
      
      // 手動操作を待つため、ここでは自動進行しない
    } else {
      // CPUの場合は自動進行（CPU AIロジックを呼び出し）
      console.log('CPU用パフォーマンスステップ処理を開始します');
      setTimeout(async () => {
        try {
          if (this.battleEngine.cpuLogic) {
            console.log('CPUパフォーマンスフェーズ実行中...');
            await this.battleEngine.cpuLogic.cpuPerformancePhase();
            console.log('CPUパフォーマンスフェーズ完了');
          }
          console.log('CPUパフォーマンスステップからエンドステップへ移行');
          this.nextPhase();
        } catch (error) {
          console.error('CPUパフォーマンスステップでエラー:', error);
          this.nextPhase(); // エラーでも進行は続ける
        }
      }, 2000);
    }
  }

  /**
   * エンドステップの実行
   * @param {number} playerId - プレイヤーID
   */
  executeEndStep(playerId) {
    console.log(`プレイヤー${playerId}のエンドステップを実行`);
    
    // 重複実行防止チェック
    if (this.endStepInProgress) {
      console.log(`⚠️ エンドステップ重複実行防止: プレイヤー${playerId}のエンドステップは既に進行中です`);
      return;
    }
    
    this.endStepInProgress = true;
    console.log(`🔒 エンドステップ進行中フラグを設定: プレイヤー${playerId}`);
    
    // 統合ログを記録
    if (window.infoPanelManager) {
      const playerName = playerId === 1 ? 'プレイヤー' : '対戦相手';
      window.infoPanelManager.logStepProgress(this.battleEngine.gameState.turnCount, 'エンドステップ', playerName, 'ターン終了処理');
    }
    
    // ターン終了時の処理（LIMITEDカード制限のみリセット）
    this.battleEngine.players[playerId].usedLimitedThisTurn = [];
    
    // エンドステップは自動で完了し、相手のターンに移行（プレイヤー・CPU共通）
    console.log('エンドステップ完了 - 自動で相手のリセットステップに移行します');
    setTimeout(() => {
      console.log(`🔓 エンドステップ進行中フラグをクリア: プレイヤー${playerId}`);
      this.endStepInProgress = false;
      this.battleEngine.endTurn();
    }, 1000);
  }
}

// PhaseControllerをグローバルで利用可能にする
if (typeof window !== 'undefined') {
  window.PhaseController = PhaseController;
}
