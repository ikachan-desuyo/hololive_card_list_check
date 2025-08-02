/**
 * ホロライブTCG バトルエンジン
 * ゲームの状態管理とルール処理を行う
 */

class HololiveBattleEngine {
  constructor() {
    this.gameState = {
      currentPlayer: 1, // 1: プレイヤー, 2: 対戦相手
      currentPhase: -1, // -1: 準備ステップ, 0-5: リセット〜エンド
      turnCount: 1,
      gameStarted: false,
      gameEnded: false,
      winner: null,
      firstPlayer: null, // 先行プレイヤー (1 or 2)
      turnOrderDecided: false,
      mulliganPhase: false, // マリガン中かどうか
      mulliganCount: { 1: 0, 2: 0 }, // 各プレイヤーのマリガン回数
      mulliganCompleted: { 1: false, 2: false } // 各プレイヤーのマリガン完了状態
    };

    this.players = {
      1: this.createPlayerState(),
      2: this.createPlayerState()
    };

    this.cardDatabase = null;
    this.stageData = null;
    this.modalUI = new ModalUI(); // モーダルUI追加
    
    // フェーズ管理をPhaseControllerに移譲
    // this.phaseInProgress と this.phaseNames は PhaseController で管理

    // フェーズ管理コントローラーの初期化（早期初期化）
    this.phaseController = new PhaseController(this);

    this.initializeGame();
    
    // CPUロジックの初期化
    this.cpuLogic = new HololiveCPULogic(this);
    
    // 手札管理の初期化
    this.handManager = new HandManager(this);
    
    // カード表示管理の初期化
    this.cardDisplayManager = new CardDisplayManager(this);
  }

  createPlayerState() {
    return {
      life: [],
      center1: null,
      center2: null,
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
      canPlaySupport: true,
      usedLimitedThisTurn: [],
      restHolomem: [], // お休み状態のホロメン
      
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
      
      console.log('バトルエンジン初期化完了');
    } catch (error) {
      console.error('バトルエンジン初期化エラー:', error);
    }
  }

  createTestDeckIfNeeded() {
    const savedDecks = localStorage.getItem("deckData");
    if (!savedDecks || Object.keys(JSON.parse(savedDecks)).length === 0) {
      console.log('テスト用デッキを作成します');
      this.createAndSaveTestDeck();
    }
  }

  createAndSaveTestDeck() {
    if (!this.cardDatabase) return;

    const allCards = Object.values(this.cardDatabase);
    
    // テスト用デッキの構成
    const testDeck = [];
    
    // 推しホロメンを1枚
    const oshiCards = allCards.filter(card => card.card_type === '推しホロメン');
    if (oshiCards.length > 0) {
      testDeck.push(oshiCards[0].id);
    }
    
    // ホロメンカードを30枚
    const holomenCards = allCards.filter(card => 
      card.card_type === 'ホロメン' && card.bloom_level === '1st'
    ).slice(0, 30);
    holomenCards.forEach(card => testDeck.push(card.id));
    
    // サポートカードを20枚
    const supportCards = allCards.filter(card => 
      card.card_type.includes('サポート')
    ).slice(0, 20);
    supportCards.forEach(card => testDeck.push(card.id));
    
    // エールカードを20枚
    const yellCards = allCards.filter(card => 
      card.card_type === 'エール'
    ).slice(0, 20);
    yellCards.forEach(card => testDeck.push(card.id));
    
    // デッキを保存
    const decks = { 'テストデッキ': testDeck };
    localStorage.setItem("deckData", JSON.stringify(decks));
    
    console.log('テスト用デッキを作成・保存しました:', testDeck.length, '枚');
  }

  async loadCardData() {
    try {
      const response = await fetch('./json_file/card_data.json');
      this.cardDatabase = await response.json();
      console.log('カードデータ読み込み完了');
    } catch (error) {
      console.error('カードデータ読み込みエラー:', error);
    }
  }

  async loadStageData() {
    try {
      const response = await fetch('./json_file/stage_data.json');
      this.stageData = await response.json();
      console.log('ステージデータ読み込み完了');
    } catch (error) {
      console.error('ステージデータ読み込みエラー:', error);
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
      console.warn('コントロールパネルの要素が見つかりません:', missingElements);
      console.log('レガシーコントロールパネルを作成します...');
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
    console.log('レガシーコントロールパネルの作成を開始...');
    
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
    console.log('コントロールパネルをDOMに追加完了');
    console.log('作成されたコントロールパネル:', controlPanel);
    console.log('body内の.control-panel要素:', document.querySelectorAll('.control-panel').length);

    // イベントリスナーの設定（レガシー版）
    document.getElementById('select-player-deck').addEventListener('click', () => this.showDeckSelection(1));
    document.getElementById('select-opponent-deck').addEventListener('click', () => this.showDeckSelection(2));
    document.getElementById('start-game').addEventListener('click', () => this.startGame());
    document.getElementById('next-phase').addEventListener('click', () => this.nextPhase());
    document.getElementById('end-turn').addEventListener('click', () => this.endTurn());
    document.getElementById('reset-game').addEventListener('click', () => this.resetGame());
    
    console.log('イベントリスナーの設定完了');
    
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
    console.log('setupCardAreaListeners 開始');
    
    const cardAreas = document.querySelectorAll('.card-area');
    console.log('card-area数:', cardAreas.length);
    
    cardAreas.forEach(area => {
      area.addEventListener('click', (e) => this.handleCardAreaClick(e));
      area.addEventListener('dragover', (e) => this.handleDragOver(e));
      area.addEventListener('dragenter', (e) => this.handleDragEnter(e));
      area.addEventListener('dragleave', (e) => this.handleDragLeave(e));
      area.addEventListener('drop', (e) => this.handleDrop(e));
    });
    
    // バックスロットにもリスナーを追加
    const backSlots = document.querySelectorAll('.back-slot');
    console.log('back-slot数:', backSlots.length);
    
    backSlots.forEach((slot, index) => {
      console.log(`back-slot[${index}]:`, slot);
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
    const phaseName = this.phaseController 
      ? this.phaseController.phaseNames[this.gameState.currentPhase + 1] 
      : '準備中'; // フォールバック
    
    turnInfo.textContent = `${playerName}のターン - ${phaseName} (ターン${this.gameState.turnCount})`;
    
    // 情報パネルも更新
    if (window.updateGameStep) {
      const currentPlayer = this.gameState.currentPlayer === 1 ? 'player' : 'opponent';
      window.updateGameStep(phaseName, `${playerName}のターン`, this.gameState.turnCount, currentPlayer);
    }
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
    console.log('ゲーム開始準備チェック');
    
    // プレイヤーデッキチェック
    if (this.players[1].deck.length === 0 && this.players[1].yellDeck.length === 0) {
      alert('プレイヤーデッキが設定されていません。\n\n📚「プレイヤーデッキ選択」ボタンからデッキを選択してください。\n\nまたはテストデッキで始めることもできます。');
      
      if (confirm('テストデッキでゲームを開始しますか？\n\n⚠️ 注意: テストデッキは学習目的のみで、バランスが調整されていません。')) {
        // テストデッキで続行
        console.log('テストデッキでゲーム開始');
      } else {
        // プレイヤーデッキ選択画面を開く
        this.showDeckSelection(1);
        return;
      }
    }
    
    // 相手デッキチェック
    if (this.players[2].deck.length === 0 && this.players[2].yellDeck.length === 0) {
      alert('相手デッキが設定されていません。\n\n🤖「相手デッキ選択」ボタンからデッキを選択してください。\n\nまたはテストデッキで始めることもできます。');
      
      if (confirm('相手もテストデッキでゲームを開始しますか？')) {
        // 相手もテストデッキで続行
        console.log('相手もテストデッキでゲーム開始');
      } else {
        // 相手デッキ選択画面を開く
        this.showDeckSelection(2);
        return;
      }
    }
    
    // デッキ構成の妥当性チェック
    const validation = this.validateGameSetup();
    if (!validation.isValid) {
      const errorMsg = '⚠️ ゲーム開始前の準備に問題があります:\n\n' + validation.errors.join('\n');
      if (!confirm(errorMsg + '\n\nそれでもゲームを開始しますか？')) {
        return;
      }
    }
    
    // ゲーム状態の初期化
    this.gameState.gameStarted = true;
    this.gameState.currentPlayer = 1;
    this.gameState.currentPhase = 0;
    this.gameState.turnCount = 1;
    
    // ゲーム開始ログ
    if (window.logGameEvent) {
      window.logGameEvent('system', 'ゲームが開始されました！');
      window.logGameEvent('system', `先行: ${this.gameState.firstPlayer === 1 ? 'プレイヤー' : '対戦相手'}`);
    }
    
    // セットアップ実行
    this.executeGameSetup();
    
    // UIの更新
    this.updateTurnInfo();
    this.updateUI();
    
    // フェーズハイライトを初期化
    this.updatePhaseHighlight();
    
    // コントロールボタンの状態更新
    document.getElementById('start-game').disabled = true;
    document.getElementById('next-phase').disabled = false;
    document.getElementById('end-turn').disabled = false;
  }

  validateGameSetup() {
    const errors = [];
    const player1 = this.players[1];
    const player2 = this.players[2];
    
    // プレイヤー1のデッキチェック
    if (player1.deck.length === 0 && player1.yellDeck.length === 0) {
      // テストデッキが作成される予定なのでスキップ
    } else {
      // メインデッキチェック（理想は50枚）
      const mainDeckSize = player1.deck.length;
      if (mainDeckSize < 30) {
        errors.push(`メインデッキが少なすぎます（${mainDeckSize}枚、推奨: 50枚）`);
      } else if (mainDeckSize > 60) {
        errors.push(`メインデッキが多すぎます（${mainDeckSize}枚、推奨: 50枚）`);
      }
      
      // エールデッキチェック（理想は20枚）
      const yellDeckSize = player1.yellDeck.length;
      if (yellDeckSize < 10) {
        errors.push(`エールデッキが少なすぎます（${yellDeckSize}枚、推奨: 20枚）`);
      } else if (yellDeckSize > 30) {
        errors.push(`エールデッキが多すぎます（${yellDeckSize}枚、推奨: 20枚）`);
      }
      
      // 推しホロメンチェック
      if (!player1.oshi) {
        errors.push('推しホロメンが設定されていません');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  executeGameSetup() {
    console.log('ゲームセットアップ実行');
    
    // 0. 先行・後攻の決定
    this.decideTurnOrder();
    
    // テストデッキの作成（必要に応じて）
    this.createTestDecks();
    
    // 1. デッキシャッフル
    this.shuffleDeck(1);
    this.shuffleDeck(2);
    console.log('デッキをシャッフルしました');
    
    // 2. 推しホロメンを配置
    this.placeOshiCards();
    console.log('推しホロメンを配置しました');
    
    // 3. ライフを設定
    this.setupLifeCards();
    console.log('ライフカードを設定しました');
    
    // 4. 初期手札を配る
    this.dealInitialHands();
    console.log('初期手札（7枚）を配りました');
    
    // 5. ゲーム状況を表示
    this.logGameStatus();
    
    // 注意: マリガン処理は先行・後攻決定後に setFirstPlayer() で開始される
  }

  setupLifeCards() {
    // 両プレイヤーのライフを設定
    for (let playerId = 1; playerId <= 2; playerId++) {
      const player = this.players[playerId];
      const lifeCount = player.oshi?.life || 6;
      
      console.log(`プレイヤー${playerId} ライフ設定前: エールデッキ${player.yellDeck.length}枚`);
      
      // 既存のライフをクリア
      player.life = [];
      
      // エールデッキからライフ分のカードを移動
      for (let i = 0; i < lifeCount && player.yellDeck.length > 0; i++) {
        const lifeCard = player.yellDeck.pop();
        player.life.push(lifeCard);
      }
      
      console.log(`プレイヤー${playerId} ライフ設定後: ライフ${player.life.length}枚, エールデッキ${player.yellDeck.length}枚`);
    }
  }

  logGameStatus() {
    const player1 = this.players[1];
    const player2 = this.players[2];
    
    console.log('=== ゲーム開始時の状況 ===');
    console.log('プレイヤー1:');
    console.log(`  メインデッキ: ${player1.deck.length}枚`);
    console.log(`  エールデッキ: ${player1.yellDeck.length}枚`);
    console.log(`  ライフ: ${player1.life.length}枚`);
    console.log(`  手札: ${player1.hand.length}枚`);
    
    console.log('プレイヤー2 (CPU):');
    console.log(`  メインデッキ: ${player2.deck.length}枚`);
    console.log(`  エールデッキ: ${player2.yellDeck.length}枚`);
    console.log(`  ライフ: ${player2.life.length}枚`);
    console.log(`  手札: ${player2.hand.length}枚`);
    
    // ゲーム開始のメッセージを表示
    const message = `🎮 ホロライブTCG バトル開始！\n\n` +
      `プレイヤー情報:\n` +
      `デッキ: ${player1.deck.length}枚, エール: ${player1.yellDeck.length}枚\n` +
      `手札: ${player1.hand.length}枚\n\n` +
      `対戦相手情報:\n` +
      `デッキ: ${player2.deck.length}枚, エール: ${player2.yellDeck.length}枚\n` +
      `手札: ${player2.hand.length}枚`;
      
    alert(message);
  }

  createTestDecks() {
    // プレイヤー1のデッキが空の場合のみテストデッキを作成
    if (this.players[1].deck.length === 0) {
      console.log('プレイヤー1のデッキが設定されていません。テストデッキを作成します。');
      const testCards1 = this.getTestCards();
      
      this.players[1].deck = [...testCards1.holomen, ...testCards1.support];
      this.players[1].yellDeck = [...testCards1.yell];
      this.players[1].oshi = testCards1.oshi;
      
      console.log(`プレイヤー1テストデッキ作成: メイン${this.players[1].deck.length}枚, エール${this.players[1].yellDeck.length}枚`);
    }
    
    // プレイヤー2のデッキが空の場合のみテストデッキを作成
    if (this.players[2].deck.length === 0) {
      console.log('プレイヤー2のデッキが設定されていません。テストデッキを作成します。');
      const testCards2 = this.getTestCards();
      this.players[2].deck = [...testCards2.holomen, ...testCards2.support];
      this.players[2].yellDeck = [...testCards2.yell];
      this.players[2].oshi = testCards2.oshi;
      
      console.log(`プレイヤー2テストデッキ作成: メイン${this.players[2].deck.length}枚, エール${this.players[2].yellDeck.length}枚`);
    }
    
    // デッキシャッフルと推しホロメン配置は executeGameSetup() で行うため削除
  }

  getTestCards() {
    // card_data.jsonから適当なカードを選んでテストデッキを作成
    const allCards = Object.values(this.cardDatabase);
    
    const holomen = allCards.filter(card => 
      card.card_type === 'ホロメン' && card.bloom_level === '1st'
    ).slice(0, 20).map(card => ({...card})); // 各カードをコピー
    
    const support = allCards.filter(card => 
      card.card_type.includes('サポート')
    ).slice(0, 20).map(card => ({...card})); // 各カードをコピー
    
    const yell = allCards.filter(card => 
      card.card_type === 'エール'
    ).slice(0, 20).map(card => ({...card})); // 各カードをコピー
    
    const oshi = allCards.find(card => 
      card.card_type === '推しホロメン'
    );
    
    return { holomen, support, yell, oshi: {...oshi} };
  }

  placeOshiCards() {
    // 推しホロメンを推しポジションに配置
    this.players[1].oshi = this.players[1].oshi;
    this.players[2].oshi = this.players[2].oshi;
    
    console.log('推しホロメンを配置しました（ライフ設定は別処理で実行）');
  }

  dealInitialHands() {
    // 初期手札を7枚配る
    for (let i = 0; i < 7; i++) {
      this.drawCard(1);
      this.drawCard(2);
    }
  }

  shuffleDeck(playerId) {
    const deck = this.players[playerId].deck;
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    console.log(`プレイヤー${playerId}のデッキをシャッフルしました`);
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
    console.log(`=== executeYellStep ===`);
    console.log(`プレイヤー${playerId}のエールステップを実行`);
    console.log(`現在のcurrentPlayer: ${this.gameState.currentPlayer}`);
    console.log(`ターン数: ${this.gameState.turnCount}`);
    console.log(`======================`);
    
    // 統合ログを記録
    if (window.infoPanelManager) {
      const playerName = playerId === 1 ? 'プレイヤー' : '対戦相手';
      window.infoPanelManager.logStepProgress(this.gameState.turnCount, 'エールステップ', playerName, 'エールを配置');
    }
    
    const player = this.players[playerId];
    
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
    if (player.center1) availableTargets.push({ position: 'center1', card: player.center1 });
    if (player.center2) availableTargets.push({ position: 'center2', card: player.center2 });
    
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
        this.showYellTargetSelection(playerId, yellCard, availableTargets);
        // プレイヤーの場合は選択UIで処理するため、ここでは自動進行しない
      } else {
        // CPUの場合は自動選択
        console.log('CPU用自動エール配置を実行します');
        const target = availableTargets[0];
        console.log(`CPU選択ターゲット: ${target.position} - ${target.card.name}`);
        this.attachYellCard(playerId, target.position, yellCard);
        
        // UI更新
        this.updateUI();
        
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
      this.updateUI();
      
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

  executeEndStep(playerId) {
    console.log(`プレイヤー${playerId}のエンドステップを実行`);
    
    // 統合ログを記録
    if (window.infoPanelManager) {
      const playerName = playerId === 1 ? 'プレイヤー' : '対戦相手';
      window.infoPanelManager.logStepProgress(this.gameState.turnCount, 'エンドステップ', playerName, 'ターン終了処理');
    }
    
    // ターン終了時の処理
    this.players[playerId].canPlaySupport = true;
    this.players[playerId].usedLimitedThisTurn = [];
    
    // エンドステップは自動で完了し、相手のターンに移行（プレイヤー・CPU共通）
    console.log('エンドステップ完了 - 自動で相手のリセットステップに移行します');
    setTimeout(() => {
      this.endTurn();
    }, 1000);
  }

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
    
    this.updateTurnInfo();
    this.updateUI();
    
    // フェーズハイライトを更新（重要！）
    this.updatePhaseHighlight();
    
    // 勝利条件の確認
    this.checkVictoryConditions();
    
    console.log(`ターン終了 - プレイヤー${this.gameState.currentPlayer}のターン開始`);
    console.log(`=== ターン終了処理完了 ===`);
    
    // 新しいターンのリセットステップ開始
    // 両プレイヤーとも自動でリセットステップを開始
    setTimeout(() => {
      console.log(`プレイヤー${this.gameState.currentPlayer}のリセットステップ開始`);
      this.executeResetStep(this.gameState.currentPlayer);
    }, 1000);
  }

  checkVictoryConditions() {
    // 勝利条件の確認
    for (let playerId = 1; playerId <= 2; playerId++) {
      const player = this.players[playerId];
      const opponent = this.players[playerId === 1 ? 2 : 1];
      
      // 条件1: 相手のライフが0
      if (opponent.life.length === 0) {
        this.endGame(playerId);
        return;
      }
      
      // 条件2: 相手のステージに推しホロメン以外がいない
      const hasStageHolomem = opponent.center1 || opponent.center2 || 
                             opponent.back1 || opponent.back2 || opponent.back3;
      if (!hasStageHolomem) {
        this.endGame(playerId);
        return;
      }
      
      // 条件3: 相手のデッキが0枚で手札ステップでカードを引けない
      if (opponent.deck.length === 0 && this.gameState.currentPlayer !== playerId && 
          this.gameState.currentPhase === 1) {
        this.endGame(playerId);
        return;
      }
    }
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
    // ゲーム状態のリセット
    this.gameState = {
      currentPlayer: 1,
      currentPhase: 0,
      turnCount: 1,
      gameStarted: false,
      gameEnded: false,
      winner: null,
      mulliganPhase: false,
      mulliganCount: { 1: 0, 2: 0 },
      mulliganCompleted: { 1: false, 2: false },
      debutPlacementCompleted: { 1: false, 2: false }
    };
    
    // プレイヤー状態のリセット
    this.players[1] = this.createPlayerState();
    this.players[2] = this.createPlayerState();
    
    // UIの更新
    this.updateTurnInfo();
    this.updateUI();
    this.updateGameStatus();
    
    // コントロールボタンの状態更新
    document.getElementById('start-game').disabled = false;
    document.getElementById('start-game').style.background = '#2196f3';
    document.getElementById('next-phase').disabled = true;
    document.getElementById('end-turn').disabled = true;
    
    console.log('ゲームをリセットしました');
    alert('ゲームがリセットされました。\n新しいバトルを開始できます。');
  }

  handleCardAreaClick(event) {
    const area = event.currentTarget;
    const areaId = area.className.split(' ')[0];
    
    console.log(`${areaId}がクリックされました`);
    
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
    console.log('カードがドロップされました');
  }

  updateUI() {
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
      case 'front1': cards = player.center1; break;
      case 'front2': cards = player.center2; break;
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
    // フェーズハイライト機能をCardDisplayManagerに委譲
    this.cardDisplayManager.updatePhaseHighlight();
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

  playCard(card, handIndex) {
    const player = this.players[this.gameState.currentPlayer];
    
    // カードプレイのログ
    if (window.logCardEvent) {
      const playerType = this.gameState.currentPlayer === 1 ? 'player' : 'opponent';
      const cardName = card.name || '不明なカード';
      window.logCardEvent(playerType, 'プレイ', cardName);
    }
    
    if (card.card_type === 'ホロメン') {
      this.playHolomenCard(card, handIndex);
    } else if (card.card_type.includes('サポート')) {
      this.playSupportCard(card, handIndex);
    }
  }

  // カードオブジェクトのディープコピーを作成
  createCardCopy(card) {
    if (!card) return null;
    
    // カードオブジェクトのディープコピーを作成
    const cardCopy = JSON.parse(JSON.stringify(card));
    
    // エールカードリストを独立したオブジェクトとして初期化
    cardCopy.yellCards = [];
    
    // 回転状態などの状態情報を保持
    if (card.isResting) {
      cardCopy.isResting = card.isResting;
    }
    
    console.log(`カードコピー作成: ${cardCopy.name} (元のエール数: ${card.yellCards ? card.yellCards.length : 0})`);
    
    return cardCopy;
  }

  playHolomenCard(card, handIndex) {
    const player = this.players[this.gameState.currentPlayer];
    
    // カードのディープコピーを作成
    const cardCopy = this.createCardCopy(card);
    
    // 空いているステージポジションを探す
    if (!player.center1) {
      player.center1 = cardCopy;
      player.hand.splice(handIndex, 1);
      console.log(`${cardCopy.name}をセンター①に配置しました`);
    } else if (!player.center2) {
      player.center2 = cardCopy;
      player.hand.splice(handIndex, 1);
      console.log(`${cardCopy.name}をセンター②に配置しました`);
    } else if (!player.back1) {
      player.back1 = cardCopy;
      player.hand.splice(handIndex, 1);
      console.log(`${cardCopy.name}をバック①に配置しました`);
    } else if (!player.back2) {
      player.back2 = cardCopy;
      player.hand.splice(handIndex, 1);
      console.log(`${cardCopy.name}をバック②に配置しました`);
    } else if (!player.back3) {
      player.back3 = cardCopy;
      player.hand.splice(handIndex, 1);
      console.log(`${cardCopy.name}をバック③に配置しました`);
    } else {
      console.log('ステージが満員です');
      return;
    }
    
    this.updateUI();
  }

  playSupportCard(card, handIndex) {
    const player = this.players[this.gameState.currentPlayer];
    
    // サポートカードの使用制限チェック
    if (!player.canPlaySupport) {
      console.log('このターンにはサポートカードを使用できません');
      return;
    }
    
    // LIMITED制限チェック
    if (card.card_type.includes('LIMITED')) {
      if (player.usedLimitedThisTurn.length > 0) {
        console.log('このターンには既にLIMITEDカードを使用しています');
        return;
      }
      player.usedLimitedThisTurn.push(card.id);
    }
    
    // サポート効果の実行（簡易版）
    console.log(`${card.name}を使用しました`);
    
    // 手札から除去してアーカイブへ
    player.hand.splice(handIndex, 1);
    player.archive.push(card);
    
    this.updateUI();
  }

  // 先行・後攻の決定
  decideTurnOrder() {
    if (this.gameState.turnOrderDecided) {
      return;
    }

    // ランダムで先行・後攻を決定
    const randomFirstPlayer = Math.random() < 0.5 ? 1 : 2;
    
    // ポップアップで選択
    this.showTurnOrderPopup(randomFirstPlayer);
  }

  showTurnOrderPopup(suggestedPlayer) {
    // モーダルUIで選択
    this.modalUI.showTurnOrderModal(0.5, suggestedPlayer, (playerId, isManual) => {
      this.setFirstPlayer(playerId, isManual);
    });
  }

  setFirstPlayer(playerId, isManual) {
    this.gameState.firstPlayer = playerId;
    this.gameState.currentPlayer = playerId;
    this.gameState.turnOrderDecided = true;
    
    const methodText = isManual ? '手動選択' : 'ランダム';
    const playerText = playerId === 1 ? 'プレイヤー' : '相手';
    
    console.log(`${methodText}により${playerText}が先行です`);
    
    // メッセージ表示
    alert(`${methodText}により${playerId === 1 ? 'あなた' : '相手'}が先行です`);
    
    // 先行・後攻決定後にマリガンフェーズを開始
    setTimeout(() => {
      this.startMulliganPhase();
    }, 500);
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
    // 先行・後攻が決定されているか確認
    if (!this.gameState.firstPlayer) {
      console.error('先行・後攻が決定されていません');
      return;
    }
    
    this.gameState.mulliganPhase = true;
    console.log('マリガンフェーズ開始');
    
    // 先行プレイヤーから順番にマリガンチェック
    this.checkMulligan(this.gameState.firstPlayer);
  }

  checkMulligan(playerId) {
    // プレイヤーの存在確認
    if (!playerId || !this.players[playerId]) {
      console.error(`無効なプレイヤーID: ${playerId}`);
      return;
    }
    
    const player = this.players[playerId];
    
    // 手札の存在確認
    if (!player.hand || !Array.isArray(player.hand)) {
      console.error(`プレイヤー${playerId}の手札が無効です:`, player.hand);
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
    console.log('Debut配置フェーズ開始');
    
    alert(
      'マリガン完了！\n\n' +
      'Debutホロメンの配置を行います\n' +
      '・センター2に1枚必須\n' +
      '・バックに好きなだけ配置可能'
    );
    
    // 先行プレイヤーから順番にDebut配置
    this.showDebutPlacementUI(this.gameState.firstPlayer);
  }

  showDebutPlacementUI(playerId) {
    const player = this.players[playerId];
    const debutCards = player.hand.filter(card => 
      card.card_type && card.card_type.includes('ホロメン') && card.bloom_level === 'Debut'
    );
    
    if (debutCards.length === 0) {
      console.error(`プレイヤー${playerId}にDebutホロメンがありません`);
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
      '• センター2に1枚必須\n' +
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
        <div>センター2: <span id="center2-status">未配置</span></div>
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
    const center2Status = document.getElementById('center2-status');
    const backCount = document.getElementById('back-count');
    const completeButton = document.getElementById('complete-debut-button');
    
    // 実際のゲーム状態を確認
    const hasValidCenter2 = player.center2 && 
                           this.isHolomenCard(player.center2) && 
                           player.center2.bloom_level === 'Debut';
    
    const backPositions = ['back1', 'back2', 'back3', 'back4', 'back5'];
    const placedBackCards = backPositions.filter(pos => player[pos]).length;
    
    if (center2Status) {
      center2Status.textContent = hasValidCenter2 ? '配置済み' : '未配置';
      center2Status.style.color = hasValidCenter2 ? '#4CAF50' : '#f44336';
    }
    
    if (backCount) {
      backCount.textContent = placedBackCards;
    }
    
    if (completeButton) {
      if (hasValidCenter2) {
        completeButton.disabled = false;
        completeButton.style.background = '#4CAF50';
        completeButton.style.cursor = 'pointer';
        completeButton.textContent = '配置完了';
      } else {
        completeButton.disabled = true;
        completeButton.style.background = '#999';
        completeButton.style.cursor = 'not-allowed';
        completeButton.textContent = '配置完了（センター２への配置が必要）';
      }
    }
  }

  executeAutoDebutPlacement() {
    const state = this.debutPlacementState;
    if (!state) return;
    
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
    if (!player.center2) {
      alert('エラー: センター２にDebutホロメンの配置が必要です。\n必ずセンター２にDebutカードを配置してください。');
      return;
    }
    
    // センター２のカードがDebutかチェック
    if (player.center2.bloom_level !== 'Debut') {
      alert('エラー: センター２にはDebutレベルのホロメンを配置してください。');
      return;
    }
    
    // ホロメンカードかチェック
    if (!this.isHolomenCard(player.center2)) {
      alert('エラー: センター２にはホロメンカードを配置してください。');
      return;
    }
    
    console.log('Debut配置バリデーション完了');
    console.log('センター２:', player.center2.name);
    
    // バックエリアの配置数をカウント
    const backPositions = ['back1', 'back2', 'back3', 'back4', 'back5'];
    const placedBackCards = backPositions.filter(pos => player[pos]).length;
    
    // コントロールを削除
    const controls = document.getElementById('debut-placement-controls');
    if (controls) {
      controls.remove();
    }
    
    const totalPlaced = 1 + placedBackCards; // センター２ + バック
    alert(`Debut配置完了！\nセンター２: ${player.center2.name}\nバックエリア: ${placedBackCards}枚\n合計: ${totalPlaced}枚のDebutホロメンを配置しました`);
    
    // 次のプレイヤーまたは次のフェーズへ
    this.proceedToNextDebutPlayer(1);
  }

  autoDebutPlacement(playerId) {
    console.log(`autoDebutPlacement開始 - プレイヤー${playerId}`);
    const player = this.players[playerId];
    
    if (!player) {
      console.error(`プレイヤー${playerId}が見つかりません`);
      return;
    }
    
    console.log('プレイヤーの手札:', player.hand);
    
    const debutCards = player.hand.filter(card => 
      card && card.card_type && card.card_type.includes('ホロメン') && card.bloom_level === 'Debut'
    );
    
    console.log('デビューカード:', debutCards);
    
    // デビューカードが存在するかチェック
    if (!debutCards || debutCards.length === 0) {
      console.error(`プレイヤー${playerId}の手札にデビューカードが見つかりません`);
      return;
    }
    
    // センター2に1枚配置（ディープコピー使用）
    const centerCard = debutCards[0];
    if (!centerCard || !centerCard.id) {
      console.error('センターカードまたはIDが無効です:', centerCard);
      return;
    }

    const centerCardCopy = this.createCardCopy(centerCard);
    player.center2 = centerCardCopy;
    const centerIndex = player.hand.findIndex(card => card && card.id === centerCard.id);
    if (centerIndex === -1) {
      console.error('手札からセンターカードが見つかりません:', centerCard);
      return;
    }
    player.hand.splice(centerIndex, 1);
    
    console.log(`プレイヤー${playerId}が${centerCardCopy.name}をセンター2に配置`);
    
    // 残りのDebutをバックに配置
    const remainingDebuts = player.hand.filter(card => 
      card && card.card_type && card.card_type.includes('ホロメン') && card.bloom_level === 'Debut'
    );
    
    let backPositions = ['back1', 'back2', 'back3', 'back4', 'back5'];
    const maxSlots = player.center1 ? 4 : 5; // センター①の存在で制限
    
    remainingDebuts.slice(0, maxSlots).forEach((card, index) => {
      if (!card || !card.id) {
        console.error('バックカードまたはIDが無効です:', card);
        return;
      }
      
      const cardCopy = this.createCardCopy(card);
      player[backPositions[index]] = cardCopy;
      const handIndex = player.hand.findIndex(handCard => handCard && handCard.id === card.id);
      if (handIndex === -1) {
        console.error('手札からバックカードが見つかりません:', card);
        return;
      }
      player.hand.splice(handIndex, 1);
      console.log(`プレイヤー${playerId}が${cardCopy.name}を${backPositions[index]}に配置`);
    });    // UIを更新
    this.updateUI();
    this.updateHandDisplay();
    
    alert(`${centerCard.name}をセンター2に配置\n残り${remainingDebuts.length}枚をバックに配置しました`);
    
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
      console.error(`CPU（プレイヤー${playerId}）にDebutホロメンがありません`);
      return;
    }
    
    // センター2に1枚配置（ディープコピー使用）
    const centerCard = debutCards[0];
    const centerCardCopy = this.createCardCopy(centerCard);
    player.center2 = centerCardCopy;
    const centerIndex = player.hand.findIndex(card => card.id === centerCard.id);
    player.hand.splice(centerIndex, 1);
    
    console.log(`CPU（プレイヤー${playerId}）が${centerCardCopy.name}をセンター2に配置`);
    
    // 残りのDebutをバックに配置（簡単なAI）
    const remainingDebuts = player.hand.filter(card => 
      card.card_type && card.card_type.includes('ホロメン') && card.bloom_level === 'Debut'
    );
    
    let backPositions = ['back1', 'back2', 'back3', 'back4', 'back5'];
    const maxSlots = player.center1 ? 4 : 5; // センター①の存在で制限
    
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
    
    alert('ゲーム開始！');
    
    // 最初のターンを開始（リセットステップから）
    this.startTurn();
  }

  startTurn() {
    console.log(`ターン${this.gameState.turnCount}開始 - プレイヤー${this.gameState.currentPlayer}のターン`);
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
        this.swapCards(droppedData, dropZone);
      } else {
        console.log('無効な交換先です');
      }
    }
    
    // ドラッグ状態をクリア
    this.clearHighlights();
    this.draggedCard = null;
    this.draggedPlacedCard = null;
  }

  // カードタイプ判定
  isSupportCard(card) {
    const isSupport = card.card_type && card.card_type.includes('サポート');
    console.log(`isSupportCard判定: ${card.name} = ${isSupport} (${card.card_type})`);
    return isSupport;
  }

  isHolomenCard(card) {
    const isHolomen = card.card_type && card.card_type.includes('ホロメン');
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
      const center2 = document.querySelector('.battle-player .front2');
      if (center2 && !this.players[1].center2) {
        center2.classList.add('drop-zone-active');
        console.log('センター②をハイライト');
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
    
    // センター1をハイライト（空または交換可能）
    const center1 = document.querySelector('.battle-player .front1');
    if (center1 && (currentAreaId !== 'front1')) {
      center1.classList.add('drop-zone-active');
      console.log('センター1をハイライト（交換可能）');
    }
    
    // センター2をハイライト（空または交換可能）
    const center2 = document.querySelector('.battle-player .front2');
    if (center2 && (currentAreaId !== 'front2')) {
      center2.classList.add('drop-zone-active');
      console.log('センター2をハイライト（交換可能）');
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
      case 'center2':
        return !this.players[1].center2; // 空の場合のみ
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
      case 'center1':
      case 'center2':
        return true; // センターエリアは常に交換可能
      case 'back':
        return this.canPlaceCardInBackSlot(card, dropZone.index);
      default:
        return false;
    }
  }

  // カード交換処理
  swapCards(draggedCardData, dropZone) {
    console.log('カード交換開始');
    console.log('ドラッグ元:', { areaId: draggedCardData.areaId, index: draggedCardData.index, card: draggedCardData.card.name });
    console.log('ドロップ先:', dropZone);
    
    const player = this.players[1];
    const sourceCard = draggedCardData.card;
    
    // ドロップ先のカードを取得
    let targetCard = null;
    switch (dropZone.type) {
      case 'center1':
        targetCard = player.center1;
        break;
      case 'center2':
        targetCard = player.center2;
        break;
      case 'back':
        const backPositions = ['back1', 'back2', 'back3', 'back4', 'back5'];
        targetCard = player[backPositions[dropZone.index]];
        console.log(`ドロップ先 back${dropZone.index + 1} のカード:`, targetCard ? targetCard.name : 'なし');
        break;
    }
    
    console.log(`元の位置から削除: ${draggedCardData.areaId}[${draggedCardData.index}]`);
    // 元の位置からカードを削除
    this.removeCardFromPosition(player, draggedCardData.areaId, draggedCardData.index);
    
    console.log(`ドロップ先に配置: ${dropZone.type}[${dropZone.index}]`);
    // ドロップ先にカードを配置
    this.placeCardAtPosition(player, sourceCard, dropZone);
    
    // 元の位置にターゲットカードを配置（カードが存在する場合）
    if (targetCard) {
      const sourceZone = {
        type: this.getZoneTypeFromAreaId(draggedCardData.areaId),
        index: draggedCardData.index
      };
      console.log(`交換先に配置: ${sourceZone.type}[${sourceZone.index}]`);
      this.placeCardAtPosition(player, targetCard, sourceZone);
      console.log(`カード交換完了: ${sourceCard.name} ⇔ ${targetCard.name}`);
    } else {
      console.log(`カード移動完了: ${sourceCard.name} → ${dropZone.type}[${dropZone.index}]`);
    }
    
    this.updateUI();
  }

  // 位置からカードを削除
  removeCardFromPosition(player, areaId, index) {
    switch (areaId) {
      case 'front1':
        player.center1 = null;
        break;
      case 'front2':
        player.center2 = null;
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
      case 'center1':
        player.center1 = card;
        break;
      case 'center2':
        player.center2 = card;
        break;
      case 'back':
        const backPositions = ['back1', 'back2', 'back3', 'back4', 'back5'];
        player[backPositions[zone.index]] = card;
        break;
    }
  }

  // エリアIDからゾーンタイプを取得
  getZoneTypeFromAreaId(areaId) {
    switch (areaId) {
      case 'front1': return 'center1';
      case 'front2': return 'center2';
      case 'backs': return 'back';
      default: return areaId;
    }
  }

  // バックスロットへの配置可能性チェック
  canPlaceCardInBackSlot(card, slotIndex) {
    const player = this.players[1];
    const backPositions = ['back1', 'back2', 'back3', 'back4', 'back5'];
    
    // センター①があるかどうかで最大使用スロット数を決定
    const maxSlots = player.center1 ? 4 : 5;
    
    // スロットインデックスが使用可能範囲内かチェック
    if (slotIndex >= maxSlots) {
      console.log(`スロット${slotIndex}は使用不可（center1=${!!player.center1}, maxSlots=${maxSlots}）`);
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
        case 'front1':
          return { type: 'center1', index: 0, element: target };
        case 'front2':
          return { type: 'center2', index: 0, element: target };
        case 'backs':
          return { type: 'back', index: areaIndex, element: target };
        default:
          return { type: 'unknown' };
      }
    }
    
    if (target.classList.contains('front2')) {
      return { type: 'center2' };
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

  // 手札からカードを配置
  placeCardFromHand(card, handIndex, dropZone) {
    const player = this.players[1];
    
    console.log(`カード配置試行: ${card.name}, dropZone:`, dropZone);
    
    if (dropZone.type === 'support') {
      this.useSupportCard(card, handIndex);
      return;
    }
    
    // カードのディープコピーを作成（ホロメンカードの場合）
    const cardToPlace = this.isHolomenCard(card) ? this.createCardCopy(card) : card;
    
    switch (dropZone.type) {
      case 'center2':
        player.center2 = cardToPlace;
        console.log(`${cardToPlace.name}をセンター②に配置`);
        
        // Debut配置中の場合、状態を更新
        if (this.debutPlacementState && !this.debutPlacementState.centerPlaced) {
          this.debutPlacementState.centerPlaced = true;
          this.updateDebutPlacementStatus();
        }
        break;
        
      case 'back':
        const backPositions = ['back1', 'back2', 'back3', 'back4', 'back5'];
        const position = backPositions[dropZone.index];
        player[position] = cardToPlace;
        console.log(`${cardToPlace.name}をバック${dropZone.index + 1}(${position})に配置`);
        
        // Debut配置中の場合、状態を更新
        if (this.debutPlacementState && !this.debutPlacementState.usedBackPositions.includes(position)) {
          this.debutPlacementState.usedBackPositions.push(position);
          this.updateDebutPlacementStatus();
        }
        break;
    }
    
    // 手札から削除
    player.hand.splice(handIndex, 1);
    
    // UI更新
    this.updateHandDisplay();
    this.updateUI();
  }

  // サポートカード使用
  useSupportCard(card, handIndex) {
    const useCard = confirm(`「${card.name}」の効果を使用しますか？`);
    
    if (useCard) {
      console.log(`${card.name}の効果を使用`);
      
      // 手札から削除
      this.players[1].hand.splice(handIndex, 1);
      
      // アーカイブに移動（実際のゲームルールに応じて）
      this.players[1].archive.push(card);
      
      // TODO: 実際のカード効果処理を実装
      alert(`${card.name}の効果を発動しました！`);
      
      // UI更新
      this.updateHandDisplay();
      this.updateUI();
    }
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
    const player = this.players[playerId];
    const holomen = player[position];
    
    if (!holomen) {
      console.error(`位置${position}にホロメンが見つかりません`);
      return;
    }
    
    // ホロメンにエールカードリストがない場合は作成
    if (!holomen.yellCards) {
      holomen.yellCards = [];
    }
    
    // エールカードを添付
    holomen.yellCards.push(yellCard);
    console.log(`プレイヤー${playerId}: ${holomen.name}(${position})に${yellCard.name}を添付しました`);
    console.log(`現在の${holomen.name}のエール数: ${holomen.yellCards.length}枚`);
    
    // デバッグ：他のホロメンの状態も確認
    console.log('=== 全ホロメンのエール状態 ===');
    ['center1', 'center2', 'back1', 'back2', 'back3', 'back4', 'back5'].forEach(pos => {
      if (player[pos]) {
        const yellCount = player[pos].yellCards ? player[pos].yellCards.length : 0;
        console.log(`${pos}: ${player[pos].name} - エール${yellCount}枚`);
      }
    });
    console.log('=============================');
    
    // エールステップの場合：プレイヤー1・CPU共に自動進行
    if (this.gameState.currentPhase === 2 && this.gameState.currentPlayer === playerId) {
      if (playerId === 1) {
        console.log('エール配置完了 - 自動でメインステップに進みます');
        setTimeout(() => {
          this.nextPhase();
        }, 1500);
      } else {
        console.log('CPUエール配置完了 - 自動でメインステップに進みます');
        setTimeout(() => {
          this.nextPhase();
        }, 1500);
      }
    }
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
        
        // 選択されたホロメンのみにエールを配置
        this.attachYellCard(playerId, target.position, yellCard);
        
        // モーダルを削除
        document.body.removeChild(modal);
        
        // UI更新
        this.updateUI();
        
        // エール配置完了（自動進行はattachYellCardメソッドで処理される）
        console.log('エールカード配置完了');
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
      'center1': 'センター①',
      'center2': 'センター②',
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
    console.log(`プレイヤー${playerId}のメインステップ`);
    
    // 統合ログを記録
    if (window.infoPanelManager) {
      const playerName = playerId === 1 ? 'プレイヤー' : '対戦相手';
      const action = playerId === 1 ? 'カードをプレイ' : 'CPU実行中';
      window.infoPanelManager.logStepProgress(this.gameState.turnCount, 'メインステップ', playerName, action);
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
          if (this.cpuLogic) {
            console.log('CPUメインフェーズ実行中...');
            await this.cpuLogic.cpuMainPhase();
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

  // パフォーマンスステップの処理
  executePerformanceStep(playerId) {
    console.log(`プレイヤー${playerId}のパフォーマンスステップ`);
    
    // 統合ログを記録
    if (window.infoPanelManager) {
      const playerName = playerId === 1 ? 'プレイヤー' : '対戦相手';
      const action = playerId === 1 ? '攻撃・スキル使用' : 'CPU実行中';
      window.infoPanelManager.logStepProgress(this.gameState.turnCount, 'パフォーマンスステップ', playerName, action);
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
          if (this.cpuLogic) {
            console.log('CPUパフォーマンスフェーズ実行中...');
            await this.cpuLogic.cpuPerformancePhase();
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

  // フェーズハイライト機能
  updatePhaseHighlight() {
    console.log(`=== updatePhaseHighlight 呼び出し ===`);
    console.log(`プレイヤー: ${this.gameState.currentPlayer}, フェーズ: ${this.gameState.currentPhase}`);
    
    // すべてのハイライトを削除
    const existingHighlights = document.querySelectorAll('.phase-highlight');
    console.log(`既存のハイライト数: ${existingHighlights.length}`);
    existingHighlights.forEach(element => {
      element.classList.remove('phase-highlight');
    });

    const currentPlayer = this.gameState.currentPlayer;
    const currentPhase = this.gameState.currentPhase;
    
    console.log(`フェーズハイライト更新: プレイヤー${currentPlayer}, フェーズ${currentPhase}`);
    
    // 現在のプレイヤーのエリアをハイライト
    this.highlightPhaseArea(currentPlayer, currentPhase);
    
    // 更新後のハイライト確認
    const newHighlights = document.querySelectorAll('.phase-highlight');
    console.log(`新しいハイライト数: ${newHighlights.length}`);
    newHighlights.forEach((element, index) => {
      console.log(`ハイライト${index}: ${element.className}`);
    });
    console.log(`=== updatePhaseHighlight 完了 ===`);
  }

  // 指定プレイヤーのフェーズエリアをハイライト
  highlightPhaseArea(playerId, phase) {
    console.log(`=== highlightPhaseArea ===`);
    console.log(`プレイヤー${playerId}, フェーズ${phase}`);
    
    const playerArea = playerId === 1 ? '.battle-player' : '.battle-opponent';
    console.log(`対象エリア: ${playerArea}`);
    
    // フェーズに応じてハイライトを適用
    switch (phase) {
      case 0: // リセットステップ
        console.log('リセットステップ - プレイヤーエリア全体をハイライト');
        const battleArea = document.querySelector(playerArea);
        if (battleArea) {
          battleArea.classList.add('phase-highlight');
          console.log('✅ リセットステップハイライト適用完了');
        } else {
          console.log('❌ プレイヤーエリアが見つかりません');
        }
        break;
      case 1: // ドローステップ
        console.log('ドローステップ - デッキエリアをハイライト');
        const deckArea = document.querySelector(`${playerArea} .deck`);
        if (deckArea) {
          deckArea.classList.add('phase-highlight');
          console.log('✅ ドローステップハイライト適用完了');
        } else {
          console.log('❌ デッキエリアが見つかりません');
        }
        break;
      case 2: // エールステップ
        console.log('エールステップ - エールデッキをハイライト');
        const yellDeck = document.querySelector(`${playerArea} .yell-deck`);
        if (yellDeck) {
          yellDeck.classList.add('phase-highlight');
          console.log('✅ エールステップハイライト適用完了');
        } else {
          console.log('❌ エールデッキが見つかりません');
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
        const front1 = document.querySelector(`${playerArea} .front1`);
        const front2 = document.querySelector(`${playerArea} .front2`);
        let highlightCount = 0;
        if (front1) {
          front1.classList.add('phase-highlight');
          highlightCount++;
        }
        if (front2) {
          front2.classList.add('phase-highlight');
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

  /**
   * フェーズインデックスからフェーズ名を取得
   * @param {number} phaseIndex - フェーズインデックス
   * @returns {string} フェーズ名
   */
  // getPhaseNameByIndex は PhaseController に移譲
}

// グローバルインスタンス
let battleEngine = null;

// ページ読み込み完了時にバトルエンジンを初期化
document.addEventListener('DOMContentLoaded', () => {
  battleEngine = new HololiveBattleEngine();
  window.battleEngine = battleEngine; // グローバルアクセス用
});
