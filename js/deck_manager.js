/**
 * デッキ管理ユーティリティ
 * デッキビルダーとバトルシミュレーターの連携機能
 */

class DeckManager {
  constructor() {
    this.savedDecks = this.loadSavedDecks();
    this.cardDatabase = null; // 独自のカードデータベースキャッシュ
  }

  // カードデータベースを取得（バトルエンジンがあれば利用、なければ独自読み込み）
  async getCardDatabase() {
    // バトルエンジンが利用可能な場合はそれを使用
    if (window.battleEngine && window.battleEngine.cardDatabase) {
      console.log('📁 [Deck Manager] バトルエンジンのカードDBを使用');
      return window.battleEngine.cardDatabase;
    }

    // 独自にカードデータを読み込み（キャッシュあり）
    if (!this.cardDatabase) {
      try {
        console.log('📁 [Deck Manager] 独自にカードデータを読み込み中...');
        const response = await fetch('./json_file/card_data.json');
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        this.cardDatabase = await response.json();
        console.log('📁 [Deck Manager] カードデータ読み込み成功:', Object.keys(this.cardDatabase).length, '枚');
      } catch (error) {
        console.error('❌ [Deck Manager] カードデータの読み込みに失敗:', error);
        return null;
      }
    }

    return this.cardDatabase;
  }

  // 保存されたデッキを読み込み
  loadSavedDecks() {
    try {
      const savedDecks = localStorage.getItem("deckData");
      return savedDecks ? JSON.parse(savedDecks) : {};
    } catch (error) {
      return {};
    }
  }

  // デッキリストを取得
  getDeckNames() {
    return Object.keys(this.savedDecks);
  }

  // 特定のデッキを取得
  getDeck(deckName) {
    return this.savedDecks[deckName] || null;
  }

  // デッキをカードオブジェクトに変換
  async convertDeckToCards(deckCardIds) {
    // カードデータベースを取得（バトルエンジンまたは独自読み込み）
    const cardDatabase = await this.getCardDatabase();
    if (!cardDatabase) {
      return { holomen: [], support: [], yell: [], oshi: null };
    }
    const deck = {
      holomen: [],
      support: [],
      yell: [],
      oshi: null
    };

    deckCardIds.forEach(cardId => {
      const card = cardDatabase[cardId];
      if (!card) {
        return;
      }

      if (card.card_type === '推しホロメン') {
        deck.oshi = card;
      } else if (card.card_type === 'エール') {
        deck.yell.push(card);
      } else if (card.card_type === 'ホロメン') {
        deck.holomen.push(card);
      } else if (card.card_type.includes('サポート')) {
        deck.support.push(card);
      }
    });

    return deck;
  }

  // デッキの妥当性チェック
  validateDeck(deck) {
    const errors = [];

    // 推しホロメンが1枚であることを確認
    if (!deck.oshi) {
      errors.push("推しホロメンが設定されていません");
    }

    // メインデッキ枚数チェック（50枚）
    const mainDeckSize = deck.holomen.length + deck.support.length;
    if (mainDeckSize !== 50) {
      errors.push(`メインデッキは50枚である必要があります（現在: ${mainDeckSize}枚）`);
    }

    // エールデッキ枚数チェック（20枚）
    if (deck.yell.length !== 20) {
      errors.push(`エールデッキは20枚である必要があります（現在: ${deck.yell.length}枚）`);
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // デッキ統計を取得
  getDeckStats(deck) {
    const colorCount = {};
    const rarityCount = {};
    
    [...deck.holomen, ...deck.support].forEach(card => {
      // 色の統計
      if (card.color) {
        colorCount[card.color] = (colorCount[card.color] || 0) + 1;
      }
      
      // レアリティの統計
      if (card.rarity) {
        rarityCount[card.rarity] = (rarityCount[card.rarity] || 0) + 1;
      }
    });

    return {
      mainDeckSize: deck.holomen.length + deck.support.length,
      yellDeckSize: deck.yell.length,
      holomenCount: deck.holomen.length,
      supportCount: deck.support.length,
      colorDistribution: colorCount,
      rarityDistribution: rarityCount
    };
  }
}

/**
 * デッキ選択UI
 */
class DeckSelectionUI {
  constructor(battleEngine, playerId = 1) {
    this.battleEngine = battleEngine;
    this.playerId = playerId;
    this.deckManager = new DeckManager();
    this.selectedDeck = null;
    this.instanceId = Math.random().toString(36).substr(2, 9); // デバッグ用ID
    console.log(`🆔 [Deck Selection] インスタンス作成: ${this.instanceId}, Player ${playerId}`);
  }

  // デッキ選択モーダルを表示
  showDeckSelectionModal() {
    console.log(`🚀 [Deck Selection] showDeckSelectionModal開始 - インスタンス: ${this.instanceId}`);
    
    // 既存のモーダルがあれば削除
    const existingModal = document.getElementById('deck-selection-modal');
    if (existingModal) {
      console.log('🔄 [Deck Selection] 既存のモーダルを削除');
      existingModal.remove();
    }
    
    const modal = this.createDeckSelectionModal();
    document.body.appendChild(modal);
    
    // DOM追加後、次のフレームでデッキリストを読み込み
    requestAnimationFrame(() => {
      this.populateDeckList();
    });
  }

  createDeckSelectionModal() {
    const playerName = this.playerId === 1 ? 'プレイヤー' : '相手';
    const modal = document.createElement('div');
    modal.id = 'deck-selection-modal';
    modal.className = 'deck-modal';
    modal.innerHTML = `
      <div class="deck-modal-content">
        <div class="deck-modal-header">
          <h2>📚 ${playerName}デッキ選択</h2>
          <button class="deck-modal-close" onclick="this.closest('.deck-modal').remove()">×</button>
        </div>
        
        <div class="deck-modal-body">
          <div class="deck-list-container">
            <h3>保存済みデッキ</h3>
            <div id="saved-deck-list" class="saved-deck-list">
              <!-- デッキリストがここに表示される -->
            </div>
          </div>
          
          <div class="deck-preview-container">
            <h3>デッキプレビュー</h3>
            <div id="deck-preview" class="deck-preview">
              <p>デッキを選択してください</p>
            </div>
            
            <div class="deck-actions">
              <button id="confirm-deck-selection" class="deck-button deck-button-primary" disabled>
                このデッキを${playerName}用に使用
              </button>
              <button class="deck-button deck-button-secondary" onclick="window.open('deck_builder.html', '_blank')">
                新しいデッキを作成
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // CSS スタイルを追加
    this.addModalStyles();

    // イベントリスナーを設定
    const confirmButton = modal.querySelector('#confirm-deck-selection');
    confirmButton.addEventListener('click', () => {
      console.log(`🎯 [Deck Selection] 確認ボタンがクリックされました - インスタンス: ${this.instanceId}`);
      console.log('🎯 [Deck Selection] this.selectedDeck:', this.selectedDeck);
      this.confirmDeckSelection();
    });

    return modal;
  }

  addModalStyles() {
    if (document.getElementById('deck-modal-styles')) return;

    const style = document.createElement('style');
    style.id = 'deck-modal-styles';
    style.textContent = `
      .deck-modal {
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

      .deck-modal-content {
        background: white;
        border-radius: 15px;
        width: 90%;
        max-width: 900px;
        max-height: 80%;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
      }

      .deck-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .deck-modal-header h2 {
        margin: 0;
        font-size: 1.5em;
      }

      .deck-modal-close {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 5px 10px;
        border-radius: 50%;
        transition: background 0.3s;
      }

      .deck-modal-close:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .deck-modal-body {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        padding: 20px;
        max-height: 60vh;
        overflow-y: auto;
      }

      .saved-deck-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-height: 400px;
        overflow-y: auto;
      }

      .deck-item {
        padding: 15px;
        border: 2px solid #e0e0e0;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.3s ease;
        background: #f9f9f9;
      }

      .deck-item:hover {
        border-color: #667eea;
        background: #f0f0ff;
      }

      .deck-item.selected {
        border-color: #667eea;
        background: #e8ecff;
        box-shadow: 0 2px 10px rgba(102, 126, 234, 0.3);
      }

      .deck-item-name {
        font-weight: bold;
        font-size: 1.1em;
        color: #333;
        margin-bottom: 5px;
      }

      .deck-item-stats {
        font-size: 0.9em;
        color: #666;
      }

      .deck-preview {
        background: #f9f9f9;
        border-radius: 10px;
        padding: 15px;
        min-height: 300px;
      }

      .deck-preview-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 2px solid #e0e0e0;
      }

      .deck-preview-name {
        font-size: 1.2em;
        font-weight: bold;
        color: #333;
      }

      .deck-preview-stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-bottom: 15px;
      }

      .deck-stat-item {
        background: white;
        padding: 8px 12px;
        border-radius: 8px;
        text-align: center;
        border: 1px solid #e0e0e0;
      }

      .deck-stat-label {
        font-size: 0.8em;
        color: #666;
      }

      .deck-stat-value {
        font-size: 1.1em;
        font-weight: bold;
        color: #333;
      }

      .deck-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
      }

      .deck-button {
        flex: 1;
        padding: 12px 20px;
        border: none;
        border-radius: 8px;
        font-size: 1em;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .deck-button-primary {
        background: #667eea;
        color: white;
      }

      .deck-button-primary:enabled:hover {
        background: #5a6fd8;
        transform: translateY(-1px);
      }

      .deck-button-primary:disabled {
        background: #ccc;
        cursor: not-allowed;
      }

      .deck-button-secondary {
        background: #f0f0f0;
        color: #333;
        border: 1px solid #ccc;
      }

      .deck-button-secondary:hover {
        background: #e0e0e0;
      }

      @media (max-width: 768px) {
        .deck-modal-body {
          grid-template-columns: 1fr;
        }
      }
    `;

    document.head.appendChild(style);
  }

  populateDeckList() {
    console.log('📋 [Deck Selection] デッキリスト読み込み開始');
    
    const deckList = document.getElementById('saved-deck-list');
    if (!deckList) {
      console.error('❌ [Deck Selection] saved-deck-list要素が見つかりません');
      return;
    }
    
    const deckNames = this.deckManager.getDeckNames();
    console.log(`📋 [Deck Selection] 保存されたデッキ数: ${deckNames.length}`);

    if (deckNames.length === 0) {
      console.log('📋 [Deck Selection] デッキが存在しないため、作成メッセージを表示');
      deckList.innerHTML = `
        <div style="text-align: center; padding: 20px; color: #666;">
          <p>保存されたデッキがありません</p>
          <button class="deck-button deck-button-secondary" onclick="window.open('deck_builder.html', '_blank')">
            デッキを作成する
          </button>
        </div>
      `;
      return;
    }

    deckList.innerHTML = '';
    console.log(`📋 [Deck Selection] デッキリスト作成中: ${deckNames.join(', ')}`);

    deckNames.forEach(deckName => {
      const deckCardIds = this.deckManager.getDeck(deckName);
      const deckItem = document.createElement('div');
      deckItem.className = 'deck-item';
      deckItem.innerHTML = `
        <div class="deck-item-name">${deckName}</div>
        <div class="deck-item-stats">カード数: ${deckCardIds.length}枚</div>
      `;

      deckItem.addEventListener('click', () => {
        console.log(`🎯 [Deck Selection] デッキ選択: ${deckName}`);
        this.selectDeck(deckName, deckItem);
      });

      deckList.appendChild(deckItem);
    });
    
    console.log('✅ [Deck Selection] デッキリスト表示完了');
  }

  async selectDeck(deckName, deckElement) {
    console.log(`🎯 [Deck Selection] selectDeck呼び出し: ${deckName} - インスタンス: ${this.instanceId}`);
    
    // 前の選択を解除
    document.querySelectorAll('.deck-item.selected').forEach(item => {
      item.classList.remove('selected');
    });

    // 新しい選択をマーク
    deckElement.classList.add('selected');
    this.selectedDeck = deckName;
    console.log(`✅ [Deck Selection] this.selectedDeck設定完了: ${this.selectedDeck}`);

    // デッキプレビューを更新
    await this.updateDeckPreview(deckName);

    // 確認ボタンを有効化
    const confirmButton = document.getElementById('confirm-deck-selection');
    if (confirmButton) {
      confirmButton.disabled = false;
      console.log('✅ [Deck Selection] 確認ボタンを有効化しました');
    } else {
      console.error('❌ [Deck Selection] 確認ボタンが見つかりません');
    }
  }

  async updateDeckPreview(deckName) {
    const previewContainer = document.getElementById('deck-preview');
    const deckCardIds = this.deckManager.getDeck(deckName);

    try {
      const deck = await this.deckManager.convertDeckToCards(deckCardIds);
      const stats = this.deckManager.getDeckStats(deck);
      const validation = this.deckManager.validateDeck(deck);

      previewContainer.innerHTML = `
        <div class="deck-preview-header">
          <div class="deck-preview-name">${deckName}</div>
          <div class="deck-validation ${validation.isValid ? 'valid' : 'invalid'}">
            ${validation.isValid ? '✅ 有効' : '❌ 無効'}
          </div>
        </div>

        <div class="deck-preview-stats">
          <div class="deck-stat-item">
            <div class="deck-stat-label">メインデッキ</div>
            <div class="deck-stat-value">${stats.mainDeckSize}枚</div>
          </div>
          <div class="deck-stat-item">
            <div class="deck-stat-label">エールデッキ</div>
            <div class="deck-stat-value">${stats.yellDeckSize}枚</div>
          </div>
          <div class="deck-stat-item">
            <div class="deck-stat-label">ホロメン</div>
            <div class="deck-stat-value">${stats.holomenCount}枚</div>
          </div>
          <div class="deck-stat-item">
            <div class="deck-stat-label">サポート</div>
            <div class="deck-stat-value">${stats.supportCount}枚</div>
          </div>
        </div>

        ${!validation.isValid ? `
          <div class="deck-errors">
            <h4>エラー:</h4>
            <ul>
              ${validation.errors.map(error => `<li>${error}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <div class="deck-color-distribution">
          <h4>色分布:</h4>
          <div class="color-chips">
            ${Object.entries(stats.colorDistribution).map(([color, count]) => 
              `<span class="color-chip color-${color}">${color}: ${count}枚</span>`
            ).join('')}
          </div>
        </div>
      `;

    } catch (error) {
      previewContainer.innerHTML = `
        <div style="color: red; text-align: center;">
          <p>デッキプレビューの読み込みに失敗しました</p>
          <p>カードデータベースが読み込まれていない可能性があります</p>
        </div>
      `;
    }
  }

  async confirmDeckSelection() {
    console.log(`🎯 [Deck Selection] confirmDeckSelection開始 - インスタンス: ${this.instanceId}`);
    console.log('選択されたデッキ:', this.selectedDeck);
    
    if (!this.selectedDeck) {
      console.warn('⚠️ [Deck Selection] デッキが選択されていません');
      return;
    }

    try {
      const deckCardIds = this.deckManager.getDeck(this.selectedDeck);
      const deck = await this.deckManager.convertDeckToCards(deckCardIds);
      const validation = this.deckManager.validateDeck(deck);

      if (!validation.isValid) {
        if (!confirm(`このデッキには以下の問題があります:\n${validation.errors.join('\n')}\n\nそれでも使用しますか？`)) {
          return;
        }
      }

      // カード効果を読み込み
      await this.loadCardEffects(deck);

      // バトルエンジンにデッキを設定
      this.applyDeckToBattle(deck);

      // モーダルを閉じる
      const modal = document.getElementById('deck-selection-modal');
      if (modal) {
        modal.remove();
        console.log('✅ [Deck Selection] モーダルを閉じました');
      }

      const playerName = this.playerId === 1 ? 'プレイヤー' : '相手';
      console.log(`✅ [Deck Selection] デッキ適用完了: ${this.selectedDeck} → ${playerName}`);
      alert(`デッキ「${this.selectedDeck}」が${playerName}用に適用されました！`);

    } catch (error) {
      console.error('❌ [Deck Selection] デッキ適用エラー:', error);
      alert("デッキの適用に失敗しました");
    }
  }

  /**
   * デッキ選択時の処理（軽量化版）
   * @param {Object} deck - デッキオブジェクト
   */
  async loadCardEffects(deck) {
    try {
      console.log(`🔮 [Card Effects] デッキ選択完了 - カード効果読み込みはゲーム開始時に延期`);
      
      // メタデータ読み込みは削除 - ページ読み込み時とゲーム開始時のみ実行
      // パフォーマンス向上のため、デッキ選択時は何も読み込まない
      
      const cardCount = [
        ...(deck.holomen || []),
        ...(deck.support || []),
        ...(deck.yell || []),
        ...(deck.oshi ? [deck.oshi] : [])
      ].length;
      
      console.log(`🔮 [Card Effects] デッキカード ${cardCount}種類 - ゲーム開始時に読み込み予定`);

    } catch (error) {
      console.error('🔮 [Card Effects] デッキ選択処理中にエラーが発生:', error);
      // エラーが発生してもデッキ選択は続行
    }
  }

  applyDeckToBattle(deck) {
    if (!this.battleEngine.players[this.playerId]) {
      return;
    }

    const player = this.battleEngine.players[this.playerId];

    // デッキをクリア
    player.deck = [];
    player.yellDeck = [];
    player.oshi = null;

    // 新しいデッキを設定
    player.deck = [...deck.holomen, ...deck.support];
    player.yellDeck = [...deck.yell];
    player.oshi = deck.oshi;

    // State Managerの状態も同期
    if (this.battleEngine.stateManager) {
      this.battleEngine.stateManager.updateState('UPDATE_PLAYER_CARDS', {
        player: this.playerId,
        area: 'deck',
        cards: [...deck.holomen, ...deck.support]
      });
      
      this.battleEngine.stateManager.updateState('UPDATE_PLAYER_CARDS', {
        player: this.playerId,
        area: 'yellDeck',
        cards: [...deck.yell]
      });
      
      this.battleEngine.stateManager.updateState('UPDATE_PLAYER_CARDS', {
        player: this.playerId,
        area: 'oshi',
        cards: deck.oshi
      });
    }

    // デッキをシャッフル
    this.battleEngine.shuffleDeck(this.playerId);

    
    // UIを更新
    this.battleEngine.updateUI();
    
    // ゲーム状況も更新
    this.battleEngine.updateGameStatus();
  }
}

// グローバルアクセス用
window.DeckManager = DeckManager;
window.DeckSelectionUI = DeckSelectionUI;
