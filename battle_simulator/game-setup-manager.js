/**
 * Game Setup Manager
 * ゲーム開始時のセットアップ処理を管理
 */

class HololiveGameSetupManager {
  constructor(battleEngine) {
    this.engine = battleEngine;
    this.gameState = battleEngine.gameState;
    this.players = battleEngine.players;
    this.cardDatabase = battleEngine.cardDatabase;
    this.modalUI = battleEngine.modalUI;
    
  }

  /**
   * テストデッキが必要かチェックして作成
   */
  createTestDeckIfNeeded() {
    const savedDecks = localStorage.getItem("deckData");
    if (!savedDecks || Object.keys(JSON.parse(savedDecks)).length === 0) {
      this.createAndSaveTestDeck();
    }
  }

  /**
   * テストデッキを作成してローカルストレージに保存
   */
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
    
  }

  /**
   * ゲーム開始処理
   */
  startGame() {
    
    // プレイヤーデッキチェック
    if (this.players[1].deck.length === 0 && this.players[1].yellDeck.length === 0) {
      alert('プレイヤーデッキが設定されていません。\n\n📚「プレイヤーデッキ選択」ボタンからデッキを選択してください。\n\nまたはテストデッキで始めることもできます。');
      
      if (confirm('テストデッキでゲームを開始しますか？\n\n⚠️ 注意: テストデッキは学習目的のみで、バランスが調整されていません。')) {
        // テストデッキで続行
      } else {
        // プレイヤーデッキ選択画面を開く
        this.engine.showDeckSelection(1);
        return;
      }
    }
    
    // 相手デッキチェック
    if (this.players[2].deck.length === 0 && this.players[2].yellDeck.length === 0) {
      alert('相手デッキが設定されていません。\n\n🤖「相手デッキ選択」ボタンからデッキを選択してください。\n\nまたはテストデッキで始めることもできます。');
      
      if (confirm('相手もテストデッキでゲームを開始しますか？')) {
        // 相手もテストデッキで続行
      } else {
        // 相手デッキ選択画面を開く
        this.engine.showDeckSelection(2);
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
    this.gameState.currentPhase = -1; // 準備ステップから開始（マリガンフェーズ）
    this.gameState.turnCount = 1;
    
    // ゲーム開始ログ
    if (window.logGameEvent) {
      window.logGameEvent('system', 'ゲームが開始されました！');
      window.logGameEvent('system', `先行: ${this.gameState.firstPlayer === 1 ? 'プレイヤー' : '対戦相手'}`);
    }
    
    // セットアップ実行
    this.executeGameSetup();
    
    // デッキカード効果の事前読み込み
    this.preloadDeckCardEffects();
    
    // UIの更新
    this.engine.updateTurnInfo();
    this.engine.updateUI();
    
    // フェーズハイライトを初期化
    this.engine.updatePhaseHighlight();
    
    // コントロールボタンの状態更新
    document.getElementById('start-game').disabled = true;
    document.getElementById('next-phase').disabled = false;
    document.getElementById('end-turn').disabled = false;
  }

  /**
   * ゲーム開始前のデッキ構成を検証
   */
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

  /**
   * ゲームセットアップの実行
   */
  executeGameSetup() {
    
    // デバッグ：ゲーム状態確認
    
    // 0. 先行・後攻の決定
    this.decideTurnOrder();
    
    // テストデッキの作成（必要に応じて）
    this.createTestDecks();
    
    // 1. デッキシャッフル
    this.shuffleDeck(1);
    this.shuffleDeck(2);
    
    // 2. 推しホロメンを配置
    this.placeOshiCards();
    
    // 3. ライフを設定
    this.setupLifeCards();
    
    // 4. 初期手札を配る
    this.dealInitialHands();
    
    // 5. ゲーム状況を表示
    this.logGameStatus();
    
    // 注意: マリガン処理は先行・後攻決定後に setFirstPlayer() で開始される
  }

  /**
   * ライフカードの設定
   */
  setupLifeCards() {
    // 両プレイヤーのライフを設定
    for (let playerId = 1; playerId <= 2; playerId++) {
      const player = this.players[playerId];
      const lifeCount = player.oshi?.life || 6;
      
      
      // 既存のライフをクリア
      player.life = [];
      
      // エールデッキからライフ分のカードを移動
      for (let i = 0; i < lifeCount && player.yellDeck.length > 0; i++) {
        const lifeCard = player.yellDeck.pop();
        player.life.push(lifeCard);
      }
      
    }
  }

  /**
   * ゲーム状況をログ出力
   */
  logGameStatus() {
    const player1 = this.players[1];
    const player2 = this.players[2];
    
    
    
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

  /**
   * テストデッキの作成
   */
  createTestDecks() {
    // プレイヤー1のデッキが空の場合のみテストデッキを作成
    if (this.players[1].deck.length === 0) {
      const testCards1 = this.getTestCards();
      
      // プロキシ経由で設定（State Managerに反映される）
      this.players[1].deck = [...testCards1.holomen, ...testCards1.support];
      this.players[1].yellDeck = [...testCards1.yell];
      this.players[1].oshi = testCards1.oshi;
      
    }
    
    // プレイヤー2のデッキが空の場合のみテストデッキを作成
    if (this.players[2].deck.length === 0) {
      const testCards2 = this.getTestCards();
      
      // プロキシ経由で設定（State Managerに反映される）
      this.players[2].deck = [...testCards2.holomen, ...testCards2.support];
      this.players[2].yellDeck = [...testCards2.yell];
      this.players[2].oshi = testCards2.oshi;
      
    }
    
    // デッキシャッフルと推しホロメン配置は executeGameSetup() で行うため削除
  }

  /**
   * テスト用カードセットを取得
   */
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

  /**
   * 推しホロメンの配置
   */
  placeOshiCards() {
    // 推しホロメンを推しポジションに配置
    this.players[1].oshi = this.players[1].oshi;
    this.players[2].oshi = this.players[2].oshi;
    
  }

  /**
   * 初期手札を配布
   */
  dealInitialHands() {
    
    // シャッフル後のデッキの状態を確認
    const player1DeckTop = this.players[1].deck.slice(-7).map(c => c.name || c.card_id);
    const player2DeckTop = this.players[2].deck.slice(-7).map(c => c.name || c.card_id);
    
    // 初期手札を7枚配る
    for (let i = 0; i < 7; i++) {
      this.engine.drawCard(1);
      this.engine.drawCard(2);
    }
    
    // 配布後の手札を確認
    const player1Hand = this.players[1].hand.map(c => c.name || c.card_id);
    const player2Hand = this.players[2].hand.map(c => c.name || c.card_id);
  }

  /**
   * デッキをシャッフル
   */
  shuffleDeck(playerId) {
    const deck = this.players[playerId].deck;
    const shuffledDeck = [...deck]; // コピーを作成
    
    
    // Fisher-Yates シャッフル
    for (let i = shuffledDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
    }
    
    
    // シャッフル結果をプロキシ経由で設定（State Managerに反映される）
    this.players[playerId].deck = shuffledDeck;
  }

  /**
   * 先行・後攻の決定
   */
  decideTurnOrder() {
    
    if (this.gameState.turnOrderDecided) {
      return;
    }

    // ランダムで先行・後攻を決定
    const randomFirstPlayer = Math.random() < 0.5 ? 1 : 2;
    
    // ポップアップで選択
    this.showTurnOrderPopup(randomFirstPlayer);
    
  }

  /**
   * 先行・後攻選択のポップアップを表示
   */
  showTurnOrderPopup(suggestedPlayer) {
    
    // モーダルUIで選択
    if (this.modalUI && this.modalUI.showTurnOrderModal) {
      this.modalUI.showTurnOrderModal(0.5, suggestedPlayer, (playerId, isManual) => {
        this.setFirstPlayer(playerId, isManual);
      });
    } else {
    }
    
  }

  /**
   * 先行プレイヤーを設定
   */
  setFirstPlayer(playerId, isManual) {
    this.gameState.firstPlayer = playerId;
    this.gameState.currentPlayer = playerId;
    this.gameState.turnOrderDecided = true;
    
    const methodText = isManual ? '手動選択' : 'ランダム';
    const playerText = playerId === 1 ? 'プレイヤー' : '相手';
    
    
    // メッセージ表示
    alert(`${methodText}により${playerId === 1 ? 'あなた' : '相手'}が先行です`);
    
    // 先行・後攻決定後にマリガンフェーズを開始
    setTimeout(() => {
      this.engine.startMulliganPhase();
    }, 500);
  }

  /**
   * デッキに含まれるカードの効果を事前読み込み
   */
  async preloadDeckCardEffects() {
    if (!this.engine.cardEffectManager) {
      return;
    }

    
    let totalLoaded = 0;
    const uniqueCardIds = new Set();

    // 全プレイヤーのデッキからユニークなカードIDを収集
    for (let playerId of [1, 2]) {
      const player = this.players[playerId];
      
      // メインデッキ
      if (player.deck) {
        player.deck.forEach(card => {
          if (card.id) uniqueCardIds.add(card.id);
        });
      }
      
      // エールデッキ
      if (player.yellDeck) {
        player.yellDeck.forEach(card => {
          if (card.id) uniqueCardIds.add(card.id);
        });
      }
      
      // 推しホロメン
      if (player.oshi && player.oshi.id) {
        uniqueCardIds.add(player.oshi.id);
      }
    }


    let effectFilesFound = 0;
    let effectFilesNotFound = 0;

    // 効果を順次読み込み
    for (const cardId of uniqueCardIds) {
      try {
        const effect = await this.engine.cardEffectManager.loadCardEffect(cardId);
        if (effect) {
          totalLoaded++;
          effectFilesFound++;
        } else {
          effectFilesNotFound++;
        }
      } catch (error) {
        effectFilesNotFound++;
      }
    }

  }
}

// グローバルスコープに公開
window.HololiveGameSetupManager = HololiveGameSetupManager;
