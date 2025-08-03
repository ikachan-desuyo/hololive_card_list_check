/**
 * Turn & Mulligan Manager
 * ターン管理とマリガン処理を担当
 */

class HololiveTurnMulliganManager {
  constructor(battleEngine) {
    this.engine = battleEngine;
    this.gameState = battleEngine.gameState;
    this.players = battleEngine.players;
    this.modalUI = battleEngine.modalUI;
    
    console.log('Turn & Mulligan Manager初期化完了');
  }

  /**
   * ターン終了処理
   */
  endTurn() {
    console.log(`=== ターン終了処理開始 ===`);
    console.log(`現在のプレイヤー: ${this.gameState.currentPlayer} → 切り替え後: ${this.gameState.currentPlayer === 1 ? 2 : 1}`);
    
    // ターン終了
    this.gameState.currentPlayer = this.gameState.currentPlayer === 1 ? 2 : 1;
    this.gameState.currentPhase = 0;
    
    if (this.gameState.currentPlayer === 1) {
      this.gameState.turnCount++;
    }
    
    console.log(`新しいターン - プレイヤー${this.gameState.currentPlayer}, ターン数: ${this.gameState.turnCount}`);
    
    // ターン開始をログに記録
    if (window.infoPanelManager) {
      window.infoPanelManager.logTurnStart(this.gameState.currentPlayer, this.gameState.turnCount);
    }
    
    this.engine.updateTurnInfo();
    this.engine.updateUI();
    
    // フェーズハイライトを更新（重要！）
    this.engine.updatePhaseHighlight();
    
    // 勝利条件の確認
    this.engine.checkVictoryConditions();
    
    console.log(`ターン終了 - プレイヤー${this.gameState.currentPlayer}のターン開始`);
    console.log(`=== ターン終了処理完了 ===`);
    
    // 新しいターンのリセットステップ開始
    // 両プレイヤーとも自動でリセットステップを開始
    setTimeout(() => {
      console.log(`プレイヤー${this.gameState.currentPlayer}のリセットステップ開始`);
      this.engine.executeResetStep(this.gameState.currentPlayer);
    }, 1000);
  }

  /**
   * ターン情報を更新
   */
  updateTurnInfo() {
    let turnInfo = document.querySelector('.turn-info');
    if (!turnInfo) {
      turnInfo = document.createElement('div');
      turnInfo.className = 'turn-info';
      document.body.appendChild(turnInfo);
    }
    
    // 準備ステップの場合は特別な表示
    if (this.gameState.currentPhase === -1) {
      turnInfo.textContent = '準備ステップ - ゲーム開始準備中';
      
      // 情報パネルも更新
      if (window.updateGameStep) {
        window.updateGameStep('準備ステップ', 'ゲーム開始準備中', 0, 'system');
      }
      return;
    }
    
    const playerName = this.gameState.currentPlayer === 1 ? 'プレイヤー' : '対戦相手';
    
    // PhaseControllerが初期化されているかチェック
    const phaseName = this.engine.phaseController 
      ? this.engine.phaseController.phaseNames[this.gameState.currentPhase + 1] 
      : '準備中'; // フォールバック
    
    turnInfo.textContent = `${playerName}のターン - ${phaseName} (ターン${this.gameState.turnCount})`;
    
    // 情報パネルも更新
    if (window.updateGameStep) {
      const currentPlayer = this.gameState.currentPlayer === 1 ? 'player' : 'opponent';
      window.updateGameStep(phaseName, `${playerName}のターン`, this.gameState.turnCount, currentPlayer);
    }
  }

  /**
   * マリガンフェーズ開始
   */
  startMulliganPhase() {
    // 先行・後攻が決定されているか確認
    if (!this.gameState.firstPlayer) {
      console.error('先行・後攻が決定されていません');
      return;
    }
    
    // マリガン状態をリセット
    this.gameState.mulliganCompleted = { 1: false, 2: false };
    this.gameState.mulliganPhase = true;
    console.log('マリガンフェーズ開始');
    
    // 先行プレイヤーから順番にマリガンチェック
    this.checkMulligan(this.gameState.firstPlayer);
  }

  /**
   * マリガンチェック
   */
  checkMulligan(playerId) {
    console.log(`=== checkMulligan 開始 - プレイヤー${playerId} ===`);
    console.log(`現在の完了状態:`, this.getAllMulliganCompleted());
    
    // プレイヤーの存在確認
    if (!playerId || !this.players[playerId]) {
      console.error(`無効なプレイヤーID: ${playerId}`);
      return;
    }
    
    // 既にマリガンが完了している場合はスキップ
    if (this.getMulliganCompleted(playerId)) {
      console.log(`プレイヤー${playerId}のマリガンは既に完了済み - proceedToNextMulliganPlayerを呼び出します`);
      this.proceedToNextMulliganPlayer(playerId);
      return;
    }
    
    const player = this.players[playerId];
    
    // 手札の存在確認
    if (!player.hand || !Array.isArray(player.hand)) {
      console.error(`プレイヤー${playerId}の手札が無効です:`, player.hand);
      return;
    }
    
    console.log(`プレイヤー${playerId}のマリガンチェック開始`);
    
    const hasDebut = player.hand.some(card => 
      card.card_type && card.card_type.includes('ホロメン') && card.bloom_level === 'Debut'
    );
    
    if (!hasDebut) {
      // Debutがない場合は強制マリガン
      console.log(`プレイヤー${playerId}: Debutなし、強制マリガン`);
      this.showMulliganUI(playerId, true);
    } else {
      // Debutがある場合は選択可能
      console.log(`プレイヤー${playerId}: Debutあり、任意マリガン`);
      this.showMulliganUI(playerId, false);
    }
    console.log(`=== checkMulligan 終了 - プレイヤー${playerId} ===`);
  }

  /**
   * マリガンUI表示
   */
  showMulliganUI(playerId, isForced) {
    const player = this.players[playerId];
    const mulliganCount = this.gameState.mulliganCount[playerId];
    
    // モーダルUIでマリガン選択
    this.modalUI.showMulliganModal(playerId, isForced, player.hand, mulliganCount, (doMulligan) => {
      if (doMulligan) {
        this.executeMulligan(playerId);
      } else {
        this.skipMulligan(playerId);
      }
    });
  }

  /**
   * マリガン実行
   */
  executeMulligan(playerId) {
    console.log(`=== executeMulligan 開始 - プレイヤー${playerId} ===`);
    console.log(`現在の完了状態:`, this.getAllMulliganCompleted());
    
    // 既に完了している場合は重複処理を防ぐ
    if (this.getMulliganCompleted(playerId)) {
      console.log(`プレイヤー${playerId}のマリガンは既に完了済み（実行時）- 重複処理をスキップ`);
      return;
    }
    
    const player = this.players[playerId];
    const mulliganCount = this.gameState.mulliganCount[playerId];
    
    console.log(`プレイヤー${playerId}がマリガンを実行（${mulliganCount + 1}回目）`);
    
    // 手札をデッキに戻す
    player.deck.push(...player.hand);
    player.hand = [];
    
    // デッキをシャッフル
    this.engine.shuffleDeck(playerId);
    console.log(`プレイヤー${playerId}のデッキをシャッフルしました`);
    
    // 新しい手札を配る（ペナルティ適用）
    const newHandSize = 7 - mulliganCount;
    for (let i = 0; i < newHandSize; i++) {
      if (player.deck.length > 0) {
        const card = player.deck.pop();
        player.hand.push(card);
      }
    }
    
    console.log(`プレイヤー${playerId}に新しい手札${newHandSize}枚を配りました`);
    
    // マリガン回数を増加
    this.gameState.mulliganCount[playerId]++;
    
    // UIを更新して手札を表示
    this.engine.updateUI();
    
    // 手札表示を強制的に更新（少し遅延を入れる）
    setTimeout(() => {
      this.engine.updateHandDisplay();
    }, 100);
    
    // マリガン完了メッセージ
    const playerName = playerId === 1 ? 'あなた' : '相手';
    alert(`${playerName}がマリガンを実行しました（${newHandSize}枚配布）`);
    
    // 手札にDebutがあるかチェックして、連続マリガンまたは次の処理を決定（setTimeout削除で直接実行）
    try {
      const hasDebut = player.hand.some(card => 
        card.card_type && card.card_type.includes('ホロメン') && card.bloom_level === 'Debut'
      );
      
      if (!hasDebut) {
        // まだDebutがないので、再度マリガンが必要
        console.log(`executeMulligan: Debutなしのため再度checkMulliganを呼び出します（プレイヤー${playerId}）`);
        this.checkMulligan(playerId);
      } else {
        // Debutが見つかったので、次のプレイヤーへ進む
        console.log(`executeMulligan: Debut発見のためproceedToNextMulliganPlayerを呼び出します（プレイヤー${playerId}）`);
        this.proceedToNextMulliganPlayer(playerId);
      }
    } catch (error) {
      console.error('executeMulliganの後処理でエラー:', error);
    }
    console.log(`=== executeMulligan 終了 - プレイヤー${playerId} ===`);
  }

  /**
   * マリガンスキップ
   */
  skipMulligan(playerId) {
    console.log(`🔍🔍🔍 skipMulligan最初のログ - プレイヤー${playerId}`);
    console.log(`🔍 === skipMulligan 開始 - プレイヤー${playerId} ===`);
    
    // 現在の完了状態をチェック
    const currentCompletedStates = this.getAllMulliganCompleted();
    console.log(`🔍 skipMulligan: 現在の完了状態チェック:`, currentCompletedStates);
    
    // 既に完了している場合は重複処理を防ぐ
    const isCompleted = this.getMulliganCompleted(playerId);
    console.log(`🔍 skipMulligan: プレイヤー${playerId}の完了状態チェック結果: ${isCompleted}`);
    
    if (isCompleted) {
      console.log(`🔍 ⚠️ プレイヤー${playerId}のマリガンは既に完了済み（スキップ時）- 重複処理をスキップして終了`);
      return;
    }
    
    console.log(`🔍 プレイヤー${playerId}がマリガンをスキップ実行中`);
    
    // マリガンスキップメッセージ
    const playerName = playerId === 1 ? 'あなた' : '相手';
    alert(`${playerName}がマリガンをスキップしました`);
    
    // 次のプレイヤーまたはDebut配置フェーズへ（setTimeout削除で直接実行）
    try {
      console.log(`🔍 skipMulligan: proceedToNextMulliganPlayerを呼び出します（プレイヤー${playerId}）`);
      this.proceedToNextMulliganPlayer(playerId);
    } catch (error) {
      console.error('🔍 proceedToNextMulliganPlayerでエラー:', error);
    }
    console.log(`🔍 === skipMulligan 終了 - プレイヤー${playerId} ===`);
  }

  /**
   * 次のマリガンプレイヤーへ進む
   */
  proceedToNextMulliganPlayer(currentPlayerId) {
    console.log(`🔍 === proceedToNextMulliganPlayer 開始 ===`);
    console.log(`🔍 現在のプレイヤー: ${currentPlayerId}`);
    console.log(`🔍 現在の完了状態:`, this.getAllMulliganCompleted());
    
    // マリガン完了状態をマーク（State Managerを使用）
    if (this.engine.stateManager) {
      const currentCount = this.gameState.mulliganCount[currentPlayerId] || 0;
      this.engine.stateManager.updateState('MULLIGAN_COMPLETE', {
        player: currentPlayerId,
        count: currentCount
      });
      console.log(`🔍 State Manager経由でプレイヤー${currentPlayerId}を完了マーク（count: ${currentCount}）`);
    } else {
      // フォールバック: 直接更新
      this.gameState.mulliganCompleted[currentPlayerId] = true;
      console.log(`🔍 直接更新でプレイヤー${currentPlayerId}を完了マーク`);
    }
    console.log(`🔍 更新後の完了状態:`, this.getAllMulliganCompleted());
    
    // 両プレイヤーのマリガンが完了したかチェック
    const completedStates = this.getAllMulliganCompleted();
    console.log(`🔍 両プレイヤー完了チェック: P1=${completedStates[1]}, P2=${completedStates[2]}`);
    
    if (completedStates[1] && completedStates[2]) {
      console.log('🔍 両プレイヤーのマリガンが完了しました - Debut配置フェーズへ');
      // 両プレイヤーのマリガンが完了
      this.engine.startDebutPlacementPhase();
      return;
    }
    
    // 次のプレイヤーを決定
    const nextPlayerId = currentPlayerId === 1 ? 2 : 1;
    console.log(`🔍 次のプレイヤー: ${nextPlayerId}`);
    
    const nextPlayerCompleted = this.getMulliganCompleted(nextPlayerId);
    console.log(`🔍 次のプレイヤー${nextPlayerId}の完了状態: ${nextPlayerCompleted}`);
    
    // 次のプレイヤーがまだマリガンを完了していない場合のみ処理
    if (!nextPlayerCompleted) {
      console.log(`🔍 プレイヤー${nextPlayerId}はまだ未完了 - マリガンチェック開始`);
      
      if (nextPlayerId === 2) {
        // CPU のマリガン判定
        this.cpuMulliganDecision(nextPlayerId);
      } else {
        // プレイヤー1のマリガン
        this.checkMulligan(nextPlayerId);
      }
    } else {
      // 両プレイヤーが完了している場合、Debut配置フェーズへ
      console.log('🔍 次のプレイヤーも既に完了済み - Debut配置フェーズへ');
      this.engine.startDebutPlacementPhase();
    }
    console.log(`🔍 === proceedToNextMulliganPlayer 終了 ===`);
  }

  /**
   * CPUマリガン判定
   */
  cpuMulliganDecision(playerId) {
    console.log(`🔍🔍🔍 === CPUマリガン判定開始 - プレイヤー${playerId} ===`);
    
    // 現在の完了状態をチェック
    const currentCompletedStates = this.getAllMulliganCompleted();
    console.log(`🔍 CPU: 現在の完了状態チェック:`, currentCompletedStates);
    
    // 既に完了している場合はスキップ
    const isCompleted = this.getMulliganCompleted(playerId);
    console.log(`🔍 CPU: プレイヤー${playerId}の完了状態: ${isCompleted}`);
    
    if (isCompleted) {
      console.log(`🔍 ⚠️ プレイヤー${playerId}のマリガンは既に完了済み（CPU）- proceedToNextMulliganPlayerを呼び出します`);
      this.proceedToNextMulliganPlayer(playerId);
      return;
    }
    
    const player = this.players[playerId];
    const hasDebut = player.hand.some(card => 
      card.card_type && card.card_type.includes('ホロメン') && card.bloom_level === 'Debut'
    );
    
    console.log(`🔍 CPU: プレイヤー${playerId}のDebut有無: ${hasDebut}`);
    
    if (!hasDebut) {
      // Debutがない場合は強制マリガン
      console.log('🔍 CPU: Debutがないので強制マリガンします');
      this.executeMulligan(playerId);
    } else {
      // 簡単なAI判定：手札が悪い場合マリガン
      const goodCards = player.hand.filter(card => 
        (card.card_type && card.card_type.includes('ホロメン')) || 
        (card.card_type && card.card_type.includes('サポート'))
      ).length;
      
      console.log(`🔍 CPU: 良いカード枚数: ${goodCards}`);
      
      // 3枚未満の場合はマリガン
      if (goodCards < 3) {
        console.log('🔍 CPU: 手札が悪いのでマリガンします');
        this.executeMulligan(playerId);
      } else {
        console.log('🔍 CPU: 手札が良いのでマリガンをスキップします');
        this.skipMulligan(playerId);
      }
    }
    console.log(`🔍 === CPUマリガン判定終了 - プレイヤー${playerId} ===`);
  }

  /**
   * マリガン完了状態を取得（State Manager対応）
   */
  getMulliganCompleted(playerId) {
    console.log(`🔍 getMulliganCompleted(${playerId}) 開始`);
    
    if (this.engine.stateManager) {
      const state = this.engine.stateManager.getState();
      console.log(`🔍 State Manager state.mulligan:`, state.mulligan);
      const completed = state.mulligan && state.mulligan.completed && state.mulligan.completed[playerId];
      console.log(`🔍 getMulliganCompleted(${playerId}): State Manager経由 = ${completed}`);
      return !!completed;
    }
    
    const completed = this.gameState.mulliganCompleted[playerId];
    console.log(`🔍 getMulliganCompleted(${playerId}): 直接アクセス = ${completed}`);
    console.log(`🔍 gameState.mulliganCompleted:`, this.gameState.mulliganCompleted);
    return !!completed;
  }

  /**
   * 全プレイヤーのマリガン完了状態を取得
   */
  getAllMulliganCompleted() {
    console.log(`🔍 getAllMulliganCompleted() 開始`);
    
    if (this.engine.stateManager) {
      const state = this.engine.stateManager.getState();
      console.log(`🔍 State Manager full state:`, state);
      const completed = state.mulligan && state.mulligan.completed ? state.mulligan.completed : { 1: false, 2: false };
      console.log(`🔍 getAllMulliganCompleted: State Manager経由 =`, completed);
      return completed;
    }
    
    console.log(`🔍 getAllMulliganCompleted: 直接アクセス =`, this.gameState.mulliganCompleted);
    console.log(`🔍 gameState全体:`, this.gameState);
    return this.gameState.mulliganCompleted;
  }

  /**
   * 手札にDebutがあるかチェック
   */
  hasDebutInHand(playerId) {
    const player = this.players[playerId];
    if (!player || !player.hand) return false;
    
    return player.hand.some(card => 
      card.card_type && card.card_type.includes('ホロメン') && card.bloom_level === 'Debut'
    );
  }

  /**
   * マリガン状態をリセット
   */
  resetMulliganState() {
    this.gameState.mulliganPhase = false;
    this.gameState.mulliganCount = { 1: 0, 2: 0 };
    this.gameState.mulliganCompleted = { 1: false, 2: false };
  }

  /**
   * ターン関連の状態をリセット
   */
  resetTurnState() {
    this.gameState.currentPlayer = 1;
    this.gameState.currentPhase = -1;
    this.gameState.turnCount = 1;
    this.gameState.turnOrderDecided = false;
  }
}

// グローバルスコープに公開
window.HololiveTurnMulliganManager = HololiveTurnMulliganManager;
