/**
 * 汎用モーダルUIクラス
 * 先攻後攻選択、マリガン選択などで使用
 */
class ModalUI {
  constructor() {
    this.activeModals = new Set();
    this.addBaseStyles();
  }

  addBaseStyles() {
    if (document.getElementById('modal-ui-styles')) return;

    const style = document.createElement('style');
    style.id = 'modal-ui-styles';
    style.textContent = `
      .game-modal {
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
        animation: modalFadeIn 0.3s ease;
      }

      @keyframes modalFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .game-modal-content {
        background: white;
        border-radius: 15px;
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        animation: modalSlideIn 0.3s ease;
      }

      @keyframes modalSlideIn {
        from { transform: translateY(-50px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      .game-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .game-modal-header h2 {
        margin: 0;
        font-size: 1.5em;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .game-modal-close {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 5px 10px;
        border-radius: 50%;
        transition: background 0.3s;
      }

      .game-modal-close:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .game-modal-body {
        padding: 30px;
        text-align: center;
      }

      .game-modal-description {
        font-size: 1.1em;
        color: #333;
        margin-bottom: 25px;
        line-height: 1.6;
      }

      .game-modal-highlight {
        background: #f0f8ff;
        border: 2px solid #667eea;
        border-radius: 10px;
        padding: 15px;
        margin: 20px 0;
        font-weight: bold;
        color: #333;
      }

      .game-modal-actions {
        display: flex;
        gap: 15px;
        margin-top: 25px;
        justify-content: center;
      }

      .game-modal-button {
        padding: 12px 25px;
        border: none;
        border-radius: 8px;
        font-size: 1em;
        cursor: pointer;
        transition: all 0.3s ease;
        min-width: 120px;
      }

      .game-modal-button-primary {
        background: #667eea;
        color: white;
      }

      .game-modal-button-primary:hover {
        background: #5a6fd8;
        transform: translateY(-1px);
      }

      .game-modal-button-secondary {
        background: #f0f0f0;
        color: #333;
        border: 1px solid #ccc;
      }

      .game-modal-button-secondary:hover {
        background: #e0e0e0;
      }

      .game-modal-button-danger {
        background: #ff4757;
        color: white;
      }

      .game-modal-button-danger:hover {
        background: #ff3742;
        transform: translateY(-1px);
      }

      .turn-order-options {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
        margin: 20px 0;
      }

      .turn-order-option {
        padding: 20px;
        border: 2px solid #e0e0e0;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.3s ease;
        background: #f9f9f9;
      }

      .turn-order-option:hover {
        border-color: #667eea;
        background: #f0f0ff;
      }

      .turn-order-option.selected {
        border-color: #667eea;
        background: #e8ecff;
        box-shadow: 0 2px 10px rgba(102, 126, 234, 0.3);
      }

      .turn-order-title {
        font-weight: bold;
        font-size: 1.1em;
        color: #333;
        margin-bottom: 5px;
      }

      .turn-order-desc {
        font-size: 0.9em;
        color: #666;
      }

      .hand-preview {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
        gap: 10px;
        margin: 20px 0;
        max-height: 200px;
        overflow-y: auto;
        padding: 15px;
        background: #f9f9f9;
        border-radius: 10px;
      }

      .hand-card {
        aspect-ratio: 2/3;
        border-radius: 8px;
        background: #ddd;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8em;
        text-align: center;
        padding: 5px;
        border: 2px solid transparent;
        position: relative;
        color: white;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.7);
        font-weight: bold;
      }

      .hand-card.debut {
        border-color: #4caf50;
        box-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
      }

      .hand-card.non-debut {
        border-color: #ff9800;
        box-shadow: 0 0 10px rgba(255, 152, 0, 0.5);
      }

      .card-type-indicator {
        position: absolute;
        bottom: 2px;
        left: 2px;
        right: 2px;
        font-size: 0.7em;
        padding: 2px 4px;
        border-radius: 4px;
        text-align: center;
        font-weight: bold;
      }

      .debut-indicator {
        background: rgba(76, 175, 80, 0.9);
        color: white;
      }

      .non-debut-indicator {
        background: rgba(255, 152, 0, 0.9);
        color: white;
      }

      @media (max-width: 768px) {
        .turn-order-options {
          grid-template-columns: 1fr;
        }
        
        .game-modal-actions {
          flex-direction: column;
        }
        
        .hand-preview {
          grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
        }
      }
    `;

    document.head.appendChild(style);
  }

  createModal(id, title, content, actions, options = {}) {
    // 既存のモーダルがあれば削除
    const existingModal = document.getElementById(id);
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = id;
    modal.className = 'game-modal';
    
    const closeButton = options.closeable !== false ? 
      `<button class="game-modal-close" onclick="document.getElementById('${id}').remove()">×</button>` : '';

    modal.innerHTML = `
      <div class="game-modal-content">
        <div class="game-modal-header">
          <h2>${title}</h2>
          ${closeButton}
        </div>
        <div class="game-modal-body">
          ${content}
          <div class="game-modal-actions">
            ${actions}
          </div>
        </div>
      </div>
    `;

    this.activeModals.add(id);
    return modal;
  }

  removeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
      modal.remove();
      this.activeModals.delete(id);
    }
  }

  // 先攻後攻選択モーダル
  showTurnOrderModal(randomResult, suggestedPlayer, callback) {
    const content = `
      <div class="game-modal-description">
        先攻・後攻を決定します
      </div>
      
      <div class="turn-order-options">
        <div class="turn-order-option" id="random-choice">
          <div class="turn-order-title">🎲 ランダムで決定</div>
          <div class="turn-order-desc">コンピューターがランダムに選択します</div>
        </div>
        <div class="turn-order-option" id="manual-choice">
          <div class="turn-order-title">✋ 手動で選択</div>
          <div class="turn-order-desc">自分で先攻・後攻を選択</div>
        </div>
      </div>
    `;

    const actions = `
      <button id="confirm-turn-order" class="game-modal-button game-modal-button-primary" disabled>
        決定
      </button>
    `;

    const modal = this.createModal('turn-order-modal', '🎯 先攻・後攻決定', content, actions, { closeable: false });
    
    let selectedOption = null;

    // 選択肢のイベントリスナー
    modal.querySelector('#random-choice').addEventListener('click', () => {
      modal.querySelectorAll('.turn-order-option').forEach(opt => opt.classList.remove('selected'));
      modal.querySelector('#random-choice').classList.add('selected');
      selectedOption = 'random';
      modal.querySelector('#confirm-turn-order').disabled = false;
    });

    modal.querySelector('#manual-choice').addEventListener('click', () => {
      modal.querySelectorAll('.turn-order-option').forEach(opt => opt.classList.remove('selected'));
      modal.querySelector('#manual-choice').classList.add('selected');
      selectedOption = 'manual';
      modal.querySelector('#confirm-turn-order').disabled = false;
    });

    // 決定ボタンのイベントリスナー
    modal.querySelector('#confirm-turn-order').addEventListener('click', () => {
      if (selectedOption === 'random') {
        callback(suggestedPlayer, false);
      } else if (selectedOption === 'manual') {
        this.showManualTurnOrderModal(callback);
      }
      this.removeModal('turn-order-modal');
    });

    document.body.appendChild(modal);
  }

  // 手動先攻後攻選択モーダル
  showManualTurnOrderModal(callback) {
    const content = `
      <div class="game-modal-description">
        先攻・後攻を選択してください
      </div>
      
      <div class="turn-order-options">
        <div class="turn-order-option" id="player-first">
          <div class="turn-order-title">🚀 あなたが先攻</div>
          <div class="turn-order-desc">最初にターンを開始します</div>
        </div>
        <div class="turn-order-option" id="opponent-first">
          <div class="turn-order-title">🛡️ 相手が先攻</div>
          <div class="turn-order-desc">相手が最初にターンを開始します</div>
        </div>
      </div>
    `;

    const actions = `
      <button id="confirm-manual-turn" class="game-modal-button game-modal-button-primary" disabled>
        決定
      </button>
    `;

    const modal = this.createModal('manual-turn-modal', '✋ 手動選択', content, actions, { closeable: false });
    
    let selectedPlayer = null;

    modal.querySelector('#player-first').addEventListener('click', () => {
      modal.querySelectorAll('.turn-order-option').forEach(opt => opt.classList.remove('selected'));
      modal.querySelector('#player-first').classList.add('selected');
      selectedPlayer = 1;
      modal.querySelector('#confirm-manual-turn').disabled = false;
    });

    modal.querySelector('#opponent-first').addEventListener('click', () => {
      modal.querySelectorAll('.turn-order-option').forEach(opt => opt.classList.remove('selected'));
      modal.querySelector('#opponent-first').classList.add('selected');
      selectedPlayer = 2;
      modal.querySelector('#confirm-manual-turn').disabled = false;
    });

    modal.querySelector('#confirm-manual-turn').addEventListener('click', () => {
      callback(selectedPlayer, true);
      this.removeModal('manual-turn-modal');
    });

    document.body.appendChild(modal);
  }

  // マリガンモーダル
  showMulliganModal(playerId, isForced, handCards, mulliganCount, callback) {
    const playerName = playerId === 1 ? 'あなた' : '相手';
    const debutCards = handCards.filter(card => 
      card.card_type && card.card_type.includes('ホロメン') && card.bloom_level === 'Debut'
    );
    
    const handPreview = handCards.map(card => {
      const isDebut = card.card_type && card.card_type.includes('ホロメン') && card.bloom_level === 'Debut';
      const cardImageStyle = card.image_url ? 
        `background-image: url(${card.image_url}); background-size: cover; background-position: center;` : 
        'background: #ddd;';
      
      return `
        <div class="hand-card ${isDebut ? 'debut' : 'non-debut'}" style="${cardImageStyle}" title="${card.name || 'カード'}">
          ${!card.image_url ? (card.name || 'カード') : ''}
          <div class="card-type-indicator ${isDebut ? 'debut-indicator' : 'non-debut-indicator'}">
            ${isDebut ? 'Debut' : '非Debut'}
          </div>
        </div>
      `;
    }).join('');

    const penaltyText = mulliganCount > 0 ? 
      `<div class="game-modal-highlight" style="background: #fff3e0; border-color: #ff9800;">
        ⚠️ ${mulliganCount}回目のマリガンのため、手札が1枚減ります
      </div>` : '';

    const forcedText = isForced ? 
      `<div class="game-modal-highlight" style="background: #ffebee; border-color: #f44336;">
        🚨 Debutホロメンがないため、マリガンが必要です
      </div>` : '';

    const content = `
      <div class="game-modal-description">
        ${playerName}のマリガン選択
      </div>
      
      ${forcedText}
      ${penaltyText}
      
      <div class="game-modal-description">
        現在の手札 (Debut: ${debutCards.length}枚 / 全${handCards.length}枚)
      </div>
      
      <div class="hand-preview">
        ${handPreview}
      </div>
    `;

    const actions = isForced ? `
      <button id="confirm-mulligan" class="game-modal-button game-modal-button-danger">
        マリガンする
      </button>
    ` : `
      <button id="confirm-mulligan" class="game-modal-button game-modal-button-primary">
        マリガンする
      </button>
      <button id="skip-mulligan" class="game-modal-button game-modal-button-secondary">
        スキップ
      </button>
    `;

    const modal = this.createModal('mulligan-modal', '🔄 マリガン選択', content, actions, { closeable: false });

    modal.querySelector('#confirm-mulligan').addEventListener('click', () => {
      callback(true);
      this.removeModal('mulligan-modal');
    });

    if (!isForced) {
      modal.querySelector('#skip-mulligan').addEventListener('click', () => {
        callback(false);
        this.removeModal('mulligan-modal');
      });
    }

    document.body.appendChild(modal);
  }

  /**
   * カード効果発動確認モーダルを表示
   * @param {Object} options - モーダル設定
   * @param {string} options.cardName - カード名
   * @param {string} options.effectName - 効果名
   * @param {string} options.effectDescription - 効果説明
   * @param {string} options.effectType - 効果タイプ（bloom, collab, gift, support, art）
   * @param {Function} callback - コールバック関数 (confirmed: boolean) => void
   */
  showCardEffectModal(options, callback) {
    const { cardName, effectName, effectDescription, effectType } = options;
    // コラボ/ブルーム確認は PerformanceManager 側で一本化しているため、ここでは常にUIを出さず自動承認
    try {
      if (effectType === 'collab' || effectType === 'bloom') {
        console.warn(`[ModalUI] ${effectType} confirmation is centralized. Auto-confirm without rendering generic modal.`);
        if (typeof callback === 'function') callback(true);
        return;
      }
      // 念のため、中央確認アクティブ状態でも汎用モーダルは出さない
      const pmDialog = document.getElementById('effect-confirmation-dialog');
      const flag = (typeof window !== 'undefined') ? window.__EFFECT_CONFIRM_ACTIVE__ : null;
      const centralizedActive = !!(pmDialog || flag);
      // effectTypeが省略/異なる場合でも、中央確認がアクティブなら汎用モーダルは出さない
      if (centralizedActive && (effectType === 'collab' || effectType === 'bloom' || (flag && (flag.type === 'collab' || flag.type === 'bloom')))) {
        const t = (flag && flag.type) || effectType || 'effect';
        console.warn(`[ModalUI] ${t} confirmation is centralized in PerformanceManager. Auto-confirm and skip duplicate modal.`);
        if (typeof callback === 'function') callback(true);
        return;
      }
    } catch (_) {}
    
    // 効果タイプに応じたアイコンと色
    const typeConfig = {
      bloom: { icon: '🌸', color: '#ff69b4', label: 'ブルームエフェクト' },
      collab: { icon: '🤝', color: '#4169e1', label: 'コラボエフェクト' },
      gift: { icon: '🎁', color: '#32cd32', label: 'ギフト' },
      support: { icon: '📋', color: '#ff8c00', label: 'サポート効果' },
      art: { icon: '⚡', color: '#dc143c', label: 'アーツ' }
    };
    
    const config = typeConfig[effectType] || { icon: '✨', color: '#888', label: '効果' };
    
    const content = `
      <div class="game-modal-description">
        <div style="color: ${config.color}; font-size: 18px; margin-bottom: 10px;">
          ${config.icon} ${config.label}
        </div>
        <div style="font-weight: bold; margin-bottom: 15px;">
          ${cardName}
        </div>
        <div style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">
          ${effectName}
        </div>
        <div style="font-size: 14px; line-height: 1.5; margin-bottom: 20px;">
          ${effectDescription}
        </div>
      </div>
    `;

    const actions = `
      <button id="activate-effect" class="game-modal-button game-modal-button-primary">
        発動する
      </button>
      <button id="cancel-effect" class="game-modal-button game-modal-button-secondary">
        キャンセル
      </button>
    `;

    const modal = this.createModal('card-effect-modal', `${config.icon} 効果発動確認`, content, actions, { closeable: true });

    modal.querySelector('#activate-effect').addEventListener('click', () => {
      callback(true);
      this.removeModal('card-effect-modal');
    });

    modal.querySelector('#cancel-effect').addEventListener('click', () => {
      callback(false);
      this.removeModal('card-effect-modal');
    });

    document.body.appendChild(modal);
  }

  /**
   * カード選択モーダルを表示
   * @param {Object} options - 選択設定
   * @param {Array} options.cards - 選択可能なカード配列
   * @param {string} options.title - モーダルタイトル
   * @param {string} options.description - 説明文
   * @param {number} options.maxSelect - 最大選択数
   * @param {number} options.minSelect - 最小選択数
   * @param {Function} callback - コールバック関数 (selectedCards: Array) => void
   */
  showCardSelectionModal(options, callback) {
    const { cards, title, description, maxSelect = 1, minSelect = 1 } = options;
    let selectedCards = [];

    const cardsList = cards.map((card, index) => {
      const cardName = card.name || card.card_name || card.cardId || `カード${index + 1}`;
      const cardType = card.card_type || '';
      const rarity = card.rarity || '';
      
      return `
        <div class="selectable-card" data-card-index="${index}">
          <div class="card-info">
            <div class="card-name">${cardName}</div>
            <div class="card-details">${cardType} ${rarity}</div>
          </div>
          <div class="card-checkbox">
            <input type="checkbox" id="card-${index}" />
          </div>
        </div>
      `;
    }).join('');

    const content = `
      <div class="game-modal-description">
        ${description}
      </div>
      <div class="selection-info">
        選択: <span id="selected-count">0</span> / ${maxSelect}
      </div>
      <div class="cards-selection-list">
        ${cardsList}
      </div>
      <style>
        .cards-selection-list {
          max-height: 300px;
          overflow-y: auto;
          margin: 15px 0;
        }
        .selectable-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          border: 1px solid #ddd;
          margin-bottom: 5px;
          border-radius: 5px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .selectable-card:hover {
          background-color: #f5f5f5;
        }
        .selectable-card.selected {
          background-color: #e3f2fd;
          border-color: #2196f3;
        }
        .card-name {
          font-weight: bold;
        }
        .card-details {
          font-size: 12px;
          color: #666;
        }
        .selection-info {
          font-weight: bold;
          margin-bottom: 10px;
        }
      </style>
    `;

    const actions = `
      <button id="confirm-selection" class="game-modal-button game-modal-button-primary" disabled>
        確定
      </button>
      <button id="cancel-selection" class="game-modal-button game-modal-button-secondary">
        キャンセル
      </button>
    `;

    const modal = this.createModal('card-selection-modal', title, content, actions, { closeable: true });

    // カード選択処理
    const updateSelection = () => {
      const selectedCount = selectedCards.length;
      modal.querySelector('#selected-count').textContent = selectedCount;
      modal.querySelector('#confirm-selection').disabled = selectedCount < minSelect;
    };

    modal.querySelectorAll('.selectable-card').forEach((cardElement, index) => {
      cardElement.addEventListener('click', () => {
        const checkbox = cardElement.querySelector('input[type="checkbox"]');
        const cardIndex = parseInt(cardElement.dataset.cardIndex);
        
        if (checkbox.checked) {
          // 選択解除
          checkbox.checked = false;
          cardElement.classList.remove('selected');
          selectedCards = selectedCards.filter(c => c.index !== cardIndex);
        } else {
          // 選択
          if (selectedCards.length < maxSelect) {
            checkbox.checked = true;
            cardElement.classList.add('selected');
            selectedCards.push({ ...cards[cardIndex], index: cardIndex });
          }
        }
        
        updateSelection();
      });
    });

    modal.querySelector('#confirm-selection').addEventListener('click', () => {
      callback(selectedCards);
      this.removeModal('card-selection-modal');
    });

    modal.querySelector('#cancel-selection').addEventListener('click', () => {
      callback([]);
      this.removeModal('card-selection-modal');
    });

    updateSelection();
    document.body.appendChild(modal);
  }
}

// グローバルアクセス用
window.ModalUI = ModalUI;
