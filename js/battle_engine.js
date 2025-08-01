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
      winner: null
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
        <div id="deck-status">デッキ: 未設定</div>
        <div id="ready-status">準備: 未完了</div>
      </div>
      <button class="control-button" id="select-deck">📚 デッキ選択</button>
      <button class="control-button" id="start-game" disabled>ゲーム開始</button>
      <button class="control-button" id="next-phase" disabled>次のフェーズ</button>
      <button class="control-button" id="end-turn" disabled>ターン終了</button>
      <button class="control-button" id="shuffle-deck">デッキシャッフル</button>
      <button class="control-button" id="reset-game">ゲームリセット</button>
    `;
    
    document.body.appendChild(controlPanel);

    // イベントリスナーの設定
    document.getElementById('select-deck').addEventListener('click', () => this.showDeckSelection());
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
    const readyStatus = document.getElementById('ready-status');
    const startButton = document.getElementById('start-game');
    
    if (!deckStatus || !readyStatus || !startButton) return;
    
    const player = this.players[1];
    const hasDeck = player.deck.length > 0 || player.yellDeck.length > 0;
    const hasOshi = !!player.oshi;
    
    if (hasDeck && hasOshi) {
      deckStatus.innerHTML = `デッキ: ✅ 設定済み<br><small>メイン${player.deck.length}枚 / エール${player.yellDeck.length}枚 / 推し${player.oshi.name}</small>`;
      readyStatus.innerHTML = '準備: ✅ 完了';
      startButton.disabled = false;
      startButton.style.background = '#4CAF50';
    } else if (hasDeck) {
      deckStatus.innerHTML = `デッキ: ⚠️ 部分設定<br><small>メイン${player.deck.length}枚 / エール${player.yellDeck.length}枚</small>`;
      readyStatus.innerHTML = '準備: ⚠️ 推しホロメン未設定';
      startButton.disabled = false;
      startButton.style.background = '#ff9800';
    } else {
      deckStatus.innerHTML = 'デッキ: ❌ 未設定';
      readyStatus.innerHTML = '準備: ❌ デッキを選択してください';
      startButton.disabled = false; // テストデッキでも開始可能
      startButton.style.background = '#2196f3';
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

  showDeckSelection() {
    if (!window.DeckSelectionUI) {
      alert('デッキ管理システムが読み込まれていません');
      return;
    }

    const deckSelectionUI = new window.DeckSelectionUI(this);
    deckSelectionUI.showDeckSelectionModal();
  }

  startGame() {
    console.log('ゲーム開始準備チェック');
    
    // デッキチェック
    if (this.players[1].deck.length === 0 && this.players[1].yellDeck.length === 0) {
      alert('デッキが設定されていません。\n\n📚「デッキ選択」ボタンからデッキを選択してください。\n\nまたはテストデッキで始めることもできます。');
      
      if (confirm('テストデッキでゲームを開始しますか？\n\n⚠️ 注意: テストデッキは学習目的のみで、バランスが調整されていません。')) {
        // テストデッキで続行
        console.log('テストデッキでゲーム開始');
      } else {
        // デッキ選択画面を開く
        this.showDeckSelection();
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
    
    // プレイヤー2（CPU）のテストデッキを作成（独立したデッキ）
    const testCards2 = this.getTestCards();
    this.players[2].deck = [...testCards2.holomen, ...testCards2.support];
    this.players[2].yellDeck = [...testCards2.yell];
    this.players[2].oshi = testCards2.oshi;
    
    console.log(`プレイヤー2テストデッキ作成: メイン${this.players[2].deck.length}枚, エール${this.players[2].yellDeck.length}枚`);
    
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
      winner: null
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
    
    handArea.innerHTML = '';
    
    player.hand.forEach((card, index) => {
      const cardElement = document.createElement('div');
      cardElement.className = 'hand-card';
      cardElement.style.backgroundImage = `url(${card.image_url})`;
      cardElement.title = card.name;
      cardElement.addEventListener('click', () => this.handleHandCardClick(card, index));
      
      handArea.appendChild(cardElement);
    });
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
      const cardElement = this.createCardElement(card, displayType, index);
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

  createCardElement(card, displayType, index) {
    const cardElement = document.createElement('div');
    cardElement.className = 'card face-down'; // デフォルトは裏向き
    
    // カードの種類による表示切り替え
    if (card && card.card_type === '推しホロメン') {
      cardElement.classList.remove('face-down');
      cardElement.classList.add('face-up');
      if (card.image_url) {
        cardElement.style.backgroundImage = `url(${card.image_url})`;
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
}

// グローバルインスタンス
let battleEngine = null;

// ページ読み込み完了時にバトルエンジンを初期化
document.addEventListener('DOMContentLoaded', () => {
  battleEngine = new HololiveBattleEngine();
  window.battleEngine = battleEngine; // グローバルアクセス用
});
