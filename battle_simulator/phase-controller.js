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
        this.battleEngine.executeResetStep(currentPlayer);
        break;
      case 1: // 手札ステップ
        this.battleEngine.executeDrawStep(currentPlayer);
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
}

// PhaseControllerをグローバルで利用可能にする
if (typeof window !== 'undefined') {
  window.PhaseController = PhaseController;
}
