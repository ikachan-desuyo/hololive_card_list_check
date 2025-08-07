/**
 * ホロライブTCG バトルエンジン
 * ゲームの状態管理とルール処理を行う
 */

class HololiveBattleEngine {
  constructor() {
    // 状態管理の初期化（最優先）
    this.stateManager = new HololiveStateManager(this);
    
    // 互換性のための状態オブジェクト（State Managerから動的に取得）
    this.gameState = this.createGameStateProxy();
    this.players = this.createPlayersProxy();

    this.cardDatabase = null;
    this.stageData = null;
    this.modalUI = new ModalUI(); // モーダルUI追加
    
    // フェーズ管理をPhaseControllerに移譲
    // this.phaseInProgress と this.phaseNames は PhaseController で管理

    // フェーズ管理コントローラーの初期化（早期初期化）
    this.phaseController = new PhaseController(this);
    
    // 配置制御管理の初期化
    this.placementController = new HololivePlacementController(this);
    
    // ゲームセットアップ管理の初期化
    this.setupManager = new HololiveGameSetupManager(this);
    
    // ターン管理の初期化
    this.turnManager = new HololiveTurnManager(this);
    
    // CPUロジックの初期化
    this.cpuLogic = new HololiveCPULogic(this);
    
    // 手札管理の初期化
    try {
      if (typeof HandManager === 'undefined') {
        throw new Error('HandManager クラスが読み込まれていません');
      }
      this.handManager = new HandManager(this);
      window.debugLog('✅ HandManager初期化成功');
    } catch (error) {
      window.errorLog('❌ HandManager初期化エラー:', error);
      throw error;
    }

    // カード効果管理システムの初期化（新システム）
    try {
      if (typeof ScalableCardEffectManager === 'undefined') {
        throw new Error('ScalableCardEffectManager クラスが読み込まれていません');
      }
      this.cardEffectManager = new ScalableCardEffectManager(this);
      window.debugLog('✅ ScalableCardEffectManager初期化成功');
    } catch (error) {
      window.errorLog('❌ ScalableCardEffectManager初期化エラー:', error);
      // カード効果システムがなくてもゲームは続行可能
      this.cardEffectManager = null;
    }

    this.initializeGame();
    
    // カード表示管理の初期化
    this.cardDisplayManager = new CardDisplayManager(this);
    
    // カードインタラクション管理の初期化
    try {
      if (typeof CardInteractionManager === 'undefined') {
        throw new Error('CardInteractionManager クラスが読み込まれていません');
      }
      this.cardInteractionManager = new CardInteractionManager(this);
      window.debugLog('✅ CardInteractionManager初期化成功');
    } catch (error) {
      window.errorLog('❌ CardInteractionManager初期化エラー:', error);
      // カードインタラクション機能がなくてもゲームは続行可能
      this.cardInteractionManager = null;
    }
    
    // パフォーマンス管理の初期化
    try {
      if (typeof PerformanceManager === 'undefined') {
        throw new Error('PerformanceManager クラスが読み込まれていません');
      }
      this.performanceManager = new PerformanceManager(this);
      window.debugLog('✅ PerformanceManager初期化成功');
    } catch (error) {
      window.errorLog('❌ PerformanceManager初期化エラー:', error);
      // パフォーマンス機能がなくてもゲームは続行可能
      this.performanceManager = null;
    }
    
    // 情報パネル管理の初期化
    if (!window.infoPanelManager) {
      window.infoPanelManager = new InfoPanelManager();
    }
    this.infoPanelManager = window.infoPanelManager;
  }

  /**
   * 互換性のためのgameStateプロキシオブジェクトを作成
   * 既存コードがthis.gameState.currentPlayerのようにアクセスできるようにする
   */
  createGameStateProxy() {
    const self = this;
    return {
      get currentPlayer() { return self.stateManager.getStateByPath('turn.currentPlayer'); },
      set currentPlayer(value) { self.stateManager.updateState('PLAYER_CHANGE', { player: value }); },
      
      get currentPhase() { return self.stateManager.getStateByPath('turn.currentPhase'); },
      set currentPhase(value) { self.stateManager.updateState('PHASE_CHANGE', { phase: value }); },
      
      get turnCount() { return self.stateManager.getStateByPath('turn.turnCount'); },
      set turnCount(value) { self.stateManager.updateState('TURN_COUNT_CHANGE', { count: value }); },
      
      get gameStarted() { return self.stateManager.getStateByPath('game.started'); },
      set gameStarted(value) { 
        if (value) {
          self.stateManager.updateState('GAME_START', {});
        } else {
          self.stateManager.updateState('GAME_STOP', {});
        }
      },
      
      get gameEnded() { return self.stateManager.getStateByPath('game.ended'); },
      set gameEnded(value) { 
        if (value) {
          self.stateManager.updateState('GAME_END', { winner: self.stateManager.getStateByPath('game.winner') });
        }
      },
      
      get winner() { return self.stateManager.getStateByPath('game.winner'); },
      set winner(value) { self.stateManager.updateState('SET_WINNER', { winner: value }); },
      
      get firstPlayer() { return self.stateManager.getStateByPath('turn.firstPlayer'); },
      set firstPlayer(value) { self.stateManager.updateState('SET_FIRST_PLAYER', { player: value }); },
      
      get turnOrderDecided() { return self.stateManager.getStateByPath('game.turnOrderDecided'); },
      set turnOrderDecided(value) { 
        if (!value) {
          self.stateManager.updateState('RESET_TURN_ORDER', {});
        }
      },
      
      get mulliganPhase() { return self.stateManager.getStateByPath('game.mulliganPhase'); },
      set mulliganPhase(value) { 
        if (value) {
          self.stateManager.updateState('MULLIGAN_START', {});
        } else {
          self.stateManager.updateState('MULLIGAN_END', {});
        }
      },
      
      get mulliganCount() { return self.stateManager.getStateByPath('mulligan.count'); },
      set mulliganCount(value) { self.stateManager.updateState('SET_MULLIGAN_COUNT', { counts: value }); },
      
      get mulliganCompleted() { return self.stateManager.getStateByPath('mulligan.completed'); },
      set mulliganCompleted(value) { self.stateManager.updateState('SET_MULLIGAN_COMPLETED', { completed: value }); }
    };
  }

  /**
   * 互換性のためのplayersプロキシオブジェクトを作成
   * 既存コードがthis.players[1].deckのようにアクセスできるようにする
   */
  createPlayersProxy() {
    const self = this;
    return {
      1: this.createPlayerProxy(1),
      2: this.createPlayerProxy(2)
    };
  }

  /**
   * 配列プロパティ用のプロキシを作成（State Manager連携）
   */
  createArrayProxy(playerId, area, path) {
    const self = this;
    return {
      get() {
        const arrayRef = self.stateManager.getStateByPath(path) || [];
        return new Proxy(arrayRef, {
          set(target, property, value) {
            if (property === 'length' || !isNaN(property)) {
              const newArray = [...arrayRef];
              if (property === 'length') {
                newArray.length = value;
              } else {
                newArray[property] = value;
              }
              self.updatePlayerCards(playerId, area, newArray);
            }
            return true;
          },
          get(target, property) {
            if (property === 'push') {
              return (...items) => {
                const newArray = [...arrayRef, ...items];
                self.updatePlayerCards(playerId, area, newArray);
                return newArray.length;
              };
            }
            if (property === 'pop') {
              return () => {
                if (arrayRef.length === 0) return undefined;
                const newArray = [...arrayRef];
                const result = newArray.pop();
                self.updatePlayerCards(playerId, area, newArray);
                return result;
              };
            }
            if (property === 'splice') {
              return (...args) => {
                const newArray = [...arrayRef];
                const result = newArray.splice(...args);
                self.updatePlayerCards(playerId, area, newArray);
                return result;
              };
            }
            if (property === 'unshift') {
              return (...items) => {
                const newArray = [...items, ...arrayRef];
                self.updatePlayerCards(playerId, area, newArray);
                return newArray.length;
              };
            }
            if (property === 'shift') {
              return () => {
                if (arrayRef.length === 0) return undefined;
                const newArray = [...arrayRef];
                const result = newArray.shift();
                self.updatePlayerCards(playerId, area, newArray);
                return result;
              };
            }
            return target[property];
          }
        });
      },
      set(value) {
        self.updatePlayerCards(playerId, area, value);
      }
    };
  }

  /**
   * 個別プレイヤーのプロキシを作成
   */
  createPlayerProxy(playerId) {
    const self = this;
    const handProxy = this.createArrayProxy(playerId, 'hand', `players.${playerId}.cards.hand`);
    const deckProxy = this.createArrayProxy(playerId, 'deck', `players.${playerId}.cards.deck`);
    const lifeProxy = this.createArrayProxy(playerId, 'life', `players.${playerId}.cards.life`);
    const holoPowerProxy = this.createArrayProxy(playerId, 'holoPower', `players.${playerId}.cards.holoPower`);
    const archiveProxy = this.createArrayProxy(playerId, 'archive', `players.${playerId}.cards.archive`);
    const yellDeckProxy = this.createArrayProxy(playerId, 'yellDeck', `players.${playerId}.cards.yellDeck`);
    
    return {
      // カードエリアの直接アクセス（既存コード互換性）
      get life() { return lifeProxy.get(); },
      set life(value) { lifeProxy.set(value); },
      
      get collab() { return self.stateManager.getStateByPath(`players.${playerId}.cards.collab`); },
      set collab(value) { self.updatePlayerCards(playerId, 'collab', value); },
      
      get center() { return self.stateManager.getStateByPath(`players.${playerId}.cards.center`); },
      set center(value) { self.updatePlayerCards(playerId, 'center', value); },
      
      get oshi() { return self.stateManager.getStateByPath(`players.${playerId}.cards.oshi`); },
      set oshi(value) { self.updatePlayerCards(playerId, 'oshi', value); },
      
      get holoPower() { return holoPowerProxy.get(); },
      set holoPower(value) { holoPowerProxy.set(value); },
      
      get deck() { return deckProxy.get(); },
      set deck(value) { deckProxy.set(value); },
      
      get yellDeck() { return yellDeckProxy.get(); },
      set yellDeck(value) { yellDeckProxy.set(value); },
      
      get back1() { return self.stateManager.getStateByPath(`players.${playerId}.cards.back1`); },
      set back1(value) { self.updatePlayerCards(playerId, 'back1', value); },
      
      get back2() { return self.stateManager.getStateByPath(`players.${playerId}.cards.back2`); },
      set back2(value) { self.updatePlayerCards(playerId, 'back2', value); },
      
      get back3() { return self.stateManager.getStateByPath(`players.${playerId}.cards.back3`); },
      set back3(value) { self.updatePlayerCards(playerId, 'back3', value); },
      
      get back4() { return self.stateManager.getStateByPath(`players.${playerId}.cards.back4`); },
      set back4(value) { self.updatePlayerCards(playerId, 'back4', value); },
      
      get back5() { return self.stateManager.getStateByPath(`players.${playerId}.cards.back5`); },
      set back5(value) { self.updatePlayerCards(playerId, 'back5', value); },
      
      get archive() { return archiveProxy.get(); },
      set archive(value) { archiveProxy.set(value); },
      
      get hand() { return handProxy.get(); },
      set hand(value) { handProxy.set(value); },
      
      // ゲーム状態（LIMITEDカード制限のみ残す）
      get usedLimitedThisTurn() { 
        const current = self.stateManager.getStateByPath(`players.${playerId}.gameState.usedLimitedThisTurn`);
        return typeof current === 'number' ? current : (Array.isArray(current) ? current.length : 0);
      },
      set usedLimitedThisTurn(value) { 
        const numValue = typeof value === 'number' ? value : (Array.isArray(value) ? value.length : 0);
        self.updatePlayerGameState(playerId, 'usedLimitedThisTurn', numValue); 
      },
      
      get restHolomem() { return self.stateManager.getStateByPath(`players.${playerId}.gameState.restHolomem`) || []; },
      set restHolomem(value) { self.updatePlayerGameState(playerId, 'restHolomem', value); },
      
      // デッキ情報
      get oshiCard() { return self.stateManager.getStateByPath(`players.${playerId}.deck.oshiCard`); },
      set oshiCard(value) { self.updatePlayerDeck(playerId, 'oshiCard', value); },
      
      get mainDeck() { return self.stateManager.getStateByPath(`players.${playerId}.deck.mainDeck`) || []; },
      set mainDeck(value) { self.updatePlayerDeck(playerId, 'mainDeck', value); },
      
      get yellCards() { return self.stateManager.getStateByPath(`players.${playerId}.deck.yellCards`) || []; },
      set yellCards(value) { self.updatePlayerDeck(playerId, 'yellCards', value); }
    };
  }

  /**
   * プレイヤーのカード状態を更新
   */
  updatePlayerCards(playerId, area, cards) {
    // カードに状態情報が不足している場合は追加
    if (cards && !Array.isArray(cards)) {
      // 単一カードの場合
      if (cards && typeof cards === 'object' && !cards.cardState) {
        cards = this.stateManager.addCardState(cards, {
          playedTurn: this.gameState.turnCount || 1,
          playedByPlayer: playerId,
          bloomedThisTurn: false,
          resting: false,
          damage: 0
        });
      }
    } else if (Array.isArray(cards)) {
      // 配列の場合（手札等）
      cards = cards.map(card => {
        if (card && typeof card === 'object' && !card.cardState) {
          return this.stateManager.addCardState(card, {
            playedTurn: this.gameState.turnCount || 1,
            playedByPlayer: playerId,
            bloomedThisTurn: false,
            resting: false,
            damage: 0
          });
        }
        return card;
      });
    }
    
    // エールカード情報を保持（cards配列から取得）
    if (cards && cards.length > 0 && cards[0] && cards[0].yellCards) {
      // State Manager送信時のエール情報（必要時のみ）
    }
    
    // 状態遷移中の場合は少し待ってから実行
    if (this.stateManager.transitionInProgress) {
      setTimeout(() => {
        this.stateManager.updateState('UPDATE_PLAYER_CARDS', {
          player: playerId,
          area: area,
          cards: cards
        });
      }, 20);  // 少し長めの遅延に変更
    } else {
      this.stateManager.updateState('UPDATE_PLAYER_CARDS', {
        player: playerId,
        area: area,
        cards: cards
      });
    }
  }

  /**
   * プレイヤーのゲーム状態を更新
   */
  updatePlayerGameState(playerId, property, value) {
    this.stateManager.updateState('UPDATE_PLAYER_GAME_STATE', {
      player: playerId,
      property: property,
      value: value
    });
  }

  /**
   * プレイヤーのデッキ情報を更新
   */
  updatePlayerDeck(playerId, property, value) {
    this.stateManager.updateState('UPDATE_PLAYER_DECK', {
      player: playerId,
      property: property,
      value: value
    });
  }

  createPlayerState() {
    return {
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
      hand: [],
      
      // ゲーム状態
      usedLimitedThisTurn: false, // LIMITED効果使用済みフラグ（boolean型に統一）
      restHolomem: [], // お休み状態のホロメン
      isFirstPlayer: null, // 先行フラグ（true: 先行, false: 後攻, null: 未設定）
      
      // デッキ構築情報
      oshiCard: null,
      mainDeck: [],
      yellCards: []
    };
  }

  async initializeGame() {
    try {
      // カードデータとステージデータの読み込み
      await this.loadCardData();
      await this.loadStageData();
      
      // テスト用デッキが存在しない場合は作成
      this.createTestDeckIfNeeded();
      
      // UI要素の初期化
      this.initializeUI();
      
      // 初期化完了
    } catch (error) {
      window.errorLog('バトルエンジン初期化エラー:', error);
    }
  }

  createTestDeckIfNeeded() {
    // Game Setup Managerに委譲
    return this.setupManager.createTestDeckIfNeeded();
  }

  createAndSaveTestDeck() {
    // Game Setup Managerに委譲
    return this.setupManager.createAndSaveTestDeck();
  }

  async loadCardData() {
    try {
      const response = await fetch('./json_file/card_data.json');
      this.cardDatabase = await response.json();
      // カードデータ読み込み完了
    } catch (error) {
      window.errorLog('カードデータ読み込みエラー:', error);
    }
  }

  async loadStageData() {
    try {
      const response = await fetch('./json_file/stage_data.json');
      this.stageData = await response.json();
      // ステージデータ読み込み完了
    } catch (error) {
      window.errorLog('ステージデータ読み込みエラー:', error);
    }
  }

  initializeUI() {
    // ターン情報の表示
    this.updateTurnInfo();
    
    // コントロールパネルの初期化
    this.setupControlPanel();
    
    // 手札エリアの初期化
    this.handManager.setupHandArea();
    
    // カードエリアのイベントリスナー設定（少し遅延）
    setTimeout(() => {
      this.setupCardAreaListeners();
    }, 100);
  }

  setupControlPanel() {
    // HTMLで既に定義されているコントロールパネルを使用
    // 必要な要素の存在確認
    const requiredElements = [
      'select-player-deck',
      'select-opponent-deck', 
      'start-game',
      'next-phase',
      'end-turn',
      'reset-game'
    ];
    
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    if (missingElements.length > 0) {
      window.warnLog('コントロールパネルの要素が見つかりません:', missingElements);
      // 後方互換性のため、動的作成を実行
      this.createLegacyControlPanel();
      return;
    }

    // イベントリスナーの設定（HTMLで定義された要素用）
    document.getElementById('select-player-deck').addEventListener('click', () => this.showDeckSelection(1));
    document.getElementById('select-opponent-deck').addEventListener('click', () => this.showDeckSelection(2));
    document.getElementById('start-game').addEventListener('click', () => this.startGame());
    document.getElementById('next-phase').addEventListener('click', () => this.nextPhase());
    document.getElementById('end-turn').addEventListener('click', () => this.endTurn());
    document.getElementById('reset-game').addEventListener('click', () => this.resetGame());
    
    // 初期状態の更新
    this.updateGameStatus();
  }

  // 後方互換性のため
  createLegacyControlPanel() {
    const controlPanel = document.createElement('div');
    controlPanel.className = 'control-panel';
    controlPanel.innerHTML = `
      <div class="game-status" id="game-status">
        <h3>🎮 ゲーム状況</h3>
        <div id="deck-status">プレイヤーデッキ: 未設定</div>
        <div id="opponent-deck-status">相手デッキ: 未設定</div>
        <div id="ready-status">準備: 未完了</div>
      </div>
      <button class="control-button" id="select-player-deck">📚 プレイヤーデッキ選択</button>
      <button class="control-button" id="select-opponent-deck">🤖 相手デッキ選択</button>
      <button class="control-button" id="start-game" disabled>ゲーム開始</button>
      <button class="control-button" id="next-phase" disabled>次のフェーズ</button>
      <button class="control-button" id="end-turn" disabled>ターン終了</button>
      <button class="control-button" id="reset-game">ゲームリセット</button>
    `;
    
    document.body.appendChild(controlPanel);

    // イベントリスナーの設定（レガシー版）
    document.getElementById('select-player-deck').addEventListener('click', () => this.showDeckSelection(1));
    document.getElementById('select-opponent-deck').addEventListener('click', () => this.showDeckSelection(2));
    document.getElementById('start-game').addEventListener('click', () => this.startGame());
    document.getElementById('next-phase').addEventListener('click', () => this.nextPhase());
    document.getElementById('end-turn').addEventListener('click', () => this.endTurn());
    document.getElementById('reset-game').addEventListener('click', () => this.resetGame());
    
    // 初期状態の更新
    this.updateGameStatus();
  }

  updateGameStatus() {
    const deckStatus = document.getElementById('deck-status');
    const opponentDeckStatus = document.getElementById('opponent-deck-status');
    const readyStatus = document.getElementById('ready-status');
    const startButton = document.getElementById('start-game');
    
    if (!deckStatus || !opponentDeckStatus || !readyStatus || !startButton) return;
    
    // プレイヤーデッキ状況
    const player = this.players[1];
    const hasPlayerDeck = player.deck.length > 0 || player.yellDeck.length > 0;
    const hasPlayerOshi = !!player.oshi;
    
    // 相手デッキ状況
    const opponent = this.players[2];
    const hasOpponentDeck = opponent.deck.length > 0 || opponent.yellDeck.length > 0;
    const hasOpponentOshi = !!opponent.oshi;
    
    // プレイヤーデッキ表示
    if (hasPlayerDeck && hasPlayerOshi) {
      deckStatus.innerHTML = `プレイヤーデッキ: ✅ 設定済み<br><small>メイン${player.deck.length}枚 / エール${player.yellDeck.length}枚 / 推し${player.oshi.name}</small>`;
    } else if (hasPlayerDeck) {
      deckStatus.innerHTML = `プレイヤーデッキ: ⚠️ 部分設定<br><small>メイン${player.deck.length}枚 / エール${player.yellDeck.length}枚</small>`;
    } else {
      deckStatus.innerHTML = 'プレイヤーデッキ: ❌ 未設定';
    }
    
    // 相手デッキ表示
    if (hasOpponentDeck && hasOpponentOshi) {
      opponentDeckStatus.innerHTML = `相手デッキ: ✅ 設定済み<br><small>メイン${opponent.deck.length}枚 / エール${opponent.yellDeck.length}枚 / 推し${opponent.oshi.name}</small>`;
    } else if (hasOpponentDeck) {
      opponentDeckStatus.innerHTML = `相手デッキ: ⚠️ 部分設定<br><small>メイン${opponent.deck.length}枚 / エール${opponent.yellDeck.length}枚</small>`;
    } else {
      opponentDeckStatus.innerHTML = '相手デッキ: ❌ 未設定';
    }
    
    // 準備状況とゲーム開始ボタン
    const bothReady = (hasPlayerDeck && hasPlayerOshi) && (hasOpponentDeck && hasOpponentOshi);
    const partialReady = (hasPlayerDeck || hasOpponentDeck);
    
    if (bothReady) {
      readyStatus.innerHTML = '準備: ✅ 完了';
      startButton.disabled = false;
      startButton.style.background = '#4CAF50';
    } else if (partialReady) {
      readyStatus.innerHTML = '準備: ⚠️ 両方のデッキを設定してください';
      startButton.disabled = false;
      startButton.style.background = '#FF9800';
    } else {
      readyStatus.innerHTML = '準備: ❌ デッキ未設定';
      startButton.disabled = true;
      startButton.style.background = '#ccc';
    }
  }

  setupCardAreaListeners() {
    const cardAreas = document.querySelectorAll('.card-area');
    
    cardAreas.forEach(area => {
      area.addEventListener('click', (e) => this.handleCardAreaClick(e));
      area.addEventListener('dragover', (e) => this.handleDragOver(e));
      area.addEventListener('dragenter', (e) => this.handleDragEnter(e));
      area.addEventListener('dragleave', (e) => this.handleDragLeave(e));
      area.addEventListener('drop', (e) => this.handleDrop(e));
    });
    
    // バックスロットにもリスナーを追加
    const backSlots = document.querySelectorAll('.back-slot');
    
    backSlots.forEach((slot, index) => {
      slot.addEventListener('click', (e) => this.handleCardAreaClick(e));
      slot.addEventListener('dragover', (e) => this.handleDragOver(e));
      slot.addEventListener('dragenter', (e) => this.handleDragEnter(e));
      slot.addEventListener('dragleave', (e) => this.handleDragLeave(e));
      slot.addEventListener('drop', (e) => this.handleDrop(e));
    });
    
    // サポートカード効果エリアを作成
    this.createSupportDropZone();
  }

  // setupHandArea メソッドを削除（HandManagerに移動）

  updateTurnInfo() {
    // Turn Managerに委譲
    return this.turnManager.updateTurnInfo();
  }

  showDeckSelection(playerId = 1) {
    if (!window.DeckSelectionUI) {
      alert('デッキ管理システムが読み込まれていません');
      return;
    }

    const deckSelectionUI = new window.DeckSelectionUI(this, playerId);
    deckSelectionUI.showDeckSelectionModal();
  }

  startGame() {
    // Game Setup Managerに委譲
    return this.setupManager.startGame();
  }

  validateGameSetup() {
    // Game Setup Managerに委譲
    return this.setupManager.validateGameSetup();
  }

  executeGameSetup() {
    // Game Setup Managerに委譲
    return this.setupManager.executeGameSetup();
  }

  setupLifeCards() {
    // Game Setup Managerに委譲
    return this.setupManager.setupLifeCards();
  }

  logGameStatus() {
    // Game Setup Managerに委譲
    return this.setupManager.logGameStatus();
  }

  createTestDecks() {
    // Game Setup Managerに委譲
    return this.setupManager.createTestDecks();
  }

  getTestCards() {
    // Game Setup Managerに委譲
    return this.setupManager.getTestCards();
  }

  placeOshiCards() {
    // Game Setup Managerに委譲
    return this.setupManager.placeOshiCards();
  }

  dealInitialHands() {
    // Game Setup Managerに委譲
    return this.setupManager.dealInitialHands();
  }

  shuffleDeck(playerId) {
    // Game Setup Managerに委譲
    return this.setupManager.shuffleDeck(playerId);
  }

  drawCard(playerId) {
    const player = this.players[playerId];
    if (player.deck.length > 0) {
      const card = player.deck.pop();
      player.hand.push(card);
      
      // ログ出力
      if (window.logCardEvent) {
        const playerType = playerId === 1 ? 'player' : 'opponent';
        const cardName = card.name || '不明なカード';
        window.logCardEvent(playerType, 'ドロー', cardName);
      }
      
      return card;
    } else {
      // デッキが空の場合のログ
      if (window.logGameEvent) {
        const playerType = playerId === 1 ? 'player' : 'opponent';
        window.logGameEvent(playerType, 'デッキが空のためカードをドローできませんでした');
      }
    }
    return null;
  }

  nextPhase() {
    // PhaseControllerに委譲
    return this.phaseController.nextPhase();
  }

  executePhase() {
    // PhaseControllerに委譲
    return this.phaseController.executePhase();
  }

  executeResetStep(playerId) {
    // PhaseControllerに委譲
    return this.phaseController.executeResetStep(playerId);
  }

  executeDrawStep(playerId) {
    // PhaseControllerに委譲
    return this.phaseController.executeDrawStep(playerId);
  }

  executeYellStep(playerId) {
    // PhaseControllerに委譲
    return this.phaseController.executeYellStep(playerId);
  }

  executeEndStep(playerId) {
    // PhaseControllerに委譲
    return this.phaseController.executeEndStep(playerId);
  }

  endTurn() {
    // Turn Managerに委譲
    return this.turnManager.endTurn();
  }

  checkVictoryConditions() {
    // 敗北条件をチェック（敗北条件を満たした方が負け）
    for (let playerId = 1; playerId <= 2; playerId++) {
      const player = this.players[playerId];
      const opponentId = playerId === 1 ? 2 : 1;
      
      // 敗北条件1: ライフが0枚になったとき
      if (player.life.length === 0) {
        console.log(`💀 [Victory] プレイヤー${playerId}敗北: ライフが0枚`);
        this.endGame(opponentId);
        return;
      }
      
      // 敗北条件2: 自分の場のホロメンカードが0枚になったとき
      const fieldHolomen = this.getFieldHolomenCards(playerId);
      if (fieldHolomen.length === 0) {
        console.log(`💀 [Victory] プレイヤー${playerId}敗北: 場のホロメンが0枚`);
        this.endGame(opponentId);
        return;
      }
      
      // 敗北条件3: デッキが0枚になった状態でエールステップになり、デッキが引けないとき
      if (player.deck.length === 0 && 
          this.gameState.currentPlayer === playerId && 
          this.gameState.currentPhase === 1) { // 手札ステップ
        console.log(`💀 [Victory] プレイヤー${playerId}敗北: デッキ切れでドロー不可`);
        this.endGame(opponentId);
        return;
      }
    }
  }

  /**
   * 場のホロメンカードを取得
   * @param {number} playerId - プレイヤーID
   * @returns {Array} ホロメンカードリスト
   */
  getFieldHolomenCards(playerId) {
    const player = this.players[playerId];
    const fieldCards = [];

    // センター・コラボ・バック全てをチェック（推しホロメンは除外）
    const positions = ['center', 'collab', 'back1', 'back2', 'back3', 'back4', 'back5'];
    
    positions.forEach(position => {
      if (player[position] && this.isHolomenCard(player[position])) {
        fieldCards.push({
          card: player[position],
          position: position
        });
      }
    });

    return fieldCards;
  }

  endGame(winnerId) {
    this.gameState.gameEnded = true;
    this.gameState.winner = winnerId;
    
    const winnerName = winnerId === 1 ? 'プレイヤー' : '対戦相手';
    alert(`ゲーム終了！${winnerName}の勝利です！`);
    
    // コントロールボタンの無効化
    document.getElementById('next-phase').disabled = true;
    document.getElementById('end-turn').disabled = true;
    
    console.log(`ゲーム終了 - プレイヤー${winnerId}の勝利`);
  }

  resetGame() {
    try {
      console.log('ゲームリセット開始...');
      
      // State Managerを使用してゲーム状態をリセット
      if (this.stateManager) {
        this.stateManager.updateState('RESET_GAME', {});
        console.log('State Manager経由でゲーム状態をリセット');
        
        // リセット後の状態確認
        const newState = this.stateManager.getState();
        console.log('リセット後の状態:', newState);
      } else {
        // フォールバック: 直接リセット（古い方式）
        this.gameState = {
          currentPlayer: 1,
          currentPhase: -1,  // -1: 準備ステップから開始
          turnCount: 1,
          gameStarted: false,
          gameEnded: false,
          winner: null,
          preparationPhase: true,  // 準備ステップフラグ
          mulliganPhase: false,
          debutPlacementPhase: false,
          mulliganCount: { 1: 0, 2: 0 },
          mulliganCompleted: { 1: false, 2: false },
          debutPlacementCompleted: { 1: false, 2: false },
          firstPlayer: null, // 先行・後攻をリセット
          turnOrderDecided: false // 先行・後攻決定状態をリセット
        };
        
        // プレイヤー状態のリセット
        this.players[1] = this.createPlayerState();
        this.players[2] = this.createPlayerState();
      }
      
      // UI要素の完全クリア
      this.clearAllUIElements();
      
      // State Managerを使用している場合は、マネージャー間の状態同期は不要
      // （State Managerが状態を一元管理するため）
      if (!this.stateManager) {
        // 各マネージャーの状態リセット（フォールバック）
        if (this.turnManager) {
          // Turn Managerの参照を更新
          this.turnManager.gameState = this.gameState;
          this.turnManager.players = this.players;
          console.log('Turn Manager状態をリセット');
        }
        
        if (this.handManager) {
          // Hand Managerの参照を更新
          this.handManager.gameState = this.gameState;
          this.handManager.players = this.players;
          console.log('Hand Manager状態をリセット');
        }
        
        if (this.cardDisplayManager) {
          // Card Display Managerの参照を更新
          this.cardDisplayManager.gameState = this.gameState;
          this.cardDisplayManager.players = this.players;
          console.log('Card Display Manager状態をリセット');
        }
      }
      
      if (!this.stateManager) {
        // Setup Managerの参照を更新（フォールバック）
        if (this.setupManager) {
          this.setupManager.gameState = this.gameState;
          this.setupManager.players = this.players;
          console.log('Setup Manager状態をリセット');
        }
        
        if (this.phaseController) {
          // Phase Controllerの参照を更新
          this.phaseController.gameState = this.gameState;
          console.log('Phase Controller状態をリセット');
        }
      }
      
      if (this.infoPanelManager) {
        // Info Panel Managerの状態リセット
        this.infoPanelManager.updateStepInfo('ゲーム開始準備', '準備フェーズ', 0, 'player', this);
        this.infoPanelManager.clearCardDetail();
        this.infoPanelManager.addLogEntry('system', 'ゲームがリセットされました');
        console.log('Info Panel Manager状態をリセット');
      }
      
      // UIの更新
      this.updateTurnInfo();
      this.updateUI();
      this.updateGameStatus();
      
      // 手札の明示的な更新
      if (this.handManager) {
        this.handManager.updateHandDisplay();
      }
      
      // コントロールボタンの状態更新
      if (this.stateManager) {
        // State Manager経由でボタン状態を更新
        this.stateManager.updateState('UI_BUTTON_STATE', {
          buttons: {
            startGame: true,
            nextPhase: false,
            endTurn: false,
            resetGame: true
          }
        });
      } else {
        // フォールバック: 直接ボタン状態を更新
        document.getElementById('start-game').disabled = false;
        document.getElementById('start-game').style.background = '#2196f3';
      }
      document.getElementById('next-phase').disabled = true;
      document.getElementById('end-turn').disabled = true;
      
      console.log('ゲームをリセットしました');
      alert('ゲームがリセットされました。\n新しいバトルを開始できます。');
      
    } catch (error) {
      window.errorLog('ゲームリセット中にエラーが発生:', error);
      alert('ゲームリセット中にエラーが発生しました。ページをリロードしてください。');
    }
  }
  
  // UI要素の完全クリア用メソッド
  clearAllUIElements() {
    // カード表示エリアのクリア
    const cardAreas = [
      'player1-collab', 'player1-center', 'player1-oshi',
      'player1-back1', 'player1-back2', 'player1-back3', 'player1-back4', 'player1-back5',
      'player2-collab', 'player2-center', 'player2-oshi',
      'player2-back1', 'player2-back2', 'player2-back3', 'player2-back4', 'player2-back5'
    ];
    
    cardAreas.forEach(areaId => {
      const area = document.getElementById(areaId);
      if (area) {
        area.innerHTML = '';
        area.classList.remove('occupied', 'selected', 'highlighted');
      }
    });
    
    // 手札エリアのクリア
    const handAreas = ['player1-hand', 'player2-hand'];
    handAreas.forEach(areaId => {
      const area = document.getElementById(areaId);
      if (area) {
        area.innerHTML = '';
      }
    });
    
    // ライフエリアのクリア
    const lifeAreas = ['player1-life', 'player2-life'];
    lifeAreas.forEach(areaId => {
      const area = document.getElementById(areaId);
      if (area) {
        area.innerHTML = '';
      }
    });
    
    // アーカイブエリアのクリア
    const archiveAreas = ['player1-archive', 'player2-archive'];
    archiveAreas.forEach(areaId => {
      const area = document.getElementById(areaId);
      if (area) {
        area.innerHTML = '';
      }
    });
    
    // ゲーム状態表示のクリア
    const statusElement = document.getElementById('game-status');
    if (statusElement) {
      statusElement.textContent = 'ゲーム準備中';
    }
    
    // カードカウンターのクリア
    const allCounters = document.querySelectorAll('.card-counter');
    allCounters.forEach(counter => {
      counter.remove();
    });
    
    // デッキ情報表示のクリア（レガシーコントロールパネル内）
    const deckStatusElements = ['deck-status', 'opponent-deck-status'];
    deckStatusElements.forEach(statusId => {
      const element = document.getElementById(statusId);
      if (element) {
        element.innerHTML = '';
      }
    });
    
    // レガシーのready-status要素をクリア
    const readyStatusElement = document.getElementById('ready-status');
    if (readyStatusElement) {
      readyStatusElement.textContent = '準備: 未完了';
    }
    
    console.log('UI要素をクリアしました（Info Panelは保持）');
  }

  handleCardAreaClick(event) {
    const area = event.currentTarget;
    const areaId = area.className.split(' ')[0];
    
    // エリアに応じた処理
    this.handleAreaInteraction(areaId);
  }

  handleAreaInteraction(areaId) {
    const currentPlayer = this.gameState.currentPlayer;
    const player = this.players[currentPlayer];
    
    switch (areaId) {
      case 'deck':
        // デッキクリック時の処理
        if (this.gameState.currentPhase === 1) { // 手札ステップ
          this.drawCard(currentPlayer);
          this.updateUI();
        }
        break;
        
      case 'yell-deck':
        // エールデッキクリック時の処理
        if (this.gameState.currentPhase === 2) { // エールステップ
          this.executeYellStep(currentPlayer);
          this.updateUI();
        }
        break;
        
      default:
        // その他のエリア
        break;
    }
  }

  handleDragOver(event) {
    event.preventDefault();
  }

  handleDrop(event) {
    event.preventDefault();
    // ドラッグ&ドロップ処理
  }

  updateUI() {
    // エール更新中は一時的に更新を抑制（ただし手札とフェーズハイライトは更新）
    if (this.isUpdatingYellCard) {
      // 手札の更新
      this.handManager.updateHandDisplay();
      // フェーズハイライトの更新
      this.updatePhaseHighlight();
      return; // カードエリア更新はスキップ
    }
    
    // 手札の更新
    this.handManager.updateHandDisplay();
    
    // カードエリアの更新
    this.updateCardAreas();
    
    // フェーズハイライトの更新
    this.updatePhaseHighlight();
    
    // ボタンの表示制御
    this.updatePhaseButtons();
    
    // Debut配置状態の更新（配置フェーズ中の場合）
    if (document.getElementById('debut-placement-controls')) {
      this.updateDebutPlacementStatus();
    }
  }

  // 手札表示更新（HandManagerに委任）
  updateHandDisplay() {
    this.handManager.updateHandDisplay();
  }

  updateCardAreas() {
    // エール更新中は一時的に更新を抑制
    if (this.isUpdatingYellCard) {
      return; // サイレントにスキップ
    }
    
    // カード表示管理機能をCardDisplayManagerに委譲
    this.cardDisplayManager.updateCardAreas();
  }

  // バックスロットエリアの更新（.back-slot要素を保持）
  updateBackSlots(playerId) {
    // バックスロット更新機能をCardDisplayManagerに委譲
    const playerType = playerId === 1 ? 'player' : 'cpu';
    this.cardDisplayManager.updateBackSlots(playerType);
  }

  displayCardsInArea(area, player, areaId, playerId = 1) {
    // カード表示機能をCardDisplayManagerに委譲
    // displayCardsInAreaの引数を正しく渡す（area, cards, areaId, player）
    let cards = null;
    switch (areaId) {
      case 'life': cards = player.life; break;
      case 'collab': cards = player.collab; break;
      case 'center': cards = player.center; break;
      case 'oshi': cards = player.oshi; break;
      case 'holo': cards = player.holoPower; break;
      case 'deck': cards = player.deck; break;
      case 'yell-deck': cards = player.yellDeck; break;
      case 'archive': cards = player.archive; break;
    }
    this.cardDisplayManager.displayCardsInArea(area, cards, areaId, player);
  }

  createCardElement(card, displayType, index, areaId = null, playerId = 1) {
    // カード要素作成機能をCardDisplayManagerに委譲
    const isPlayerCard = (playerId === 1);
    return this.cardDisplayManager.createCardElement(card, areaId, index, isPlayerCard);
  }

  shouldCardBeFaceUp(card, areaId) {
    // カード表示判定機能をCardDisplayManagerに委譲
    return this.cardDisplayManager.shouldCardBeFaceUp(card, areaId);
  }

  getCardCount(player, areaId) {
    // カード数取得機能をCardDisplayManagerに委譲
    return this.cardDisplayManager.getCardCount(player, areaId);
  }

  updateCardCounter(area, count) {
    // カードカウンター更新機能をCardDisplayManagerに委譲
    this.cardDisplayManager.updateCardCounter(area, count);
  }

  updatePhaseHighlight() {
    // すべてのハイライトを削除
    const existingHighlights = document.querySelectorAll('.phase-highlight');
    existingHighlights.forEach(element => {
      element.classList.remove('phase-highlight');
    });

    const currentPlayer = this.gameState.currentPlayer;
    const currentPhase = this.gameState.currentPhase;
    
    // 現在のプレイヤーのエリアをハイライト
    this.highlightPhaseArea(currentPlayer, currentPhase);
  }

  // 指定プレイヤーのフェーズエリアをハイライト
  highlightPhaseArea(playerId, phase) {
    const playerArea = playerId === 1 ? '.battle-player' : '.battle-opponent';
    
    // フェーズに応じてハイライトを適用
    switch (phase) {
      case 0: // リセットステップ
        const battleArea = document.querySelector(playerArea);
        if (battleArea) {
          battleArea.classList.add('phase-highlight');
        }
        break;
      case 1: // ドローステップ
        const deckArea = document.querySelector(`${playerArea} .deck`);
        if (deckArea) {
          deckArea.classList.add('phase-highlight');
        }
        break;
      case 2: // エールステップ
        const yellDeck = document.querySelector(`${playerArea} .yell-deck`);
        if (yellDeck) {
          yellDeck.classList.add('phase-highlight');
        }
        break;
      case 3: // メインステップ
        if (playerId === 1) {
          console.log('メインステップ（プレイヤー） - 手札エリアをハイライト');
          const handArea = document.querySelector('.hand-area');
          if (handArea) {
            handArea.classList.add('phase-highlight');
            console.log('✅ プレイヤーメインステップハイライト適用完了');
          } else {
            console.log('❌ 手札エリアが見つかりません');
          }
        } else {
          console.log('メインステップ（CPU） - プレイヤーエリア全体をハイライト');
          const battleArea = document.querySelector(playerArea);
          if (battleArea) {
            battleArea.classList.add('phase-highlight');
            console.log('✅ CPUメインステップハイライト適用完了');
          } else {
            console.log('❌ CPUプレイヤーエリアが見つかりません');
          }
        }
        break;
      case 4: // パフォーマンスステップ
        console.log('パフォーマンスステップ - フロントエリアをハイライト');
        const collab = document.querySelector(`${playerArea} .collab`);
        const center = document.querySelector(`${playerArea} .center`);
        let highlightCount = 0;
        if (collab) {
          collab.classList.add('phase-highlight');
          highlightCount++;
        }
        if (center) {
          center.classList.add('phase-highlight');
          highlightCount++;
        }
        console.log(`✅ パフォーマンスステップハイライト適用完了 (${highlightCount}箇所)`);
        break;
      case 5: // エンドステップ
        console.log('エンドステップ - プレイヤーエリア全体をハイライト');
        const endBattleArea = document.querySelector(playerArea);
        if (endBattleArea) {
          endBattleArea.classList.add('phase-highlight');
          console.log('✅ エンドステップハイライト適用完了');
        } else {
          console.log('❌ エンドステップ用プレイヤーエリアが見つかりません');
        }
        break;
      default:
        console.log(`⚠️ 未対応のフェーズ: ${phase}`);
    }
    console.log(`=== highlightPhaseArea 完了 ===`);
  }

  updatePhaseButtons() {
    const nextPhaseBtn = document.getElementById('next-phase');
    const toPerformanceBtn = document.getElementById('to-performance');
    const endTurnBtn = document.getElementById('end-turn');
    
    if (!nextPhaseBtn || !toPerformanceBtn || !endTurnBtn) return;
    
    // すべてのボタンを非表示かつ無効化
    nextPhaseBtn.style.display = 'none';
    nextPhaseBtn.disabled = true;
    toPerformanceBtn.style.display = 'none';
    toPerformanceBtn.disabled = true;
    endTurnBtn.style.display = 'none';
    endTurnBtn.disabled = true;
    
    // プレイヤー1のターンでゲームが開始されている場合のみボタンを表示・有効化
    if (this.gameState.currentPlayer === 1 && this.gameState.gameStarted && !this.gameState.gameEnded) {
      switch (this.gameState.currentPhase) {
        case 3: // メインステップ
          toPerformanceBtn.style.display = 'block';
          toPerformanceBtn.disabled = false;
          toPerformanceBtn.textContent = 'パフォーマンスステップへ';
          break;
        case 4: // パフォーマンスステップ
          endTurnBtn.style.display = 'block';
          endTurnBtn.disabled = false;
          endTurnBtn.textContent = 'ターン終了';
          break;
        default:
          // その他のステップでは自動進行のため、ボタンは表示しない
          break;
      }
    }
  }

  // 手札カードクリック処理（HandManagerに委任）
  handleHandCardClick(card, index) {
    this.handManager.handleHandCardClick(card, index);
  }

  // カードプレイ処理（HandManagerに委任）
  playCard(card, handIndex) {
    return this.handManager.playCard(card, handIndex);
  }

  // ホロメンカード配置処理（HandManagerに委任）
  playHolomenCard(card, handIndex) {
    return this.handManager.playHolomenCard(card, handIndex);
  }

  // サポートカード使用処理（HandManagerに委任）
  playSupportCard(card, handIndex) {
    return this.handManager.playSupportCard(card, handIndex);
  }

  // カードオブジェクトのディープコピーを作成（HandManagerに委任）
  createCardCopy(card) {
    return this.handManager.createCardCopy(card);
  }

  // 先行・後攻の決定
  decideTurnOrder() {
    // Game Setup Managerに委譲
    return this.setupManager.decideTurnOrder();
  }

  showTurnOrderPopup(suggestedPlayer) {
    // Game Setup Managerに委譲
    return this.setupManager.showTurnOrderPopup(suggestedPlayer);
  }

  setFirstPlayer(playerId, isManual) {
    // Game Setup Managerに委譲
    return this.setupManager.setFirstPlayer(playerId, isManual);
  }

  showGameMessage(message) {
    const messageArea = document.querySelector('.game-message') || this.createGameMessageArea();
    messageArea.textContent = message;
    messageArea.style.display = 'block';
    
    // 3秒後に非表示
    setTimeout(() => {
      messageArea.style.display = 'none';
    }, 3000);
  }

  createGameMessageArea() {
    const messageArea = document.createElement('div');
    messageArea.className = 'game-message';
    messageArea.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 20px;
      border-radius: 10px;
      font-size: 18px;
      z-index: 1000;
      display: none;
    `;
    document.body.appendChild(messageArea);
    return messageArea;
  }

  // マリガン処理開始
  startMulliganPhase() {
    // Turn Managerに委譲
    return this.turnManager.startMulliganPhase();
  }

  checkMulligan(playerId) {
    // Turn & Mulligan Managerに委譲
    return this.turnMulliganManager.checkMulligan(playerId);
  }

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

  executeMulligan(playerId) {
    const player = this.players[playerId];
    const mulliganCount = this.gameState.mulliganCount[playerId];
    
    console.log(`プレイヤー${playerId}がマリガンを実行（${mulliganCount + 1}回目）`);
    
    // 手札をデッキに戻す
    player.deck.push(...player.hand);
    player.hand = [];
    
    // デッキをシャッフル
    this.shuffleDeck(playerId);
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
    this.updateUI();
    
    // 手札表示を強制的に更新（少し遅延を入れる）
    setTimeout(() => {
      this.updateHandDisplay();
    }, 100);
    
    // マリガン完了メッセージ
    const playerName = playerId === 1 ? 'あなた' : '相手';
    alert(`${playerName}がマリガンを実行しました（${newHandSize}枚配布）`);
    
    // 手札にDebutがあるかチェックして、連続マリガンまたは次の処理を決定
    setTimeout(() => {
      const hasDebut = player.hand.some(card => 
        card.card_type && card.card_type.includes('ホロメン') && card.bloom_level === 'Debut'
      );
      
      if (!hasDebut) {
        // まだDebutがないので、再度マリガンが必要
        this.checkMulligan(playerId);
      } else {
        // Debutが見つかったので、任意でマリガンを選択可能
        this.checkMulligan(playerId);
      }
    }, 500);
  }

  skipMulligan(playerId) {
    console.log(`プレイヤー${playerId}がマリガンをスキップ`);
    
    // マリガンスキップメッセージ
    const playerName = playerId === 1 ? 'あなた' : '相手';
    alert(`${playerName}がマリガンをスキップしました`);
    
    // 次のプレイヤーまたはDebut配置フェーズへ
    setTimeout(() => {
      this.proceedToNextMulliganPlayer(playerId);
    }, 500);
  }

  proceedToNextMulliganPlayer(currentPlayerId) {
    // マリガン完了状態をマーク
    this.gameState.mulliganCompleted[currentPlayerId] = true;
    
    // 両プレイヤーのマリガンが完了したかチェック
    if (this.gameState.mulliganCompleted[1] && this.gameState.mulliganCompleted[2]) {
      // 両プレイヤーのマリガンが完了
      this.startDebutPlacementPhase();
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
      this.startDebutPlacementPhase();
    }
  }

  cpuMulliganDecision(playerId) {
    const player = this.players[playerId];
    const hasDebut = player.hand.some(card => 
      card.card_type && card.card_type.includes('ホロメン') && card.bloom_level === 'Debut'
    );
    
    if (!hasDebut) {
      // Debutがない場合は強制マリガン
      this.executeMulligan(playerId);
    } else {
      // 簡単なAI判定：手札が悪い場合マリガン
      const goodCards = player.hand.filter(card => 
        (card.card_type && card.card_type.includes('ホロメン')) || 
        (card.card_type && card.card_type.includes('サポート'))
      ).length;
      
      if (goodCards < 3 && this.gameState.mulliganCount[playerId] === 0) {
        this.executeMulligan(playerId);
      } else {
        this.skipMulligan(playerId);
      }
    }
  }

  // Debut配置フェーズ開始
  startDebutPlacementPhase() {
    this.gameState.mulliganPhase = false;
    this.gameState.debutPlacementPhase = true;  // 追加: Debut配置フェーズフラグを設定
    
    // State Managerの状態も更新
    if (this.stateManager) {
      this.stateManager.startDebutPlacementPhase();
    }
    
    console.log('Debut配置フェーズ開始');
    
    alert(
      'マリガン完了！\n\n' +
      'Debutホロメンの配置を行います\n' +
      '・センターに1枚必須\n' +
      '・バックに好きなだけ配置可能'
    );
    
    // 先行プレイヤーから順番にDebut配置
    this.showDebutPlacementUI(this.gameState.firstPlayer);
  }

  showDebutPlacementUI(playerId) {
    console.log(`=== showDebutPlacementUI 開始 - プレイヤー${playerId} ===`);
    const player = this.players[playerId];
    
    console.log(`プレイヤー${playerId}の手札:`, player.hand);
    console.log(`手札枚数: ${player.hand.length}`);
    
    // 手札の各カードを詳細チェック
    player.hand.forEach((card, index) => {
      if (card) {
        console.log(`手札[${index}]:`, {
          name: card.name,
          card_type: card.card_type,
          bloom_level: card.bloom_level,
          isHolomen: card.card_type && card.card_type.includes('ホロメン'),
          isDebut: card.bloom_level === 'Debut'
        });
      }
    });
    
    const debutCards = player.hand.filter(card => 
      card.card_type && card.card_type.includes('ホロメン') && card.bloom_level === 'Debut'
    );
    
    console.log(`デビューカード検出結果: ${debutCards.length}枚`, debutCards);
    
    if (debutCards.length === 0) {
      window.errorLog(`プレイヤー${playerId}にDebutホロメンがありません`);
      return;
    }
    
    const playerName = playerId === 1 ? 'あなた' : '相手';
    
    if (playerId === 1) {
      // プレイヤー1の場合：手動配置UI
      this.showManualDebutPlacementUI(playerId);
    } else {
      // CPUの場合：自動配置
      this.cpuDebutPlacement(playerId);
    }
  }

  showManualDebutPlacementUI(playerId) {
    const player = this.players[playerId];
    const debutCards = player.hand.filter(card => 
      card.card_type && card.card_type.includes('ホロメン') && card.bloom_level === 'Debut'
    );
    
    // Debut配置状態を初期化
    this.debutPlacementState = {
      playerId: playerId,
      debutCards: [...debutCards],
      centerPlaced: false,
      backPositions: ['back1', 'back2', 'back3', 'back4', 'back5'],
      usedBackPositions: []
    };
    
    alert(
      'あなたのDebut配置\n\n' +
      `Debutホロメン: ${debutCards.length}枚\n\n` +
      '📌 配置ルール:\n' +
      '• センターに1枚必須\n' +
      '• バックに好きなだけ配置可能\n\n' +
      '手札のDebutホロメンをドラッグ&ドロップで配置してください'
    );
    
    // 手札を更新してドラッグ&ドロップでの配置を促進
    this.updateHandDisplay();
    
    // 完了確認のためのボタンを表示
    this.showDebutPlacementControls();
  }

  showDebutPlacementControls() {
    // 既存のコントロールを削除
    const existingControls = document.getElementById('debut-placement-controls');
    if (existingControls) {
      existingControls.remove();
    }
    
    // Debut配置用のコントロールパネルを作成
    const controls = document.createElement('div');
    controls.id = 'debut-placement-controls';
    controls.style.cssText = `
      position: fixed;
      top: 50%;
      left: 20px;
      transform: translateY(-50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 20px;
      border-radius: 10px;
      z-index: 1000;
      backdrop-filter: blur(10px);
      min-width: 250px;
    `;
    
    controls.innerHTML = `
      <h3>🎭 Debut配置</h3>
      <div id="debut-status">
        <div>センター: <span id="center-status">未配置</span></div>
        <div>バック: <span id="back-count">0</span>/3</div>
      </div>
      <button id="auto-debut-button" style="
        width: 100%;
        padding: 10px;
        margin: 10px 0;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
      ">自動配置</button>
      <button id="complete-debut-button" style="
        width: 100%;
        padding: 10px;
        background: #2196F3;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
      " disabled>配置完了</button>
    `;
    
    document.body.appendChild(controls);
    
    // イベントリスナーを設定
    document.getElementById('auto-debut-button').addEventListener('click', () => {
      this.executeAutoDebutPlacement();
    });
    
    document.getElementById('complete-debut-button').addEventListener('click', () => {
      this.completeDebutPlacement();
    });
    
    // 初期状態を更新
    this.updateDebutPlacementStatus();
  }

  updateDebutPlacementStatus() {
    const player = this.players[1];
    const centerStatus = document.getElementById('center-status');
    const backCount = document.getElementById('back-count');
    const completeButton = document.getElementById('complete-debut-button');
    const autoButton = document.getElementById('auto-debut-button');
    
    // 実際のゲーム状態を確認（center → center）
    const hasValidCenter = player.center && 
                          this.isHolomenCard(player.center) && 
                          player.center.bloom_level === 'Debut';
    
    const backPositions = ['back1', 'back2', 'back3', 'back4', 'back5'];
    const placedBackCards = backPositions.filter(pos => player[pos]).length;
    
    // センターに既にカードが配置されているかチェック（Debutかどうかは問わない）
    const hasAnyCenterCard = player.center !== null;
    
    if (centerStatus) {
      centerStatus.textContent = hasValidCenter ? '配置済み' : '未配置';
      centerStatus.style.color = hasValidCenter ? '#4CAF50' : '#f44336';
    }
    
    if (backCount) {
      backCount.textContent = placedBackCards;
    }
    
    // 配置完了ボタンの制御
    if (completeButton) {
      if (hasValidCenter) {
        completeButton.disabled = false;
        completeButton.style.background = '#4CAF50';
        completeButton.style.cursor = 'pointer';
        completeButton.textContent = '配置完了';
      } else {
        completeButton.disabled = true;
        completeButton.style.background = '#999';
        completeButton.style.cursor = 'not-allowed';
        completeButton.textContent = '配置完了（センターへの配置が必要）';
      }
    }
    
    // 自動配置ボタンの制御
    if (autoButton) {
      if (hasAnyCenterCard) {
        // 既にセンターにカードが配置されている場合は自動配置を無効化
        autoButton.disabled = true;
        autoButton.style.background = '#999';
        autoButton.style.cursor = 'not-allowed';
        autoButton.textContent = '自動配置（センタークリア後に使用可能）';
      } else {
        // センターが空の場合は自動配置を有効化
        autoButton.disabled = false;
        autoButton.style.background = '#4CAF50';
        autoButton.style.cursor = 'pointer';
        autoButton.textContent = '自動配置';
      }
    }
  }

  executeAutoDebutPlacement() {
    console.log('=== executeAutoDebutPlacement 開始 ===');
    const state = this.debutPlacementState;
    console.log('debutPlacementState:', state);
    
    if (!state) {
      window.errorLog('debutPlacementStateが存在しません');
      return;
    }
    
    // 自動配置前にセンターの状態をチェック
    const player = this.players[state.playerId];
    if (player.center !== null) {
      alert('⚠️ 自動配置エラー\n\nセンター２に既にカードが配置されています。\n手動で移動するか、クリアしてから自動配置を使用してください。');
      window.errorLog('センターに既にカードが配置されているため自動配置を実行できません');
      return;
    }
    
    // プレイヤーの現在状態をチェック
    console.log(`プレイヤー${state.playerId}の手札:`, player.hand);
    console.log(`手札枚数: ${player.hand.length}`);
    
    // コントロールを削除
    const controls = document.getElementById('debut-placement-controls');
    if (controls) {
      controls.remove();
    }
    
    // 自動配置を実行
    this.autoDebutPlacement(state.playerId);
  }

  completeDebutPlacement() {
    const player = this.players[1]; // プレイヤーのデータを取得
    
    // センター２に配置されているかチェック
    if (!player.center) {
      alert('エラー: センター２にDebutホロメンの配置が必要です。\n必ずセンター２にDebutカードを配置してください。');
      return;
    }
    
    // センター２のカードがDebutかチェック
    if (player.center.bloom_level !== 'Debut') {
      alert('エラー: センター２にはDebutレベルのホロメンを配置してください。');
      return;
    }
    
    // ホロメンカードかチェック
    if (!this.isHolomenCard(player.center)) {
      alert('エラー: センター２にはホロメンカードを配置してください。');
      return;
    }
    
    console.log('Debut配置バリデーション完了');
    console.log('センター２:', player.center.name);
    
    // バックエリアの配置数をカウント
    const backPositions = ['back1', 'back2', 'back3', 'back4', 'back5'];
    const placedBackCards = backPositions.filter(pos => player[pos]).length;
    
    // コントロールを削除
    const controls = document.getElementById('debut-placement-controls');
    if (controls) {
      controls.remove();
    }
    
    const totalPlaced = 1 + placedBackCards; // センター２ + バック
    alert(`Debut配置完了！\nセンター２: ${player.center.name}\nバックエリア: ${placedBackCards}枚\n合計: ${totalPlaced}枚のDebutホロメンを配置しました`);
    
    // 次のプレイヤーまたは次のフェーズへ
    this.proceedToNextDebutPlayer(1);
  }

  autoDebutPlacement(playerId) {
    console.log(`autoDebutPlacement開始 - プレイヤー${playerId}`);
    const player = this.players[playerId];
    
    if (!player) {
      window.errorLog(`プレイヤー${playerId}が見つかりません`);
      return;
    }
    
    console.log('プレイヤーの手札:', player.hand);
    console.log('既存の配置状態:');
    console.log('- collab:', player.collab?.name || '空');
    console.log('- center:', player.center?.name || '空');
    console.log('- back1:', player.back1?.name || '空');
    console.log('- back2:', player.back2?.name || '空');
    console.log('- back3:', player.back3?.name || '空');
    console.log('- back4:', player.back4?.name || '空');
    console.log('- back5:', player.back5?.name || '空');
    
    // 手札の各カードを詳細チェック
    player.hand.forEach((card, index) => {
      if (card) {
        console.log(`手札[${index}]:`, {
          name: card.name,
          card_type: card.card_type,
          bloom_level: card.bloom_level,
          isHolomen: card.card_type && card.card_type.includes('ホロメン'),
          isDebut: card.bloom_level === 'Debut'
        });
      }
    });
    
    // 手札と既に配置済みのDebutカードを取得
    const handDebutCards = player.hand.filter(card => 
      card && card.card_type && card.card_type.includes('ホロメン') && card.bloom_level === 'Debut'
    );
    
    // 既に配置済みのDebutカードを取得
    const placedDebutCards = [];
    const backPositions = ['back1', 'back2', 'back3', 'back4', 'back5'];
    
    // センターからDebutカードを探す
    if (player.center && player.center.card_type && player.center.card_type.includes('ホロメン') && player.center.bloom_level === 'Debut') {
      placedDebutCards.push({ card: player.center, position: 'center' });
    }
    
    // バックからDebutカードを探す
    backPositions.forEach(position => {
      const card = player[position];
      if (card && card.card_type && card.card_type.includes('ホロメン') && card.bloom_level === 'Debut') {
        placedDebutCards.push({ card: card, position: position });
      }
    });
    
    console.log('手札のデビューカード:', handDebutCards);
    console.log('配置済みのデビューカード:', placedDebutCards);
    
    // 利用可能なDebutカードの総数をチェック
    const totalDebutCards = handDebutCards.length + placedDebutCards.length;
    if (totalDebutCards === 0) {
      window.warnLog(`プレイヤー${playerId}にDebutカードが見つかりません`);
      this.proceedToNextDebutPlayer(playerId);
      return;
    }
    
    // センターが空の場合、必ず配置する
    if (!player.center) {
      let centerCard = null;
      let sourcePosition = null;
      
      // 優先順位：手札 > バック配置済み
      if (handDebutCards.length > 0) {
        centerCard = handDebutCards[0];
        sourcePosition = 'hand';
      } else if (placedDebutCards.length > 0) {
        const backPlaced = placedDebutCards.find(p => p.position.startsWith('back'));
        if (backPlaced) {
          centerCard = backPlaced.card;
          sourcePosition = backPlaced.position;
        }
      }
      
      if (centerCard) {
        const centerCardCopy = this.createCardCopy(centerCard);
        player.center = centerCardCopy;
        
        if (sourcePosition === 'hand') {
          // 手札から移動
          const handIndex = player.hand.findIndex(card => card && card.id === centerCard.id);
          if (handIndex !== -1) {
            player.hand.splice(handIndex, 1);
          }
        } else {
          // バックから移動
          player[sourcePosition] = null;
        }
        
        console.log(`プレイヤー${playerId}が${centerCardCopy.name}を${sourcePosition}からセンターに配置`);
      }
    }
    
    // 残りのDebutをバックに配置（手札のみから）
    const remainingHandDebuts = player.hand.filter(card => 
      card && card.card_type && card.card_type.includes('ホロメン') && card.bloom_level === 'Debut'
    );
    
    const maxSlots = player.collab ? 4 : 5; // センター①の存在で制限
    
    // 空きバックスロットを探して配置
    let placedCount = 0;
    for (let i = 0; i < Math.min(maxSlots, backPositions.length) && placedCount < remainingHandDebuts.length; i++) {
      const position = backPositions[i];
      
      // スロットが空の場合のみ配置
      if (!player[position]) {
        const card = remainingHandDebuts[placedCount];
        if (!card || !card.id) {
          window.errorLog('バックカードまたはIDが無効です:', card);
          continue;
        }
        
        const cardCopy = this.createCardCopy(card);
        player[position] = cardCopy;
        const handIndex = player.hand.findIndex(handCard => handCard && handCard.id === card.id);
        if (handIndex === -1) {
          window.errorLog('手札からバックカードが見つかりません:', card);
          continue;
        }
        player.hand.splice(handIndex, 1);
        console.log(`プレイヤー${playerId}が${cardCopy.name}を${position}に配置`);
        placedCount++;
      } else {
        console.log(`${position}は既に配置済み:`, player[position].name);
      }
    }    
    // UIを更新
    this.updateUI();
    this.updateHandDisplay();
    
    const centerCardName = player.center ? player.center.name : '（センター既に配置済み）';
    const backPlacedCount = placedCount;
    
    if (centerCardName !== '（センター既に配置済み）' || backPlacedCount > 0) {
      let message = '';
      if (centerCardName !== '（センター既に配置済み）') {
        message += `${centerCardName}をセンターに配置\n`;
      }
      if (backPlacedCount > 0) {
        message += `${backPlacedCount}枚をバックに配置しました`;
      }
      alert(message.trim());
    } else {
      alert('既に配置されているため、新たな配置は行いませんでした');
    }
    
    // 次のプレイヤーへ
    this.proceedToNextDebutPlayer(playerId);
  }

  proceedToNextDebutPlayer(currentPlayerId) {
    // Debut配置完了状態を管理するため、状態を追加
    if (!this.gameState.debutPlacementCompleted) {
      this.gameState.debutPlacementCompleted = { 1: false, 2: false };
    }
    
    // 現在のプレイヤーの配置を完了としてマーク
    this.gameState.debutPlacementCompleted[currentPlayerId] = true;
    
    // 両プレイヤーの配置が完了したかチェック
    if (this.gameState.debutPlacementCompleted[1] && this.gameState.debutPlacementCompleted[2]) {
      // 両プレイヤーの配置が完了
      this.finishGameSetup();
      return;
    }
    
    // 次のプレイヤーを決定
    const nextPlayerId = currentPlayerId === 1 ? 2 : 1;
    
    // 次のプレイヤーがまだ配置を完了していない場合
    if (!this.gameState.debutPlacementCompleted[nextPlayerId]) {
      if (nextPlayerId === 1) {
        // プレイヤー1の手動配置
        this.showDebutPlacementUI(nextPlayerId);
      } else {
        // プレイヤー2（CPU）の自動配置
        this.cpuDebutPlacement(nextPlayerId);
      }
    } else {
      // 次のプレイヤーが既に完了している場合、ゲームセットアップ完了
      this.finishGameSetup();
    }
  }

  cpuDebutPlacement(playerId) {
    const player = this.players[playerId];
    const debutCards = player.hand.filter(card => 
      card.card_type && card.card_type.includes('ホロメン') && card.bloom_level === 'Debut'
    );
    
    if (debutCards.length === 0) {
      window.errorLog(`CPU（プレイヤー${playerId}）にDebutホロメンがありません`);
      return;
    }
    
    // センターに1枚配置（ディープコピー使用）
    const centerCard = debutCards[0];
    const centerCardCopy = this.createCardCopy(centerCard);
    player.center = centerCardCopy;
    const centerIndex = player.hand.findIndex(card => card.id === centerCard.id);
    player.hand.splice(centerIndex, 1);
    
    console.log(`CPU（プレイヤー${playerId}）が${centerCardCopy.name}をセンターに配置`);
    
    // 残りのDebutをバックに配置（簡単なAI）
    const remainingDebuts = player.hand.filter(card => 
      card.card_type && card.card_type.includes('ホロメン') && card.bloom_level === 'Debut'
    );
    
    let backPositions = ['back1', 'back2', 'back3', 'back4', 'back5'];
    const maxSlots = player.collab ? 4 : 5; // センター①の存在で制限
    
    remainingDebuts.slice(0, maxSlots).forEach((card, index) => {
      const cardCopy = this.createCardCopy(card);
      player[backPositions[index]] = cardCopy;
      const handIndex = player.hand.findIndex(handCard => handCard.id === card.id);
      player.hand.splice(handIndex, 1);
      console.log(`CPU（プレイヤー${playerId}）が${cardCopy.name}を${backPositions[index]}に配置`);
    });
    
    // UIを更新
    this.updateUI();
    
    // 次のプレイヤーへ
    this.proceedToNextDebutPlayer(playerId);
  }

  finishGameSetup() {
    console.log('ゲームセットアップ完了');
    this.gameState.gameStarted = true;
    this.gameState.debutPlacementPhase = false;  // 追加: Debut配置フェーズ終了
    
    // State Managerの状態も更新
    if (this.stateManager) {
      this.stateManager.endDebutPlacementPhase();
    }
    
    alert('ゲーム開始！');
    
    // 最初のターンを開始（リセットステップから）
    this.startTurn();
  }

  startTurn() {
    // プレイヤー別ターン回数を増加（ターン開始時）
    const currentPlayerTurnCount = this.stateManager.getStateByPath(`turn.playerTurnCount.${this.gameState.currentPlayer}`) || 0;
    this.stateManager.updateState('PLAYER_TURN_CHANGE', {
      player: this.gameState.currentPlayer,
      turnCount: currentPlayerTurnCount + 1
    });
    
    const playerTurnCount = currentPlayerTurnCount + 1;
    console.log(`プレイヤー${this.gameState.currentPlayer}のターン${playerTurnCount}開始 (全体ターン${this.gameState.turnCount})`);
    this.gameState.currentPhase = 0; // リセットステップから開始
    this.updateTurnInfo(); // ターン情報を更新
    this.updateUI();
    
    // リセットステップを自動実行
    setTimeout(() => {
      this.executeResetStep(this.gameState.currentPlayer);
    }, 1000);
  }

  // ドラッグ&ドロップ関連の関数
  // 手札ドラッグ開始処理（HandManagerに委任）
  handleHandCardDragStart(e, card, index) {
    this.handManager.handleHandCardDragStart(e, card, index);
  }

  // 配置済みカードのドラッグ開始処理
  handlePlacedCardDragStart(e, card, areaId, index) {
    console.log('配置済みカードからドラッグ開始:', card.name, 'エリア:', areaId, 'インデックス:', index);
    
    // ドラッグ中のカードデータを保存
    this.draggedCard = {
      card: card,
      areaId: areaId,
      index: index,
      source: 'placed'
    };
    
    // ドラッグエフェクトを追加
    e.target.classList.add('dragging');
    
    // 有効なドロップゾーンをハイライト（交換可能な場所）
    this.highlightValidSwapZones(card, areaId, index);
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({
      cardId: card.id,
      areaId: areaId,
      index: index,
      source: 'placed'
    }));
  }

  // 配置済みカードのドラッグ終了処理
  handlePlacedCardDragEnd(e) {
    console.log('配置済みカードのドラッグ終了');
    
    // ドラッグエフェクトを削除
    e.target.classList.remove('dragging');
    
    // ハイライトを削除
    this.clearDropZoneHighlights();
    
    // ドラッグ状態をクリア
    this.draggedCard = null;
  }

  // 手札ドラッグ終了処理（HandManagerに委任）
  handleHandCardDragEnd(e) {
    this.handManager.handleHandCardDragEnd(e);
  }

  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }

  handleDragEnter(e) {
    e.preventDefault();
    if (this.draggedCard && this.isValidDropTarget(e.target, this.draggedCard.card)) {
      e.target.classList.add('drop-zone-hover');
    }
  }

  handleDragLeave(e) {
    e.target.classList.remove('drop-zone-hover');
  }

  handleDrop(e) {
    e.preventDefault();
    e.target.classList.remove('drop-zone-hover');
    
    const droppedData = this.draggedCard || this.draggedPlacedCard;
    if (!droppedData) {
      console.log('ドラッグデータが見つかりません');
      return;
    }
    
    const card = droppedData.card;
    const dropZone = this.getDropZoneInfo(e.target);
    
    console.log('ドロップ先:', dropZone);
    console.log('ドラッグ元:', droppedData.source);
    
    // 配置制御チェック
    if (this.placementController && dropZone.type !== 'support') {
      // バックスロットの場合は具体的なポジション名を作成
      let positionName = dropZone.type;
      if (dropZone.type === 'back' && dropZone.index !== undefined) {
        positionName = `back${dropZone.index + 1}`; // index 0 → back1
      }
      
      const placementCheck = this.placementController.canPlaceCard(card, positionName, 1);
      if (!placementCheck.allowed) {
        alert(`⚠️ 配置不可\n\n${placementCheck.reason}`);
        console.log('配置制御により配置が拒否されました:', placementCheck.reason);
        return;
      }
    }
    
    if (droppedData.source === 'hand') {
      // 手札からの配置
      if (this.isValidDropTarget(e.target, card)) {
        this.placeCardFromHand(card, droppedData.index, dropZone);
      } else {
        console.log('無効なドロップ先です');
      }
    } else if (droppedData.source === 'placed') {
      // 配置済みカードの移動・交換
      if (this.isValidSwapTarget(e.target, card)) {
        // swapCardsメソッドを正しい引数で呼び出し
        this.performCardSwap(droppedData, dropZone);
      } else {
        console.log('無効な交換先です');
      }
    }
    
    // ドラッグ状態をクリア
    this.clearHighlights();
    this.draggedCard = null;
    this.draggedPlacedCard = null;
  }

  // カードタイプ判定（HandManagerに委任）
  isSupportCard(card) {
    return this.handManager.isSupportCard(card);
  }

  isHolomenCard(card) {
    // nullチェックを追加
    if (!card || !card.card_type) {
      console.log(`isHolomenCard判定: ${card ? card.name || 'unnamed' : 'null'} = false (nullまたはcard_typeなし)`);
      return false;
    }
    
    const isHolomen = card.card_type.includes('ホロメン');
    console.log(`isHolomenCard判定: ${card.name} = ${isHolomen} (${card.card_type})`);
    return isHolomen;
  }

  // 有効なドロップゾーンをハイライト
  highlightValidDropZones(card) {
    console.log('ハイライト開始:', card.name, 'カードタイプ:', card.card_type);
    
    if (this.isSupportCard(card)) {
      // サポートカードは効果エリアのみ
      console.log('サポートカード検出');
      return;
    }
    
    if (this.isHolomenCard(card)) {
      console.log('ホロメンカード検出');
      
      // センター②をチェック（空の場合のみ）
      const center = document.querySelector('.battle-player .center');
      if (center && !this.players[1].center) {
        center.classList.add('drop-zone-active');
        console.log('センター②をハイライト');
      }
      
      // コラボエリアをチェック
      const collabArea = document.querySelector('.battle-player .collab-area');
      if (collabArea) {
        collabArea.classList.add('drop-zone-active');
        console.log('コラボエリアをハイライト');
      }
      
      // バックスロットをチェック（デバッグ強化）
      console.log('全体のバックスロット:', document.querySelectorAll('.back-slot').length);
      console.log('プレイヤーエリアのバックスロット:', document.querySelectorAll('.battle-player .back-slot').length);
      
      const backSlots = document.querySelectorAll('.battle-player .back-slot');
      console.log('バックスロット数:', backSlots.length);
      
      backSlots.forEach((slot, index) => {
        console.log(`バックスロット${index}:`, slot);
        const canPlace = this.canPlaceCardInBackSlot(card, index);
        console.log(`バックスロット${index}: 配置可能=${canPlace}`);
        if (canPlace) {
          slot.classList.add('drop-zone-active');
          console.log(`バックスロット${index}をハイライト`);
        }
      });
    }
  }

  // 交換可能なゾーンをハイライト
  highlightValidSwapZones(card, currentAreaId, currentIndex) {
    console.log('交換可能ゾーンのハイライト開始:', card.name, '現在位置:', currentAreaId, currentIndex);
    
    if (!this.isHolomenCard(card)) {
      return;
    }
    
    // コラボをハイライト（空または交換可能）
    const collab = document.querySelector('.battle-player .collab');
    if (collab && (currentAreaId !== 'collab')) {
      collab.classList.add('drop-zone-active');
      console.log('コラボをハイライト（交換可能）');
    }
    
    // センターをハイライト（空または交換可能）
    const center = document.querySelector('.battle-player .center');
    if (center && (currentAreaId !== 'center')) {
      center.classList.add('drop-zone-active');
      console.log('センターをハイライト（交換可能）');
    }
    
    // バックスロットをハイライト（現在位置以外）
    const backSlots = document.querySelectorAll('.battle-player .back-slot');
    backSlots.forEach((slot, index) => {
      // 現在のバックスロット位置でない場合、または異なるエリアからの場合
      if (currentAreaId !== 'backs' || currentIndex !== index) {
        const canPlace = this.canPlaceCardInBackSlot(card, index);
        if (canPlace) {
          slot.classList.add('drop-zone-active');
          console.log(`バックスロット${index}をハイライト（交換可能）`);
        }
      }
    });
  }

  // ドロップゾーンハイライトをクリア
  clearDropZoneHighlights() {
    const highlighted = document.querySelectorAll('.drop-zone-active');
    highlighted.forEach(element => {
      element.classList.remove('drop-zone-active');
    });
  }

  // ハイライトをクリア（エイリアス）
  clearHighlights() {
    this.clearDropZoneHighlights();
    document.querySelectorAll('.drop-zone-hover').forEach(element => {
      element.classList.remove('drop-zone-hover');
    });
  }

  // ドロップ先の有効性チェック
  isValidDropTarget(target, card) {
    if (this.isSupportCard(card)) {
      return target.classList.contains('support-drop-zone');
    }
    
    if (!this.isHolomenCard(card)) {
      return false;
    }
    
    const dropZone = this.getDropZoneInfo(target);
    
    switch (dropZone.type) {
      case 'center':
        // センターは空の場合も、カードがある場合（ブルーム/交換）も有効
        return true;
      case 'collab':
        // コラボエリアも有効なドロップ先として追加
        return true;
      case 'back':
        return this.canPlaceCardInBackSlot(card, dropZone.index);
      default:
        return false;
    }
  }

  // 交換先の有効性チェック
  isValidSwapTarget(target, card) {
    if (!this.isHolomenCard(card)) {
      return false;
    }
    
    const dropZone = this.getDropZoneInfo(target);
    
    switch (dropZone.type) {
      case 'collab':
      case 'center':
        return true; // センターエリアは常に交換可能
      case 'back':
        return this.canPlaceCardInBackSlot(card, dropZone.index);
      default:
        return false;
    }
  }

  // カード交換の実行（ドラッグ&ドロップからの呼び出し用）
  performCardSwap(draggedCardData, dropZone) {
    console.log(`🔍 [performCardSwap] カード移動開始: ${draggedCardData?.card?.name || draggedCardData?.name}`);
    
    // データ構造の検証とカードの抽出
    let sourceCard;
    if (draggedCardData && draggedCardData.card) {
      sourceCard = draggedCardData.card;
    } else if (draggedCardData && !draggedCardData.card && draggedCardData.name) {
      // draggedCardDataが直接カードオブジェクトの場合
      sourceCard = draggedCardData;
    } else {
      window.errorLog('sourceCard の抽出に失敗:', draggedCardData);
      return false;
    }
    
    if (!sourceCard || !sourceCard.name) {
      window.errorLog('有効なsourceCard が見つかりません');
      return false;
    }
    
    const player = this.players[1];
    
    // 移動元のポジション名を構築
    let sourcePosition;
    if (draggedCardData.areaId === 'backs') {
      sourcePosition = `back${draggedCardData.index + 1}`;
    } else {
      sourcePosition = draggedCardData.areaId;
    }
    
    // 移動先のポジション名を構築
    let targetPosition;
    let targetCard = null;
    
    switch (dropZone.type) {
      case 'collab':
        targetPosition = 'collab';
        targetCard = player.collab;
        break;
      case 'center':
        targetPosition = 'center';
        targetCard = player.center;
        break;
      case 'back':
        targetPosition = `back${dropZone.index + 1}`;
        targetCard = player[targetPosition];
        break;
    }
    
    console.log(`移動: ${sourcePosition} → ${targetPosition}`);
    
    // コラボ移動の場合は、State ManagerのcheckSwapValidityをスキップ
    // （Hand Managerで専用のコラボ処理を実行するため）
    const isCollabMove = targetPosition === 'collab' && sourcePosition.startsWith('back');
    
    // State Manager経由でのチェック（コラボ移動以外）
    if (this.stateManager && !isCollabMove) {
      const swapCheck = this.stateManager.checkSwapValidity(
        sourceCard, sourcePosition, targetCard, targetPosition, 1
      );
      
      if (!swapCheck.valid) {
        alert(`⚠️ 移動不可\n\n${swapCheck.reason}`);
        console.log('State Managerにより移動が拒否されました:', swapCheck.reason);
        return false;
      }
      
      // バトンタッチの場合は特別処理
      if (sourcePosition === 'center' && targetPosition.startsWith('back') && targetCard) {
        return this.handleBatonTouch(sourceCard, targetCard, targetPosition);
      }
    }
    
    // HandManagerのswapCardsメソッドを呼び出し
    return this.handManager.swapCards(sourceCard, sourcePosition, targetCard, targetPosition, 1);
  }

  // 位置からカードを削除
  removeCardFromPosition(player, areaId, index) {
    switch (areaId) {
      case 'collab':
        player.collab = null;
        break;
      case 'center':
        player.center = null;
        break;
      case 'backs':
        const backPositions = ['back1', 'back2', 'back3', 'back4', 'back5'];
        player[backPositions[index]] = null;
        break;
    }
  }

  // 指定位置にカードを配置
  placeCardAtPosition(player, card, zone) {
    switch (zone.type) {
      case 'collab':
        player.collab = card;
        break;
      case 'center':
        player.center = card;
        break;
      case 'back':
        const backPositions = ['back1', 'back2', 'back3', 'back4', 'back5'];
        player[backPositions[zone.index]] = card;
        break;
    }

    // HPがあるホロメンカードの場合、HP初期化
    if (card && card.hp && card.card_type && card.card_type.includes('ホロメン')) {
      const playerId = player === this.players[1] ? 1 : 2;
      this.stateManager.setCurrentHP(card, playerId, this.stateManager.getMaxHP(card));
      console.log(`💚 [HP初期化] ${card.name}: ${card.hp}HP`);
    }
  }

  // エリアIDからゾーンタイプを取得
  getZoneTypeFromAreaId(areaId) {
    switch (areaId) {
      case 'collab': return 'collab';
      case 'center': return 'center';
      case 'backs': return 'back';
      default: return areaId;
    }
  }

  // バックスロットへの配置可能性チェック
  canPlaceCardInBackSlot(card, slotIndex) {
    const player = this.players[1];
    const backPositions = ['back1', 'back2', 'back3', 'back4', 'back5'];
    
    // 配置枚数制限を削除 - すべてのスロットを使用可能に
    if (slotIndex >= 5) {
      console.log(`スロット${slotIndex}は範囲外（0-4のみ有効）`);
      return false;
    }
    
    const currentCard = player[backPositions[slotIndex]];
    
    console.log(`バック配置チェック: ${card.name}, bloom_level: ${card.bloom_level}, slotIndex: ${slotIndex}, currentCard:`, currentCard);
    
    // Debut, Spotは空のスロットにのみ配置可能
    if (card.bloom_level === 'Debut' || card.bloom_level === 'Spot') {
      const canPlace = !currentCard;
      console.log(`Debut/Spot配置チェック: ${canPlace}`);
      return canPlace;
    }
    
    // 1stは Debut/1st/1stBuzz の上に配置可能
    if (card.bloom_level === '1st') {
      if (!currentCard) return false;
      return ['Debut', '1st', '1stBuzz'].includes(currentCard.bloom_level);
    }
    
    // 2ndは 1st/1stBuzz/2nd の上に配置可能
    if (card.bloom_level === '2nd') {
      if (!currentCard) return false;
      return ['1st', '1stBuzz', '2nd'].includes(currentCard.bloom_level);
    }
    
    return false;
  }

  // ドロップ先情報を取得
  getDropZoneInfo(target) {
    console.log('getDropZoneInfo - target:', target, 'classList:', target.classList);
    
    // 既存のカードの場合
    if (target.classList.contains('card') && target.classList.contains('face-up')) {
      console.log('配置済みカードを検出');
      const areaId = target.dataset.areaId;
      const areaIndex = parseInt(target.dataset.areaIndex) || 0;
      
      console.log('カードエリア情報:', { areaId, areaIndex });
      
      switch (areaId) {
        case 'collab':
          return { type: 'collab', index: 0, element: target };
        case 'center':
          return { type: 'center', index: 0, element: target };
        case 'backs':
          return { type: 'back', index: areaIndex, element: target };
        default:
          return { type: 'unknown' };
      }
    }
    
    if (target.classList.contains('center')) {
      return { type: 'center' };
    }
    
    if (target.classList.contains('collab')) {
      console.log('コラボエリア検出');
      return { type: 'collab' };
    }
    
    if (target.classList.contains('holo')) {
      console.log('ホロパワーエリア検出');
      return { type: 'holo' };
    }
    
    if (target.classList.contains('back-slot')) {
      const slotIndex = parseInt(target.getAttribute('data-slot')) || 0;
      console.log('バックスロット検出:', slotIndex);
      return { type: 'back', index: slotIndex };
    }
    
    // .backs コンテナがクリックされた場合、最初の空きスロットを探す
    if (target.classList.contains('backs')) {
      console.log('backsコンテナ検出 - 子スロットを検索');
      const backSlots = target.querySelectorAll('.back-slot');
      console.log('子バックスロット数:', backSlots.length);
      
      // 最初の空きスロットを見つける
      for (let i = 0; i < backSlots.length; i++) {
        const slotIndex = parseInt(backSlots[i].getAttribute('data-slot')) || i;
        const player = this.players[1];
        const backPositions = ['back1', 'back2', 'back3', 'back4', 'back5'];
        if (!player[backPositions[slotIndex]]) {
          console.log('空きスロット発見:', slotIndex);
          return { type: 'back', index: slotIndex };
        }
      }
    }
    
    // バックスロット内のカード要素に直接ドロップした場合
    if (target.closest('.back-slot')) {
      const backSlot = target.closest('.back-slot');
      const slotIndex = parseInt(backSlot.getAttribute('data-slot')) || 0;
      console.log('バックスロット内要素検出:', slotIndex);
      return { type: 'back', index: slotIndex };
    }
    
    if (target.classList.contains('support-drop-zone')) {
      return { type: 'support' };
    }
    
    return { type: 'unknown' };
  }

  // 手札からカードを配置（交換対応版、HandManagerに委任）
  placeCardFromHand(card, handIndex, dropZone) {
    return this.handManager.placeCardFromHandWithSwap(card, handIndex, dropZone);
  }

  // サポートカード効果使用（HandManagerに委任）
  useSupportCard(card, handIndex) {
    return this.handManager.useSupportCard(card, handIndex);
  }

  // カード位置交換（HandManagerに委任）
  swapCards(sourceCard, sourcePosition, targetCard, targetPosition, playerId = 1) {
    return this.handManager.swapCards(sourceCard, sourcePosition, targetCard, targetPosition, playerId);
  }

  // 手札からの配置処理（交換対応版、HandManagerに委任）
  placeCardFromHandWithSwap(card, handIndex, dropZone) {
    return this.handManager.placeCardFromHandWithSwap(card, handIndex, dropZone);
  }

  // サポートドロップゾーン作成
  createSupportDropZone() {
    console.log('createSupportDropZone() 呼び出し');
    // 既存の要素があれば削除
    const existingZone = document.getElementById('support-drop-zone');
    if (existingZone) {
      console.log('既存のサポートドロップゾーンを削除');
      existingZone.remove();
    }
    
    const supportZone = document.createElement('div');
    supportZone.className = 'support-drop-zone';
    supportZone.textContent = 'サポートカード効果使用';
    supportZone.id = 'support-drop-zone';
    
    // プレイヤーエリアの上端に合わせ、横幅も合わせる
    supportZone.style.height = '550px'; // 手札エリアと重ならない高さ
    supportZone.style.width = '100%'; // プレイヤーエリアの横幅に合わせる
    supportZone.style.top = '0'; // プレイヤーエリアの上端に合わせる
    supportZone.style.left = '0'; // 左端も合わせる
    console.log('サポートドロップゾーン要素作成完了:', supportZone);
    console.log('適用したスタイル - height:', supportZone.style.height, 'width:', supportZone.style.width, 'top:', supportZone.style.top);
    
    // ドロップイベントを追加
    supportZone.addEventListener('dragover', (e) => this.handleDragOver(e));
    supportZone.addEventListener('dragenter', (e) => this.handleDragEnter(e));
    supportZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    supportZone.addEventListener('drop', (e) => this.handleDrop(e));
    
    // プレイヤーエリア内に配置
    const playerArea = document.querySelector('.battle-player');
    if (playerArea) {
      playerArea.appendChild(supportZone);
      console.log('サポートドロップゾーンをプレイヤーエリアに追加完了');
    } else {
      document.body.appendChild(supportZone);
      console.log('プレイヤーエリアが見つからないためbodyに追加');
    }
  }

  // サポートドロップゾーン表示/非表示
  showSupportDropZone() {
    console.log('showSupportDropZone() 呼び出し');
    const supportZone = document.getElementById('support-drop-zone');
    console.log('support-drop-zone要素:', supportZone);
    if (supportZone) {
      supportZone.classList.add('active');
      console.log('active クラス追加完了');
    } else {
      console.log('support-drop-zone要素が見つかりません');
    }
  }

  hideSupportDropZone() {
    const supportZone = document.getElementById('support-drop-zone');
    if (supportZone) {
      supportZone.classList.remove('active');
    }
  }

  // エールカードをホロメンに添付
  attachYellCard(playerId, position, yellCard) {
    console.log(`✅ [エール配置開始] プレイヤー${playerId}: ${yellCard.name} → ${position}`);
    
    // UI更新を一時停止（unknown表示を防ぐ）
    this.isUpdatingYellCard = true;
    
    const player = this.players[playerId];
    const holomen = player[position];
    
    if (!holomen) {
      window.errorLog(`❌ [エール配置エラー] プレイヤー${playerId}の${position}にホロメンが存在しません`);
      this.isUpdatingYellCard = false;
      return;
    }
    
    // yellCardsプロパティを初期化（存在しない場合）
    if (!holomen.yellCards) {
      holomen.yellCards = [];
    }
    
    // エールカードを添付
    holomen.yellCards.push(yellCard);
    
    console.log(`✅ [エール配置完了] ${holomen.name}に${yellCard.name}を添付 (エール数: ${holomen.yellCards.length}枚)`);
    
    // State Managerに更新を送信
    this.updatePlayerCards(playerId, position, [holomen]);
    
    // データ同期とUI更新
    setTimeout(() => {
      if (typeof window !== 'undefined' && this.stateManager && typeof this.stateManager.getState === 'function') {
        try {
          const state = this.stateManager.getState();
          const statePlayer = state.players ? state.players[playerId] : null;
          if (statePlayer && statePlayer.cards && statePlayer.cards[position]) {
            // プレイヤーデータをState Managerと同期
            if (statePlayer.cards[position][0] && statePlayer.cards[position][0].yellCards) {
              this.players[playerId][position] = statePlayer.cards[position][0];
              console.log(`🔄 [データ同期完了] ${position}をState Managerから同期`);
              
              // 同期完了後にUI更新を実行
              setTimeout(() => {
                this.isUpdatingYellCard = false;
                this.updateUI();
                this.updateCardAreas();
                // エール表示更新完了
              }, 50);
            }
          }
        } catch (error) {
          window.errorLog(`❌ [同期エラー] State Manager同期に失敗:`, error.message);
          this.isUpdatingYellCard = false;
        }
      } else {
        // State Manager利用不可の場合の代替処理
        setTimeout(() => {
          this.isUpdatingYellCard = false;
          this.updateUI();
          this.updateCardAreas();
          // 直接UI更新完了
        }, 100);
      }
    }, 100);
    
    // 注意: UI更新はデータ同期完了後に自動実行されます
  }

  // エール対象選択UI表示
  showYellTargetSelection(playerId, yellCard, availableTargets) {
    // 対象選択のモーダルを表示
    const modal = document.createElement('div');
    modal.className = 'yell-target-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>🎵 エールカード配置</h3>
        <p><strong>${yellCard.name}</strong>をどのホロメンに配置しますか？</p>
        <div class="target-selection">
          ${availableTargets.map((target, index) => `
            <button class="target-button" data-index="${index}">
              ${target.card.name}
              <small>(${this.getPositionName(target.position)})</small>
            </button>
          `).join('')}
        </div>
      </div>
    `;
    
    // スタイルを追加
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;
    
    const modalContent = modal.querySelector('.modal-content');
    modalContent.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 15px;
      text-align: center;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      min-width: 400px;
    `;
    
    const targetSelection = modal.querySelector('.target-selection');
    targetSelection.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 20px;
    `;
    
    // ボタンにイベントリスナーを追加
    modal.querySelectorAll('.target-button').forEach((button, index) => {
      button.style.cssText = `
        padding: 12px 24px;
        font-size: 16px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        background: #4CAF50;
        color: white;
        transition: background 0.3s;
      `;
      
      button.addEventListener('click', () => {
        console.log(`エール配置ボタンクリック: インデックス${index}`);
        const target = availableTargets[index];
        console.log(`選択されたターゲット: ${target.position} - ${target.card.name}`);
        console.log(`配置するエールカード: ${yellCard.name}`);
        
        try {
          console.log('attachYellCard呼び出し直前');
          console.log('this.attachYellCard:', this.attachYellCard);
          console.log('playerId:', playerId, 'target.position:', target.position, 'yellCard:', yellCard);
          
          // 選択されたホロメンのみにエールを配置
          this.attachYellCard(playerId, target.position, yellCard);
          
          console.log('attachYellCard呼び出し後');
        } catch (error) {
          window.errorLog(`エール配置でエラーが発生:`, error);
          window.errorLog(`エラーの詳細:`, error.stack);
        }
        
        // モーダルを削除
        document.body.removeChild(modal);
        
        // UI更新
        this.updateUI();
        
        // エール配置完了 - プレイヤーの場合は自動でメインステップに進む
        console.log('エールカード配置完了');
        if (this.gameState.currentPhase === 2 && playerId === 1) {
          console.log('エール配置完了 - 自動でメインステップに進みます');
          setTimeout(() => {
            this.nextPhase();
          }, 1500);
        }
      });
      
      button.addEventListener('mouseenter', () => {
        button.style.background = '#45a049';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.background = '#4CAF50';
      });
    });
    
    document.body.appendChild(modal);
  }

  // ポジション名を取得
  getPositionName(position) {
    const positionNames = {
      'collab': 'センター①',
      'center': 'センター②',
      'back1': 'バック①',
      'back2': 'バック②',
      'back3': 'バック③',
      'back4': 'バック④',
      'back5': 'バック⑤'
    };
    return positionNames[position] || position;
  }

  // メインステップの処理
  executeMainStep(playerId) {
    return this.phaseController.executeMainStep(playerId);
  }

  // パフォーマンスステップの処理
  executePerformanceStep(playerId) {
    return this.phaseController.executePerformanceStep(playerId);
  }

  // エールカードをエリア内に兄弟要素として追加
  addYellCardsToArea(area, holomenCard, areaId, cardIndex) {
    // エールカード表示機能をCardDisplayManagerに委譲
    this.cardDisplayManager.addYellCardsToArea(area, holomenCard, areaId, cardIndex);
  }

  // エールカードをカード表示に追加（旧関数・互換性のため残す）
  addYellCardsToDisplay(cardElement, holomenCard, areaId) {
    // エールカード表示機能をCardDisplayManagerに委譲
    this.cardDisplayManager.addYellCardsToDisplay(cardElement, holomenCard, areaId);
  }

  /**
   * フェーズインデックスからフェーズ名を取得
   * @param {number} phaseIndex - フェーズインデックス
   * @returns {string} フェーズ名
   */
  // getPhaseNameByIndex は PhaseController に移譲

  /**
   * バトンタッチの処理
   * @param {Object} sourceCard - センターのカード
   * @param {Object} targetCard - バックのカード
   * @param {string} targetPosition - バックのポジション
   * @returns {boolean} 実行成功フラグ
   */
  handleBatonTouch(sourceCard, targetCard, targetPosition) {
    if (!this.stateManager) {
      window.errorLog('State Managerが見つかりません');
      return false;
    }

    try {
      // バトンタッチの詳細チェック
      const batonCheck = this.stateManager.checkBatonTouch(
        sourceCard, targetCard, targetPosition, this.stateManager.getStateByPath('players.1')
      );

      if (!batonCheck.valid) {
        alert(`⚠️ バトンタッチ不可\n\n${batonCheck.reason}`);
        return false;
      }

      // エールカード選択UI表示
      this.showBatonTouchYellSelection(sourceCard, targetCard, targetPosition, batonCheck);
      return true;
    } catch (error) {
      window.errorLog('バトンタッチ処理エラー:', error);
      return false;
    }
  }

  /**
   * バトンタッチ用のエールカード選択UIを表示
   * @param {Object} sourceCard - センターのカード
   * @param {Object} targetCard - バックのカード
   * @param {string} targetPosition - バックのポジション
   * @param {Object} batonCheck - バトンタッチチェック結果
   */
  showBatonTouchYellSelection(sourceCard, targetCard, targetPosition, batonCheck) {
    // シンプルな確認ダイアログ（後でより高度なUIに置き換え可能）
    const requiredCosts = batonCheck.requiredCosts;
    const totalRequired = Object.values(requiredCosts).reduce((sum, count) => sum + count, 0);
    
    const costText = Object.entries(requiredCosts)
      .filter(([color, count]) => count > 0)
      .map(([color, count]) => `${color}:${count}`)
      .join(', ');

    const message = `バトンタッチを実行しますか？\n\n` +
                   `${sourceCard.name} ⇔ ${targetCard.name}\n\n` +
                   `必要コスト: ${costText || 'なし'}\n` +
                   `アーカイブ予定: ${totalRequired}枚のエール`;

    if (confirm(message)) {
      // 使用可能なエールカードから必要分を自動選択
      const selectedCards = this.autoSelectYellCards(batonCheck.availableYellCards, requiredCosts);
      
      if (selectedCards.length >= totalRequired) {
        // バトンタッチ実行
        const success = this.stateManager.executeBatonTouch(
          sourceCard, targetCard, targetPosition, 1, selectedCards
        );
        
        if (success) {
          // UI更新
          this.updateUI();
          this.infoPanelManager?.addLogEntry('action', 
            `バトンタッチ: ${sourceCard.name} ⇔ ${targetCard.name} (エール${selectedCards.length}枚使用)`
          );
        }
      } else {
        alert('エールカードが不足しています');
      }
    }
  }

  /**
   * エールカードの自動選択
   * @param {Array} availableCards - 使用可能なカード
   * @param {Object} requiredCosts - 必要コスト
   * @returns {Array} 選択されたカード
   */
  autoSelectYellCards(availableCards, requiredCosts) {
    const selected = [];
    const remaining = { ...requiredCosts };
    
    // 特定色のコストを優先的に選択
    for (const [color, required] of Object.entries(remaining)) {
      if (required > 0 && color !== 'colorless') {
        const matchingCards = availableCards.filter(cardInfo => 
          cardInfo.color === color && !selected.includes(cardInfo)
        );
        
        for (let i = 0; i < Math.min(required, matchingCards.length); i++) {
          selected.push(matchingCards[i]);
          remaining[color]--;
        }
      }
    }
    
    // 無色コストを任意の色で補填
    const totalColorlessNeeded = Object.values(remaining).reduce((sum, count) => sum + count, 0);
    const unselectedCards = availableCards.filter(cardInfo => !selected.includes(cardInfo));
    
    for (let i = 0; i < Math.min(totalColorlessNeeded, unselectedCards.length); i++) {
      selected.push(unselectedCards[i]);
    }
    
    return selected;
  }
}

// グローバルインスタンス
let battleEngine = null;

// ページ読み込み完了時にバトルエンジンを初期化
document.addEventListener('DOMContentLoaded', () => {
  battleEngine = new HololiveBattleEngine();
  window.battleEngine = battleEngine; // グローバルアクセス用
});
