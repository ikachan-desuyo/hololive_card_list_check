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
    this.phaseInProgress = false; // フェーズ進行制御フラグ
    
    this.phaseNames = [
      '準備ステップ', // -1
      'リセットステップ', // 0
      '手札ステップ', // 1
      'エールステップ', // 2
      'メインステップ', // 3
      'パフォーマンスステップ', // 4
      'エンドステップ' // 5
    ];

    this.initializeGame();
    
    // CPUロジックの初期化
    this.cpuLogic = new HololiveCPULogic(this);
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
    this.setupHandArea();
    
    // カードエリアのイベントリスナー設定（少し遅延）
    setTimeout(() => {
      this.setupCardAreaListeners();
    }, 100);
  }

  setupControlPanel() {
    const controlPanel = document.createElement('div');
    controlPanel.className = 'control-panel';
    controlPanel.innerHTML = `
      <div class="game-status" id="game-status">
        <h3>🎮 ゲーム状況</h3>
        <div id="deck-status">プレイヤーデッキ: 未設定</div>
        <div id="opponent-deck-status">相手デッキ: 未設定</div>
        <div id="ready-status">準備: 未完了</div>
      </div>
      <button class="control-button" id="select-deck">📚 プレイヤーデッキ選択</button>
      <button class="control-button" id="select-opponent-deck">🤖 相手デッキ選択</button>
      <button class="control-button" id="start-game" disabled>ゲーム開始</button>
      <button class="control-button" id="next-phase" disabled>次のフェーズ</button>
      <button class="control-button" id="to-performance" disabled>パフォーマンスステップへ</button>
      <button class="control-button" id="end-turn" disabled>ターン終了</button>
      <button class="control-button" id="shuffle-deck">デッキシャッフル</button>
      <button class="control-button" id="reset-game">ゲームリセット</button>
    `;
    
    document.body.appendChild(controlPanel);

    // イベントリスナーの設定
    document.getElementById('select-deck').addEventListener('click', () => this.showDeckSelection(1));
    document.getElementById('select-opponent-deck').addEventListener('click', () => this.showDeckSelection(2));
    document.getElementById('start-game').addEventListener('click', () => this.startGame());
    document.getElementById('next-phase').addEventListener('click', () => this.nextPhase());
    document.getElementById('to-performance').addEventListener('click', () => this.nextPhase());
    document.getElementById('end-turn').addEventListener('click', () => this.nextPhase());
    document.getElementById('shuffle-deck').addEventListener('click', () => this.shuffleDeck(1));
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

  setupHandArea() {
    const handArea = document.createElement('div');
    handArea.className = 'hand-area';
    handArea.id = 'player-hand';
    document.body.appendChild(handArea);
  }

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
      return;
    }
    
    const playerName = this.gameState.currentPlayer === 1 ? 'プレイヤー' : '対戦相手';
    const phaseName = this.phaseNames[this.gameState.currentPhase + 1]; // インデックスを調整
    
    turnInfo.textContent = `${playerName}のターン - ${phaseName} (ターン${this.gameState.turnCount})`;
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
    
    // セットアップ実行
    this.executeGameSetup();
    
    // UIの更新
    this.updateTurnInfo();
    this.updateUI();
    
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
      return card;
    }
    return null;
  }

  nextPhase() {
    console.log(`=== nextPhase 呼び出し ===`);
    console.log(`gameStarted: ${this.gameState.gameStarted}, gameEnded: ${this.gameState.gameEnded}`);
    console.log(`現在のプレイヤー: ${this.gameState.currentPlayer}`);
    console.log(`現在のフェーズ: ${this.gameState.currentPhase}`);
    console.log(`ターン数: ${this.gameState.turnCount}`);
    console.log(`呼び出し元のスタックトレース:`);
    console.trace();
    console.log(`========================`);
    
    if (!this.gameState.gameStarted || this.gameState.gameEnded) return;
    
    // 既にフェーズ進行中の場合は実行を避ける
    if (this.phaseInProgress) {
      console.log('フェーズ進行中のため、次のフェーズ呼び出しをスキップします');
      return;
    }
    
    this.phaseInProgress = true;
    
    // 次のフェーズへ移行
    this.gameState.currentPhase++;
    
    console.log(`フェーズ更新後: ${this.gameState.currentPhase}`);
    
    // エンドステップ（フェーズ5）の次はターン終了
    if (this.gameState.currentPhase > 5) {
      console.log(`フェーズ5を超えたためターン終了`);
      this.phaseInProgress = false;
      this.endTurn();
      return;
    }
    
    // UI更新（フェーズ情報を先に更新）
    this.updateTurnInfo();
    this.updateUI();
    
    // フェーズ進行フラグをリセット（非同期処理完了後）
    setTimeout(() => {
      this.phaseInProgress = false;
    }, 100);
    
    // 現在のフェーズの処理を実行
    this.executePhase();
  }

  executePhase() {
    const currentPlayer = this.gameState.currentPlayer;
    const phase = this.gameState.currentPhase;
    
    console.log(`=== executePhase デバッグ ===`);
    console.log(`currentPlayer: ${currentPlayer}, phase: ${phase}`);
    console.log(`turnCount: ${this.gameState.turnCount}`);
    console.log(`==========================`);
    
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
        this.executeYellStep(currentPlayer);
        break;
      case 3: // メインステップ
        this.executeMainStep(currentPlayer);
        break;
      case 4: // パフォーマンスステップ
        this.executePerformanceStep(currentPlayer);
        break;
      case 5: // エンドステップ
        this.executeEndStep(currentPlayer);
        break;
    }
  }

  executeResetStep(playerId) {
    console.log(`=== executeResetStep ===`);
    console.log(`プレイヤー${playerId}のリセットステップを実行`);
    console.log(`現在のcurrentPlayer: ${this.gameState.currentPlayer}`);
    console.log(`ターン数: ${this.gameState.turnCount}`);
    console.log(`======================`);
    
    const player = this.players[playerId];
    
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
    this.updateUI();
    
    // リセットステップは自動で完了し、次のステップへ移行
    console.log('リセットステップ完了 - 自動で手札ステップに進みます');
    setTimeout(() => {
      this.nextPhase();
    }, 1500);
  }

  executeDrawStep(playerId) {
    console.log(`=== executeDrawStep ===`);
    console.log(`プレイヤー${playerId}の手札ステップを実行`);
    console.log(`現在のcurrentPlayer: ${this.gameState.currentPlayer}`);
    console.log(`ターン数: ${this.gameState.turnCount}`);
    console.log(`======================`);
    
    // デッキからカードを1枚引く
    const drawnCard = this.drawCard(playerId);
    if (drawnCard) {
      console.log(`プレイヤー${playerId}がカードを1枚引きました:`, drawnCard.name);
    } else {
      console.log(`プレイヤー${playerId}のデッキが空です`);
      // デッキ切れの処理
      this.checkVictoryConditions();
      return;
    }
    
    // UI更新
    this.updateUI();
    
    // 手札ステップは自動で完了し、次のステップへ移行
    console.log('手札ステップ完了 - 自動でエールステップに進みます');
    setTimeout(() => {
      this.nextPhase();
    }, 1000);
  }

  executeYellStep(playerId) {
    console.log(`=== executeYellStep ===`);
    console.log(`プレイヤー${playerId}のエールステップを実行`);
    console.log(`現在のcurrentPlayer: ${this.gameState.currentPlayer}`);
    console.log(`ターン数: ${this.gameState.turnCount}`);
    console.log(`======================`);
    
    const player = this.players[playerId];
    
    if (player.yellDeck.length === 0) {
      console.log(`プレイヤー${playerId}のエールデッキが空です`);
      // プレイヤー1の場合は手動進行、CPUの場合は自動進行
      if (playerId === 1) {
        console.log('エールデッキが空です - 手動でメインステップに進んでください');
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
        }, 1500);
      }
    } else {
      // ホロメンがいない場合はアーカイブへ
      player.archive.push(yellCard);
      console.log(`エールカードをアーカイブに送りました: ${yellCard.name}`);
      
      // UI更新
      this.updateUI();
      
      // プレイヤー1の場合は手動進行、CPUの場合は自動進行
      if (playerId === 1) {
        console.log('エールカードをアーカイブに送りました - 手動でメインステップに進んでください');
      } else {
        // 自動で次のステップへ移行
        setTimeout(() => {
          this.nextPhase();
        }, 1000);
      }
    }
  }

  executeEndStep(playerId) {
    console.log(`プレイヤー${playerId}のエンドステップを実行`);
    
    // ターン終了時の処理
    this.players[playerId].canPlaySupport = true;
    this.players[playerId].usedLimitedThisTurn = [];
    
    // エンドステップは自動で完了し、相手のターンに移行
    console.log('エンドステップ完了 - 自動で相手のリセットステップに移行します');
    setTimeout(() => {
      this.endTurn();
    }, 1000);
  }

  endTurn() {
    // ターン終了
    this.gameState.currentPlayer = this.gameState.currentPlayer === 1 ? 2 : 1;
    this.gameState.currentPhase = 0;
    
    if (this.gameState.currentPlayer === 1) {
      this.gameState.turnCount++;
    }
    
    this.updateTurnInfo();
    this.updateUI();
    
    // 勝利条件の確認
    this.checkVictoryConditions();
    
    console.log(`ターン終了 - プレイヤー${this.gameState.currentPlayer}のターン開始`);
    
    // 新しいターンのリセットステップ開始
    // 両プレイヤーとも自動でリセットステップを開始
    setTimeout(() => {
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
    this.updateHandDisplay();
    
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

  updateHandDisplay() {
    const handArea = document.getElementById('player-hand');
    const player = this.players[1]; // プレイヤーの手札のみ表示
    
    // 既存の手札を完全にクリア
    handArea.innerHTML = '';
    
    // 手札が存在する場合のみ表示
    if (player.hand && Array.isArray(player.hand)) {
      player.hand.forEach((card, index) => {
        const cardElement = document.createElement('div');
        cardElement.className = 'hand-card';
        
        // 画像URLの確認とフォールバック
        const imageUrl = card.image_url || 'images/placeholder.png';
        cardElement.style.backgroundImage = `url(${imageUrl})`;
        cardElement.style.backgroundSize = 'cover';
        cardElement.style.backgroundPosition = 'center';
        cardElement.style.backgroundRepeat = 'no-repeat';
        
        cardElement.title = card.name || 'カード';
        cardElement.setAttribute('data-card-id', card.id || index);
        cardElement.setAttribute('data-card-index', index);
        
        // ドラッグ機能を追加
        cardElement.draggable = true;
        cardElement.addEventListener('dragstart', (e) => this.handleHandCardDragStart(e, card, index));
        cardElement.addEventListener('dragend', (e) => this.handleHandCardDragEnd(e));
        
        // クリックイベント
        cardElement.addEventListener('click', () => this.handleHandCardClick(card, index));
        
        handArea.appendChild(cardElement);
      });
      
      console.log(`手札表示更新完了: ${player.hand.length}枚`);
    } else {
      console.log('手札が空です');
    }
  }

  updateCardAreas() {
    // 各カードエリアの状態を更新
    const areas = ['life', 'front1', 'front2', 'oshi', 'holo', 'deck', 
                   'yell-deck', 'archive']; // 'backs'を除外
    
    // プレイヤーエリアの更新
    areas.forEach(areaId => {
      const area = document.querySelector(`.battle-player .${areaId}`);
      if (area) {
        area.innerHTML = '';
        const player = this.players[1];
        this.displayCardsInArea(area, player, areaId, 1); // プレイヤーID追加
      }
    });

    // バックエリアは特別処理（.back-slot要素を保持）
    this.updateBackSlots(1);

    // 対戦相手エリアの更新
    areas.forEach(areaId => {
      const area = document.querySelector(`.battle-opponent .${areaId}`);
      if (area) {
        area.innerHTML = '';
        const opponent = this.players[2];
        this.displayCardsInArea(area, opponent, areaId, 2); // プレイヤーID追加
      }
    });
    
    // 対戦相手のバックエリアも特別処理
    this.updateBackSlots(2);
  }

  // バックスロットエリアの更新（.back-slot要素を保持）
  updateBackSlots(playerId) {
    const sectionClass = playerId === 1 ? '.battle-player' : '.battle-opponent';
    const backSlots = document.querySelectorAll(`${sectionClass} .back-slot`);
    const player = this.players[playerId];
    const backPositions = ['back1', 'back2', 'back3', 'back4', 'back5'];
    
    // センター①があるかどうかで最大使用スロット数を決定
    const maxSlots = player.center1 ? 4 : 5;
    
    backSlots.forEach((slot, index) => {
      // 既存のカード要素をクリア（スロット自体は保持）
      const existingCards = slot.querySelectorAll('.card');
      existingCards.forEach(card => card.remove());
      
      // 使用不可スロットの処理
      if (index >= maxSlots) {
        slot.classList.add('disabled');
        slot.classList.remove('has-card');
        slot.style.opacity = '0.3';
        slot.style.pointerEvents = 'none';
        slot.textContent = '使用不可';
        return;
      } else {
        slot.classList.remove('disabled');
        slot.style.opacity = '1';
        slot.style.pointerEvents = 'auto';
      }
      
      // 対応するバックポジションにカードがある場合は表示
      const card = player[backPositions[index]];
      if (card) {
        const cardElement = this.createCardElement(card, 'single', index, 'backs', playerId); // プレイヤーID追加
        // バックスロット内でのサイズ調整
        cardElement.style.width = '100%';
        cardElement.style.height = '100%';
        cardElement.style.position = 'absolute';
        cardElement.style.top = '0';
        cardElement.style.left = '0';
        
        slot.appendChild(cardElement);
        slot.classList.add('has-card');
        slot.style.position = 'relative'; // 子要素の絶対配置のため
        
        // エールカードがある場合は表示
        if (card.yellCards && card.yellCards.length > 0) {
          this.addYellCardsToArea(slot, card, 'backs', index);
        }
      } else {
        slot.classList.remove('has-card');
        slot.style.position = 'static';
        // 空のスロットには元のテキストを表示
        if (slot.children.length === 0) {
          slot.textContent = `バック${index + 1}`;
        }
      }
    });
  }

  displayCardsInArea(area, player, areaId, playerId = 1) {
    let cards = [];
    let displayType = 'stack'; // 'stack', 'spread', 'single'
    
    switch (areaId) {
      case 'life':
        cards = player.life;
        displayType = 'vertical';
        break;
      case 'front1':
        if (player.center1) cards = [player.center1];
        displayType = 'single';
        break;
      case 'front2':
        if (player.center2) cards = [player.center2];
        displayType = 'single';
        break;
      case 'oshi':
        if (player.oshi) cards = [player.oshi];
        displayType = 'single';
        break;
      case 'holo':
        cards = player.holoPower;
        displayType = 'spread';
        break;
      case 'deck':
        cards = player.deck.slice(0, 3); // 上3枚のみ表示
        displayType = 'stack';
        break;
      case 'yell-deck':
        cards = player.yellDeck.slice(0, 3); // 上3枚のみ表示
        displayType = 'stack';
        break;
      case 'archive':
        cards = player.archive.slice(0, 3); // 上3枚のみ表示
        displayType = 'stack';
        break;
    }

    // カードを表示
    cards.forEach((card, index) => {
      const cardElement = this.createCardElement(card, displayType, index, areaId, playerId);
      area.appendChild(cardElement);
      
      // エールカードがある場合、同じエリア内に兄弟要素として追加
      if (card && card.yellCards && card.yellCards.length > 0) {
        this.addYellCardsToArea(area, card, areaId, index);
      }
    });

    // カードカウンターの追加
    const totalCount = this.getCardCount(player, areaId);
    if (totalCount > 0) {
      this.updateCardCounter(area, totalCount);
      area.classList.add('has-card');
    } else {
      area.classList.remove('has-card');
    }
  }

  createCardElement(card, displayType, index, areaId = null, playerId = 1) {
    const cardElement = document.createElement('div');
    cardElement.className = 'card face-down'; // デフォルトは裏向き
    
    // ホロメンカードのz-indexを確実に設定（!importantに対抗）
    cardElement.style.zIndex = '100 !important';
    cardElement.style.position = 'relative'; // z-indexを有効にするため
    
    // 横向き状態の判定
    if (card && card.isResting) {
      cardElement.classList.add('resting');
    }
    
    // 表向きで表示すべきエリアかどうかを判定
    const shouldShowFaceUp = this.shouldCardBeFaceUp(card, areaId);
    
    if (shouldShowFaceUp && card) {
      cardElement.classList.remove('face-down');
      cardElement.classList.add('face-up');
      
      // カード画像の設定
      if (card.image_url) {
        cardElement.style.backgroundImage = `url(${card.image_url})`;
        cardElement.style.backgroundSize = 'cover';
        cardElement.style.backgroundPosition = 'center';
      }
      
      // カード名表示（画像がない場合のフォールバック）
      if (!card.image_url) {
        cardElement.innerHTML = `
          <div class="card-content">
            <div class="card-name">${card.name || 'Unknown'}</div>
            <div class="card-type">${card.card_type || ''}</div>
          </div>
        `;
      }
      
      // エールカードの追加は別途 addYellCardsToArea で行う
    }
    
    // 配置済みカードのドラッグ機能を追加（プレイヤー1のセンター、バックのホロメンカードのみ）
    if (playerId === 1 && shouldShowFaceUp && this.isHolomenCard(card) && (areaId === 'front1' || areaId === 'front2' || areaId === 'backs')) {
      cardElement.draggable = true;
      cardElement.setAttribute('data-card-id', card.id);
      cardElement.setAttribute('data-area-id', areaId);
      cardElement.setAttribute('data-area-index', index);
      
      cardElement.addEventListener('dragstart', (e) => this.handlePlacedCardDragStart(e, card, areaId, index));
      cardElement.addEventListener('dragend', (e) => this.handlePlacedCardDragEnd(e));
    }
    
    // 表示タイプによる位置調整
    if (displayType === 'stack') {
      cardElement.style.position = 'absolute';
      cardElement.style.top = '50%';
      cardElement.style.left = '50%';
      if (index === 0) {
        cardElement.style.transform = 'translate(-50%, -50%)';
        cardElement.style.zIndex = '10';
      } else {
        const offset = index * 2;
        cardElement.style.transform = `translate(${-50 + offset}%, ${-50 + offset}%)`;
        cardElement.style.zIndex = `${10 - index}`;
      }
    } else if (displayType === 'vertical') {
      // ライフカード用の縦並び表示（90度回転した横向きカードを重ねて縦に並べる）
      cardElement.style.position = 'relative';
      cardElement.style.display = 'block';
      cardElement.style.margin = '-25px auto'; // 6枚でも収まるよう重ねる
      cardElement.style.zIndex = `${20 - index}`; // 上のカードほど前面に
    }
    
    return cardElement;
  }

  shouldCardBeFaceUp(card, areaId) {
    if (!card) return false;
    
    // 推しホロメンは常に表向き
    if (card.card_type === '推しホロメン') {
      return true;
    }
    
    // 表向きで表示すべきエリア
    const faceUpAreas = ['front1', 'front2', 'backs', 'archive'];
    return faceUpAreas.includes(areaId);
  }

  getCardCount(player, areaId) {
    switch (areaId) {
      case 'life': return player.life.length;
      case 'front1': return player.center1 ? 1 : 0;
      case 'front2': return player.center2 ? 1 : 0;
      case 'oshi': return player.oshi ? 1 : 0;
      case 'holo': return player.holoPower.length;
      case 'deck': return player.deck.length;
      case 'yell-deck': return player.yellDeck.length;
      case 'backs': return (player.back1 ? 1 : 0) + (player.back2 ? 1 : 0) + (player.back3 ? 1 : 0) + (player.back4 ? 1 : 0) + (player.back5 ? 1 : 0);
      case 'archive': return player.archive.length;
      default: return 0;
    }
  }

  updateCardCounter(area, count) {
    let counter = area.querySelector('.card-counter');
    
    if (count > 1) { // 2枚以上の時のみカウンター表示
      if (!counter) {
        counter = document.createElement('div');
        counter.className = 'card-counter';
        area.appendChild(counter);
      }
      counter.textContent = count;
    } else if (counter) {
      counter.remove();
    }
  }

  updatePhaseHighlight() {
    // すべてのハイライトを削除
    document.querySelectorAll('.phase-highlight').forEach(el => {
      el.classList.remove('phase-highlight');
    });
    
    // 現在のフェーズに応じてハイライト
    const phase = this.gameState.currentPhase;
    const currentPlayer = this.gameState.currentPlayer;
    let targetArea = null;
    
    // 現在のプレイヤーのエリアを特定
    const playerSection = currentPlayer === 1 ? '.battle-player' : '.battle-opponent';
    
    switch (phase) {
      case -1: // 準備ステップ
        // 準備ステップではハイライトなし
        break;
      case 0: // リセットステップ
        // リセットステップでは全体をハイライト
        targetArea = document.querySelector(playerSection);
        break;
      case 1: // 手札ステップ
        targetArea = document.querySelector(`${playerSection} .deck`);
        break;
      case 2: // エールステップ
        targetArea = document.querySelector(`${playerSection} .yell-deck`);
        break;
      case 3: // メインステップ
        targetArea = document.querySelector(`${playerSection} .front1`);
        break;
      case 4: // パフォーマンスステップ
        targetArea = document.querySelector(`${playerSection} .front1`);
        break;
    }
    
    if (targetArea) {
      targetArea.classList.add('phase-highlight');
    }
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

  handleHandCardClick(card, index) {
    console.log('手札のカードがクリックされました:', card.name);
    
    // メインステップでのみカードをプレイ可能
    if (this.gameState.currentPhase === 3) {
      this.playCard(card, index);
    } else {
      console.log('メインステップでのみカードをプレイできます');
    }
  }

  playCard(card, handIndex) {
    const player = this.players[this.gameState.currentPlayer];
    
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
  handleHandCardDragStart(e, card, index) {
    console.log('手札からドラッグ開始:', card.name);
    
    // ドラッグ中のカードデータを保存
    this.draggedCard = {
      card: card,
      index: index,
      source: 'hand'
    };
    
    // ドラッグエフェクトを追加
    e.target.classList.add('dragging');
    
    // サポートカードの場合は専用エリアを表示
    if (this.isSupportCard(card)) {
      this.showSupportDropZone();
    }
    
    // 有効なドロップゾーンをハイライト
    this.highlightValidDropZones(card);
    
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({
      cardId: card.id,
      cardIndex: index,
      source: 'hand'
    }));
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

  handleHandCardDragEnd(e) {
    console.log('ドラッグ終了');
    
    // ドラッグエフェクトを削除
    e.target.classList.remove('dragging');
    
    // サポートエリアを非表示
    this.hideSupportDropZone();
    
    // ハイライトを削除
    this.clearDropZoneHighlights();
    
    // ドラッグ状態をクリア
    this.draggedCard = null;
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
    // 既存の要素があれば削除
    const existingZone = document.getElementById('support-drop-zone');
    if (existingZone) {
      existingZone.remove();
    }
    
    const supportZone = document.createElement('div');
    supportZone.className = 'support-drop-zone';
    supportZone.textContent = 'サポートカード効果使用';
    supportZone.id = 'support-drop-zone';
    
    // ドロップイベントを追加
    supportZone.addEventListener('dragover', (e) => this.handleDragOver(e));
    supportZone.addEventListener('dragenter', (e) => this.handleDragEnter(e));
    supportZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    supportZone.addEventListener('drop', (e) => this.handleDrop(e));
    
    // プレイヤーエリア内に配置
    const playerArea = document.querySelector('.battle-player');
    if (playerArea) {
      playerArea.appendChild(supportZone);
    } else {
      document.body.appendChild(supportZone);
    }
  }

  // サポートドロップゾーン表示/非表示
  showSupportDropZone() {
    const supportZone = document.getElementById('support-drop-zone');
    if (supportZone) {
      supportZone.classList.add('active');
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
    
    // エールステップの場合は自動で次のステップに進む
    if (this.gameState.currentPhase === 2 && this.gameState.currentPlayer === playerId) {
      console.log('エール配置完了 - 自動でメインステップに進みます');
      setTimeout(() => {
        this.nextPhase();
      }, 1500);
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
        
        // プレイヤーの場合は手動操作を待つ
        console.log('エールカード配置完了 - 手動でメインステップに進んでください');
        // 自動進行はしない - プレイヤーが手動で次のフェーズボタンを押すのを待つ
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
    
    if (playerId === 1) {
      // プレイヤーの場合は手動操作を待つ（自動進行しない）
      console.log('メインステップです。カードをプレイした後、「パフォーマンスステップへ」ボタンを押してください。');
      // 手動操作を待つため、ここでは自動進行しない
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
      }, 2000);
    }
  }

  // パフォーマンスステップの処理
  executePerformanceStep(playerId) {
    console.log(`プレイヤー${playerId}のパフォーマンスステップ`);
    
    if (playerId === 1) {
      // プレイヤーの場合は手動操作を待つ（自動進行しない）
      console.log('パフォーマンスステップです。攻撃やスキルを使用した後、「ターン終了」ボタンを押してください。');
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
    if (!holomenCard.yellCards || holomenCard.yellCards.length === 0) return;
    
    console.log(`エール表示更新: ${holomenCard.name}に${holomenCard.yellCards.length}枚のエール`);
    
    // 既存のエールカードコンテナを削除（重複防止）
    const existingYellContainer = area.querySelector(`.yell-cards[data-card-index="${cardIndex}"]`);
    if (existingYellContainer) {
      existingYellContainer.remove();
    }
    
    const yellContainer = document.createElement('div');
    yellContainer.className = 'yell-cards';
    yellContainer.setAttribute('data-card-index', cardIndex);
    
    // センターかバックかで配置を変える
    if (areaId === 'front1' || areaId === 'front2') {
      yellContainer.classList.add('center');
    } else {
      yellContainer.classList.add('back');
    }
    
    // エリア内での絶対配置
    yellContainer.style.position = 'absolute';
    yellContainer.style.top = '0';
    yellContainer.style.left = '0';
    yellContainer.style.width = '100%';
    yellContainer.style.height = '100%';
    yellContainer.style.zIndex = '5'; // ホロメンカードより後ろだが、ホバー時は子要素が前面に
    yellContainer.style.pointerEvents = 'auto'; // マウスイベントを有効にしてエールカードがホバー可能に
    
    holomenCard.yellCards.forEach((yellCard, index) => {
      const yellElement = document.createElement('div');
      yellElement.className = 'yell-card';
      yellElement.title = yellCard.name;
      
      // エールカードをライフカードのように重ねて配置
      yellElement.style.position = 'absolute';
      yellElement.style.width = '120px'; // 他のカードと同じサイズに統一
      yellElement.style.height = '168px'; // 他のカードと同じサイズに統一
      
      // センターとバックで異なる重なり方（ホロメンカードから少しずらす）
      if (areaId === 'front1' || areaId === 'front2') {
        // センター配置：ホロメンカードの下に、右部分が少しはみ出るように配置
        // 上下は同じ高さ、左右は右にずらして重ねる
        const offsetX = 30 + (index * 12); // 右にもっと大きくはみ出し
        const offsetY = 0; // 上下は同じ高さ
        yellElement.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(1)`;
        yellElement.style.zIndex = `${5 - index}`; // 通常時は後ろに、ホバー時はCSSで250に
      } else if (areaId === 'backs') {
        // バック配置：ホロメンカードの背後に、上部が少しはみ出るように配置
        // 左右は同じ場所、上下は上にずらして重ねる
        const offsetX = 0; // 左右は同じ場所
        const offsetY = -20 - (index * 8); // 上により大きくはみ出し
        yellElement.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(1)`;
        yellElement.style.zIndex = `${5 + index}`; // 通常時は後ろに、ホバー時はCSSで250に
      } else {
        // その他のエリア：左下にずらして重ねる  
        const offsetX = -8 - (index * 3);
        const offsetY = 8 + (index * 3);
        yellElement.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(1)`;
        yellElement.style.zIndex = `${5 - index}`;
      }
      
      // エールカードの画像を表示
      if (yellCard.image_url) {
        yellElement.style.backgroundImage = `url(${yellCard.image_url})`;
        yellElement.style.backgroundSize = 'cover';
        yellElement.style.backgroundPosition = 'center';
        yellElement.style.backgroundRepeat = 'no-repeat';
      } else {
        // 画像がない場合は最初の文字を表示
        yellElement.textContent = yellCard.name.charAt(0);
        yellElement.style.display = 'flex';
        yellElement.style.alignItems = 'center';
        yellElement.style.justifyContent = 'center';
        yellElement.style.fontSize = '12px';
        yellElement.style.fontWeight = 'bold';
      }
      
      yellContainer.appendChild(yellElement);
    });
    
    // エリア内の最初の子要素として追加（ホロメンカードより後ろに）
    area.insertBefore(yellContainer, area.firstChild);
  }

  // エールカードをカード表示に追加（旧関数・互換性のため残す）
  addYellCardsToDisplay(cardElement, holomenCard, areaId) {
    if (!holomenCard.yellCards || holomenCard.yellCards.length === 0) return;
    
    // 既存のエールカードコンテナを削除（重複防止）
    const existingYellContainer = cardElement.querySelector('.yell-cards');
    if (existingYellContainer) {
      existingYellContainer.remove();
    }
    
    const yellContainer = document.createElement('div');
    yellContainer.className = 'yell-cards';
    
    // センターかバックかで配置を変える
    if (areaId === 'front1' || areaId === 'front2') {
      yellContainer.classList.add('center');
    } else {
      yellContainer.classList.add('back');
    }
    
    // エールカードをホロメンカードの後ろに配置
    yellContainer.style.position = 'absolute';
    yellContainer.style.top = '0';
    yellContainer.style.left = '0';
    yellContainer.style.width = '100%';
    yellContainer.style.height = '100%';
    yellContainer.style.zIndex = '-10'; // ホロメンカードより確実に後ろ
    yellContainer.style.pointerEvents = 'none'; // マウスイベントはホロメンカードに委ねる
    
    holomenCard.yellCards.forEach((yellCard, index) => {
      const yellElement = document.createElement('div');
      yellElement.className = 'yell-card';
      yellElement.title = yellCard.name;
      
      // エールカードをライフカードのように重ねて配置
      yellElement.style.position = 'absolute';
      yellElement.style.width = '120px'; // 他のカードと同じサイズに統一
      yellElement.style.height = '168px'; // 他のカードと同じサイズに統一
      
      // センターとバックで異なる重なり方（ホロメンカードから少しずらす）
      if (areaId === 'front1' || areaId === 'front2') {
        // センター配置：右下にずらして重ねる
        const offsetX = 8 + (index * 4);
        const offsetY = 8 + (index * 4);
        yellElement.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        yellElement.style.zIndex = `${-10 - index}`; // 後から配置されるほど後ろに
      } else {
        // バック配置：左下にずらして重ねる  
        const offsetX = -8 - (index * 3);
        const offsetY = 8 + (index * 3);
        yellElement.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        yellElement.style.zIndex = `${-10 - index}`;
      }
      
      // エールカードの画像を表示
      if (yellCard.image_url) {
        yellElement.style.backgroundImage = `url(${yellCard.image_url})`;
        yellElement.style.backgroundSize = 'cover';
        yellElement.style.backgroundPosition = 'center';
        yellElement.style.backgroundRepeat = 'no-repeat';
      } else {
        // 画像がない場合は最初の文字を表示
        yellElement.textContent = yellCard.name.charAt(0);
        yellElement.style.display = 'flex';
        yellElement.style.alignItems = 'center';
        yellElement.style.justifyContent = 'center';
        yellElement.style.fontSize = '12px';
        yellElement.style.fontWeight = 'bold';
      }
      
      yellContainer.appendChild(yellElement);
    });
    
    // ホロメンカードの後ろに配置（firstChildより前に挿入）
    cardElement.insertBefore(yellContainer, cardElement.firstChild);
    
    console.log(`エール表示更新: ${holomenCard.name}に${holomenCard.yellCards.length}枚のエール`);
  }
}

// グローバルインスタンス
let battleEngine = null;

// ページ読み込み完了時にバトルエンジンを初期化
document.addEventListener('DOMContentLoaded', () => {
  battleEngine = new HololiveBattleEngine();
  window.battleEngine = battleEngine; // グローバルアクセス用
});
