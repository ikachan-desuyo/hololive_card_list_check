/**
 * デッキ管理ユーティリティ
 * デッキビルダーとバトルシミュレーターの連携機能
 */

class DeckManager {
  constructor() {
    this.savedDecks = this.loadSavedDecks();
  }

  // 保存されたデッキを読み込み
  loadSavedDecks() {
    try {
      const savedDecks = localStorage.getItem("deckData");
      return savedDecks ? JSON.parse(savedDecks) : {};
    } catch (error) {
      console.error("デッキデータの読み込みに失敗:", error);
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
    if (!window.battleEngine || !window.battleEngine.cardDatabase) {
      console.error("カードデータベースが読み込まれていません");
      return { holomen: [], support: [], yell: [], oshi: null };
    }

    const cardDatabase = window.battleEngine.cardDatabase;
    const deck = {
      holomen: [],
      support: [],
      yell: [],
      oshi: null
    };

    deckCardIds.forEach(cardId => {
      const card = cardDatabase[cardId];
      if (!card) {
        console.warn(`カード ${cardId} が見つかりません`);
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
  }

  // デッキ選択モーダルを表示
  showDeckSelectionModal() {
    const modal = this.createDeckSelectionModal();
    document.body.appendChild(modal);
    this.populateDeckList();
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
    modal.querySelector('#confirm-deck-selection').addEventListener('click', () => {
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
    const deckList = document.getElementById('saved-deck-list');
    const deckNames = this.deckManager.getDeckNames();

    if (deckNames.length === 0) {
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

    deckNames.forEach(deckName => {
      const deckCardIds = this.deckManager.getDeck(deckName);
      const deckItem = document.createElement('div');
      deckItem.className = 'deck-item';
      deckItem.innerHTML = `
        <div class="deck-item-name">${deckName}</div>
        <div class="deck-item-stats">カード数: ${deckCardIds.length}枚</div>
      `;

      deckItem.addEventListener('click', () => {
        this.selectDeck(deckName, deckItem);
      });

      deckList.appendChild(deckItem);
    });
  }

  async selectDeck(deckName, deckElement) {
    // 前の選択を解除
    document.querySelectorAll('.deck-item.selected').forEach(item => {
      item.classList.remove('selected');
    });

    // 新しい選択をマーク
    deckElement.classList.add('selected');
    this.selectedDeck = deckName;

    // デッキプレビューを更新
    await this.updateDeckPreview(deckName);

    // 確認ボタンを有効化
    document.getElementById('confirm-deck-selection').disabled = false;
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
      console.error("デッキプレビューの更新に失敗:", error);
      previewContainer.innerHTML = `
        <div style="color: red; text-align: center;">
          <p>デッキプレビューの読み込みに失敗しました</p>
          <p>カードデータベースが読み込まれていない可能性があります</p>
        </div>
      `;
    }
  }

  async confirmDeckSelection() {
    if (!this.selectedDeck) return;

    try {
      const deckCardIds = this.deckManager.getDeck(this.selectedDeck);
      const deck = await this.deckManager.convertDeckToCards(deckCardIds);
      const validation = this.deckManager.validateDeck(deck);

      if (!validation.isValid) {
        if (!confirm(`このデッキには以下の問題があります:\n${validation.errors.join('\n')}\n\nそれでも使用しますか？`)) {
          return;
        }
      }

      // バトルエンジンにデッキを設定
      this.applyDeckToBattle(deck);

      // モーダルを閉じる
      document.getElementById('deck-selection-modal').remove();

      const playerName = this.playerId === 1 ? 'プレイヤー' : '相手';
      alert(`デッキ「${this.selectedDeck}」が${playerName}用に適用されました！`);

    } catch (error) {
      console.error("デッキ適用エラー:", error);
      alert("デッキの適用に失敗しました");
    }
  }

  applyDeckToBattle(deck) {
    if (!this.battleEngine.players[this.playerId]) {
      console.error(`プレイヤー${this.playerId}が存在しません!`);
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

    // デッキをシャッフル
    this.battleEngine.shuffleDeck(this.playerId);

    console.log(`デッキ「${this.selectedDeck}」をプレイヤー${this.playerId}に適用しました`);
    
    // UIを更新
    this.battleEngine.updateUI();
    
    // ゲーム状況も更新
    this.battleEngine.updateGameStatus();
  }
}

// グローバルアクセス用
window.DeckManager = DeckManager;
window.DeckSelectionUI = DeckSelectionUI;
