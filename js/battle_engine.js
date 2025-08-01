/**
 * ホロライブTCG バトルエンジン
 * ゲームの状態管理とルール処理を行う
 */

class HololiveBattleEngine {
  constructor() {
    this.gameState = {
      currentPlayer: 1, // 1: プレイヤー, 2: 対戦相手
      currentPhase: 0, // 0-5: リセット〜エンド
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
    
    this.phaseNames = [
      'リセットステップ',
      '手札ステップ',
      'エールステップ',
      'メインステップ',
      'パフォーマンスステップ',
      'エンドステップ'
    ];

    this.initializeGame();
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
    
    // カードエリアのイベントリスナー設定
    this.setupCardAreaListeners();
    
    // 手札エリアの初期化
    this.setupHandArea();
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
    document.getElementById('end-turn').addEventListener('click', () => this.endTurn());
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
    const cardAreas = document.querySelectorAll('.card-area');
    cardAreas.forEach(area => {
      area.addEventListener('click', (e) => this.handleCardAreaClick(e));
      area.addEventListener('dragover', (e) => this.handleDragOver(e));
      area.addEventListener('drop', (e) => this.handleDrop(e));
    });
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
    
    const playerName = this.gameState.currentPlayer === 1 ? 'プレイヤー' : '対戦相手';
    const phaseName = this.phaseNames[this.gameState.currentPhase];
    
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
    if (!this.gameState.gameStarted || this.gameState.gameEnded) return;
    
    // 現在のフェーズの処理
    this.executePhase();
    
    // 次のフェーズへ
    this.gameState.currentPhase++;
    
    if (this.gameState.currentPhase >= this.phaseNames.length) {
      this.endTurn();
    } else {
      this.updateTurnInfo();
      this.updateUI();
    }
  }

  executePhase() {
    const currentPlayer = this.gameState.currentPlayer;
    const phase = this.gameState.currentPhase;
    
    switch (phase) {
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
        // プレイヤーの行動を待つ
        break;
      case 4: // パフォーマンスステップ
        // プレイヤーの行動を待つ
        break;
      case 5: // エンドステップ
        this.executeEndStep(currentPlayer);
        break;
    }
  }

  executeResetStep(playerId) {
    // お休み状態のホロメンをアクティブにする
    this.players[playerId].restHolomem = [];
    
    // コラボホロメンをお休み状態にする
    if (this.players[playerId].center2) {
      this.players[playerId].restHolomem.push('center2');
    }
    
    console.log(`プレイヤー${playerId}のリセットステップを実行`);
  }

  executeDrawStep(playerId) {
    // デッキからカードを1枚引く
    const drawnCard = this.drawCard(playerId);
    if (drawnCard) {
      console.log(`プレイヤー${playerId}がカードを1枚引きました:`, drawnCard.name);
    } else {
      console.log(`プレイヤー${playerId}のデッキが空です`);
      // デッキ切れの処理
      this.checkVictoryConditions();
    }
  }

  executeYellStep(playerId) {
    // エールデッキから1枚引いて、ホロメンに送る
    const player = this.players[playerId];
    if (player.yellDeck.length > 0) {
      const yellCard = player.yellDeck.pop();
      
      // 自動的にセンターホロメンに送る（実際のゲームでは選択）
      if (player.center1) {
        // ホロメンにエールを付ける処理
        console.log(`プレイヤー${playerId}がエールを送りました:`, yellCard.name);
      } else {
        // ホロメンがいない場合はアーカイブ
        player.archive.push(yellCard);
      }
    }
  }

  executeEndStep(playerId) {
    // ターン終了時の処理
    this.players[playerId].canPlaySupport = true;
    this.players[playerId].usedLimitedThisTurn = [];
    console.log(`プレイヤー${playerId}のエンドステップを実行`);
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
                   'yell-deck', 'backs', 'archive'];
    
    // プレイヤーエリアの更新
    areas.forEach(areaId => {
      const area = document.querySelector(`.battle-player .${areaId}`);
      if (area) {
        area.innerHTML = '';
        const player = this.players[1];
        this.displayCardsInArea(area, player, areaId);
      }
    });

    // 対戦相手エリアの更新
    areas.forEach(areaId => {
      const area = document.querySelector(`.battle-opponent .${areaId}`);
      if (area) {
        area.innerHTML = '';
        const opponent = this.players[2];
        this.displayCardsInArea(area, opponent, areaId);
      }
    });
  }

  displayCardsInArea(area, player, areaId) {
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
      case 'backs':
        if (player.back1) cards.push(player.back1);
        if (player.back2) cards.push(player.back2);
        if (player.back3) cards.push(player.back3);
        displayType = 'spread';
        break;
      case 'archive':
        cards = player.archive.slice(0, 3); // 上3枚のみ表示
        displayType = 'stack';
        break;
    }

    // カードを表示
    cards.forEach((card, index) => {
      const cardElement = this.createCardElement(card, displayType, index, areaId);
      area.appendChild(cardElement);
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

  createCardElement(card, displayType, index, areaId = null) {
    const cardElement = document.createElement('div');
    cardElement.className = 'card face-down'; // デフォルトは裏向き
    
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
      case 'backs': return (player.back1 ? 1 : 0) + (player.back2 ? 1 : 0) + (player.back3 ? 1 : 0);
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
    let targetArea = null;
    
    switch (phase) {
      case 1: // 手札ステップ
        targetArea = document.querySelector('.deck');
        break;
      case 2: // エールステップ
        targetArea = document.querySelector('.yell-deck');
        break;
      case 3: // メインステップ
        targetArea = document.querySelector('.front1');
        break;
      case 4: // パフォーマンスステップ
        targetArea = document.querySelector('.front1');
        break;
    }
    
    if (targetArea) {
      targetArea.classList.add('phase-highlight');
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

  playHolomenCard(card, handIndex) {
    const player = this.players[this.gameState.currentPlayer];
    
    // 空いているステージポジションを探す
    if (!player.center1) {
      player.center1 = card;
      player.hand.splice(handIndex, 1);
      console.log(`${card.name}をセンター①に配置しました`);
    } else if (!player.center2) {
      player.center2 = card;
      player.hand.splice(handIndex, 1);
      console.log(`${card.name}をセンター②に配置しました`);
    } else if (!player.back1) {
      player.back1 = card;
      player.hand.splice(handIndex, 1);
      console.log(`${card.name}をバック①に配置しました`);
    } else if (!player.back2) {
      player.back2 = card;
      player.hand.splice(handIndex, 1);
      console.log(`${card.name}をバック②に配置しました`);
    } else if (!player.back3) {
      player.back3 = card;
      player.hand.splice(handIndex, 1);
      console.log(`${card.name}をバック③に配置しました`);
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
    const randomResult = suggestedPlayer === 1 ? 'あなたが先行' : '相手が先行';
    
    const userChoice = confirm(
      `先行・後攻の決定\n\n` +
      `ランダム結果: ${randomResult}\n\n` +
      `ランダム結果で決定しますか？\n` +
      `「OK」= ランダム結果で決定\n` +
      `「キャンセル」= 手動で選択`
    );
    
    if (userChoice) {
      // ランダム結果で決定
      this.setFirstPlayer(suggestedPlayer, false);
    } else {
      // 手動選択
      const manualChoice = confirm(
        `手動選択\n\n` +
        `「OK」= あなたが先行\n` +
        `「キャンセル」= 相手が先行`
      );
      
      this.setFirstPlayer(manualChoice ? 1 : 2, true);
    }
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
    const playerName = playerId === 1 ? 'あなた' : '相手';
    const player = this.players[playerId];
    
    const debutCards = player.hand.filter(card => 
      card.card_type && card.card_type.includes('ホロメン') && card.bloom_level === 'Debut'
    );
    
    if (isForced) {
      // 強制マリガンの場合
      alert(
        `${playerName}のマリガン\n\n` +
        `現在の手札: ${player.hand.length}枚\n` +
        `Debutホロメン: ${debutCards.length}枚\n\n` +
        `※ Debutホロメンがないため、マリガンが必要です\n` +
        `全ての手札をデッキに戻してシャッフルし、新しい手札を引きます`
      );
      
      this.executeMulligan(playerId);
    } else {
      // 選択可能な場合
      const mulliganCount = this.gameState.mulliganCount[playerId];
      const newHandSize = 7 - mulliganCount;
      const penalty = mulliganCount > 0 ? `手札が${mulliganCount}枚減って${newHandSize}枚` : `ペナルティなしで7枚`;
      
      const userChoice = confirm(
        `${playerName}のマリガン\n\n` +
        `現在の手札: ${player.hand.length}枚\n` +
        `Debutホロメン: ${debutCards.length}枚\n\n` +
        `マリガンを行いますか？\n` +
        `マリガンすると：${penalty}になります\n\n` +
        `「OK」= マリガンする\n` +
        `「キャンセル」= マリガンしない`
      );
      
      if (userChoice) {
        this.executeMulligan(playerId);
      } else {
        // マリガンを拒否した場合、次のプレイヤーに進む
        this.skipMulligan(playerId);
      }
    }
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
      selectedCards: [],
      centerPlaced: false,
      backPositions: ['back1', 'back2', 'back3'],
      usedBackPositions: []
    };
    
    alert(
      'あなたのDebut配置\n\n' +
      `Debutホロメン: ${debutCards.length}枚\n\n` +
      '📌 配置ルール:\n' +
      '• センター2に1枚必須\n' +
      '• バックに好きなだけ配置可能\n\n' +
      '手札のDebutホロメンをクリックして配置してください'
    );
    
    this.showDebutPlacementModal();
  }

  showDebutPlacementModal() {
    // 既存のモーダルを削除
    const existingModal = document.getElementById('debut-placement-modal');
    if (existingModal) {
      existingModal.remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'debut-placement-modal';
    modal.className = 'debut-modal';
    modal.innerHTML = this.createDebutPlacementModalHTML();
    
    document.body.appendChild(modal);
    this.addDebutPlacementStyles();
    this.setupDebutPlacementEvents();
    this.updateDebutPlacementDisplay();
  }

  createDebutPlacementModalHTML() {
    return `
      <div class="debut-modal-content">
        <div class="debut-modal-header">
          <h2>🎭 Debutホロメン配置</h2>
          <div class="debut-progress">
            <span id="center-status">センター2: 未配置</span>
            <span id="back-status">バック: 0/3</span>
          </div>
        </div>
        
        <div class="debut-modal-body">
          <div class="debut-cards-section">
            <h3>手札のDebutホロメン</h3>
            <div id="debut-cards-list" class="debut-cards-list">
              <!-- Debutカードがここに表示される -->
            </div>
          </div>
          
          <div class="placement-area">
            <h3>配置エリア</h3>
            <div class="stage-layout">
              <div class="center-stage">
                <div class="stage-position" id="center2-slot" data-position="center2">
                  <span class="position-label">センター2</span>
                  <div class="card-slot">必須</div>
                </div>
              </div>
              
              <div class="back-stage">
                <div class="stage-position" id="back1-slot" data-position="back1">
                  <span class="position-label">バック1</span>
                  <div class="card-slot">任意</div>
                </div>
                <div class="stage-position" id="back2-slot" data-position="back2">
                  <span class="position-label">バック2</span>
                  <div class="card-slot">任意</div>
                </div>
                <div class="stage-position" id="back3-slot" data-position="back3">
                  <span class="position-label">バック3</span>
                  <div class="card-slot">任意</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="debut-modal-footer">
          <button id="confirm-debut-placement" class="debut-button debut-button-primary" disabled>
            配置完了
          </button>
          <button id="auto-debut-placement" class="debut-button debut-button-secondary">
            自動配置
          </button>
        </div>
      </div>
    `;
  }

  addDebutPlacementStyles() {
    if (document.getElementById('debut-placement-styles')) return;

    const style = document.createElement('style');
    style.id = 'debut-placement-styles';
    style.textContent = `
      .debut-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }

      .debut-modal-content {
        background: white;
        border-radius: 15px;
        width: 90%;
        max-width: 1000px;
        max-height: 85%;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      }

      .debut-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        background: linear-gradient(135deg, #ff6b6b 0%, #feca57 100%);
        color: white;
      }

      .debut-modal-header h2 {
        margin: 0;
        font-size: 1.5em;
      }

      .debut-progress {
        font-size: 0.9em;
        opacity: 0.9;
      }

      .debut-modal-body {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        padding: 20px;
        max-height: 50vh;
        overflow-y: auto;
      }

      .debut-cards-list {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        max-height: 300px;
        overflow-y: auto;
        padding: 10px;
        border: 2px dashed #ddd;
        border-radius: 10px;
      }

      .debut-card-item {
        padding: 10px;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        background: #f9f9f9;
        min-width: 100px;
        text-align: center;
      }

      .debut-card-item:hover {
        border-color: #ff6b6b;
        background: #ffe0e0;
        transform: scale(1.05);
      }

      .debut-card-item.selected {
        border-color: #ff6b6b;
        background: #ffebeb;
        box-shadow: 0 2px 10px rgba(255, 107, 107, 0.3);
      }

      .stage-layout {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .center-stage, .back-stage {
        display: flex;
        gap: 10px;
        justify-content: center;
      }

      .stage-position {
        text-align: center;
      }

      .position-label {
        display: block;
        font-size: 0.8em;
        color: #666;
        margin-bottom: 5px;
      }

      .card-slot {
        width: 100px;
        height: 140px;
        border: 2px dashed #ddd;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8em;
        color: #999;
        transition: all 0.3s ease;
      }

      .card-slot.can-drop {
        border-color: #ff6b6b;
        background: #ffe0e0;
      }

      .card-slot.filled {
        border-color: #4ecdc4;
        background: #e0f7fa;
        color: #333;
      }

      .debut-modal-footer {
        display: flex;
        gap: 10px;
        padding: 20px;
        border-top: 1px solid #eee;
      }

      .debut-button {
        flex: 1;
        padding: 12px 20px;
        border: none;
        border-radius: 8px;
        font-size: 1em;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .debut-button-primary {
        background: #ff6b6b;
        color: white;
      }

      .debut-button-primary:enabled:hover {
        background: #ff5252;
        transform: translateY(-1px);
      }

      .debut-button-primary:disabled {
        background: #ccc;
        cursor: not-allowed;
      }

      .debut-button-secondary {
        background: #f0f0f0;
        color: #333;
        border: 1px solid #ccc;
      }

      .debut-button-secondary:hover {
        background: #e0e0e0;
      }
    `;

    document.head.appendChild(style);
  }

  setupDebutPlacementEvents() {
    // 自動配置ボタン
    document.getElementById('auto-debut-placement').addEventListener('click', () => {
      this.executeAutoDebutPlacement();
    });

    // 配置完了ボタン
    document.getElementById('confirm-debut-placement').addEventListener('click', () => {
      this.confirmDebutPlacement();
    });
  }

  updateDebutPlacementDisplay() {
    const debutCardsList = document.getElementById('debut-cards-list');
    const state = this.debutPlacementState;
    
    // Debutカードリストを更新
    debutCardsList.innerHTML = '';
    state.debutCards.forEach(card => {
      const cardElement = document.createElement('div');
      cardElement.className = 'debut-card-item';
      cardElement.innerHTML = `
        <div class="card-name">${card.name}</div>
        <div class="card-hp">HP: ${card.hp || '?'}</div>
      `;
      
      cardElement.addEventListener('click', () => {
        this.selectDebutCard(card);
      });
      
      debutCardsList.appendChild(cardElement);
    });
    
    // 進捗状況を更新
    const centerStatus = document.getElementById('center-status');
    const backStatus = document.getElementById('back-status');
    
    centerStatus.textContent = state.centerPlaced ? 'センター2: 配置済み' : 'センター2: 未配置';
    backStatus.textContent = `バック: ${state.usedBackPositions.length}/3`;
    
    // 配置完了ボタンの状態を更新
    const confirmButton = document.getElementById('confirm-debut-placement');
    confirmButton.disabled = !state.centerPlaced;
  }

  selectDebutCard(card) {
    const state = this.debutPlacementState;
    
    if (!state.centerPlaced) {
      // センター2に配置
      this.placeCardInPosition(card, 'center2');
    } else {
      // バックに配置
      const availableBack = state.backPositions.find(pos => !state.usedBackPositions.includes(pos));
      if (availableBack) {
        this.placeCardInPosition(card, availableBack);
      } else {
        alert('バックステージが満員です（最大3枚）');
      }
    }
  }

  placeCardInPosition(card, position) {
    const state = this.debutPlacementState;
    const player = this.players[state.playerId];
    
    // カードを配置
    player[position] = card;
    
    // 手札から削除
    const handIndex = player.hand.findIndex(handCard => handCard.id === card.id);
    player.hand.splice(handIndex, 1);
    
    // 状態を更新
    const cardIndex = state.debutCards.findIndex(debutCard => debutCard.id === card.id);
    state.debutCards.splice(cardIndex, 1);
    
    if (position === 'center2') {
      state.centerPlaced = true;
    } else {
      state.usedBackPositions.push(position);
    }
    
    // スロット表示を更新
    const slot = document.getElementById(`${position}-slot`).querySelector('.card-slot');
    slot.textContent = card.name;
    slot.classList.add('filled');
    
    // 表示を更新
    this.updateDebutPlacementDisplay();
    this.updateUI();
    
    console.log(`${card.name}を${position}に配置`);
  }

  executeAutoDebutPlacement() {
    const state = this.debutPlacementState;
    
    // モーダルを閉じる
    document.getElementById('debut-placement-modal').remove();
    
    // 自動配置を実行
    this.autoDebutPlacement(state.playerId);
  }

  confirmDebutPlacement() {
    const state = this.debutPlacementState;
    
    if (!state.centerPlaced) {
      alert('センター2への配置は必須です');
      return;
    }
    
    // モーダルを閉じる
    document.getElementById('debut-placement-modal').remove();
    
    const placedCount = 1 + state.usedBackPositions.length;
    alert(`Debut配置完了！\n${placedCount}枚のDebutホロメンを配置しました`);
    
    // 次のプレイヤーまたは次のフェーズへ
    this.proceedToNextDebutPlayer(state.playerId);
  }

  autoDebutPlacement(playerId) {
    const player = this.players[playerId];
    const debutCards = player.hand.filter(card => 
      card.card_type && card.card_type.includes('ホロメン') && card.bloom_level === 'Debut'
    );
    
    // センター2に1枚配置
    const centerCard = debutCards[0];
    player.center2 = centerCard;
    const centerIndex = player.hand.findIndex(card => card.id === centerCard.id);
    player.hand.splice(centerIndex, 1);
    
    console.log(`プレイヤー${playerId}が${centerCard.name}をセンター2に配置`);
    
    // 残りのDebutをバックに配置
    const remainingDebuts = player.hand.filter(card => 
      card.card_type && card.card_type.includes('ホロメン') && card.bloom_level === 'Debut'
    );
    
    let backPositions = ['back1', 'back2', 'back3'];
    remainingDebuts.slice(0, 3).forEach((card, index) => {
      player[backPositions[index]] = card;
      const handIndex = player.hand.findIndex(handCard => handCard.id === card.id);
      player.hand.splice(handIndex, 1);
      console.log(`プレイヤー${playerId}が${card.name}を${backPositions[index]}に配置`);
    });
    
    // UIを更新
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
    
    // センター2に1枚配置
    const centerCard = debutCards[0];
    player.center2 = centerCard;
    const centerIndex = player.hand.findIndex(card => card.id === centerCard.id);
    player.hand.splice(centerIndex, 1);
    
    console.log(`CPU（プレイヤー${playerId}）が${centerCard.name}をセンター2に配置`);
    
    // 残りのDebutをバックに配置（簡単なAI）
    const remainingDebuts = player.hand.filter(card => 
      card.card_type && card.card_type.includes('ホロメン') && card.bloom_level === 'Debut'
    );
    
    let backPositions = ['back1', 'back2', 'back3'];
    remainingDebuts.slice(0, 3).forEach((card, index) => {
      player[backPositions[index]] = card;
      const handIndex = player.hand.findIndex(handCard => handCard.id === card.id);
      player.hand.splice(handIndex, 1);
      console.log(`CPU（プレイヤー${playerId}）が${card.name}を${backPositions[index]}に配置`);
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
    
    // 最初のターンを開始
    this.startTurn();
  }

  startTurn() {
    console.log(`ターン${this.gameState.turnCount}開始 - プレイヤー${this.gameState.currentPlayer}のターン`);
    this.gameState.currentPhase = 0; // リセットステップから開始
    this.updateUI();
  }
}

// グローバルインスタンス
let battleEngine = null;

// ページ読み込み完了時にバトルエンジンを初期化
document.addEventListener('DOMContentLoaded', () => {
  battleEngine = new HololiveBattleEngine();
  window.battleEngine = battleEngine; // グローバルアクセス用
});
