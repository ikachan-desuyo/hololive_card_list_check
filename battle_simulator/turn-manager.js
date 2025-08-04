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
    
    console.log('Turn Manager初期化完了');
  }

  /**
   * ターン終了処理
   */
  endTurn() {
    console.log(`=== ターン終了処理開始 ===`);
    console.log(`現在のプレイヤー: ${this.gameState.currentPlayer} → 切り替え後: ${this.gameState.currentPlayer === 1 ? 2 : 1}`);
    
    // エンドステップフラグをリセット（重複実行防止）
    if (this.engine.phaseController) {
      this.engine.phaseController.endStepInProgress = false;
      console.log('🔄 エンドステップフラグをリセット');
    }
    
    // 現在のプレイヤー（ターン終了するプレイヤー）のブルームフラグをリセット
    const currentPlayer = this.gameState.currentPlayer;
    this.engine.stateManager.updateState('RESET_TURN_FLAGS', {
      player: currentPlayer
    });
    
    // ターン終了
    this.gameState.currentPlayer = this.gameState.currentPlayer === 1 ? 2 : 1;
    this.gameState.currentPhase = 0;
    
    // プレイヤー別ターン数を更新（新しいプレイヤーのターン開始時に増加）
    const newPlayer = this.gameState.currentPlayer;
    const currentPlayerTurnCount = this.engine.stateManager.getStateByPath(`turn.playerTurnCount.${newPlayer}`) || 0;
    const newPlayerTurnCount = currentPlayerTurnCount + 1;
    
    // State Managerを通じてプレイヤー別ターン数を更新
    this.engine.stateManager.updateState('UPDATE_PLAYER_TURN', {
      player: newPlayer,
      turnCount: newPlayerTurnCount
    });
    
    console.log(`プレイヤー${newPlayer}のターン回数を更新: ${currentPlayerTurnCount} → ${newPlayerTurnCount}`);
    
    // 全体ターン数の更新（プレイヤー1に戻った時のみ）
    if (this.gameState.currentPlayer === 1) {
      // プレイヤー1に戻った時は常に全体ターン数を増加
      // ただし、ゲーム最初のプレイヤー1のターンは除外
      const player1TurnCount = newPlayerTurnCount; // 上で更新済み
      if (player1TurnCount > 1) {
        // プレイヤー1が既に2回以上ターンを実行している場合のみ増加（初回を除く）
        this.gameState.turnCount++;
        console.log(`全体ターン数を増加: ${this.gameState.turnCount} (プレイヤー1の${player1TurnCount}回目のターン)`);
      } else {
        console.log(`最初のサイクル: 全体ターン数維持 ${this.gameState.turnCount} (プレイヤー1の${player1TurnCount}回目のターン)`);
      }
    }
    
    console.log(`新しいターン - プレイヤー${this.gameState.currentPlayer}, ターン数: ${this.gameState.turnCount}`);
    
    // プレイヤー別ターン回数を取得してログに含める（プレイヤー切り替え後の状態）
    setTimeout(() => {
      const playerTurnCount = this.engine.stateManager.getStateByPath(`turn.playerTurnCount.${this.gameState.currentPlayer}`) || 0;
      console.log(`プレイヤー${this.gameState.currentPlayer}のターン回数: ${playerTurnCount} (ターン開始前)`);
      
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
      console.log('先行・後攻が未決定のため、先行・後攻決定処理を開始します');
      // Game Setup Managerの先行・後攻決定処理を呼び出し
      if (this.engine.setupManager && this.engine.setupManager.decideTurnOrder) {
        this.engine.setupManager.decideTurnOrder();
        return; // 先行・後攻決定後に再度startMulliganPhaseが呼ばれる
      } else {
        console.error('Setup Managerが利用できません');
        return;
      }
    }
    
    this.gameState.mulliganPhase = true;
    console.log('マリガンフェーズ開始');
    
    // 先行プレイヤーから順番にマリガンチェック
    this.checkMulligan(this.gameState.firstPlayer);
  }

  /**
   * マリガンチェック
   */
  checkMulligan(playerId) {
    console.log(`🔍🔍🔍 checkMulligan開始 - プレイヤー${playerId}`);
    
    // プレイヤーの存在確認
    if (!playerId || !this.players[playerId]) {
      console.error(`無効なプレイヤーID: ${playerId}`);
      return;
    }
    
    const player = this.players[playerId];
    console.log(`🔍 プレイヤー${playerId}の手札確認:`, player.hand);
    
    // 手札の存在確認
    if (!player.hand || !Array.isArray(player.hand)) {
      console.error(`プレイヤー${playerId}の手札が無効です:`, player.hand);
      return;
    }
    
    const hasDebut = player.hand.some(card => 
      card.card_type && card.card_type.includes('ホロメン') && card.bloom_level === 'Debut'
    );
    
    console.log(`🔍 プレイヤー${playerId}のDebut有無: ${hasDebut}`);
    
    if (!hasDebut) {
      // Debutがない場合は強制マリガン
      console.log(`🔍 プレイヤー${playerId}: Debutなし、強制マリガンUI表示`);
      this.showMulliganUI(playerId, true);
    } else {
      // Debutがある場合は選択可能
      console.log(`🔍 プレイヤー${playerId}: Debutあり、任意マリガンUI表示`);
      this.showMulliganUI(playerId, false);
    }
    
    console.log(`🔍 checkMulligan終了 - プレイヤー${playerId}`);
  }

  /**
   * マリガンUI表示
   */
  showMulliganUI(playerId, isForced) {
    console.log(`🔍🔍🔍 showMulliganUI開始 - プレイヤー${playerId}, 強制: ${isForced}`);
    
    const player = this.players[playerId];
    const mulliganCount = this.gameState.mulliganCount[playerId];
    
    console.log(`🔍 プレイヤー${playerId}のマリガン回数: ${mulliganCount}`);
    console.log(`🔍 modalUI存在確認:`, !!this.modalUI);
    console.log(`🔍 showMulliganModal存在確認:`, !!this.modalUI?.showMulliganModal);
    
    // 既存のモーダルを確実に削除してから新しいモーダルを表示
    const existingModal = document.getElementById('mulligan-modal');
    if (existingModal) {
      console.log(`🔍 既存のマリガンモーダルを削除中...`);
      existingModal.remove();
    }
    
    // 少し遅延を入れてからモーダルを表示（DOM更新を確実にする）
    setTimeout(() => {
      console.log(`🔍 プレイヤー${playerId}のマリガンモーダル表示開始`);
      
      // モーダルUIでマリガン選択
      try {
        this.modalUI.showMulliganModal(playerId, isForced, player.hand, mulliganCount, (doMulligan) => {
          console.log(`🔍🔍🔍 マリガンモーダルコールバック呼び出し - プレイヤー${playerId}, マリガン実行: ${doMulligan}`);
          console.log(`🔍 コールバック前の完了状態:`, this.gameState.mulliganCompleted);
          
          // 重複処理チェック
          if (this.gameState.mulliganCompleted[playerId]) {
            console.log(`🔍 ⚠️ 重複処理検出: プレイヤー${playerId}は既に完了済み - コールバック処理をスキップ`);
            return;
          }
          
          try {
            if (doMulligan) {
              console.log(`🔍 executeMulligan呼び出し開始 - プレイヤー${playerId}`);
              this.executeMulligan(playerId);
              console.log(`🔍 executeMulligan呼び出し完了 - プレイヤー${playerId}`);
            } else {
              console.log(`🔍 skipMulligan呼び出し開始 - プレイヤー${playerId}`);
              this.skipMulligan(playerId);
              console.log(`🔍 skipMulligan呼び出し完了 - プレイヤー${playerId}`);
            }
          } catch (error) {
            console.error(`🔍 ❌ コールバック処理中にエラー:`, error);
          }
          
          console.log(`🔍 コールバック後の完了状態:`, this.gameState.mulliganCompleted);
        });
        console.log(`🔍 showMulliganModal呼び出し成功 - プレイヤー${playerId}`);
      } catch (error) {
        console.error(`🔍 showMulliganModal呼び出しエラー:`, error);
      }
      
      console.log(`🔍 showMulliganUI終了 - プレイヤー${playerId}`);
    }, 200); // 200ms遅延でDOM更新を確実にする
  }

  /**
   * マリガン実行
   */
  executeMulligan(playerId) {
    const player = this.players[playerId];
    const mulliganCount = this.gameState.mulliganCount[playerId];
    
    console.log(`プレイヤー${playerId}がマリガンを実行（${mulliganCount + 1}回目）`);
    
    // 手札をデッキに戻す
    player.deck.push(...player.hand);
    player.hand = [];
    
    // デッキをシャッフル
    this.engine.shuffleDeck(playerId);
    console.log(`プレイヤー${playerId}のデッキをシャッフルしました`);
    
    // マリガン回数を増加（手札配布前に増加）
    console.log(`🔍 マリガン実行前: プレイヤー${playerId}のマリガン回数 = ${this.gameState.mulliganCount[playerId]}`);
    
    // State Managerを通じてマリガン回数を更新
    const currentCount = this.gameState.mulliganCount[playerId] || 0;
    const newCount = currentCount + 1;
    
    // State Managerでマリガン回数を更新
    if (this.engine.stateManager) {
      console.log(`🔍 State Managerを使用してマリガン回数を更新: ${currentCount} → ${newCount}`);
      const newCounts = { ...this.gameState.mulliganCount };
      newCounts[playerId] = newCount;
      this.engine.stateManager.updateState('SET_MULLIGAN_COUNT', { counts: newCounts });
    } else {
      // フォールバック: 直接更新
      console.log(`🔍 直接更新でマリガン回数を更新: ${currentCount} → ${newCount}`);
      this.gameState.mulliganCount[playerId] = newCount;
    }
    
    const currentMulliganCount = this.gameState.mulliganCount[playerId];
    console.log(`🔍 マリガン実行後: プレイヤー${playerId}のマリガン回数 = ${currentMulliganCount}`);
    
    // 新しい手札を配る（ペナルティ適用）
    // 1回目はペナルティなし(7枚)、2回目から1枚ずつ減少
    const newHandSize = Math.max(0, 7 - Math.max(0, currentMulliganCount - 1));
    
    console.log(`🔍 計算詳細: 7 - Math.max(0, ${currentMulliganCount} - 1) = 7 - ${Math.max(0, currentMulliganCount - 1)} = ${newHandSize}`);
    console.log(`🔍 マリガン${currentMulliganCount}回目: 手札${newHandSize}枚配布予定`);
    
    // 手札が0枚になる場合は敗北
    if (newHandSize === 0) {
      console.log(`🔍 ⚠️ プレイヤー${playerId}の手札が0枚になりました - 敗北処理`);
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
    
    console.log(`プレイヤー${playerId}に新しい手札${newHandSize}枚を配りました（マリガン${currentMulliganCount}回目）`);
    
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
        console.log(`🔍 プレイヤー${playerId}: Debutなし、強制マリガン継続`);
        this.checkMulligan(playerId);
      } else {
        // Debutがあるので、任意マリガン選択を表示
        console.log(`🔍 プレイヤー${playerId}: Debut発見、任意マリガン選択`);
        this.checkMulligan(playerId);
      }
    }, 500);
  }

  /**
   * マリガンスキップ
   */
  skipMulligan(playerId) {
    console.log(`🔍🔍🔍 skipMulligan開始 - プレイヤー${playerId}`);
    console.log(`🔍 現在の完了状態:`, this.gameState.mulliganCompleted);
    
    // 既に完了している場合は重複処理を防ぐ
    if (this.gameState.mulliganCompleted[playerId]) {
      console.log(`🔍 ⚠️ プレイヤー${playerId}のマリガンは既に完了済み - 重複処理をスキップ`);
      return;
    }
    
    console.log(`プレイヤー${playerId}がマリガンをスキップ`);
    
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
    console.log(`🔍🔍🔍 proceedToNextMulliganPlayer開始 - プレイヤー${currentPlayerId}`);
    console.log(`🔍 処理前の完了状態:`, this.gameState.mulliganCompleted);
    
    // 重複処理防止チェック
    if (this.gameState.mulliganCompleted[currentPlayerId]) {
      console.log(`🔍 ⚠️ プレイヤー${currentPlayerId}は既に完了済み - 重複処理をスキップ`);
      // 既に完了している場合でも、次のプレイヤーの確認は実行
    } else {
      // マリガン完了状態をマーク（State Manager対応）
      if (this.engine.stateManager) {
        console.log(`🔍 State Manager使用してプレイヤー${currentPlayerId}を完了マーク`);
        try {
          this.engine.stateManager.updateState('MULLIGAN_COMPLETE', {
            player: currentPlayerId,
            count: this.gameState.mulliganCount[currentPlayerId] || 0
          });
          console.log(`🔍 State Manager更新成功 - プレイヤー${currentPlayerId}`);
        } catch (error) {
          console.error(`🔍 ❌ State Manager更新エラー:`, error);
          // フォールバック処理
          const newCompleted = { ...this.gameState.mulliganCompleted };
          newCompleted[currentPlayerId] = true;
          this.gameState.mulliganCompleted = newCompleted;
          console.log(`🔍 フォールバック更新実行 - プレイヤー${currentPlayerId}`);
        }
      } else {
        // フォールバック: 直接更新
        console.log(`🔍 直接更新でプレイヤー${currentPlayerId}を完了マーク`);
        const newCompleted = { ...this.gameState.mulliganCompleted };
        newCompleted[currentPlayerId] = true;
        this.gameState.mulliganCompleted = newCompleted;
      }
      
      console.log(`🔍 プレイヤー${currentPlayerId}を完了にマーク`);
    }
    
    console.log(`🔍 マーク後の完了状態:`, this.gameState.mulliganCompleted);
    console.log(`🔍 mulliganCompleted[1]:`, this.gameState.mulliganCompleted[1]);
    console.log(`🔍 mulliganCompleted[2]:`, this.gameState.mulliganCompleted[2]);
    console.log(`🔍 mulliganCompleted の型:`, typeof this.gameState.mulliganCompleted);
    console.log(`🔍 mulliganCompleted はArray?:`, Array.isArray(this.gameState.mulliganCompleted));
    
    // 両プレイヤーのマリガンが完了したかチェック
    const player1Complete = this.gameState.mulliganCompleted[1];
    const player2Complete = this.gameState.mulliganCompleted[2];
    console.log(`🔍 プレイヤー1完了: ${player1Complete}, プレイヤー2完了: ${player2Complete}`);
    
    if (player1Complete && player2Complete) {
      console.log(`🔍 ✅ 両プレイヤーのマリガンが完了 - Debut配置フェーズへ`);
      // 両プレイヤーのマリガンが完了
      this.engine.startDebutPlacementPhase();
      return;
    }
    
    // 次のプレイヤーを決定
    const nextPlayerId = currentPlayerId === 1 ? 2 : 1;
    console.log(`🔍 次のプレイヤー: ${nextPlayerId}`);
    console.log(`🔍 次のプレイヤーの完了状態: ${this.gameState.mulliganCompleted[nextPlayerId]}`);
    
    // 次のプレイヤーがまだマリガンを完了していない場合
    if (!this.gameState.mulliganCompleted[nextPlayerId]) {
      console.log(`🔍 プレイヤー${nextPlayerId}は未完了 - マリガン処理開始`);
      
      if (nextPlayerId === 2) {
        // CPU のマリガン判定
        console.log(`🔍 CPUマリガン判定開始 - プレイヤー${nextPlayerId}`);
        this.cpuMulliganDecision(nextPlayerId);
      } else {
        // プレイヤー1のマリガン
        console.log(`🔍 プレイヤー1マリガンチェック開始 - プレイヤー${nextPlayerId}`);
        this.checkMulligan(nextPlayerId);
      }
    } else {
      console.log(`🔍 プレイヤー${nextPlayerId}も既に完了済み - Debut配置フェーズへ`);
      // 次のプレイヤーが既に完了している場合、Debut配置フェーズへ
      this.engine.startDebutPlacementPhase();
    }
  }

  /**
   * CPUマリガン判定
   */
  cpuMulliganDecision(playerId) {
    console.log(`🔍🔍🔍 CPUマリガン判定開始 - プレイヤー${playerId}`);
    console.log(`🔍 現在の完了状態:`, this.gameState.mulliganCompleted);
    
    // 既に完了している場合はスキップ
    if (this.gameState.mulliganCompleted[playerId]) {
      console.log(`🔍 ⚠️ プレイヤー${playerId}のマリガンは既に完了済み（CPU）- 重複処理をスキップ`);
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
      // 簡単なAI判定：手札が悪い場合マリガン（ただし回数制限を考慮）
      const mulliganCount = this.gameState.mulliganCount[playerId];
      const goodCards = player.hand.filter(card => 
        (card.card_type && card.card_type.includes('ホロメン')) || 
        (card.card_type && card.card_type.includes('サポート'))
      ).length;
      
      console.log(`🔍 CPU: 良いカード枚数: ${goodCards}, 現在のマリガン回数: ${mulliganCount}`);
      
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
        console.log(`CPU: 手札が悪いのでマリガンします（${mulliganCount + 1}回目）`);
        this.executeMulligan(playerId);
      } else {
        console.log(`CPU: マリガンを終了します（${mulliganCount}回実行済み）`);
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
    this.gameState.turnCount = 0; // 初期値は0、ゲーム開始時に1になる
    this.gameState.turnOrderDecided = false;
  }
}

// グローバルスコープに公開
window.HololiveTurnManager = HololiveTurnManager;
