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
        this.battleEngine.executeYellStep(currentPlayer);
        break;
      case 3: // メインステップ
        this.battleEngine.executeMainStep(currentPlayer);
        break;
      case 4: // パフォーマンスステップ
        this.battleEngine.executePerformanceStep(currentPlayer);
        break;
      case 5: // エンドステップ
        this.battleEngine.executeEndStep(currentPlayer);
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
    
    // センター1のホロメンカードを横向きにしてバックに移動
    if (player.center1) {
      const center1Card = player.center1;
      center1Card.isResting = true; // 横向き状態をマーク
      
      // 空いているバックスロットを探す
      const backPositions = ['back1', 'back2', 'back3', 'back4', 'back5'];
      for (let pos of backPositions) {
        if (!player[pos]) {
          player[pos] = center1Card;
          player.center1 = null;
          console.log(`${center1Card.name}をセンター1からバック(${pos})に移動（横向き）`);
          break;
        }
      }
    }
    
    // センター1が空の場合：バックの横向きホロメンカードをチェック
    if (!player.center1) {
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
      // センター1にカードがある場合は通常通りバックの横向きカードを縦に戻す
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
}

// PhaseControllerをグローバルで利用可能にする
if (typeof window !== 'undefined') {
  window.PhaseController = PhaseController;
}
