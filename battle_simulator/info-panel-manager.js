/**
 * 情報パネル管理クラス - バトルシミュレーター右側パネル
 * ステップ情報、カード詳細、ログエリアを管理
 */
class InfoPanelManager {
  constructor() {
    this.stepInfoElement = null;
    this.cardDetailElement = null;
    this.logAreaElement = null;
    this.logEntries = [];
    this.maxLogEntries = 100; // 最大ログ保持数
    
    this.init();
  }

  /**
   * 情報パネルシステムの初期化
   */
  init() {
    this.createPanelElements();
    this.setupEventListeners();
    this.updateStepInfo('ゲーム開始準備', '準備フェーズ', 0);
    this.clearCardDetail();
    this.addLogEntry('system', 'バトルシミュレーターが開始されました');
  }

  /**
   * パネル要素の作成とDOMへの挿入
   */
  createPanelElements() {
    // メインパネルコンテナ
    const infoPanelContainer = document.createElement('div');
    infoPanelContainer.className = 'info-panel';
    
    // ステップ情報パネル
    this.stepInfoElement = document.createElement('div');
    this.stepInfoElement.className = 'step-info';
    this.stepInfoElement.innerHTML = `
      <h3>ゲーム状況</h3>
      <div class="phase">準備中...</div>
      <div class="turn">ターン: 0</div>
    `;
    
    // カード詳細パネル
    this.cardDetailElement = document.createElement('div');
    this.cardDetailElement.className = 'card-detail';
    this.cardDetailElement.innerHTML = `
      <h3>カード詳細</h3>
      <div class="no-card">カードを選択してください</div>
    `;
    
    // ログエリアパネル
    this.logAreaElement = document.createElement('div');
    this.logAreaElement.className = 'log-area';
    this.logAreaElement.innerHTML = `
      <h3>ゲームログ</h3>
      <div class="log-content"></div>
    `;
    
    // パネルをコンテナに追加
    infoPanelContainer.appendChild(this.stepInfoElement);
    infoPanelContainer.appendChild(this.cardDetailElement);
    infoPanelContainer.appendChild(this.logAreaElement);
    
    // body に追加
    document.body.appendChild(infoPanelContainer);
  }

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    // カードホバーイベントを監視
    document.addEventListener('mouseover', (event) => {
      if (event.target.classList.contains('card') || 
          event.target.classList.contains('hand-card') ||
          event.target.classList.contains('yell-card')) {
        this.showCardDetail(event.target);
      }
    });

    // カードから離れた時の処理
    document.addEventListener('mouseout', (event) => {
      if (event.target.classList.contains('card') || 
          event.target.classList.contains('hand-card') ||
          event.target.classList.contains('yell-card')) {
        // 一定時間後にカード詳細をクリア（他のカードにすぐ移動する場合は維持）
        setTimeout(() => {
          if (!document.querySelector(':hover')?.closest('.card, .hand-card, .yell-card')) {
            this.clearCardDetail();
          }
        }, 100);
      }
    });
  }

  /**
   * ステップ情報の更新
   * @param {string} stepName - ステップ名（例: 'リセットステップ', 'ドローステップ'）
   * @param {string} phase - フェーズ名（例: 'メインフェーズ', 'バトルフェーズ'）
   * @param {number} turn - ターン数
   * @param {string} player - 現在のプレイヤー（'player' または 'opponent'）
   */
  updateStepInfo(stepName, phase, turn, player = 'player') {
    if (!this.stepInfoElement) return;
    
    const playerText = player === 'player' ? 'あなた' : '相手';
    const phaseElement = this.stepInfoElement.querySelector('.phase');
    const turnElement = this.stepInfoElement.querySelector('.turn');
    
    if (phaseElement) {
      phaseElement.textContent = `${stepName} (${playerText})`;
    }
    
    if (turnElement) {
      turnElement.textContent = `${phase} - ターン: ${turn}`;
    }
  }

  /**
   * カード詳細情報の表示
   * @param {HTMLElement} cardElement - カード要素
   */
  showCardDetail(cardElement) {
    if (!this.cardDetailElement) return;

    // カードデータを取得（data属性から）
    const cardId = cardElement.dataset.cardId;
    const cardName = cardElement.dataset.cardName || '不明なカード';
    const cardType = cardElement.dataset.cardType || '不明';
    const cardDescription = cardElement.dataset.cardDescription || '';
    const cardColor = cardElement.dataset.cardColor || '';
    const cardLevel = cardElement.dataset.cardLevel || '';
    const cardHP = cardElement.dataset.cardHp || '';
    const cardAttack = cardElement.dataset.cardAttack || '';

    let detailHTML = `
      <h3>カード詳細</h3>
      <div class="card-name">${cardName}</div>
    `;

    if (cardType) {
      detailHTML += `<div class="card-type">種類: ${cardType}</div>`;
    }

    if (cardColor) {
      detailHTML += `<div class="card-color">色: ${cardColor}</div>`;
    }

    if (cardLevel) {
      detailHTML += `<div class="card-level">レベル: ${cardLevel}</div>`;
    }

    if (cardHP) {
      detailHTML += `<div class="card-hp">HP: ${cardHP}</div>`;
    }

    if (cardAttack) {
      detailHTML += `<div class="card-attack">攻撃力: ${cardAttack}</div>`;
    }

    if (cardDescription) {
      detailHTML += `<div class="card-description">${cardDescription}</div>`;
    }

    // カードIDがある場合は詳細情報をカードデータから取得
    if (cardId && window.cardDataManager) {
      const cardData = window.cardDataManager.getCardById(cardId);
      if (cardData) {
        detailHTML = this.formatCardDetailFromData(cardData);
      }
    }

    this.cardDetailElement.innerHTML = detailHTML;
  }

  /**
   * カードデータから詳細情報をフォーマット
   * @param {Object} cardData - カードデータオブジェクト
   * @return {string} フォーマットされたHTML
   */
  formatCardDetailFromData(cardData) {
    let html = `
      <h3>カード詳細</h3>
      <div class="card-name">${cardData.name || '不明なカード'}</div>
    `;

    if (cardData.type) {
      html += `<div class="card-type">種類: ${cardData.type}</div>`;
    }

    if (cardData.color && cardData.color.length > 0) {
      const colorText = Array.isArray(cardData.color) ? cardData.color.join('・') : cardData.color;
      html += `<div class="card-color">色: ${colorText}</div>`;
    }

    if (cardData.level !== undefined) {
      html += `<div class="card-level">レベル: ${cardData.level}</div>`;
    }

    if (cardData.hp !== undefined) {
      html += `<div class="card-hp">HP: ${cardData.hp}</div>`;
    }

    if (cardData.attack !== undefined) {
      html += `<div class="card-attack">攻撃力: ${cardData.attack}</div>`;
    }

    if (cardData.bloomLevel !== undefined) {
      html += `<div class="card-bloom">ブルームレベル: ${cardData.bloomLevel}</div>`;
    }

    if (cardData.skills && cardData.skills.length > 0) {
      html += `<div class="card-skills"><strong>スキル:</strong><br>`;
      cardData.skills.forEach(skill => {
        html += `• ${skill.name}: ${skill.description}<br>`;
      });
      html += `</div>`;
    }

    if (cardData.description) {
      html += `<div class="card-description">${cardData.description}</div>`;
    }

    return html;
  }

  /**
   * カード詳細をクリア
   */
  clearCardDetail() {
    if (!this.cardDetailElement) return;
    
    this.cardDetailElement.innerHTML = `
      <h3>カード詳細</h3>
      <div class="no-card">カードを選択してください</div>
    `;
  }

  /**
   * ログエントリを追加
   * @param {string} type - ログの種類（'system', 'player', 'opponent'）
   * @param {string} message - ログメッセージ
   * @param {Date} timestamp - タイムスタンプ（省略時は現在時刻）
   */
  addLogEntry(type, message, timestamp = new Date()) {
    const entry = {
      type,
      message,
      timestamp
    };

    this.logEntries.push(entry);

    // 最大ログ数を超えた場合は古いものから削除
    if (this.logEntries.length > this.maxLogEntries) {
      this.logEntries.shift();
    }

    this.updateLogDisplay();
  }

  /**
   * ログ表示の更新
   */
  updateLogDisplay() {
    if (!this.logAreaElement) return;

    const logContent = this.logAreaElement.querySelector('.log-content');
    if (!logContent) return;

    let html = '';
    
    // 最新のログから表示（新しいものが上に）
    const recentEntries = this.logEntries.slice(-20); // 最新20件のみ表示
    
    recentEntries.reverse().forEach(entry => {
      const timeStr = entry.timestamp.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      html += `
        <div class="log-entry ${entry.type}">
          <span class="timestamp">[${timeStr}]</span>
          ${entry.message}
        </div>
      `;
    });

    logContent.innerHTML = html;
    
    // 新しいログが追加されたら一番上にスクロール
    logContent.scrollTop = 0;
  }

  /**
   * ゲーム状態に関連するログを追加
   * @param {string} action - アクション名
   * @param {string} player - プレイヤー識別子
   * @param {string} details - 詳細情報
   */
  logGameAction(action, player, details = '') {
    const playerName = player === 'player' ? 'あなた' : '相手';
    const message = details ? `${playerName}が${action}: ${details}` : `${playerName}が${action}`;
    this.addLogEntry(player, message);
  }

  /**
   * システムメッセージを追加
   * @param {string} message - システムメッセージ
   */
  logSystem(message) {
    this.addLogEntry('system', message);
  }

  /**
   * ステップ遷移ログを追加
   * @param {string} playerName - プレイヤー名（'プレイヤー' or '対戦相手'）
   * @param {string} fromStep - 移行前のステップ名
   * @param {string} toStep - 移行後のステップ名
   * @param {number} turn - ターン数
   */
  logStepTransition(playerName, fromStep, toStep, turn) {
    const message = `【ターン${turn}】${playerName}: ${fromStep} → ${toStep}`;
    this.addLogEntry('step', message);
  }

  /**
   * ターン開始ログを追加
   * @param {string} playerName - プレイヤー名
   * @param {number} turn - ターン数
   */
  logTurnStart(playerName, turn) {
    const message = `【ターン${turn}開始】${playerName}のターン`;
    this.addLogEntry('turn', message);
  }

  /**
   * フェーズ開始ログを追加
   * @param {string} playerName - プレイヤー名
   * @param {string} stepName - ステップ名
   * @param {number} turn - ターン数
   */
  logPhaseStart(playerName, stepName, turn) {
    const message = `【ターン${turn}】${stepName}: ${playerName}開始`;
    this.addLogEntry('phase', message);
  }

  /**
   * カードアクションのログ
   * @param {string} player - プレイヤー識別子
   * @param {string} action - アクション（'ドロー', 'プレイ', 'バトル'など）
   * @param {string} cardName - カード名
   * @param {string} target - 対象（省略可）
   */
  logCardAction(player, action, cardName, target = '') {
    const playerName = player === 'player' ? 'あなた' : '相手';
    const targetText = target ? ` → ${target}` : '';
    const message = `${playerName}が「${cardName}」を${action}${targetText}`;
    this.addLogEntry(player, message);
  }

  /**
   * バトル結果のログ
   * @param {string} attacker - 攻撃者
   * @param {string} defender - 防御者
   * @param {string} result - 結果
   */
  logBattleResult(attacker, defender, result) {
    const message = `バトル結果: ${attacker} vs ${defender} - ${result}`;
    this.addLogEntry('system', message);
  }

  /**
   * フェーズ変更のログ
   * @param {string} phase - 新しいフェーズ
   * @param {string} player - 現在のプレイヤー
   */
  logPhaseChange(phase, player) {
    const playerName = player === 'player' ? 'あなた' : '相手';
    this.logSystem(`${playerName}の${phase}が開始されました`);
  }

  /**
   * プレイヤーのアクション待ちログ
   * @param {string} stepName - ステップ名
   * @param {string} instruction - 操作指示
   */
  logPlayerActionWait(stepName, instruction) {
    const message = `${stepName}: ${instruction}`;
    this.addLogEntry('system', message);
  }

  /**
   * 統合ステップログ（ターン情報 + ステップ + 操作内容）
   * @param {number} turn - ターン数
   * @param {string} stepName - ステップ名
   * @param {string} playerName - プレイヤー名
   * @param {string} action - 操作内容
   */
  logStepProgress(turn, stepName, playerName, action) {
    const message = `【ターン${turn}】${stepName} (${playerName}) - ${action}`;
    this.addLogEntry('step', message);
  }

  /**
   * パネルの表示/非表示切り替え
   * @param {boolean} visible - 表示するかどうか
   */
  setVisible(visible) {
    const panel = document.querySelector('.info-panel');
    if (panel) {
      panel.style.display = visible ? 'flex' : 'none';
    }
  }

  /**
   * 全ログをクリア
   */
  clearAllLogs() {
    this.logEntries = [];
    this.updateLogDisplay();
    this.logSystem('ログがクリアされました');
  }

  /**
   * 情報パネルをリセット（ゲーム開始時など）
   */
  reset() {
    this.updateStepInfo('ゲーム開始準備', '準備フェーズ', 0);
    this.clearCardDetail();
    this.clearAllLogs();
    this.logSystem('新しいゲームが開始されました');
  }
}

// グローバルインスタンスとして利用可能にする
window.infoPanelManager = null;

// DOM読み込み完了後に初期化
document.addEventListener('DOMContentLoaded', () => {
  window.infoPanelManager = new InfoPanelManager();
});

// バトルエンジンからの呼び出し用のヘルパー関数
window.updateGameStep = (stepName, phase, turn, player) => {
  if (window.infoPanelManager) {
    window.infoPanelManager.updateStepInfo(stepName, phase, turn, player);
  }
};

window.logGameEvent = (type, message) => {
  if (window.infoPanelManager) {
    if (type === 'system') {
      window.infoPanelManager.logSystem(message);
    } else {
      window.infoPanelManager.addLogEntry(type, message);
    }
  }
};

window.logCardEvent = (player, action, cardName, target) => {
  if (window.infoPanelManager) {
    window.infoPanelManager.logCardAction(player, action, cardName, target);
  }
};

// 自動初期化
document.addEventListener('DOMContentLoaded', () => {
  if (!window.infoPanelManager) {
    console.log('Info Panel Manager を初期化します');
    window.infoPanelManager = new InfoPanelManager();
  }
});
