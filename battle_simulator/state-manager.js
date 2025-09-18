/**
 * State Manager
 * ゲーム状態の集中管理とイミュータブルな状態更新を提供
 */

class HololiveStateManager {
  constructor(battleEngine = null) {
    this.battleEngine = battleEngine;
    this.state = this.createInitialState();
    this.listeners = new Map(); // イベントリスナー管理
    this.stateHistory = []; // 状態履歴（デバッグ用）
    this.maxHistorySize = 50;
    this.transitionInProgress = false; // 状態遷移中フラグ
  }

  /**
   * 先行プレイヤーの最初のターンか判定
   * @param {number} playerId
   * @returns {boolean}
   */
  isFirstPlayerFirstTurn(playerId) {
    try {
      const turnState = this.state.turn;
      if (!turnState || !turnState.firstPlayer) return false;
      if (turnState.firstPlayer !== playerId) return false;
      // グローバル turnCount が 1 の間のみ「先行1ターン目」とみなす（個別カウント不使用）
      return (turnState.turnCount === 1);
    } catch (e) {
      return false;
    }
  }

  /**
   * LIMITED効果を現在使用可能か統一判定
   * (1) 先行プレイヤーの最初のターンは禁止
   * (2) 1ターン1回制限（usedLimitedThisTurn）
   * @param {number} playerId
   * @returns {{canUse:boolean, reason:string|null}}
   */
  canUseLimitedNow(playerId) {
    const players = this.battleEngine ? this.battleEngine.players : null;
    const player = players ? players[playerId] : null;
    if (!player) return { canUse: false, reason: 'player_not_found' };
    if (this.isFirstPlayerFirstTurn(playerId)) {
      return { canUse: false, reason: 'first_player_first_turn' };
    }
    if (player.gameState?.usedLimitedThisTurn === true) {
      return { canUse: false, reason: 'already_used_this_turn' };
    }
    if (window.BATTLE_ENGINE_DEBUG) {
      console.debug('[LIMITED][canUseLimitedNow] OK playerId=', playerId, 'turnCount=', this.state.turn.turnCount, 'firstPlayer=', this.state.turn.firstPlayer);
    }
    return { canUse: true, reason: null };
  }

  /**
   * 初期状態の作成
   */
  createInitialState() {
    return {
      // ゲーム全体の状態
      game: {
        started: false,
        ended: false,
        winner: null,
        turnOrderDecided: false,
        mulliganPhase: false,
        debutPlacementPhase: false
      },
      
      // ターン・フェーズ状態
      turn: {
        currentPlayer: 1,
        currentPhase: -1, // -1: 準備, 0-5: リセット〜エンド
        turnCount: 0, // ゲーム開始前は0、最初のターン開始時に1になる
        firstPlayer: null,
        playerTurnCount: { 1: 0, 2: 0 } // 各プレイヤーのターン回数
      },
      
      // マリガン状態
      mulligan: {
        count: { 1: 0, 2: 0 },
        completed: { 1: false, 2: false }
      },
      
      // プレイヤー状態
      players: {
        1: this.createPlayerState(),
        2: this.createPlayerState()
      },
      
      // UI状態
      ui: {
        selectedCard: null,
        highlightedAreas: [],
        modalOpen: false,
        dragState: {
          isDragging: false,
          draggedCard: null,
          dragSource: null,
          validDropZones: []
        },
        buttonsEnabled: {
          startGame: true,
          nextPhase: false,
          endTurn: false,
          resetGame: true
        }
      },
      
      // メタ情報
      meta: {
        lastUpdate: Date.now(),
        updateCount: 0,
        version: '1.0.0'
      }
    };
  }

  /**
   * プレイヤー状態の初期化
   */
  createPlayerState() {
    return {
      // カードエリア
      cards: {
        life: [],
        collab: null,
        center: null,
        oshi: null,
        holoPower: [],
        deck: [],
        yellDeck: [],
        back1: null,
        back2: null,
        back3: null,
        back4: null,
        back5: null,
        archive: [],
        hand: []
      },
      
      // カードHP管理（カードIDをキーとして現在HPを保存）
      cardHP: {},
      
      // ゲーム状態
      gameState: {
        usedLimitedThisTurn: false, // LIMITED効果使用済みフラグ（boolean型）
        restHolomem: [],
        collabMovedThisTurn: false, // このターンにコラボ移動を実行したか
        batonTouchUsedThisTurn: false // このターンにバトンタッチを実行したか
        // ブルーム・プレイ状態などはカード自体に付与
      },
      
      // デッキ情報
      deck: {
        oshiCard: null,
        mainDeck: [],
        yellCards: []
      }
    };
  }

  /**
   * 状態の取得（読み取り専用）
   */
  getState() {
    return this.deepClone(this.state);
  }

  /**
   * 特定の状態パスの取得
   * @param {string} path - ドット記法でのパス ('game.started', 'turn.currentPlayer' など)
   */
  getStateByPath(path) {
    const keys = path.split('.');
    let current = this.state;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return this.deepClone(current);
  }

  /**
   * 状態の更新（イミュータブル）
   * @param {string} actionType - アクションタイプ
   * @param {Object} payload - 更新データ
   */
  updateState(actionType, payload) {
    // UPDATE_PLAYER_CARDSは状態遷移中でも安全に実行可能
    if (this.transitionInProgress && actionType !== 'UPDATE_PLAYER_CARDS') {
      window.warnLog(`状態遷移中のため更新をスキップ: ${actionType}`);
      return { success: false, reason: 'transition_in_progress' };
    }

    // UPDATE_PLAYER_CARDSの場合は遷移フラグを設定しない
    if (actionType !== 'UPDATE_PLAYER_CARDS') {
      this.transitionInProgress = true;
    }
    
    try {
      const oldState = this.deepClone(this.state);
      const result = this.applyStateUpdate(oldState, actionType, payload);
      
      // applyStateUpdateの戻り値を確認
      if (result && typeof result === 'object' && result.success !== undefined) {
        if (actionType !== 'UPDATE_PLAYER_CARDS') {
          this.transitionInProgress = false;
        }
        return result;
      }
      
      const newState = result;
      
      // 状態の妥当性チェック
      if (this.validateState(newState)) {
        this.state = newState;
        this.state.meta.lastUpdate = Date.now();
        this.state.meta.updateCount++;
        
        // 履歴に追加
        this.addToHistory(actionType, payload, oldState);
        
        // リスナーに通知
        this.notifyListeners(actionType, payload, oldState, newState);
        
        this.logStateChange(actionType, payload);
        
        if (actionType !== 'UPDATE_PLAYER_CARDS') {
          this.transitionInProgress = false;
        }
        return { success: true };
      } else {
        return { success: false, reason: 'validation_failed' };
      }
    } catch (error) {
      return { success: false, reason: 'error', error: error.message };
    } finally {
      // UPDATE_PLAYER_CARDSの場合はフラグをクリアしない
      if (actionType !== 'UPDATE_PLAYER_CARDS') {
        this.transitionInProgress = false;
      }
    }
  }

  /**
   * 状態更新の適用
   */
  applyStateUpdate(state, actionType, payload) {
    const newState = this.deepClone(state);
    
    switch (actionType) {
      case 'GAME_START':
        newState.game.started = true;
        newState.ui.buttonsEnabled.startGame = false;
        newState.ui.buttonsEnabled.nextPhase = true;
        
        // ゲーム開始時：全体ターン数のみ1に設定（プレイヤーターン回数は最初のターン開始時に設定）
        newState.turn.turnCount = 1; // 最初のターンなので1
        break;
        
      case 'GAME_STOP':
        newState.game.started = false;
        newState.ui.buttonsEnabled.startGame = true;
        newState.ui.buttonsEnabled.nextPhase = false;
        break;
        
      case 'GAME_END':
        newState.game.ended = true;
        newState.game.winner = payload.winner;
        newState.ui.buttonsEnabled.nextPhase = false;
        newState.ui.buttonsEnabled.endTurn = false;
        break;
        
      case 'PHASE_CHANGE':
        newState.turn.currentPhase = payload.phase;
        break;
        
      case 'PLAYER_CHANGE':
        const oldPlayer = newState.turn.currentPlayer;
        newState.turn.currentPlayer = payload.player;
        
        // プレイヤー別ターン回数の自動増加は無効化（turn-manager.jsで手動管理）
        // 従来の全体ターンカウントも無効化（turn-manager.jsで管理）
        break;
        
      case 'TURN_COUNT_CHANGE':
        newState.turn.turnCount = payload.count;
        break;
        
      case 'PLAYER_TURN_CHANGE':
        // プレイヤー別ターン数を手動で設定
        if (payload.player && payload.turnCount !== undefined) {
          newState.turn.playerTurnCount[payload.player] = payload.turnCount;
        }
        break;
        
      case 'UPDATE_PLAYER_TURN':
        // プレイヤー別ターン数を更新
        if (payload.player && payload.turnCount !== undefined) {
          newState.turn.playerTurnCount[payload.player] = payload.turnCount;
        }
        break;
        
      case 'RESET_TURN_FLAGS':
        // プレイヤーの全カードのブルーム・ターン制限フラグをリセット
        if (payload.player && newState.players[payload.player]) {
          const player = newState.players[payload.player];
          const positions = ['center', 'collab', 'back1', 'back2', 'back3', 'back4', 'back5'];
          
          positions.forEach(position => {
            if (player[position]?.cardState) {
              player[position].cardState.bloomedThisTurn = false;
            }
            // エフェクト使用フラグもリセット
            if (player[position]) {
              player[position].bloomEffectUsed = false;
              player[position].collabEffectUsed = false;
            }
          });
          
          // ターン制限フラグもリセット
          if (player.gameState) {
            const oldFlag = player.gameState.collabMovedThisTurn;
            player.gameState.collabMovedThisTurn = false;
            // バトンタッチ使用フラグもリセット（LIMITEDはエンドステップのみでリセット）
            player.gameState.batonTouchUsedThisTurn = false;
          }
          
          // バトンタッチ使用時はターン1制限を解除
          if (newState.turn.playerTurnCount[payload.player] <= 1) {
            newState.turn.playerTurnCount[payload.player] = 2;
          }
          
        } else {
          window.warnLog(`⚠️ [RESET_TURN_FLAGS] プレイヤー${payload.player}が見つかりません`);
        }
        break;
        
      case 'RESET_COLLAB_MOVE':
        // 特定プレイヤーのコラボ移動フラグをリセット
        if (payload.playerId && newState.players[payload.playerId]) {
          const player = newState.players[payload.playerId];
          if (player.gameState) {
            const oldFlag = player.gameState.collabMovedThisTurn;
            player.gameState.collabMovedThisTurn = false;
          }
        } else {
          window.warnLog(`⚠️ [RESET_COLLAB_MOVE] プレイヤー${payload.playerId}が見つかりません`);
        }
        break;
        
      case 'SET_WINNER':
        newState.game.winner = payload.winner;
        break;
        
      case 'SET_FIRST_PLAYER':
        newState.turn.firstPlayer = payload.player;
        newState.game.turnOrderDecided = true;
        break;
        
      case 'RESET_TURN_ORDER':
        newState.turn.firstPlayer = null;
        newState.game.turnOrderDecided = false;
        break;
        
      case 'MULLIGAN_START':
        newState.game.mulliganPhase = true;
        break;
        
      case 'MULLIGAN_END':
        newState.game.mulliganPhase = false;
        break;
        
      case 'DEBUT_PLACEMENT_START':
        newState.game.debutPlacementPhase = true;
        break;
        
      case 'DEBUT_PLACEMENT_END':
        newState.game.debutPlacementPhase = false;
        break;
        
      case 'SET_MULLIGAN_COUNT':
        if (payload.counts) {
          newState.mulligan.count = { ...payload.counts };
        }
        break;
        
      case 'SET_MULLIGAN_COMPLETED':
        if (payload.completed) {
          newState.mulligan.completed = { ...payload.completed };
        }
        break;
        
      case 'MULLIGAN_COMPLETE':
        newState.mulligan.completed[payload.player] = true;
        newState.mulligan.count[payload.player] = payload.count;
        
        // 両プレイヤーのマリガンが完了したかチェック
        if (newState.mulligan.completed[1] && newState.mulligan.completed[2]) {
          newState.game.mulliganPhase = false;
        }
        break;
        
      case 'RESET_GAME':
        return this.createInitialState();
        
      case 'UPDATE_PLAYER_CARDS':
        if (payload.player && payload.area && newState.players[payload.player]) {
          newState.players[payload.player].cards[payload.area] = payload.cards;
        }
        break;
        
      case 'UPDATE_CARD_EQUIPMENT':
        // カードの装備データを更新（個別カード管理対応）
        if (payload.player && payload.cardId && payload.equipment && newState.players[payload.player]) {
          const player = newState.players[payload.player];
          const positions = ['center', 'collab', 'back1', 'back2', 'back3', 'back4', 'back5'];
          
          // 特定位置が指定されている場合は、その位置のカードのみ更新
          if (payload.position) {
            const card = player.cards && player.cards[payload.position];
            if (card && card.id === payload.cardId) {
              if (!card.equipment) {
                card.equipment = { fans: [], tools: [], mascots: [] };
              }
              // 深いコピーで装備データを更新（参照問題を回避）
              card.equipment = JSON.parse(JSON.stringify(payload.equipment));
            }
          } else {
            // 位置が指定されていない場合は、同一IDの全カードを更新（従来の動作）
            positions.forEach(pos => {
              const card = player.cards && player.cards[pos];
              if (card && card.id === payload.cardId) {
                if (!card.equipment) {
                  card.equipment = { fans: [], tools: [], mascots: [] };
                }
                // 深いコピーで装備データを更新
                card.equipment = JSON.parse(JSON.stringify(payload.equipment));
              }
            });
          }
        }
        break;
        
      case 'UPDATE_PLAYER_GAME_STATE':
        if (payload.player && payload.property && newState.players[payload.player]) {
          newState.players[payload.player].gameState[payload.property] = payload.value;
        }
        break;
        
      case 'UPDATE_PLAYER_DECK':
        if (payload.player && payload.property && newState.players[payload.player]) {
          newState.players[payload.player].deck[payload.property] = payload.value;
        }
        break;
        
      case 'UI_BUTTON_STATE':
        if (payload.buttons) {
          Object.assign(newState.ui.buttonsEnabled, payload.buttons);
        }
        break;

      case 'CHECK_DROP_VALIDITY':
        // ドラッグ&ドロップの有効性をチェック
        // このアクションは状態を変更せず、チェック結果のみを返す
        break;

      case 'CHECK_SWAP_VALIDITY':
        // カード交換の有効性をチェック
        // このアクションは状態を変更せず、チェック結果のみを返す
        break;

      case 'SWAP_CARDS':
        // カード位置交換の実行（エール情報保持強化）
        if (payload.player && payload.sourcePosition && payload.targetPosition) {
          const player = newState.players[payload.player];
          const battleEnginePlayer = this.battleEngine?.players?.[payload.player];
          
          if (player && battleEnginePlayer) {
            
            // Battle Engineから最新のカード情報を取得（エール情報含む）
            const sourceCard = battleEnginePlayer[payload.sourcePosition];
            const targetCard = battleEnginePlayer[payload.targetPosition];
            
            
            // エール情報を含めてState Managerにも反映
            if (sourceCard) {
              // エール情報が存在する場合は確実に保持
              const sourceCardWithYell = {
                ...sourceCard,
                yellCards: sourceCard.yellCards ? [...sourceCard.yellCards] : []
              };
              player.cards[payload.targetPosition] = sourceCardWithYell;
            } else {
              player.cards[payload.targetPosition] = null;
            }
            
            if (targetCard) {
              // 移動先のカードのエール情報も保持
              const targetCardWithYell = {
                ...targetCard,
                yellCards: targetCard.yellCards ? [...targetCard.yellCards] : []
              };
              player.cards[payload.sourcePosition] = targetCardWithYell;
            } else {
              player.cards[payload.sourcePosition] = null;
            }
            
            // Battle Engineでの実際の交換実行
            
            // 一時的にカードを保存してから交換
            const tempSourceCard = battleEnginePlayer[payload.sourcePosition];
            const tempTargetCard = battleEnginePlayer[payload.targetPosition];
            
            
            // コラボ移動の場合は、HandManagerで既にチェック済みなので直接交換
            const isCollabMove = payload.targetPosition === 'collab' && payload.sourcePosition.startsWith('back');
            
            console.log(`🔍 [StateManager] カード移動処理:`, {
              sourcePosition: payload.sourcePosition,
              targetPosition: payload.targetPosition,
              isCollabMove: isCollabMove,
              sourceCard: tempSourceCard?.name,
              targetCard: tempTargetCard?.name
            });
            
            if (isCollabMove) {
              // 直接代入でコラボ移動を実行
              try {
                battleEnginePlayer[payload.targetPosition] = tempSourceCard;
                battleEnginePlayer[payload.sourcePosition] = tempTargetCard;
              } catch (error) {
              }
            } else {
              // 通常の交換処理
              
              // バトンタッチの場合は直接交換（ブルーム判定をスキップ）
              if (payload.isBatonTouch) {
                battleEnginePlayer[payload.targetPosition] = tempSourceCard;
                battleEnginePlayer[payload.sourcePosition] = tempTargetCard;
              } else {
                // 通常の移動はBattle Engineの検証を通す
                try {
                    // Battle Engineの専用swapCardsメソッドを使用
                    const swapResult = battleEngine.swapCards(
                        tempSourceCard, 
                        payload.sourcePosition, 
                        tempTargetCard, 
                        payload.targetPosition, 
                        payload.player
                    );
                } catch (error) {
                    // フォールバック: 直接代入を試行
                    battleEnginePlayer[payload.targetPosition] = tempSourceCard;
                    battleEnginePlayer[payload.sourcePosition] = tempTargetCard;
                }
              }
            }
            
            
            
            // エール情報も確実に反映
            if (tempSourceCard && tempSourceCard.yellCards && tempSourceCard.yellCards.length > 0) {
              // 移動先にエール情報付きカードを配置
              const movedCard = battleEnginePlayer[payload.targetPosition];
              if (movedCard) {
                movedCard.yellCards = [...tempSourceCard.yellCards];
              } else {
              }
            }
            
            // 🔒 コラボ移動の場合は、コラボロック状態を確実に設定
            if (isCollabMove) {
              const collabCard = battleEnginePlayer[payload.targetPosition];
              if (collabCard) {
                // cardStateが存在しない場合は初期化
                if (!collabCard.cardState) {
                  collabCard.cardState = {};
                }
                
                // コラボロック状態を設定
                collabCard.cardState.collabLocked = true;
                
                // コラボしたターンを記録
                collabCard.collabedTurn = this.state.turn.turnCount;
                
                // State Manager側でも同期
                if (player.cards[payload.targetPosition]) {
                  if (!player.cards[payload.targetPosition].cardState) {
                    player.cards[payload.targetPosition].cardState = {};
                  }
                  player.cards[payload.targetPosition].cardState.collabLocked = true;
                  player.cards[payload.targetPosition].collabedTurn = this.state.turn.turnCount;
                }
                
                // コラボエフェクト確認UIを表示
                setTimeout(() => {
                  console.log(`🤝 [StateManager] コラボエフェクト確認UI表示準備:`, {
                    cardName: collabCard.name,
                    cardId: collabCard.id,
                    position: payload.targetPosition,
                    playerId: payload.playerId,
                    hasPerformanceManager: !!this.battleEngine.performanceManager
                  });
                  
                  if (this.battleEngine.performanceManager) {
                    this.battleEngine.performanceManager.showCollabEffectConfirmation(
                      collabCard, 
                      payload.targetPosition, 
                      payload.playerId
                    );
                  } else {
                    console.error(`❌ [StateManager] PerformanceManager が見つかりません`);
                  }
                }, 500);
              }
            }
          }
        }
        break;
        
      case 'PLACE_CARD':
        // カード配置（ブルームの場合は重ね置き）
        try {
          if (payload.player && payload.card && payload.position) {
            const player = newState.players[payload.player];
            if (player) {
              // Battle Engineの最新データも確認
              const battleEnginePlayer = this.battleEngine?.players?.[payload.player];
              
              // ブルーム配置の場合（バックポジション且つ既存カードがある）
              if (payload.position.startsWith('back')) {
                // Battle Engineデータを優先して確認
                const existingCard = battleEnginePlayer?.[payload.position] || player[payload.position];
                if (existingCard) {
                  // ブルーム: 新しいカードを上に重ね、下のカードをstackedCardsに移動
                  
                  // 既存カードにブルーム済みマークを設定
                  if (existingCard.cardState) {
                    existingCard.cardState.bloomedThisTurn = true;
                  }
                  
                  // 既存カードのダメージ/HP情報を解析
                  const previousMaxHP = this.getMaxHP(existingCard);
                  // cardState.damage 優先、なければ HPマップから算出
                  let previousDamage = existingCard.cardState?.damage || 0;
                  // HPマップが存在し、差分から damage を再計算できる場合は整合性を確保
                  try {
                    const playerHPMap = this.state.players[payload.player]?.cardHP || {};
                    const existingKey = existingCard.cardState?.uniqueId || existingCard.id;
                    const trackedCurrentHP = playerHPMap[existingKey];
                    if (previousMaxHP && trackedCurrentHP !== undefined) {
                      const calcDamage = Math.max(0, previousMaxHP - trackedCurrentHP);
                      // 大きい方を採用（よりダメージが進んでいる値）
                      if (calcDamage > previousDamage) previousDamage = calcDamage;
                    }
                  } catch (e) {
                    console.warn('[Bloom HP Transfer] 旧カードHP解析中にエラー', e);
                  }

                  const newCard = this.addCardState(payload.card, {
                    bloomedThisTurn: false, // 新しく配置されるカードはブルーム済みではない
                    playedTurn: newState.turn?.turnCount || 1,
                    bloomedFromCard: existingCard,
                    // 既存カードから状態を引き継ぎ
                    resting: existingCard.cardState?.resting || false,
                    damage: previousDamage,
                    yellCards: existingCard.yellCards || existingCard.cardState?.yellCards || [],
                    supportCards: existingCard.cardState?.supportCards || [],
                    stackedCards: [
                      ...(existingCard.cardState?.stackedCards || []),
                      existingCard
                    ]
                  });
                  
                  // お休み状態（isResting）も引き継ぎ
                  if (existingCard.isResting) {
                    newCard.isResting = existingCard.isResting;
                  }
                  
                  // エール引き継ぎを確実にする追加処理
                  if (existingCard.yellCards && existingCard.yellCards.length > 0) {
                    newCard.yellCards = [...existingCard.yellCards];
                  }
                  // 装備引き継ぎ
                  if (existingCard.equipment) {
                    newCard.equipment = JSON.parse(JSON.stringify(existingCard.equipment));
                    if (existingCard.equipmentEffects) {
                      newCard.equipmentEffects = JSON.parse(JSON.stringify(existingCard.equipmentEffects));
                    }
                  }
                  // HPマップ転送（新カードの現在HP = 新最大HP - previousDamage, ただし最低1）
                  try {
                    const newMax = this.getMaxHP(newCard);
                    const newCurrent = Math.max(1, newMax - previousDamage);
                    const newKey = newCard.cardState?.uniqueId || newCard.id;
                    if (!this.state.players[payload.player].cardHP) {
                      this.state.players[payload.player].cardHP = {};
                    }
                    this.state.players[payload.player].cardHP[newKey] = newCurrent;
                    console.log(`🌸 [Bloom HP Transfer] Back位置 ${payload.position}: ${existingCard.name} (${previousMaxHP - previousDamage}/${previousMaxHP}) → ${newCard.name} (${newCurrent}/${newMax})`);
                  } catch (e) {
                    console.warn('[Bloom HP Transfer] HP設定失敗', e);
                  }
                  
                  // 新しいカードの情報を確認
                  
                  player[payload.position] = newCard; // 直接プロパティアクセス
                
                // ブルーム完了フラグを設定
                this.bloomCompleted = true;
                
                // ブルーム効果チェック（center配置時）
                setTimeout(() => {
                  console.log(`🌸 [StateManager] ブルーム効果チェック開始: handManager=${!!this.battleEngine.handManager}`);
                  if (this.battleEngine.handManager && this.battleEngine.handManager.checkAndTriggerBloomEffects) {
                    console.log(`🌸 [StateManager] ブルーム効果チェック実行中...`);
                    this.battleEngine.handManager.checkAndTriggerBloomEffects(
                      newCard, 
                      payload.player, 
                      payload.position
                    );
                  } else {
                    console.warn(`❌ [StateManager] handManagerまたはcheckAndTriggerBloomEffectsが存在しません`);
                  }
                }, 500);
              } else {
                // 通常配置
                const newCard = this.addCardState(payload.card, {
                  playedTurn: newState.turn.turnCount,
                  playedByPlayer: payload.player
                });
                player[payload.position] = newCard; // 直接プロパティアクセス
              }
            } else if (payload.position === 'center') {
              // センターポジションの場合
              const existingCard = battleEnginePlayer?.center || player.center;
              if (existingCard) {
                // ブルーム: 新しいカードを上に重ね、下のカードをstackedCardsに移動
                
                // 既存カードにブルーム済みマークを設定
                if (existingCard.cardState) {
                  existingCard.cardState.bloomedThisTurn = true;
                }
                
                // HP/ダメージ計算
                const prevCenterMax = this.getMaxHP(existingCard);
                let prevCenterDamage = existingCard.cardState?.damage || 0;
                try {
                  const playerHPMap = this.state.players[payload.player]?.cardHP || {};
                  const existingKey = existingCard.cardState?.uniqueId || existingCard.id;
                  const trackedCurrentHP = playerHPMap[existingKey];
                  if (prevCenterMax && trackedCurrentHP !== undefined) {
                    const calcDamage = Math.max(0, prevCenterMax - trackedCurrentHP);
                    if (calcDamage > prevCenterDamage) prevCenterDamage = calcDamage;
                  }
                } catch (e) { console.warn('[Bloom HP Transfer] center解析エラー', e); }

                const newCard = this.addCardState(payload.card, {
                  bloomedThisTurn: false,
                  playedTurn: newState.turn?.turnCount || 1,
                  bloomedFromCard: existingCard,
                  resting: existingCard.cardState?.resting || false,
                  damage: prevCenterDamage,
                  yellCards: existingCard.yellCards || existingCard.cardState?.yellCards || [],
                  supportCards: existingCard.cardState?.supportCards || [],
                  stackedCards: [
                    ...(existingCard.cardState?.stackedCards || []),
                    existingCard
                  ]
                });
                
                // お休み状態（isResting）も引き継ぎ
                if (existingCard.isResting) {
                  newCard.isResting = existingCard.isResting;
                }
                
                // エール引き継ぎを確実にする追加処理
                if (existingCard.yellCards && existingCard.yellCards.length > 0) {
                  newCard.yellCards = [...existingCard.yellCards];
                }
                // 装備引き継ぎ
                if (existingCard.equipment) {
                  newCard.equipment = JSON.parse(JSON.stringify(existingCard.equipment));
                  if (existingCard.equipmentEffects) {
                    newCard.equipmentEffects = JSON.parse(JSON.stringify(existingCard.equipmentEffects));
                  }
                }
                // HPマップ転送
                try {
                  const newMax = this.getMaxHP(newCard);
                  const newCurrent = Math.max(1, newMax - prevCenterDamage);
                  const newKey = newCard.cardState?.uniqueId || newCard.id;
                  if (!this.state.players[payload.player].cardHP) {
                    this.state.players[payload.player].cardHP = {};
                  }
                  this.state.players[payload.player].cardHP[newKey] = newCurrent;
                  console.log(`🌸 [Bloom HP Transfer] Center: ${existingCard.name} → ${newCard.name} (${newCurrent}/${newMax})`);
                } catch (e) { console.warn('[Bloom HP Transfer] center HP設定失敗', e); }
                
                // 新しいカードの情報を確認
                
                player.center = newCard; // 直接プロパティアクセス
                
                // ブルーム完了フラグを設定
                this.bloomCompleted = true;
                
                // ブルーム効果チェック（center配置時）
                setTimeout(() => {
                  console.log(`🌸 [StateManager] センターブルーム効果チェック開始: handManager=${!!this.battleEngine.handManager}`);
                  if (this.battleEngine.handManager && this.battleEngine.handManager.checkAndTriggerBloomEffects) {
                    console.log(`🌸 [StateManager] センターブルーム効果チェック実行中...`);
                    // ブルーム効果チェックには新しく配置されたカード（上に重ねられたカード）を渡す
                    this.battleEngine.handManager.checkAndTriggerBloomEffects(
                      newCard, 
                      payload.player, 
                      'center'
                    );
                  } else {
                    console.warn(`❌ [StateManager] handManagerまたはcheckAndTriggerBloomEffectsが存在しません`);
                  }
                }, 500);
              } else {
                // 通常配置
                const newCard = this.addCardState(payload.card, {
                  playedTurn: newState.turn.turnCount,
                  playedByPlayer: payload.player
                });
                player.center = newCard; // 直接プロパティアクセス
              }
            } else if (payload.position === 'collab') {
              // コラボポジションの場合
              const existingCard = battleEnginePlayer?.collab || player.collab;
              if (existingCard) {
                // ブルーム: 新しいカードを上に重ね、下のカードをstackedCardsに移動
                
                // 既存カードにブルーム済みマークを設定
                if (existingCard.cardState) {
                  existingCard.cardState.bloomedThisTurn = true;
                }
                
                // HP/ダメージ計算
                const prevCollabMax = this.getMaxHP(existingCard);
                let prevCollabDamage = existingCard.cardState?.damage || 0;
                try {
                  const playerHPMap = this.state.players[payload.player]?.cardHP || {};
                  const existingKey = existingCard.cardState?.uniqueId || existingCard.id;
                  const trackedCurrentHP = playerHPMap[existingKey];
                  if (prevCollabMax && trackedCurrentHP !== undefined) {
                    const calcDamage = Math.max(0, prevCollabMax - trackedCurrentHP);
                    if (calcDamage > prevCollabDamage) prevCollabDamage = calcDamage;
                  }
                } catch (e) { console.warn('[Bloom HP Transfer] collab解析エラー', e); }

                const newCard = this.addCardState(payload.card, {
                  bloomedThisTurn: false,
                  playedTurn: newState.turn?.turnCount || 1,
                  bloomedFromCard: existingCard,
                  resting: existingCard.cardState?.resting || false,
                  damage: prevCollabDamage,
                  yellCards: existingCard.yellCards || existingCard.cardState?.yellCards || [],
                  supportCards: existingCard.cardState?.supportCards || [],
                  stackedCards: [
                    ...(existingCard.cardState?.stackedCards || []),
                    existingCard
                  ]
                });
                
                // お休み状態（isResting）も引き継ぎ
                if (existingCard.isResting) {
                  newCard.isResting = existingCard.isResting;
                }
                
                // エール引き継ぎを確実にする追加処理
                if (existingCard.yellCards && existingCard.yellCards.length > 0) {
                  newCard.yellCards = [...existingCard.yellCards];
                }
                // 装備引き継ぎ
                if (existingCard.equipment) {
                  newCard.equipment = JSON.parse(JSON.stringify(existingCard.equipment));
                  if (existingCard.equipmentEffects) {
                    newCard.equipmentEffects = JSON.parse(JSON.stringify(existingCard.equipmentEffects));
                  }
                }
                // HPマップ転送
                try {
                  const newMax = this.getMaxHP(newCard);
                  const newCurrent = Math.max(1, newMax - prevCollabDamage);
                  const newKey = newCard.cardState?.uniqueId || newCard.id;
                  if (!this.state.players[payload.player].cardHP) {
                    this.state.players[payload.player].cardHP = {};
                  }
                  this.state.players[payload.player].cardHP[newKey] = newCurrent;
                  console.log(`🌸 [Bloom HP Transfer] Collab: ${existingCard.name} → ${newCard.name} (${newCurrent}/${newMax})`);
                } catch (e) { console.warn('[Bloom HP Transfer] collab HP設定失敗', e); }
                
                // 新しいカードの情報を確認
                
                player.collab = newCard; // 直接プロパティアクセス
                
                // ブルーム完了フラグを設定
                this.bloomCompleted = true;
              } else {
                // 通常配置
                const newCard = this.addCardState(payload.card, {
                  playedTurn: newState.turn.turnCount,
                  playedByPlayer: payload.player
                });
                player.collab = newCard; // 直接プロパティアクセス
              }
            } else {
              // その他のポジション
              player.cards[payload.position] = payload.card;
            }
            
            // 手札から配置した場合は手札から削除
            if (player.cards.hand && payload.action !== 'bloom') {
              // ブルーム時は手札削除を呼び出し元（hand-manager）が正確なインデックスで実施するため二重削除回避
              const handIndex = player.cards.hand.findIndex(handCard => 
                handCard.id === payload.card.id || handCard.name === payload.card.name
              );
              if (handIndex !== -1) {
                player.cards.hand.splice(handIndex, 1);
              }
            }
            
            // Battle Engineのプレイヤーデータと同期
            if (this.battleEngine?.players?.[payload.player]) {
              
              // Battle Engineプレイヤーデータを直接更新（確実な同期）
              try {
                // 新しいカードデータをディープコピーして設定
                const updatedCard = JSON.parse(JSON.stringify(player[payload.position]));
                
                // エール情報を確実に引き継ぎ
                if (updatedCard.yellCards && Array.isArray(updatedCard.yellCards)) {
                }
                
                // 同期するカード情報をログ出力
                
                this.battleEngine.players[payload.player][payload.position] = updatedCard;
                
                // UI更新は呼び出し元で適切なタイミングで行う
                
                // 成功を返す
                return { success: true, card: updatedCard };
                
              } catch (error) {
                // フォールバック：直接代入
                this.battleEngine.players[payload.player][payload.position] = player[payload.position];
                return { success: false, error: error.message };
              }
            }
          }
        }
        return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
        break;

      case 'ADD_BLOOM_HISTORY':
        // ブルーム履歴の追加
        if (payload.player && payload.position) {
          const player = newState.players[payload.player];
          if (player && !player.bloomedThisTurn.includes(payload.position)) {
            player.bloomedThisTurn.push(payload.position);
            
            // カードにブルームターン情報を記録
            const card = player.stage?.[payload.position] || player[payload.position];
            if (card) {
              card.bloomedTurn = newState.turn.turnCount;
              card.bloomEffectUsed = false; // 効果未使用にリセット
              
              // ブルームエフェクト自動モーダル表示（ブルーム直後）
              setTimeout(() => {
                console.log(`🌸 [StateManager] バックポジションブルーム効果チェック開始: handManager=${!!this.battleEngine.handManager}`);
                if (this.battleEngine.handManager && this.battleEngine.handManager.checkAndTriggerBloomEffects) {
                  console.log(`🌸 [StateManager] バックポジションブルーム効果チェック実行中...`);
                  this.battleEngine.handManager.checkAndTriggerBloomEffects(
                    card, 
                    payload.player, 
                    payload.position
                  );
                } else {
                  console.warn(`❌ [StateManager] handManagerまたはcheckAndTriggerBloomEffectsが存在しません`);
                }
              }, 500);
            }
          }
        }
        break;

      case 'CLEAR_BLOOM_HISTORY':
        // ブルーム履歴のクリア（ターン終了時）
        if (payload.player) {
          const player = newState.players[payload.player];
          if (player) {
            player.bloomedThisTurn = [];
          }
        } else {
          // 全プレイヤーのブルーム履歴をクリア
          Object.values(newState.players).forEach(player => {
            if (player.bloomedThisTurn) {
              player.bloomedThisTurn = [];
            }
          });
        }
        break;

      case 'SET_DRAG_STATE':
        // ドラッグ状態の設定
        if (payload.isDragging !== undefined) {
          if (!newState.ui.dragState) {
            newState.ui.dragState = {};
          }
          newState.ui.dragState.isDragging = payload.isDragging;
          newState.ui.dragState.draggedCard = payload.card || null;
          newState.ui.dragState.dragSource = payload.source || null;
        }
        break;

      case 'SET_DROP_ZONES':
        // 有効なドロップゾーンの設定
        if (payload.validZones) {
          if (!newState.ui.dragState) {
            newState.ui.dragState = {};
          }
          newState.ui.dragState.validDropZones = payload.validZones;
        }
        break;

      case 'UPDATE_CARD_STATE':
        // カード状態の更新
        if (payload.playerId && payload.position && payload.cardState) {
          const playerId = payload.playerId;
          const position = payload.position;
          const cardState = payload.cardState;
          
          // プレイヤーデータが存在するかチェック
          if (newState.players[playerId]) {
            
            // カード状態を追加・更新
            if (!newState.players[playerId].cardStates) {
              newState.players[playerId].cardStates = {};
            }
            
            if (!newState.players[playerId].cardStates[position]) {
              newState.players[playerId].cardStates[position] = {};
            }
            
            // cardStateの各プロパティを更新
            Object.assign(newState.players[playerId].cardStates[position], cardState);
            
          }
        }
        break;
        
      default:
        window.warnLog(`未知のアクションタイプ: ${actionType}`);
    }
    
    return newState;
  }

  /**
   * 状態の妥当性チェック
   */
  validateState(state) {
    try {
      // 基本構造チェック
      if (!state.game || !state.turn || !state.players || !state.ui || !state.meta) {
        return false;
      }
      
      // プレイヤー範囲チェック
      if (state.turn.currentPlayer < 1 || state.turn.currentPlayer > 2) {
        return false;
      }
      
      // フェーズ範囲チェック
      if (state.turn.currentPhase < -1 || state.turn.currentPhase > 5) {
        return false;
      }
      
      // プレイヤー状態チェック
      if (!state.players[1] || !state.players[2]) {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * イベントリスナーの登録
   */
  addListener(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
  }

  /**
   * イベントリスナーの削除
   */
  removeListener(eventType, callback) {
    if (this.listeners.has(eventType)) {
      const listeners = this.listeners.get(eventType);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * リスナーに通知
   */
  notifyListeners(actionType, payload, oldState, newState) {
    // 特定のアクションタイプのリスナー
    if (this.listeners.has(actionType)) {
      this.listeners.get(actionType).forEach(callback => {
        try {
          callback(payload, oldState, newState);
        } catch (error) {
        }
      });
    }
    
    // 全般的な状態変更リスナー
    if (this.listeners.has('*')) {
      this.listeners.get('*').forEach(callback => {
        try {
          callback(actionType, payload, oldState, newState);
        } catch (error) {
        }
      });
    }
  }

  /**
   * 履歴に追加
   */
  addToHistory(actionType, payload, oldState) {
    this.stateHistory.push({
      timestamp: Date.now(),
      actionType,
      payload: this.deepClone(payload),
      state: this.deepClone(oldState)
    });
    
    // 履歴サイズ制限
    if (this.stateHistory.length > this.maxHistorySize) {
      this.stateHistory.shift();
    }
  }

  /**
   * 状態変更ログ
   */
  logStateChange(actionType, payload) {
    // 重要なアクションのみログ出力
    const importantActions = ['GAME_START', 'GAME_END', 'PHASE_CHANGE', 'PLAYER_CHANGE', 'SWAP_CARDS'];
    
    if (importantActions.includes(actionType)) {
    }
  }

  /**
   * カードに状態情報を付与する
   * @param {Object} card - カードオブジェクト
   * @param {Object} stateInfo - 付与する状態情報
   * @returns {Object} 状態情報付きカード
   */
  addCardState(card, stateInfo = {}) {
    if (!card) return card;
    
    // カードの状態情報を初期化または更新
    const cardWithState = this.deepClone(card);
    
    if (!cardWithState.cardState) {
      cardWithState.cardState = {
        bloomedThisTurn: false,      // このターンにブルームしたか
        justPlayed: false,           // プレイしたばかりか（次ターンまでブルーム不可）
        collabLocked: false,         // コラボロック状態か（リセットステップまで移動不可）
        resting: false,              // お休み状態か
        playedTurn: null,            // プレイされたターン
        bloomedFromCard: null,       // ブルーム元のカード（ブルームの場合）
        damage: 0,                   // 受けているダメージ
        yellCards: [],               // 付いているエールカード
        supportCards: [],            // 付いているサポートカード
        stackedCards: [],            // 重なっているホロメンカード
        uniqueId: null               // 一意識別子（同名カード識別用）
      };
    }
    
    // 既存のエール情報を保持（カードの直接プロパティとcardState両方チェック）
    if (cardWithState.yellCards && !cardWithState.cardState.yellCards.length) {
      cardWithState.cardState.yellCards = [...cardWithState.yellCards];
    }
    
    // 状態情報を更新
    Object.assign(cardWithState.cardState, stateInfo);
    
    // isRestingプロパティとcardState.restingを同期
    if (stateInfo.resting !== undefined) {
      cardWithState.isResting = stateInfo.resting;
    } else if (cardWithState.isResting !== undefined) {
      cardWithState.cardState.resting = cardWithState.isResting;
    }
    
    // エール情報をカードの直接プロパティにも設定（UI表示用）
    if (cardWithState.cardState.yellCards && cardWithState.cardState.yellCards.length > 0) {
      cardWithState.yellCards = [...cardWithState.cardState.yellCards];
    }
    
    // 一意識別子がない場合は生成
    if (!cardWithState.cardState.uniqueId) {
      cardWithState.cardState.uniqueId = `${card.number}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    return cardWithState;
  }

  /**
   * カードの状態情報を取得
   * @param {Object} card - カードオブジェクト
   * @returns {Object} 状態情報
   */
  getCardState(card) {
    if (!card || !card.cardState) {
      // カードに直接設定されているisRestingプロパティもチェック
      const isResting = card?.isResting || false;
      return {
        bloomedThisTurn: false,
        justPlayed: false,
        collabLocked: false,
        resting: isResting, // card.isRestingの値を反映
        playedTurn: null,
        bloomedFromCard: null,
        damage: 0,
        yellCards: [],
        supportCards: [],
        stackedCards: [],
        uniqueId: null
      };
    }
    
    // cardStateが存在する場合は、isRestingプロパティとcardState.restingを統合
    const cardState = { ...card.cardState };
    if (card.isResting !== undefined) {
      cardState.resting = card.isResting;
    }
    
    return cardState;
  }

  /**
   * カードの状態をクリア（ターン終了時など）
   * @param {Object} card - カードオブジェクト
   * @param {Array} clearFlags - クリアする状態のリスト
   * @returns {Object} 状態クリア後のカード
   */
  clearCardState(card, clearFlags = ['bloomedThisTurn']) {
    if (!card || !card.cardState) return card;
    
    const updatedCard = this.deepClone(card);
    clearFlags.forEach(flag => {
      if (flag in updatedCard.cardState) {
        if (typeof updatedCard.cardState[flag] === 'boolean') {
          updatedCard.cardState[flag] = false;
        } else {
          updatedCard.cardState[flag] = null;
        }
      }
    });
    
    return updatedCard;
  }

  /**
   * ディープクローン
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Set) return new Set(obj);
    if (obj instanceof Map) return new Map(obj);
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (typeof obj === 'object') {
      const cloned = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = this.deepClone(obj[key]);
        }
      }
      return cloned;
    }
  }

  /**
   * デバッグ情報の取得
   */
  getDebugInfo() {
    return {
      currentState: this.state,
      history: this.stateHistory.slice(-10), // 最新10件
      listenerCount: Array.from(this.listeners.entries()).map(([type, listeners]) => ({
        type,
        count: listeners.length
      }))
    };
  }

  /**
   * ドラッグ&ドロップの有効性をチェック
   * @param {Object} card - ドラッグされているカード
   * @param {string} targetPosition - ドロップ先のポジション
   * @param {number} playerId - プレイヤーID
   * @returns {Object} チェック結果
   */
  checkDropValidity(card, targetPosition, playerId = 1) {
    const currentState = this.getState();
    
    // デバッグ用: 現在の状態を表示
    const playerTurnCount = currentState.turn.playerTurnCount[playerId] || 0;
    
    // 基本的なバリデーション
    if (!card || !targetPosition) {
      return {
        valid: false,
        reason: 'カードまたはドロップ先が指定されていません'
      };
    }

    // ドラッグソースの確認（ブルーム制限用）
    const dragSource = currentState.ui.dragState.dragSource;

    // プレイヤーの存在確認
    if (!currentState.players[playerId]) {
      return {
        valid: false,
        reason: '無効なプレイヤーです'
      };
    }

    // フェーズ別の制限チェック
    const currentPhase = currentState.turn.currentPhase;
    const isDebutPhase = currentState.game.debutPlacementPhase;
    
    // Debut配置フェーズの特別処理
    if (isDebutPhase) {
      if (targetPosition.startsWith('back') || targetPosition === 'center') {
        // Debutレベルのホロメンカードのみ配置可能
        if (card.card_type?.includes('ホロメン') && card.bloom_level === 'Debut') {
          return {
            valid: true,
            reason: 'Debut配置フェーズで配置可能'
          };
        } else {
          return {
            valid: false,
            reason: 'Debut配置フェーズではDebutレベルのホロメンカードのみ配置可能'
          };
        }
      } else {
        return {
          valid: false,
          reason: 'Debut配置フェーズではセンターまたはバックにのみ配置可能'
        };
      }
    }

    // その他のフェーズでの制限
    const player = currentState.players[playerId];
    
    // ブルーム配置の制限チェック（メインステップでのみ可能）
    if ((targetPosition.startsWith('back') || targetPosition === 'center' || targetPosition === 'collab') && currentPhase === 3) {
      const targetCard = targetPosition === 'center' 
        ? player.center 
        : targetPosition === 'collab'
          ? player.collab
          : player[targetPosition];
        
        
      if (targetCard && this.checkBloomCompatibility(card, targetCard).valid) {
        
        // ブルーム操作の場合の制限チェック
        
        // 1. 手札からのみ可能チェック
        if (!dragSource || dragSource !== 'hand') {
          return {
            valid: false,
            reason: 'ブルームは手札からのみ可能です'
          };
        }
        
        // 2. ターン制限チェック
        const canBloomResult = this.canBloom(card, targetCard, playerId);
        if (!canBloomResult.valid) {
          return canBloomResult;
        }
      }
    }
    
    // メインステップ以外でのブルーム試行を拒否
    if ((targetPosition.startsWith('back') || targetPosition === 'center' || targetPosition === 'collab') && currentPhase !== 3) {
      const targetCard = targetPosition === 'center' 
        ? player.center 
        : targetPosition === 'collab'
          ? player.collab
          : player.cards.back_positions[targetPosition];
        
      if (targetCard && this.checkBloomCompatibility(card, targetCard).valid) {
        return {
          valid: false,
          reason: 'ブルームはメインステップでのみ可能です'
        };
      }
    }
    
    if (currentPhase === 3) { // メインステップ
      // コラボポジションの制限チェック
      if (targetPosition === 'collab') {
        return this.checkCollabPlacement(card, player);
      }
      
      // ホロパワーエリアの制限チェック
      if (targetPosition === 'holo') {
        return this.checkHoloPowerPlacement(card, player);
      }
      
      // ブルーム配置の制限チェック（バックスロット）
      if (targetPosition.startsWith('back')) {
        return this.checkBloomPlacement(card, targetPosition, player);
      }
      
      // ブルーム配置の制限チェック（センターポジション）
      if (targetPosition === 'center') {
        return this.checkBloomPlacement(card, 'center', player);
      }
    }

    return {
      valid: true,
      reason: '配置可能'
    };
  }

  // コラボポジション配置のチェック
  checkCollabPlacement(card, player) {
    // ホロメンカードのみがコラボに移動可能
    if (!card.card_type?.includes('ホロメン')) {
      return {
        valid: false,
        reason: 'ホロメンカードのみコラボに配置できます'
      };
    }

    // コラボポジションが既に使用されているかチェック
    const targetCard = player.collab || player.cards?.collab;
    if (targetCard) {
      // 既存カードがある場合、ブルーム可能性をチェック
      
      // ブルーム互換性チェック
      const compatibilityResult = this.checkBloomCompatibility(card, targetCard, 1);
      if (compatibilityResult.valid) {
        // ブルーム可能性チェック
        const canBloomResult = this.canBloom(card, targetCard, 1);
        if (canBloomResult.valid) {
          return {
            valid: true,
            reason: 'コラボでブルーム可能',
            isBloom: true,
            willStayResting: canBloomResult.willStayResting
          };
        } else {
          return canBloomResult;
        }
      } else {
      }
      
      return {
        valid: false,
        reason: 'コラボポジションには既にカードが配置されています'
      };
    }

    return {
      valid: true,
      reason: 'コラボ配置可能'
    };
  }

  // ホロパワーエリア配置のチェック
  checkHoloPowerPlacement(card, player) {
    // エールカードのみがホロパワーに配置可能
    if (!card.card_type?.includes('エール')) {
      return {
        valid: false,
        reason: 'エールカードのみホロパワーに配置できます'
      };
    }

    return {
      valid: true,
      reason: 'ホロパワー配置可能'
    };
  }

  // ブルーム配置のチェック（公式ルールver1.40準拠）
  checkBloomPlacement(card, targetPosition, player) {
    // ターゲットカードの取得（ポジションに応じて適切にアクセス）
    let targetCard;
    if (targetPosition === 'center') {
      targetCard = player.center;
    } else if (targetPosition === 'collab') {
      targetCard = player.collab;
    } else if (targetPosition.startsWith('back')) {
      targetCard = player.cards.back_positions[targetPosition];
    } else {
      targetCard = player.cards[targetPosition];
    }
    
    if (!targetCard) {
      return {
        valid: false,
        reason: 'ブルームする対象カードが存在しません'
      };
    }

    // ブルームは手札からのみ可能
    // この関数が呼ばれる時点で、ドラッグ元が手札であることを確認する必要がある
    // ※ 実際のドラッグ元チェックは checkDropValidity で実装

    // 基本的な互換性チェック
    const compatibilityResult = this.checkBloomCompatibility(card, targetCard, 1);
    if (!compatibilityResult.valid) {
      return compatibilityResult;
    }

    // より詳細なブルーム可能性チェック
    const canBloomResult = this.canBloom(card, targetCard, 1);
    if (!canBloomResult.valid) {
      return canBloomResult;
    }

    return {
      valid: true,
      reason: 'ブルーム配置可能',
      willStayResting: canBloomResult.willStayResting,
      isBloom: true // ブルームであることを明示
    };
  }

  /**
   * カード交換の有効性をチェック
   * @param {Object} sourceCard - 移動元のカード
   * @param {string} sourcePosition - 移動元のポジション
   * @param {Object} targetCard - 移動先のカード（null可）
   * @param {string} targetPosition - 移動先のポジション
   * @param {number} playerId - プレイヤーID
   * @returns {Object} チェック結果
   */
  checkSwapValidity(sourceCard, sourcePosition, targetCard, targetPosition, playerId = 1) {
    const currentState = this.getState();
    
    // 基本的なバリデーション
    if (!sourceCard || !sourcePosition || !targetPosition) {
      return {
        valid: false,
        reason: '必要な情報が不足しています'
      };
    }

    // 同じ位置への移動は無効
    if (sourcePosition === targetPosition) {
      return {
        valid: false,
        reason: '同じ位置への移動はできません'
      };
    }

    // プレイヤーの存在確認
    if (!currentState.players[playerId]) {
      return {
        valid: false,
        reason: '無効なプレイヤーです'
      };
    }

    const player = currentState.players[playerId];
    
    // フェーズ制限チェック
    const currentPhase = currentState.turn.currentPhase;
    const isDebutPhase = currentState.game.debutPlacementPhase;
    
    // デバッグログ追加
    
    // Debut配置フェーズでは自由に移動可能（ブルーム以外）
    if (isDebutPhase) {
      // 手札、センター、バック間の移動は自由
      if ((sourcePosition === 'hand' || sourcePosition === 'center' || sourcePosition.startsWith('back')) &&
          (targetPosition === 'hand' || targetPosition === 'center' || targetPosition.startsWith('back'))) {
        
        // 手札への移動は常に許可
        if (targetPosition === 'hand') {
          return {
            valid: true,
            reason: 'Debut配置フェーズで手札への移動可能'
          };
        }
        
        // Debutレベルのホロメンカードの配置先制限のみチェック（手札以外）
        if (targetPosition !== 'hand' && sourceCard.card_type?.includes('ホロメン')) {
          if (sourceCard.bloom_level !== 'Debut') {
            return {
              valid: false,
              reason: 'Debut配置フェーズではDebutレベルのホロメンカードのみ配置可能'
            };
          }
        }
        
        return {
          valid: true,
          reason: 'Debut配置フェーズで移動可能'
        };
      } else {
        return {
          valid: false,
          reason: 'Debut配置フェーズでは手札・センター・バック間のみ移動可能'
        };
      }
    }

    // ゲーム中の交換制限
    if (currentPhase !== 3) { // メインフェーズ以外では交換不可
      return {
        valid: false,
        reason: 'メインフェーズでのみカード交換が可能です'
      };
    }

    // メインフェーズでのカード移動制限
    if (currentPhase === 3) {
      // コラボからの移動制限: リセットステップ以外では一切移動不可
      if (sourcePosition === 'collab') {
        return {
          valid: false,
          reason: 'コラボのホロメンは次のリセットステップまで移動できません'
        };
      }
      
      // コラボへの移動制限: バックからのみ可能
      if (targetPosition === 'collab') {
        if (!sourcePosition.startsWith('back')) {
          return {
            valid: false,
            reason: 'コラボに移動できるのはバックのカードからのみです'
          };
        }
        // コラボ移動の場合は、バリデーションのみ実行し、実際の移動はhand-manager.jsで制御
        return this.checkCollabMoveFromBack(sourceCard, player);
      }
      
      // センターからバックへの移動: バトンタッチ
      if (sourcePosition === 'center' && targetPosition.startsWith('back')) {
        return this.checkBatonTouch(sourceCard, targetCard, targetPosition, player);
      }
      
      // バックからセンターへの移動: 通常の交換
      if (sourcePosition.startsWith('back') && targetPosition === 'center') {
        return this.checkBackToCenterSwap(sourceCard, targetCard, player);
      }
      
      // バック同士の移動: 通常の交換
      if (sourcePosition.startsWith('back') && targetPosition.startsWith('back')) {
        return this.checkBackToBackSwap(sourceCard, targetCard, sourcePosition, targetPosition, player);
      }
    }

    // ホロメンカード同士の交換チェック（従来のロジック）
    if (sourceCard.card_type?.includes('ホロメン')) {
      // 移動先にカードがある場合の交換ルール
      if (targetCard) {
        if (!targetCard.card_type?.includes('ホロメン')) {
          return {
            valid: false,
            reason: 'ホロメンカード同士でのみ位置交換が可能です'
          };
        }
        
        // ホロメンカード同士の基本的な配置チェック（ブルームではない通常の移動）
        // 実際のブルームは別途 checkBloomPlacement で処理される
      } else {
        // 空の位置への移動は基本的に許可（ブルーム以外）
        // ブルーム判定は drag&drop 時に別途実行される
      }
    }

    // バックスロット制限を削除 - すべてのスロットを使用可能に
    if (targetPosition.startsWith('back')) {
      const backIndex = parseInt(targetPosition.replace('back', '')) - 1;
      
      // スロット範囲チェックのみ（0-4）
      if (backIndex < 0 || backIndex >= 5) {
        return {
          valid: false,
          reason: '無効なバックスロットです'
        };
      }
    }

    return {
      valid: true,
      reason: '交換可能'
    };
  }

  /**
   * ブルーム互換性チェック（公式ルールver1.40準拠）
   * @param {Object} card - チェックするカード
   * @param {Object} targetCard - ブルーム対象のカード
   * @param {number} playerId - プレイヤーID
   * @returns {Object} チェック結果
   */
  checkBloomCompatibility(card, targetCard, playerId) {
    if (!card.card_type?.includes('ホロメン') || !targetCard.card_type?.includes('ホロメン')) {
      return {
        valid: false,
        reason: 'ブルームはホロメン同士でのみ可能です'
      };
    }

    // 1. 同名カード要件チェック（正規化名比較も実施）
    const normalize = (name) => {
      if (!name || typeof name !== 'string') return '';
      let n = name.trim();
      n = n.replace(/[\s　]+/g, '');
      n = n.replace(/[（(][^)）]*[)）]$/g, '');
      n = n.replace(/[★☆#]+$/g, '');
      return n;
    };
    const rawMismatch = card.name !== targetCard.name;
    const normMismatch = normalize(card.name) !== normalize(targetCard.name);
    if (normMismatch) {
      return {
        valid: false,
        reason: rawMismatch ? 'ブルームは同名（表記揺れ含む）のホロメンのみ可能です' : '内部正規化後の名称不一致によりブルーム不可'
      };
    }

    // 2. Spotホロメンのブルーム禁止
    if (card.bloom_level === 'Spot' || targetCard.bloom_level === 'Spot') {
      return {
        valid: false,
        reason: 'Spotホロメンはブルームできません'
      };
    }

    // 3. ブルームレベル制限チェック（公式ルール準拠）
    const sourceLevel = card.bloom_level;
    const targetLevel = targetCard.bloom_level;
    
    // 正しいブルーム可能組み合わせ
    const validBloomCombinations = {
      'Debut': ['1st', '1stBuzz'],                  // Debut → 1st, 1stBuzz のみ
      '1st': ['1st', '1stBuzz', '2nd'],             // 1st → 1st, 1stBuzz, 2nd
      '1stBuzz': ['1st', '1stBuzz', '2nd'],         // 1stBuzz → 1st, 1stBuzz, 2nd
      '2nd': ['2nd']                                // 2nd → 2nd のみ
    };
    
    if (!validBloomCombinations[targetLevel] || !validBloomCombinations[targetLevel].includes(sourceLevel)) {
      return {
        valid: false,
        reason: `${targetLevel} → ${sourceLevel}へのブルームはできません`
      };
    }
    

    // 4. HP・ダメージ制限チェック
    const targetCardState = this.getCardState(targetCard);
    const currentDamage = targetCardState.damage || 0;
    const bloomCardHP = card.hp || 0;
    
    if (bloomCardHP <= currentDamage) {
      return {
        valid: false,
        reason: 'Bloom先のHPがダメージ量以下のためブルームできません'
      };
    }

    return {
      valid: true,
      reason: 'ブルーム可能'
    };
  }

  /**
   * ドラッグ状態の更新
   * @param {boolean} isDragging - ドラッグ中かどうか
   * @param {Object} card - ドラッグされているカード
   * @param {string} source - ドラッグ元
   */
  setDragState(isDragging, card = null, source = null) {
    this.updateState('SET_DRAG_STATE', {
      isDragging,
      card,
      source
    });
  }

  /**
   * 有効なドロップゾーンの設定
   * @param {Array} validZones - 有効なドロップゾーンのリスト
   */
  setValidDropZones(validZones) {
    this.updateState('SET_DROP_ZONES', {
      validZones
    });
  }

  /**
   * ブルーム履歴を追加
   * @param {number} playerId - プレイヤーID
   * @param {string} position - ブルームしたポジション
   */
  addBloomHistory(playerId, position) {
    this.updateState('ADD_BLOOM_HISTORY', {
      player: playerId,
      position
    });
  }

  /**
   * ブルーム履歴をクリア
   * @param {number} playerId - プレイヤーID（省略で全プレイヤー）
   */
  clearBloomHistory(playerId = null) {
    this.updateState('CLEAR_BLOOM_HISTORY', {
      player: playerId
    });
  }

  /**
   * カードを配置してブルーム履歴を更新
   * @param {number} playerId - プレイヤーID
   * @param {Object} card - 配置するカード
   * @param {string} position - 配置先ポジション
   */
  placeCardWithBloomTracking(playerId, card, position) {
    // カード配置
    this.updateState('PLACE_CARD', {
      player: playerId,
      card,
      position
    });

    // ブルーム配置の場合、履歴に追加
    if (position.startsWith('back') && card.card_type?.includes('ホロメン')) {
      const player = this.getState().players[playerId];
      const targetCard = player.stage[position];
      
      if (targetCard) { // 他のカードの上に配置（ブルーム）
        this.addBloomHistory(playerId, position);
      }
    }
  }

  // =========================================
  // ブルーム・コラボルール管理メソッド
  // =========================================

  /**
   * カードがブルームかどうかを判定（新ブルームルール準拠）
   * @param {Object} card - ブルームしようとするカード（手札から）
   * @param {Object} targetCard - ブルーム対象のカード（場のカード）
   * @returns {boolean} ブルームかどうか
   */
  isBloom(card, targetCard) {
    // 基本チェック: カードが存在するか
    if (!card || !targetCard) {
      return false;
    }
    
    // 正規化名称で比較（placement-controller と同等ロジックをこちらにも複製）
    const normalize = (name) => {
      if (!name || typeof name !== 'string') return '';
      let n = name.trim();
      n = n.replace(/[\s　]+/g, '');
      n = n.replace(/[（(][^)）]*[)）]$/g, '');
      n = n.replace(/[★☆#]+$/g, '');
      return n;
    };
    const rawSource = card.name;
    const rawTarget = targetCard.name;
    const normSource = normalize(rawSource);
    const normTarget = normalize(rawTarget);

    if (normSource !== normTarget) {
      return false;
    }
    
    // 新しいブルームルールでレベル組み合わせチェック
    const sourceLevel = card.bloom_level;      // 手札のカード
    const targetLevel = targetCard.bloom_level; // 場のカード
    
    // 正しいブルーム可能組み合わせ
    const validBloomCombinations = {
      'Debut': ['1st', '1stBuzz'],                  // Debut → 1st, 1stBuzz のみ
      '1st': ['1st', '1stBuzz', '2nd'],             // 1st → 1st, 1stBuzz, 2nd
      '1stBuzz': ['1st', '1stBuzz', '2nd'],         // 1stBuzz → 1st, 1stBuzz, 2nd
      '2nd': ['2nd']                                // 2nd → 2nd のみ
    };
    
    return validBloomCombinations[targetLevel]?.includes(sourceLevel) || false;
  }

  /**
   * ブルームレベルを数値に変換
   * @param {string} bloomLevel - ブルームレベル文字列
   * @returns {number} レベル数値
   */
  getBloomLevel(bloomLevel) {
    switch (bloomLevel) {
      case 'Debut':
        return 0;
      case '1st':
        return 1;
      case '2nd':
        return 2;
      default:
        return -1; // 無効なレベル
    }
  }

  /**
   * カードがブルーム可能かチェック（公式ルールver1.40準拠）
   * @param {Object} card - ブルームしようとするカード
   * @param {Object} targetCard - ブルーム対象のカード
   * @param {number} playerId - プレイヤーID
   * @returns {Object} チェック結果
   */
  canBloom(card, targetCard, playerId) {
    const gameState = this.getState();
    const currentTurn = gameState.turn.turnCount;
    const playerTurnCount = gameState.turn.playerTurnCount[playerId] || 0;
    const currentPhase = gameState.turn.currentPhase;
    const debutPlacementPhase = gameState.game?.debutPlacementPhase || this.state.debutPlacementPhase || false;

    if (window && window.debugLog) {
      window.debugLog('[canBloom] attempt', {
        source: { name: card?.name, level: card?.bloom_level, hp: card?.hp },
        target: { name: targetCard?.name, level: targetCard?.bloom_level, hp: targetCard?.hp },
        phase: currentPhase,
        debutPlacementPhase,
        turn: currentTurn,
        playerTurnCount
      });
    }

    // フェーズ制限: メインステップ（phase 3）のみ許可（Debut配置フェーズ中は通常ブルーム不可）
    if (!debutPlacementPhase && currentPhase !== 3) {
      return {
        valid: false,
        reason: 'ブルームはメインステップでのみ可能です'
      };
    }
    // Debut配置特別フェーズ中はブルーム禁止（初期配置のみ）
    if (debutPlacementPhase) {
      return {
        valid: false,
        reason: 'Debut配置フェーズ中はブルームできません'
      };
    }
    
    // 1. 基本的な互換性チェック
    const compatibilityCheck = this.checkBloomCompatibility(card, targetCard, playerId);
    if (!compatibilityCheck.valid) {
      return compatibilityCheck;
    }

    // 2. 初回ターン制限チェック（各プレイヤーの最初のターン）
    if (playerTurnCount <= 1) {
      return {
        valid: false,
        reason: `プレイヤー${playerId}の最初のターンではブルームできません`
      };
    }


    // 3. カード別ブルーム回数制限チェック（同一カードに対して1ターンに1回のみ）
    const targetCardState = this.getCardState(targetCard);
    
    if (targetCardState?.bloomedThisTurn) {
      return {
        valid: false,
        reason: `このカードは今ターンに既にブルームしています`
      };
    }

    // 4. カード状態チェック
    const cardState = this.getCardState(card);
    // targetCardStateは上で既に取得済み

    // 5. ステージに出たターンのブルーム禁止
    // playedTurnがnullの場合は、古いカードとして扱い、ブルーム可能とする
    if (targetCardState.justPlayed || (targetCardState.playedTurn !== null && targetCardState.playedTurn === currentTurn)) {
      return {
        valid: false,
        reason: 'ステージに出たターンではブルームできません'
      };
    }

    // 6. ブルーム不可能力チェック
    if (targetCard.abilities?.includes('ブルーム不可') || targetCard.bloom_level === 'Spot') {
      return {
        valid: false,
        reason: 'このホロメンはブルーム不可能力を持っています'
      };
    }

    // 7. お休み状態の確認（お休みでもブルーム可能、ただし状態は維持）
    if (targetCardState.resting) {
    }

    return {
      valid: true,
      reason: 'ブルーム可能',
      willStayResting: targetCardState.resting
    };
  }

  /**
   * ブルーム実行後の状態更新（公式ルールver1.40準拠）
   * @param {Object} card - ブルームしたカード
   * @param {Object} targetCard - ブルーム対象のカード  
   * @param {number} playerId - プレイヤーID
   * @returns {Object} 更新されたカード
   */
  recordBloom(card, targetCard, playerId) {
    const currentTurn = this.state.turn.turnCount;
    const targetCardState = this.getCardState(targetCard);
    
    // ブルームしたカードに状態を付与し、全ての要素を引き継ぐ
    const updatedCard = this.addCardState(card, {
      bloomedThisTurn: false, // 新しく配置されるカードはブルーム済みではない
      playedTurn: currentTurn,
      bloomedFromCard: targetCard,
      // 引き継がれる状態
      resting: targetCardState.resting,           // お休み状態
      damage: targetCardState.damage || 0,        // ダメージマーカー
      // 引き継がれる要素
      yellCards: targetCard.cardState?.yellCards || [],      // エールカード
      supportCards: targetCard.cardState?.supportCards || [], // サポートカード
      stackedCards: [                             // 重なっているホロメン
        ...(targetCard.cardState?.stackedCards || []),
        targetCard // ブルーム元を重なったカードに追加
      ]
    });
    
    // ブルーム履歴を記録
    const targetCardUpdatedState = this.addCardState(targetCard, {
      bloomedThisTurn: true // ブルーム対象のホロメンもブルーム済みマーク
    });
    
    
    return updatedCard;
  }

  /**
   * プレイヤーがコラボ可能かどうかの総合チェック
   * @param {number} playerId - プレイヤーID
   * @returns {Object} チェック結果
   */
  canPlayerCollab(playerId) {
    const playerState = this.state.players[playerId];


    // 1. このターンに既にコラボ移動を実行したかチェック
    if (playerState.gameState.collabMovedThisTurn) {
      return {
        valid: false,
        reason: '1ターンに1度のみコラボ移動可能です'
      };
    }

    // 2. コラボポジションが既に使用されているかチェック
    if (playerState.cards.collab) {
      return {
        valid: false,
        reason: 'コラボポジションには既にカードが配置されています'
      };
    }

    // 3. デッキ残り枚数チェック（ホロパワー配置のため）
    if (!playerState.cards.deck || playerState.cards.deck.length === 0) {
      return {
        valid: false,
        reason: 'デッキが空のためホロパワーを置けません'
      };
    }

    // 4. バックポジションにコラボ可能なホロメンが存在するかチェック
    const backPositions = ['back1', 'back2', 'back3', 'back4', 'back5'];
    const availableHolomen = backPositions.some(pos => {
      const backCard = playerState.cards[pos];
      if (!backCard || !backCard.card_type?.includes('ホロメン')) {
        return false;
      }
      const cardState = this.getCardState(backCard);
      return !cardState.resting; // お休み状態でないホロメンが存在
    });

    if (!availableHolomen) {
      return {
        valid: false,
        reason: 'コラボできるホロメンがバックポジションにいません'
      };
    }

    return {
      valid: true,
      reason: 'コラボ実行可能'
    };
  }

  /**
   * コラボ移動が可能かチェック
   * 公式ルール準拠：デッキ枚数、ホロメン存在、お休み状態等を総合的にチェック
   * @param {Object} card - 移動しようとするカード
   * @param {number} playerId - プレイヤーID
   * @returns {Object} チェック結果
   */
  canMoveToCollab(card, playerId) {
    const playerState = this.state.players[playerId];
    const currentTurn = this.state.turn.currentPlayer;

    // デバッグ: 詳細なターン状態を記録

    // 1. ホロメンカードのみがコラボに移動可能
    if (!card.card_type?.includes('ホロメン')) {
      return {
        valid: false,
        reason: 'ホロメンカードのみコラボに移動できます'
      };
    }

    // 2. 現在のターンプレイヤーのみがコラボ移動可能
    if (playerId !== currentTurn) {
      return {
        valid: false,
        reason: '自分のターンでないとコラボ移動できません'
      };
    }

    // 3. このターンに既にコラボ移動を実行したかチェック
    if (playerState.gameState.collabMovedThisTurn) {
      return {
        valid: false,
        reason: '1ターンに1度のみコラボ移動可能です'
      };
    }

    // 3. お休み状態のカードかチェック
    const cardState = this.getCardState(card);
    if (cardState.resting) {
      return {
        valid: false,
        reason: 'お休み状態のホロメンはコラボに移動できません'
      };
    }

    // 4. コラボポジションが既に使用されているかチェック（Battle Engine参照で同期確保）
    const battleEnginePlayer = this.battleEngine.players[playerId];
    
    if (battleEnginePlayer.collab) {
      return {
        valid: false,
        reason: 'コラボポジションには既にカードが配置されています'
      };
    }

    // 5. デッキ残り枚数チェック（ホロパワー配置のため、Battle Engine参照）
    if (!battleEnginePlayer.deck || battleEnginePlayer.deck.length === 0) {
      return {
        valid: false,
        reason: 'デッキが空のためホロパワーを置けません'
      };
    }

    // 6. バックポジションにコラボ可能なホロメンが存在するかチェック（Battle Engine参照）
    const backPositions = ['back1', 'back2', 'back3', 'back4', 'back5'];
    const availableHolomen = backPositions.some(pos => {
      const backCard = battleEnginePlayer[pos];
      if (!backCard || !backCard.card_type?.includes('ホロメン')) {
        return false;
      }
      // お休み状態チェックはState Managerを使用（状態管理のため）
      const cardState = this.getCardState(backCard);
      return !cardState.resting; // お休み状態でないホロメンが存在
    });

    if (!availableHolomen) {
      return {
        valid: false,
        reason: 'コラボできるホロメンがバックポジションにいません'
      };
    }

    return {
      valid: true,
      reason: 'コラボ移動可能'
    };
  }

  /**
   * コラボ移動実行後の状態更新
   * @param {Object} card - コラボに移動したカード
   * @param {number} playerId - プレイヤーID
   * @returns {Object} 更新されたカード
   */
  recordCollabMove(card, playerId) {
    const currentTurn = this.state.turn.currentPlayer;
    const currentFlag = this.state.players[playerId].gameState.collabMovedThisTurn;
    
    
    // プレイヤーの状態を更新
    this.updateState('UPDATE_PLAYER_GAME_STATE', {
      player: playerId,
      property: 'collabMovedThisTurn',
      value: true
    });
    
    // 更新後の状態を確認
    const updatedFlag = this.state.players[playerId].gameState.collabMovedThisTurn;
    
    
    // カードにコラボロック状態を付与
    const updatedCard = this.addCardState(card, {
      collabLocked: true
    });
    
    return updatedCard;
  }

  /**
   * コラボからの移動が可能かチェック
   * @param {Object} card - 移動しようとするカード
   * @param {number} playerId - プレイヤーID
   * @returns {Object} チェック結果
   */
  canMoveFromCollab(card, playerId) {
    
    // シンプルチェック：カードのcardState.collabLockedを確認
    if (card && card.cardState && card.cardState.collabLocked === true) {
      return {
        valid: false,
        reason: 'コラボしたホロメンは次のリセットステップまで移動できません'
      };
    }
    
    // Battle Engineからも確認
    if (this.battleEngine && this.battleEngine.players[playerId]) {
      const collabCard = this.battleEngine.players[playerId].collab;
      if (collabCard && collabCard.name === card.name && 
          collabCard.cardState && collabCard.cardState.collabLocked === true) {
        return {
          valid: false,
          reason: 'コラボしたホロメンは次のリセットステップまで移動できません'
        };
      }
    }
    
    return {
      valid: true,
      reason: '移動可能'
    };
  }

  /**
   * カードにダメージを与える
   * @param {Object} card - ダメージを受けるカード
   * @param {number} damage - ダメージ量
   * @returns {Object} ダメージ後のカード
   */
  addDamageToCard(card, damage) {
    if (!card || damage <= 0) return card;
    
    const currentState = this.getCardState(card);
    const newDamage = (currentState.damage || 0) + damage;
    
    return this.addCardState(card, {
      damage: newDamage
    });
  }

  /**
   * カードのダメージを回復する
   * @param {Object} card - 回復するカード
   * @param {number} healAmount - 回復量（省略で全回復）
   * @returns {Object} 回復後のカード
   */
  healCardDamage(card, healAmount = null) {
    if (!card) return card;
    
    const currentState = this.getCardState(card);
    const currentDamage = currentState.damage || 0;
    
    const newDamage = healAmount === null 
      ? 0 
      : Math.max(0, currentDamage - healAmount);
    
    return this.addCardState(card, {
      damage: newDamage
    });
  }

  /**
   * エールカードをホロメンに付ける
   * @param {Object} holomem - ホロメンカード
   * @param {Object} yellCard - エールカード
   * @returns {Object} 更新されたホロメンカード
   */
  attachYellCard(holomem, yellCard) {
    if (!holomem || !yellCard) return holomem;
    
    const currentState = this.getCardState(holomem);
    const newYellCards = [...(currentState.yellCards || []), yellCard];
    
    return this.addCardState(holomem, {
      yellCards: newYellCards
    });
  }

  /**
   * サポートカードをホロメンに付ける
   * @param {Object} holomem - ホロメンカード
   * @param {Object} supportCard - サポートカード
   * @returns {Object} 更新されたホロメンカード
   */
  attachSupportCard(holomem, supportCard) {
    if (!holomem || !supportCard) return holomem;
    
    const currentState = this.getCardState(holomem);
    const newSupportCards = [...(currentState.supportCards || []), supportCard];
    
    return this.addCardState(holomem, {
      supportCards: newSupportCards
    });
  }

  /**
   * プレイしたばかりのDebutカードを記録
   * @param {Object} card - プレイしたカード
   * @param {number} playerId - プレイヤーID
   * @returns {Object} 更新されたカード
   */
  recordJustPlayedDebut(card, playerId) {
    const currentTurn = this.state.turn.turnCount;
    
    const updatedCard = this.addCardState(card, {
      justPlayed: true,
      playedTurn: currentTurn
    });
    
    return updatedCard;
  }

  /**
   * ターン終了時のクリーンアップ
   * @param {number} playerId - プレイヤーID
   */
  endTurnCleanup(playerId) {
    // プレイヤーの基本状態をクリア
    this.updateState('UPDATE_PLAYER_GAME_STATE', {
      player: playerId,
      property: 'collabMovedThisTurn',
      value: false
    });
    
    this.updateState('UPDATE_PLAYER_GAME_STATE', {
      player: playerId,
      property: 'batonTouchUsedThisTurn',
      value: false
    });
    
    this.updateState('UPDATE_PLAYER_GAME_STATE', {
      player: playerId,
      property: 'usedLimitedThisTurn',
      value: []
    });
    
    // 全カードのターン終了時状態をクリア
    this.clearAllCardsState(playerId, ['bloomedThisTurn']);
  }

  /**
   * リセットステップ時のクリーンアップ
   * @param {number} playerId - プレイヤーID
   */
  resetStepCleanup(playerId) {
    // 全カードのリセットステップ時状態をクリア
    this.clearAllCardsState(playerId, ['justPlayed', 'collabLocked']);
    
    // お休み状態のアクティブ化とコラボホロメンのお休み化もここで実行
    this.processRestStateChanges(playerId);
  }

  /**
   * プレイヤーの全カードの状態をクリア
   * @param {number} playerId - プレイヤーID
   * @param {Array} clearFlags - クリアする状態のリスト
   */
  clearAllCardsState(playerId, clearFlags) {
    const player = this.state.players[playerId];
    if (!player) return;
    
    // 各エリアのカードの状態をクリア
    const areas = ['center', 'collab', 'back1', 'back2', 'back3', 'back4', 'back5', 'hand', 'archive'];
    
    areas.forEach(area => {
      const cards = player.cards[area];
      if (Array.isArray(cards)) {
        // 配列の場合（hand, archive等）
        for (let i = 0; i < cards.length; i++) {
          if (cards[i]) {
            cards[i] = this.clearCardState(cards[i], clearFlags);
          }
        }
      } else if (cards) {
        // 単一カードの場合（center, collab, back1-5等）
        player.cards[area] = this.clearCardState(cards, clearFlags);
      }
    });
  }

  /**
   * お休み状態の変更処理
   * @param {number} playerId - プレイヤーID
   */
  processRestStateChanges(playerId) {
    const player = this.state.players[playerId];
    if (!player) return;
    
    // コラボにいるホロメンをお休み状態にする
    if (player.cards.collab) {
      player.cards.collab = this.addCardState(player.cards.collab, {
        resting: true
      });
    }
    
    // バックのお休み状態のホロメンをアクティブにする
    ['back1', 'back2', 'back3', 'back4', 'back5'].forEach(position => {
      const card = player.cards[position];
      if (card) {
        const cardState = this.getCardState(card);
        if (cardState.resting) {
          player.cards[position] = this.addCardState(card, {
            resting: false
          });
        }
      }
    });
  }

  // =========================================
  // Debut配置フェーズ管理メソッド
  // =========================================

  /**
   * Debut配置フェーズを開始
   */
  startDebutPlacementPhase() {
    this.updateState('DEBUT_PLACEMENT_START', {});
  }

  /**
   * Debut配置フェーズを終了
   */
  endDebutPlacementPhase() {
    this.updateState('DEBUT_PLACEMENT_END', {});
  }

  /**
   * Debut配置が完了しているかチェック
   * @param {number} playerId - プレイヤーID
   * @returns {Object} チェック結果
   */
  checkDebutPlacementComplete(playerId) {
    const player = this.state.players[playerId];
    if (!player) {
      return {
        complete: false,
        reason: '無効なプレイヤーです'
      };
    }

    // センターに最低1枚のDebutカードが必要
    if (!player.cards.center || !player.cards.center.card_type?.includes('ホロメン')) {
      return {
        complete: false,
        reason: 'センターにDebutホロメンカードを配置してください'
      };
    }

    return {
      complete: true,
      reason: 'Debut配置完了'
    };
  }

  // =========================================
  // メインフェーズカード移動ルール
  // =========================================

  /**
   * バックからコラボへの移動チェック
   * @param {Object} card - 移動するカード
   * @param {Object} player - プレイヤー状態
   * @returns {Object} チェック結果
   */
  checkCollabMoveFromBack(card, player) {
    // ホロメンカードのみがコラボに移動可能
    if (!card.card_type?.includes('ホロメン')) {
      return {
        valid: false,
        reason: 'ホロメンカードのみコラボに移動できます'
      };
    }

    // このターンに既にコラボ移動を実行したかチェック
    if (player.gameState.collabMovedThisTurn) {
      return {
        valid: false,
        reason: '1ターンに1度のみコラボ移動可能です'
      };
    }

    // お休み状態のカードかチェック
    const cardState = this.getCardState(card);
    if (cardState.resting) {
      return {
        valid: false,
        reason: 'お休み状態のホロメンはコラボに移動できません'
      };
    }

    // コラボポジションが既に使用されているかチェック
    if (player.cards.collab) {
      return {
        valid: false,
        reason: 'コラボポジションには既にカードが配置されています'
      };
    }

    return {
      valid: true,
      reason: 'コラボ移動可能'
    };
  }

  /**
   * バトンタッチチェック（センターからバックへの移動）
   * @param {Object} sourceCard - センターのカード
   * @param {Object} targetCard - バックのカード（必須）
   * @param {string} targetPosition - バックのポジション
   * @param {Object} player - プレイヤー状態
   * @returns {Object} チェック結果
   */
  checkBatonTouch(sourceCard, targetCard, targetPosition, player) {
    // バックに対象カードが存在することが必須
    if (!targetCard) {
      return {
        valid: false,
        reason: 'バトンタッチは空のスロットには使用できません'
      };
    }

    // 対象がホロメンカードであることを確認
    if (!targetCard.card_type?.includes('ホロメン')) {
      return {
        valid: false,
        reason: 'バトンタッチはホロメン同士でのみ可能です'
      };
    }

    // このターンに既にバトンタッチを実行したかチェック
    if (player.gameState.batonTouchUsedThisTurn) {
      return {
        valid: false,
        reason: '1ターンに1度のみバトンタッチ可能です'
      };
    }

    // センターカードのbaton_touch情報を取得
    const batonTouchInfo = sourceCard.baton_touch;
    if (!batonTouchInfo || 
        (typeof batonTouchInfo === 'string' && batonTouchInfo.length === 0) ||
        (Array.isArray(batonTouchInfo) && batonTouchInfo.length === 0)) {
      return {
        valid: false,
        reason: 'このカードはバトンタッチ能力を持っていません'
      };
    }

    // 必要なアーカイブ配置コストをチェック
    const requiredCosts = this.calculateBatonTouchCost(batonTouchInfo);
    const availableYellCards = this.getAvailableYellCardsForBatonTouch(player);
    
    const costCheck = this.checkBatonTouchCost(requiredCosts, availableYellCards);
    if (!costCheck.valid) {
      return costCheck;
    }

    return {
      valid: true,
      reason: 'バトンタッチ可能',
      requiredCosts,
      availableYellCards
    };
  }

  /**
   * バックからセンターへの交換チェック
   * @param {Object} sourceCard - バックのカード
   * @param {Object} targetCard - センターのカード
   * @param {Object} player - プレイヤー状態
   * @returns {Object} チェック結果
   */
  checkBackToCenterSwap(sourceCard, targetCard, player) {
    // ホロメンカード同士の交換であることを確認
    if (!sourceCard.card_type?.includes('ホロメン') || !targetCard.card_type?.includes('ホロメン')) {
      return {
        valid: false,
        reason: 'ホロメン同士でのみ位置交換が可能です'
      };
    }

    // お休み状態のカードはセンターに移動できない
    const sourceCardState = this.getCardState(sourceCard);
    if (sourceCardState.resting) {
      return {
        valid: false,
        reason: 'お休み状態のホロメンはセンターに移動できません'
      };
    }

    return {
      valid: true,
      reason: '位置交換可能'
    };
  }

  /**
   * バック同士の交換チェック
   * @param {Object} sourceCard - 移動元のカード
   * @param {Object} targetCard - 移動先のカード（null可）
   * @param {string} sourcePosition - 移動元ポジション
   * @param {string} targetPosition - 移動先ポジション
   * @param {Object} player - プレイヤー状態
   * @returns {Object} チェック結果
   */
  checkBackToBackSwap(sourceCard, targetCard, sourcePosition, targetPosition, player) {
    // ホロメンカードのみ移動可能
    if (!sourceCard.card_type?.includes('ホロメン')) {
      return {
        valid: false,
        reason: 'ホロメンカードのみ移動可能です'
      };
    }

    // 移動先にカードがある場合はホロメン同士である必要がある
    if (targetCard && !targetCard.card_type?.includes('ホロメン')) {
      return {
        valid: false,
        reason: 'ホロメン同士でのみ位置交換が可能です'
      };
    }

    // バック同士の移動は基本的に許可（ブルーム判定は別途実行）
    // 実際のブルーム処理は drag&drop 時に checkBloomPlacement で処理

    return {
      valid: true,
      reason: '移動可能'
    };
  }

  /**
   * バトンタッチのコスト計算
   * @param {string|Array} batonTouchInfo - baton_touch情報（文字列または配列）
   * @returns {Object} 必要コスト
   */
  calculateBatonTouchCost(batonTouchInfo) {
    const costs = {
      white: 0,
      green: 0,
      red: 0,
      blue: 0,
      yellow: 0,
      purple: 0,
      colorless: 0
    };

    // 文字列の場合は配列に変換
    let costArray;
    if (typeof batonTouchInfo === 'string') {
      costArray = [batonTouchInfo];
    } else if (Array.isArray(batonTouchInfo)) {
      costArray = batonTouchInfo;
    } else {
      console.warn('不正なバトンタッチ情報:', batonTouchInfo);
      return costs;
    }

    costArray.forEach(cost => {
      const colorKey = cost.toLowerCase();
      if (colorKey === '無色') {
        costs.colorless++;
      } else if (costs.hasOwnProperty(colorKey)) {
        costs[colorKey]++;
      }
    });

    return costs;
  }

  /**
   * バトンタッチに使用可能なエールカードを取得
   * @param {Object} player - プレイヤー状態
   * @returns {Array} 使用可能なエールカード
   */
  getAvailableYellCardsForBatonTouch(player) {
    const availableCards = [];
    
    // 場に出ているホロメンのエールカードのみを取得
    const holomemPositions = ['center', 'collab', 'back1', 'back2', 'back3', 'back4', 'back5'];
    holomemPositions.forEach(position => {
      const holomem = player.cards[position];
      if (holomem && holomem.yellCards && Array.isArray(holomem.yellCards)) {
        holomem.yellCards.forEach((yellCard, index) => {
          availableCards.push({
            card: yellCard,
            source: 'holomem',
            sourcePosition: position,
            sourceIndex: index,
            color: this.getYellCardColor(yellCard)
          });
        });
      }
    });

    return availableCards;
  }

  /**
   * エールカードの色を取得
   * @param {Object} yellCard - エールカード
   * @returns {string} カラー
   */
  getYellCardColor(yellCard) {
    // エールカードの色情報を取得（実装に応じて調整）
    if (yellCard.color) {
      const colorValue = yellCard.color.toLowerCase();
      
      // 日本語から英語への変換
      const colorMap = {
        '白': 'white',
        '緑': 'green', 
        '赤': 'red',
        '青': 'blue',
        '黄': 'yellow',
        '紫': 'purple',
        '無色': 'colorless'
      };
      
      // 日本語の場合は英語に変換
      if (colorMap[colorValue]) {
        return colorMap[colorValue];
      }
      
      // 既に英語の場合はそのまま
      return colorValue;
    }
    
    // フォールバック: カード名やIDから推測
    const cardName = yellCard.name || '';
    if (cardName.includes('白') || cardName.includes('White')) return 'white';
    if (cardName.includes('緑') || cardName.includes('Green')) return 'green';
    if (cardName.includes('赤') || cardName.includes('Red')) return 'red';
    if (cardName.includes('青') || cardName.includes('Blue')) return 'blue';
    if (cardName.includes('黄') || cardName.includes('Yellow')) return 'yellow';
    if (cardName.includes('紫') || cardName.includes('Purple')) return 'purple';
    
    return 'colorless'; // デフォルトは無色
  }

  /**
   * バトンタッチコストをチェック
   * @param {Object} requiredCosts - 必要コスト
   * @param {Array} availableCards - 使用可能カード
   * @returns {Object} チェック結果
   */
  checkBatonTouchCost(requiredCosts, availableCards) {
    const availableCosts = {
      white: 0,
      green: 0,
      red: 0,
      blue: 0,
      yellow: 0,
      purple: 0,
      colorless: 0
    };

    // 使用可能なカードをカウント
    availableCards.forEach(cardInfo => {
      availableCosts[cardInfo.color]++;
    });

    // 各色のコストをチェック
    for (const [color, required] of Object.entries(requiredCosts)) {
      if (required > 0) {
        if (color === 'colorless') {
          // 無色コストは任意の色で支払い可能
          const totalAvailable = Object.values(availableCosts).reduce((sum, count) => sum + count, 0);
          if (totalAvailable < required) {
            return {
              valid: false,
              reason: `バトンタッチに必要なエール${required}枚が不足しています`
            };
          }
        } else {
          // 特定色のコストチェック
          if (availableCosts[color] < required) {
            return {
              valid: false,
              reason: `バトンタッチに必要な${color}エール${required}枚が不足しています`
            };
          }
        }
      }
    }

    return {
      valid: true,
      reason: 'バトンタッチコスト満足'
    };
  }

  /**
   * バトンタッチ実行
   * @param {Object} sourceCard - センターのカード
   * @param {Object} targetCard - バックのカード
   * @param {string} targetPosition - バックのポジション
   * @param {number} playerId - プレイヤーID
   * @param {Array} usedYellCards - 使用するエールカード
   * @returns {boolean} 実行成功フラグ
   */
  executeBatonTouch(sourceCard, targetCard, targetPosition, playerId, usedYellCards) {
    try {
      // バトンタッチフラグを設定
      this.updateState('UPDATE_PLAYER_GAME_STATE', {
        player: playerId,
        property: 'batonTouchUsedThisTurn',
        value: true
      });

      // ターン1フラグをリセット（バトンタッチ使用時）
      this.updateState('RESET_TURN_FLAGS', {
        player: playerId
      });

      // 使用したエールカードをアーカイブに移動
      usedYellCards.forEach(cardInfo => {
        this.moveYellCardToArchive(cardInfo, playerId);
      });

      // カードの位置を交換
      this.updateState('SWAP_CARDS', {
        player: playerId,
        sourcePosition: 'center',
        targetPosition: targetPosition,
        isBatonTouch: true  // バトンタッチフラグを追加
      });

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * エールカードをアーカイブに移動
   * @param {Object} cardInfo - カード情報
   * @param {number} playerId - プレイヤーID
   */
  moveYellCardToArchive(cardInfo, playerId) {
    const player = this.state.players[playerId];
    if (!player) return;

    if (cardInfo.source === 'holomem') {
      // ホロメンからエールカードを削除
      const holomem = player.cards[cardInfo.sourcePosition];
      if (holomem && holomem.yellCards && Array.isArray(holomem.yellCards)) {
        if (cardInfo.sourceIndex >= 0 && cardInfo.sourceIndex < holomem.yellCards.length) {
          const removedCard = holomem.yellCards.splice(cardInfo.sourceIndex, 1)[0];
          // アーカイブに追加
          if (!player.cards.archive) {
            player.cards.archive = [];
          }
          player.cards.archive.push(removedCard);
        }
      }
    }
  }

  // ==================== HP管理メソッド ====================

  /**
   * カードの最大HPを取得
   * @param {Object} card - カード情報
   * @returns {number} 最大HP
   */
  getMaxHP(card) {
    if (!card || !card.hp) return 0;
    return parseInt(card.hp) || 0;
  }

  /**
   * カードの現在HPを取得
   * @param {Object} card - カード情報
   * @param {number} playerId - プレイヤーID
   * @returns {number} 現在HP
   */
  getCurrentHP(card, playerId) {
    if (!card || !card.hp) return 0;
    const max = this.getMaxHP(card);
    const cardKey = (card.cardState && card.cardState.uniqueId) ? card.cardState.uniqueId : card.id;
    const player = this.state.players[playerId];
    if (player && player.cardHP && player.cardHP[cardKey] !== undefined) {
      return player.cardHP[cardKey];
    }
    // 指定プレイヤーに無い場合は逆プレイヤーを参照（所有者探索）
    const otherId = playerId === 1 ? 2 : 1;
    const other = this.state.players[otherId];
    if (other && other.cardHP && other.cardHP[cardKey] !== undefined) {
      console.warn(`⚠️ [HP所有者再解決] cardKey=${cardKey} は player${otherId} に記録されていました (参照元 player${playerId})`);
      return other.cardHP[cardKey];
    }
    return max; // どこにも記録が無ければ最大値（未ダメージ扱い）
  }

  /**
   * カードの現在HPを設定
   * @param {Object} card - カード情報
   * @param {number} playerId - プレイヤーID
   * @param {number} newHP - 新しいHP値
   */
  setCurrentHP(card, playerId, newHP, { force = false } = {}) {
    if (!card || !card.hp) return;
    const player = this.state.players[playerId];
    if (!player) return;
    if (!player.cardHP) {
      player.cardHP = {};
    }
    const maxHP = this.getMaxHP(card);
    const proposedHP = Math.max(0, Math.min(newHP, maxHP));
    const cardKey = (card.cardState && card.cardState.uniqueId) ? card.cardState.uniqueId : card.id;
    const existing = player.cardHP[cardKey];
    // 既にHPが記録されていて、forceでない場合はより低い（ダメージが進んでいる）値を優先保持
    let finalHP = proposedHP;
    if (existing !== undefined && !force) {
      // 現HP < 提案値（上書きで回復してしまう）なら保持、それ以外は更新
      if (existing < proposedHP) {
        finalHP = existing; // 上書き回復を防止
      }
    }
    player.cardHP[cardKey] = finalHP;
    console.log(`🩹 [HP設定] ${card.name}: ${finalHP}/${maxHP} (プレイヤー${playerId}) [${cardKey}] force=${force}`);
    console.log(`📡 [StateManager] cardDamaged event:`, {
      playerId,
      card,
      cardKey,
      currentHP: finalHP,
      maxHP,
      isKnockOut: finalHP === 0
    });
  }

  /**
   * カードにダメージを与える
   * @param {Object} card - カード情報
   * @param {number} playerId - プレイヤーID
   * @param {number} damage - ダメージ量
   * @returns {Object} ダメージ結果
   */
  dealDamage(card, playerId, damage) {
    if (!card || !card.hp || damage <= 0) {
      return { success: false, reason: 'Invalid parameters' };
    }
    
    const currentHP = this.getCurrentHP(card, playerId);
    const newHP = Math.max(0, currentHP - damage);
    
    this.setCurrentHP(card, playerId, newHP);
    
    return {
      success: true,
      previousHP: currentHP,
      currentHP: newHP,
      damage: damage,
      isKnockOut: newHP === 0
    };
  }

  /**
   * カードのHPを回復する
   * @param {Object} card - カード情報
   * @param {number} playerId - プレイヤーID
   * @param {number} healAmount - 回復量
   * @returns {Object} 回復結果
   */
  healCard(card, playerId, healAmount) {
    if (!card || !card.hp || healAmount <= 0) {
      return { success: false, reason: 'Invalid parameters' };
    }
    
    const currentHP = this.getCurrentHP(card, playerId);
    const maxHP = this.getMaxHP(card);
    const newHP = Math.min(maxHP, currentHP + healAmount);
    
    this.setCurrentHP(card, playerId, newHP);
    
    return {
      success: true,
      previousHP: currentHP,
      currentHP: newHP,
      healAmount: Math.min(healAmount, newHP - currentHP)
    };
  }

  /**
   * カードのHPを完全回復する
   * @param {Object} card - カード情報
   * @param {number} playerId - プレイヤーID
   */
  fullHealCard(card, playerId) {
    if (!card || !card.hp) return;
    
    const maxHP = this.getMaxHP(card);
    this.setCurrentHP(card, playerId, maxHP, { force: true });
  }

  /**
   * プレイヤーの全カードのHPを初期化
   * @param {number} playerId - プレイヤーID
   */
  initializeAllCardHP(playerId) {
    const player = this.state.players[playerId];
    if (!player) return;
    
    player.cardHP = {};
    
    // 全エリアのカードを確認してHPを初期化
    const areas = ['center', 'collab', 'back1', 'back2', 'back3', 'back4', 'back5'];
    areas.forEach(area => {
      const card = player.cards[area];
      if (card && card.hp) {
        this.setCurrentHP(card, playerId, this.getMaxHP(card), { force: true });
      }
    });
    
    // ライフエリアも確認
    if (player.cards.life && Array.isArray(player.cards.life)) {
      player.cards.life.forEach(card => {
        if (card && card.hp) {
          this.setCurrentHP(card, playerId, this.getMaxHP(card), { force: true });
        }
      });
    }
  }
}

// グローバルスコープに公開
window.HololiveStateManager = HololiveStateManager;
