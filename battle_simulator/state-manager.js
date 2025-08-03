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
        canPlaySupport: true,
        usedLimitedThisTurn: [],
        restHolomem: []
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
    console.log(`[State Manager] ${actionType}:`, payload);
    console.log('Current State:', {
      game: this.state.game,
      turn: this.state.turn,
      mulligan: this.state.mulligan
    });
  }

  /**
   * ディープクローン
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj);
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
    // ここに追加のルールを実装

    return {
      valid: true,
      reason: '配置可能'
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
}

// グローバルスコープに公開
window.HololiveStateManager = HololiveStateManager;
