/**
 * State Manager
 * ゲーム状態の集中管理とイミュータブルな状態更新を提供
 */

class HololiveStateManager {
  constructor() {
    this.state = this.createInitialState();
    this.listeners = new Map(); // イベントリスナー管理
    this.stateHistory = []; // 状態履歴（デバッグ用）
    this.maxHistorySize = 50;
    this.transitionInProgress = false; // 状態遷移中フラグ
    
    console.log('State Manager初期化完了');
    this.logStateChange('INIT', 'State Manager initialized');
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
        mulliganPhase: false
      },
      
      // ターン・フェーズ状態
      turn: {
        currentPlayer: 1,
        currentPhase: -1, // -1: 準備, 0-5: リセット〜エンド
        turnCount: 1,
        firstPlayer: null
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
      
      // ゲーム状態
      gameState: {
        usedLimitedThisTurn: [], // LIMITEDカード制限のみ残す
        restHolomem: [],
        collabMovedThisTurn: false // このターンにコラボ移動を実行したか
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
    if (this.transitionInProgress) {
      console.warn(`状態遷移中のため更新をスキップ: ${actionType}`);
      return false;
    }

    this.transitionInProgress = true;
    
    try {
      const oldState = this.deepClone(this.state);
      const newState = this.applyStateUpdate(oldState, actionType, payload);
      
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
        return true;
      } else {
        console.error(`状態の妥当性チェックに失敗: ${actionType}`, payload);
        return false;
      }
    } catch (error) {
      console.error(`状態更新中にエラーが発生: ${actionType}`, error);
      return false;
    } finally {
      this.transitionInProgress = false;
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
        newState.turn.currentPlayer = payload.player;
        if (payload.player === 1) {
          newState.turn.turnCount++;
        }
        break;
        
      case 'TURN_COUNT_CHANGE':
        newState.turn.turnCount = payload.count;
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
        // カード位置交換の実行
        if (payload.player && payload.sourcePosition && payload.targetPosition) {
          const player = newState.players[payload.player];
          if (player) {
            const sourceCard = player.cards[payload.sourcePosition];
            const targetCard = player.cards[payload.targetPosition];
            
            // 位置を交換
            player.cards[payload.sourcePosition] = targetCard;
            player.cards[payload.targetPosition] = sourceCard;
          }
        }
        break;

      case 'ADD_BLOOM_HISTORY':
        // ブルーム履歴の追加
        if (payload.player && payload.position) {
          const player = newState.players[payload.player];
          if (player && !player.bloomedThisTurn.includes(payload.position)) {
            player.bloomedThisTurn.push(payload.position);
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
        
      default:
        console.warn(`未知のアクションタイプ: ${actionType}`);
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
      console.error('状態妥当性チェックエラー:', error);
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
          console.error(`リスナーエラー (${actionType}):`, error);
        }
      });
    }
    
    // 全般的な状態変更リスナー
    if (this.listeners.has('*')) {
      this.listeners.get('*').forEach(callback => {
        try {
          callback(actionType, payload, oldState, newState);
        } catch (error) {
          console.error('グローバルリスナーエラー:', error);
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
      console.log(`[State] ${actionType}:`, payload);
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
        uniqueId: null               // 一意識別子（同名カード識別用）
      };
    }
    
    // 状態情報を更新
    Object.assign(cardWithState.cardState, stateInfo);
    
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
      return {
        bloomedThisTurn: false,
        justPlayed: false,
        collabLocked: false,
        resting: false,
        playedTurn: null,
        bloomedFromCard: null,
        uniqueId: null
      };
    }
    return card.cardState;
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
    
    // 基本的なバリデーション
    if (!card || !targetPosition) {
      return {
        valid: false,
        reason: 'カードまたはドロップ先が指定されていません'
      };
    }

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
        return {
          valid: true,
          reason: 'Debut配置フェーズで配置可能'
        };
      } else {
        return {
          valid: false,
          reason: 'Debut配置フェーズではセンターまたはバックにのみ配置可能'
        };
      }
    }

    // その他のフェーズでの制限
    if (currentPhase === 3) { // メインステップ
      const player = currentState.players[playerId];
      
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
    }

    return {
      valid: true,
      reason: '配置可能'
    };
  }

  // コラボポジション配置のチェック
  checkCollabPlacement(card, player) {
    // バックのホロメンカードのみがコラボに移動可能
    if (!card.card_type?.includes('ホロメン')) {
      return {
        valid: false,
        reason: 'ホロメンカードのみコラボに配置できます'
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

  // ブルーム配置のチェック
  checkBloomPlacement(card, targetPosition, player) {
    const targetCard = player.cards[targetPosition];
    
    if (!targetCard) {
      return {
        valid: false,
        reason: 'ブルームする対象カードが存在しません'
      };
    }

    // 既にブルームしているカードは再度ブルームできない（カード状態ベース）
    const targetCardState = this.getCardState(targetCard);
    if (targetCardState.bloomedThisTurn) {
      return {
        valid: false,
        reason: 'このターンに既にブルームしたカードです'
      };
    }

    // ブルームレベルの互換性チェック
    return this.checkBloomCompatibility(card, targetCard);
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
    
    // Debut配置フェーズでは交換可能
    if (isDebutPhase) {
      return {
        valid: true,
        reason: 'Debut配置フェーズで交換可能'
      };
    }

    // ゲーム中の交換制限
    if (currentPhase !== 3) { // メインフェーズ以外では交換不可
      return {
        valid: false,
        reason: 'メインフェーズでのみカード交換が可能です'
      };
    }

    // ホロメンカード同士の交換チェック
    if (sourceCard.card_type?.includes('ホロメン')) {
      // 移動先にカードがある場合の交換ルール
      if (targetCard) {
        if (!targetCard.card_type?.includes('ホロメン')) {
          return {
            valid: false,
            reason: 'ホロメンカード同士でのみ位置交換が可能です'
          };
        }
        
        // ブルーム制限チェック
        if (!this.checkBloomCompatibility(sourceCard, targetPosition, player) ||
            !this.checkBloomCompatibility(targetCard, sourcePosition, player)) {
          return {
            valid: false,
            reason: 'ブルームレベル制限により交換できません'
          };
        }
      } else {
        // 空の位置への移動
        if (!this.checkBloomCompatibility(sourceCard, targetPosition, player)) {
          return {
            valid: false,
            reason: 'このブルームレベルはその位置に配置できません'
          };
        }
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
   * ブルーム互換性チェック
   * @param {Object} card - チェックするカード
   * @param {string} position - 配置先ポジション
   * @param {Object} player - プレイヤー状態
   * @returns {boolean} 配置可能かどうか
   */
  checkBloomCompatibility(card, position, player) {
    if (!card.card_type?.includes('ホロメン')) {
      return true; // ホロメン以外は制限なし
    }

    const bloomLevel = card.bloom_level;
    
    // センターエリア（collab, center）は制限なし
    if (position === 'collab' || position === 'center') {
      return true;
    }

    // バックスロットの場合
    if (position.startsWith('back')) {
      const currentCard = player.cards[position];
      
      // Debut, Spotは空のスロットにのみ配置可能
      if (bloomLevel === 'Debut' || bloomLevel === 'Spot') {
        return !currentCard;
      }
      
      // 1stは Debut/1st/1stBuzz の上に配置可能
      if (bloomLevel === '1st') {
        if (!currentCard) return false;
        return ['Debut', '1st', '1stBuzz'].includes(currentCard.bloom_level);
      }
      
      // 2ndは 1st/1stBuzz/2nd の上に配置可能
      if (bloomLevel === '2nd') {
        if (!currentCard) return false;
        return ['1st', '1stBuzz', '2nd'].includes(currentCard.bloom_level);
      }
    }

    return true;
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
   * カードがブルーム可能かチェック
   * @param {Object} card - ブルームしようとするカード
   * @param {Object} targetCard - ブルーム対象のカード
   * @param {number} playerId - プレイヤーID
   * @returns {Object} チェック結果
   */
  canBloom(card, targetCard, playerId) {
    const cardState = this.getCardState(card);
    const targetCardState = this.getCardState(targetCard);

    // 1. 同ターンに既にブルームしたカードかチェック
    if (cardState.bloomedThisTurn) {
      return {
        valid: false,
        reason: 'このカードは既に今ターンでブルームしています'
      };
    }

    // 2. プレイしたばかりのDebutカードかチェック
    if (targetCardState.justPlayed) {
      return {
        valid: false,
        reason: 'プレイしたばかりのDebutカードにはブルームできません（次ターンから可能）'
      };
    }

    // 3. お休み状態の確認（お休みでもブルーム可能、ただし状態は維持）
    if (targetCardState.resting) {
      console.log('お休み状態のカードにブルームします（お休み状態は維持されます）');
    }

    return {
      valid: true,
      reason: 'ブルーム可能',
      willStayResting: targetCardState.resting
    };
  }

  /**
   * ブルーム実行後の状態更新
   * @param {Object} card - ブルームしたカード
   * @param {Object} targetCard - ブルーム対象のカード  
   * @param {number} playerId - プレイヤーID
   * @returns {Object} 更新されたカード
   */
  recordBloom(card, targetCard, playerId) {
    const currentTurn = this.state.turn.turnCount;
    const targetCardState = this.getCardState(targetCard);
    
    // ブルームしたカードに状態を付与
    const updatedCard = this.addCardState(card, {
      bloomedThisTurn: true,
      playedTurn: currentTurn,
      bloomedFromCard: targetCard,
      resting: targetCardState.resting // ブルーム元の休み状態を継承
    });
    
    return updatedCard;
  }

  /**
   * コラボ移動が可能かチェック
   * @param {Object} card - 移動しようとするカード
   * @param {number} playerId - プレイヤーID
   * @returns {Object} チェック結果
   */
  canMoveToCollab(card, playerId) {
    const playerState = this.state.players[playerId];

    // 1. ホロメンカードのみがコラボに移動可能
    if (!card.card_type?.includes('ホロメン')) {
      return {
        valid: false,
        reason: 'ホロメンカードのみコラボに移動できます'
      };
    }

    // 2. このターンに既にコラボ移動を実行したかチェック
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

    // 4. コラボポジションが既に使用されているかチェック
    if (playerState.cards.collab) {
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
   * コラボ移動実行後の状態更新
   * @param {Object} card - コラボに移動したカード
   * @param {number} playerId - プレイヤーID
   * @returns {Object} 更新されたカード
   */
  recordCollabMove(card, playerId) {
    // プレイヤーの状態を更新
    this.updateState('UPDATE_PLAYER_GAME_STATE', {
      player: playerId,
      property: 'collabMovedThisTurn',
      value: true
    });
    
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
    const cardState = this.getCardState(card);

    // コラボにいてロックされているカードかチェック
    if (cardState.collabLocked) {
      return {
        valid: false,
        reason: 'コラボしたホロメンは次のリセットステップまで移動できません'
      };
    }

    return {
      valid: true,
      reason: '移動可能'
    };
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
}

// グローバルスコープに公開
window.HololiveStateManager = HololiveStateManager;
