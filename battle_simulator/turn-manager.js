/**
 * Turn Manager
 * ターン管理とマリガン処理を担当
 */

class HololiveTurnManager {
  constructor(battleEngine) {
    this.engine = battleEngine;
    this.gameState = battleEngine.gameState;
    this.players = battleEngine.players;
    this.modalUI = battleEngine.modalUI;
    
  }

  /**
   * ターン終了処理
   */
  endTurn() {
    
    // エンドステップフラグをリセット（重複実行防止）
    if (this.engine.phaseController) {
      this.engine.phaseController.endStepInProgress = false;
    }
    
    // 現在のプレイヤー（ターン終了するプレイヤー）のブルームフラグをリセット
    const currentPlayer = this.gameState.currentPlayer;
    this.engine.stateManager.updateState('RESET_TURN_FLAGS', {
      player: currentPlayer
    });
    
    // ターン終了 - State Manager経由で安全に更新
    const nextPlayer = this.gameState.currentPlayer === 1 ? 2 : 1;
    this.engine.stateManager.updateState('PLAYER_CHANGE', { player: nextPlayer });
    this.engine.stateManager.updateState('PHASE_CHANGE', { phase: 0 });
    
    // プレイヤー別ターン数を更新（新しいプレイヤーのターン開始時に増加）
    const newPlayer = this.gameState.currentPlayer;
    const currentPlayerTurnCount = this.engine.stateManager.getStateByPath(`turn.playerTurnCount.${newPlayer}`) || 0;
    const newPlayerTurnCount = currentPlayerTurnCount + 1;
    
    // State Managerを通じてプレイヤー別ターン数を更新
    this.engine.stateManager.updateState('UPDATE_PLAYER_TURN', {
      player: newPlayer,
      turnCount: newPlayerTurnCount
    });
    
    
    // 全体ターン数の更新（プレイヤー1に戻った時のみ）
    if (this.gameState.currentPlayer === 1) {
      // プレイヤー1に戻った時は常に全体ターン数を増加
      // ただし、ゲーム最初のプレイヤー1のターンは除外
      const player1TurnCount = newPlayerTurnCount; // 上で更新済み
      if (player1TurnCount > 1) {
        // プレイヤー1が既に2回以上ターンを実行している場合のみ増加（初回を除く）
        this.engine.stateManager.updateState('TURN_COUNT_CHANGE', { 
          count: this.gameState.turnCount + 1 
        });
      } else {
      }
    }
    
    
    // プレイヤー別ターン回数を取得してログに含める（プレイヤー切り替え後の状態）
    setTimeout(() => {
      const playerTurnCount = this.engine.stateManager.getStateByPath(`turn.playerTurnCount.${this.gameState.currentPlayer}`) || 0;
      
      // ターン開始をログに記録（プレイヤー別ターン回数を表示）
      if (window.infoPanelManager) {
        window.infoPanelManager.logTurnStart(`プレイヤー${this.gameState.currentPlayer}(${playerTurnCount + 1}回目)`, this.gameState.turnCount);
      }
    }, 100);
    
    this.engine.updateTurnInfo();
    this.engine.updateUI();
    
    // フェーズハイライトを更新（重要！）
    this.engine.updatePhaseHighlight();
    
    // 勝利条件の確認
    this.engine.checkVictoryConditions();
    
    
    // 新しいターンのリセットステップ開始
    // 両プレイヤーとも自動でリセットステップを開始
    setTimeout(() => {
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
    
    // プレイヤー別ターン回数を取得
    const playerTurnCount = this.engine.stateManager.getStateByPath(`turn.playerTurnCount.${this.gameState.currentPlayer}`) || 0;
    
    // PhaseControllerが初期化されているかチェック
    const phaseName = this.engine.phaseController 
      ? this.engine.phaseController.phaseNames[this.gameState.currentPhase + 1] 
      : '準備中'; // フォールバック
    
    turnInfo.textContent = `${playerName}のターン${playerTurnCount} - ${phaseName} (全体ターン${this.gameState.turnCount})`;
    
    // 情報パネルも更新
    if (window.updateGameStep) {
      const currentPlayer = this.gameState.currentPlayer === 1 ? 'player' : 'opponent';
      window.updateGameStep(phaseName, `${playerName}のターン${playerTurnCount}`, this.gameState.turnCount, currentPlayer);
    }
  }

  /**
   * マリガンフェーズ開始
   */
  startMulliganPhase() {
    // 先行・後攻が決定されているか確認
    if (!this.gameState.firstPlayer) {
      // Game Setup Managerの先行・後攻決定処理を呼び出し
      if (this.engine.setupManager && this.engine.setupManager.decideTurnOrder) {
        this.engine.setupManager.decideTurnOrder();
        return; // 先行・後攻決定後に再度startMulliganPhaseが呼ばれる
      } else {
        return;
      }
    }
    
    // マリガンフェーズ開始 - State Manager経由
    this.engine.stateManager.updateState('MULLIGAN_START', {});
    
    // 先行プレイヤーから順番にマリガンチェック
    this.checkMulligan(this.gameState.firstPlayer);
  }

  /**
   * マリガンチェック
   */
  checkMulligan(playerId) {
    
    // プレイヤーの存在確認
    if (!playerId || !this.players[playerId]) {
      return;
    }
    
    const player = this.players[playerId];
    
    // 手札の存在確認
    if (!player.hand || !Array.isArray(player.hand)) {
      return;
    }
    
    const hasDebut = player.hand.some(card => 
      card.card_type && card.card_type.includes('ホロメン') && card.bloom_level === 'Debut'
    );
    
    
    if (!hasDebut) {
      // Debutがない場合は強制マリガン
      this.showMulliganUI(playerId, true);
    } else {
      // Debutがある場合は選択可能
      this.showMulliganUI(playerId, false);
    }
    
  }

  /**
   * マリガンUI表示
   */
  showMulliganUI(playerId, isForced) {
    
    const player = this.players[playerId];
    const mulliganCount = this.gameState.mulliganCount[playerId];
    
    
    // 既存のモーダルを確実に削除してから新しいモーダルを表示
    const existingModal = document.getElementById('mulligan-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    // 少し遅延を入れてからモーダルを表示（DOM更新を確実にする）
    setTimeout(() => {
      
      // モーダルUIでマリガン選択
      try {
        this.modalUI.showMulliganModal(playerId, isForced, player.hand, mulliganCount, (doMulligan) => {
          
          // 重複処理チェック
          if (this.gameState.mulliganCompleted[playerId]) {
            return;
          }
          
          try {
            if (doMulligan) {
              this.executeMulligan(playerId);
            } else {
              this.skipMulligan(playerId);
            }
          } catch (error) {
          }
          
        });
      } catch (error) {
      }
      
    }, 200); // 200ms遅延でDOM更新を確実にする
  }

  /**
   * マリガン実行
   */
  executeMulligan(playerId) {
    const player = this.players[playerId];
    const mulliganCount = this.gameState.mulliganCount[playerId];
    
    
    // 手札をデッキに戻す
    player.deck.push(...player.hand);
    player.hand = [];
    
    // デッキをシャッフル
    this.engine.shuffleDeck(playerId);
    
    // マリガン回数を増加（手札配布前に増加）
    
    // State Managerを通じてマリガン回数を更新
    const currentCount = this.gameState.mulliganCount[playerId] || 0;
    const newCount = currentCount + 1;
    
    // State Managerでマリガン回数を更新
    if (this.engine.stateManager) {
      const newCounts = { ...this.gameState.mulliganCount };
      newCounts[playerId] = newCount;
      this.engine.stateManager.updateState('SET_MULLIGAN_COUNT', { counts: newCounts });
    } else {
      // フォールバック: 直接更新
      this.gameState.mulliganCount[playerId] = newCount;
    }
    
    const currentMulliganCount = this.gameState.mulliganCount[playerId];
    
    // 新しい手札を配る（ペナルティ適用）
    // 1回目はペナルティなし(7枚)、2回目から1枚ずつ減少
    const newHandSize = Math.max(0, 7 - Math.max(0, currentMulliganCount - 1));
    
    
    // 手札が0枚になる場合は敗北
    if (newHandSize === 0) {
      alert(`プレイヤー${playerId}の手札が0枚になったため敗北しました`);
      // 敗北処理をここで呼び出す可能性があるが、とりあえずログのみ
      return;
    }
    
    for (let i = 0; i < newHandSize; i++) {
      if (player.deck.length > 0) {
        const card = player.deck.pop();
        player.hand.push(card);
      }
    }
    
    
    // UIを更新して手札を表示
    this.engine.updateUI();
    
    // 手札表示を強制的に更新（少し遅延を入れる）
    setTimeout(() => {
      this.engine.updateHandDisplay();
    }, 100);
    
    // マリガン完了メッセージ
    const playerName = playerId === 1 ? 'あなた' : '相手';
    alert(`${playerName}がマリガンを実行しました（${newHandSize}枚配布）`);
    
    // マリガン実行後、再度Debut有無をチェックして次のマリガン判定を行う
    setTimeout(() => {
      const hasDebut = player.hand.some(card => 
        card.card_type && card.card_type.includes('ホロメン') && card.bloom_level === 'Debut'
      );
      
      if (!hasDebut) {
        // まだDebutがないので、強制マリガン継続
        this.checkMulligan(playerId);
      } else {
        // Debutがあるので、任意マリガン選択を表示
        this.checkMulligan(playerId);
      }
    }, 500);
  }

  /**
   * マリガンスキップ
   */
  skipMulligan(playerId) {
    
    // 既に完了している場合は重複処理を防ぐ
    if (this.gameState.mulliganCompleted[playerId]) {
      return;
    }
    
    
    // マリガンスキップメッセージ
    const playerName = playerId === 1 ? 'あなた' : '相手';
    alert(`${playerName}がマリガンをスキップしました`);
    
    // 次のプレイヤーまたはDebut配置フェーズへ（setTimeout削除）
    this.proceedToNextMulliganPlayer(playerId);
  }

  /**
   * 次のマリガンプレイヤーへ進む
   */
  proceedToNextMulliganPlayer(currentPlayerId) {
    
    // 重複処理防止チェック
    if (this.gameState.mulliganCompleted[currentPlayerId]) {
      // 既に完了している場合でも、次のプレイヤーの確認は実行
    } else {
      // マリガン完了状態をマーク（State Manager対応）
      if (this.engine.stateManager) {
        try {
          this.engine.stateManager.updateState('MULLIGAN_COMPLETE', {
            player: currentPlayerId,
            count: this.gameState.mulliganCount[currentPlayerId] || 0
          });
        } catch (error) {
          // フォールバック処理
          const newCompleted = { ...this.gameState.mulliganCompleted };
          newCompleted[currentPlayerId] = true;
          this.gameState.mulliganCompleted = newCompleted;
        }
      } else {
        // フォールバック: 直接更新
        const newCompleted = { ...this.gameState.mulliganCompleted };
        newCompleted[currentPlayerId] = true;
        this.gameState.mulliganCompleted = newCompleted;
      }
      
    }
    
    
    // 両プレイヤーのマリガンが完了したかチェック
    const player1Complete = this.gameState.mulliganCompleted[1];
    const player2Complete = this.gameState.mulliganCompleted[2];
    
    if (player1Complete && player2Complete) {
      // 両プレイヤーのマリガンが完了
      this.engine.startDebutPlacementPhase();
      return;
    }
    
    // 次のプレイヤーを決定
    const nextPlayerId = currentPlayerId === 1 ? 2 : 1;
    
    // 次のプレイヤーがまだマリガンを完了していない場合
    if (!this.gameState.mulliganCompleted[nextPlayerId]) {
      
      if (nextPlayerId === 2) {
        // CPU のマリガン判定
        this.cpuMulliganDecision(nextPlayerId);
      } else {
        // プレイヤー1のマリガン
        this.checkMulligan(nextPlayerId);
      }
    } else {
      // 次のプレイヤーが既に完了している場合、Debut配置フェーズへ
      this.engine.startDebutPlacementPhase();
    }
  }

  /**
   * CPUマリガン判定
   */
  cpuMulliganDecision(playerId) {
    
    // 既に完了している場合はスキップ
    if (this.gameState.mulliganCompleted[playerId]) {
      return;
    }
    
    const player = this.players[playerId];
    const hasDebut = player.hand.some(card => 
      card.card_type && card.card_type.includes('ホロメン') && card.bloom_level === 'Debut'
    );
    
    
    if (!hasDebut) {
      // Debutがない場合は強制マリガン
      this.executeMulligan(playerId);
    } else {
      // 簡単なAI判定：手札が悪い場合マリガン（ただし回数制限を考慮）
      const mulliganCount = this.gameState.mulliganCount[playerId];
      const goodCards = player.hand.filter(card => 
        (card.card_type && card.card_type.includes('ホロメン')) || 
        (card.card_type && card.card_type.includes('サポート'))
      ).length;
      
      
      // マリガン回数とカード品質を考慮した判定
      let shouldMulligan = false;
      
      if (mulliganCount === 0) {
        // 初回マリガン（ペナルティなし）：3枚未満の場合はマリガン
        shouldMulligan = goodCards < 3;
      } else if (mulliganCount === 1) {
        // 2回目マリガン（1枚減少）：2枚未満の場合のみマリガン
        shouldMulligan = goodCards < 2;
      } else if (mulliganCount >= 6) {
        // 7回目以降は手札が1枚以下になるため実行しない
        shouldMulligan = false;
      } else {
        // 3回目以降：よほど悪くない限りマリガンしない（1枚未満）
        shouldMulligan = goodCards < 1;
      }
      
      if (shouldMulligan) {
        this.executeMulligan(playerId);
      } else {
        this.skipMulligan(playerId);
      }
    }
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
    // State Manager経由でマリガン状態をリセット
    this.engine.stateManager.updateState('MULLIGAN_END', {});
    this.engine.stateManager.updateState('SET_MULLIGAN_COUNT', { counts: { 1: 0, 2: 0 } });
    this.engine.stateManager.updateState('SET_MULLIGAN_COMPLETED', { completed: { 1: false, 2: false } });
  }

  /**
   * ターン関連の状態をリセット
   */
  resetTurnState() {
    this.engine.stateManager.updateState('PLAYER_CHANGE', { player: 1 });
    this.engine.stateManager.updateState('PHASE_CHANGE', { phase: -1 });
    this.engine.stateManager.updateState('TURN_COUNT_CHANGE', { count: 0 }); // 初期値は0、ゲーム開始時に1になる
    this.engine.stateManager.updateState('RESET_TURN_ORDER', {});
  }
}

// グローバルスコープに公開
window.HololiveTurnManager = HololiveTurnManager;
