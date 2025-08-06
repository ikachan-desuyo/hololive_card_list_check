/**
 * 共通ユーティリティ関数
 * 全てのページで使用される汎用的な関数を提供します
 */

// デバッグモードの設定（本番環境では false に設定）
const DEBUG_MODE = true;

/**
 * デバッグログ出力（本番環境では無効化）
 * @param {string} message - ログメッセージ
 * @param {...any} args - 追加の引数
 */
window.debugLog = function(message, ...args) {
  if (DEBUG_MODE) {
    console.log(`[DEBUG] ${message}`, ...args);
  }
};

/**
 * エラーログ出力（常に有効）
 * @param {string} message - エラーメッセージ
 * @param {...any} args - 追加の引数
 */
window.errorLog = function(message, ...args) {
  console.error(`[ERROR] ${message}`, ...args);
};

/**
 * 警告ログ出力（常に有効）
 * @param {string} message - 警告メッセージ
 * @param {...any} args - 追加の引数
 */
window.warnLog = function(message, ...args) {
  console.warn(`[WARN] ${message}`, ...args);
};

/**
 * テキスト正規化関数（ひらがな/カタカナ、大文字/小文字統一）
 * 全ページで共通使用される検索・フィルタリング用の正規化
 * @param {string} text - 正規化するテキスト
 * @returns {string} 正規化されたテキスト
 */
window.normalizeText = function(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }
  
  return text
    .toLowerCase()
    .replace(/[ぁ-ゖ]/g, s => String.fromCharCode(s.charCodeAt(0) + 0x60))  // ひらがな→カタカナ変換
    .replace(/[\u3041-\u3096]/g, s => String.fromCharCode(s.charCodeAt(0) + 0x60)); // 残りのひらがな→カタカナ
};

/**
 * ダークモード切り替え関数
 * 複数ページで使用されるダークモード機能
 */
window.toggleDarkMode = function() {
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem("darkMode", isDark ? "true" : "false");
  return isDark;
};

/**
 * ダークモード初期化関数
 * ページロード時にダークモード状態を復元
 */
window.initializeDarkMode = function() {
  const darkMode = localStorage.getItem("darkMode");
  if (darkMode === "true") {
    document.body.classList.add("dark");
  }
};

/**
 * ホーム画面への遷移関数
 * 全ページで使用される共通ナビゲーション
 */
window.goHome = function() {
  if (typeof window.navigateToPage === 'function') {
    window.navigateToPage('index.html');
  } else {
    window.location.href = 'index.html';
  }
};

/**
 * チップ操作の共通関数群
 * フィルタUIで使用されるチップ操作を統一
 */

/**
 * チップの選択/非選択を切り替え
 * @param {HTMLElement} btn - チップボタン要素
 */
window.toggleChip = function(btn) {
  btn.classList.toggle("selected");
};

/**
 * チップグループの全選択
 * @param {HTMLElement} allBtn - 全選択ボタン要素
 */
window.selectAllChip = function(allBtn) {
  const container = allBtn.closest('.chip-group, .filter-chips');
  if (!container) return;
  
  const chips = container.querySelectorAll('.chip:not(.all-chip)');
  const isAllSelected = allBtn.classList.contains('selected');
  
  if (isAllSelected) {
    // 全選択解除
    chips.forEach(chip => chip.classList.remove('selected'));
    allBtn.classList.remove('selected');
  } else {
    // 全選択
    chips.forEach(chip => chip.classList.add('selected'));
    allBtn.classList.add('selected');
  }
};

/**
 * チップグループから選択されている値を取得
 * @param {string} groupId - チップグループのID
 * @returns {Array<string>} 選択されている値の配列
 */
window.getCheckedFromChips = function(groupId) {
  const container = document.getElementById(groupId);
  if (!container) return [];
  
  return Array.from(container.querySelectorAll('.chip.selected:not(.all-chip)'))
    .map(chip => chip.dataset.value || chip.textContent.trim());
};

/**
 * モバイル画面判定
 * @returns {boolean} モバイル画面かどうか
 */
window.isMobileScreen = function() {
  return window.innerWidth <= 768;
};

/**
 * 配列をシャッフルする（Fisher-Yates法）
 * @param {Array} array - シャッフルする配列
 * @returns {Array} シャッフルされた新しい配列
 */
window.shuffleArray = function(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

/**
 * オブジェクトのディープクローン
 * @param {any} obj - クローンするオブジェクト
 * @returns {any} クローンされたオブジェクト
 */
window.deepClone = function(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  if (obj instanceof Array) {
    return obj.map(item => window.deepClone(item));
  }
  
  if (typeof obj === 'object') {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = window.deepClone(obj[key]);
      }
    }
    return cloned;
  }
  
  return obj;
};

/**
 * 非同期処理の遅延実行
 * @param {number} ms - 遅延時間（ミリ秒）
 * @returns {Promise} 遅延処理のPromise
 */
window.delay = function(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * 安全なJSON解析
 * @param {string} jsonString - JSON文字列
 * @param {any} defaultValue - 解析失敗時のデフォルト値
 * @returns {any} 解析されたオブジェクトまたはデフォルト値
 */
window.safeJsonParse = function(jsonString, defaultValue = null) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    window.errorLog('JSON解析に失敗:', error);
    return defaultValue;
  }
};

/**
 * LocalStorageの安全な操作
 */
window.storageUtils = {
  /**
   * 値を保存
   * @param {string} key - キー
   * @param {any} value - 値
   */
  set: function(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      window.errorLog('LocalStorage保存エラー:', error);
      return false;
    }
  },
  
  /**
   * 値を取得
   * @param {string} key - キー
   * @param {any} defaultValue - デフォルト値
   * @returns {any} 取得された値またはデフォルト値
   */
  get: function(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      window.errorLog('LocalStorage取得エラー:', error);
      return defaultValue;
    }
  },
  
  /**
   * 値を削除
   * @param {string} key - キー
   */
  remove: function(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      window.errorLog('LocalStorage削除エラー:', error);
      return false;
    }
  }
};

/**
 * バリデーション関数群
 * データの整合性を保つための検証機能
 */
window.validate = {
  /**
   * カードオブジェクトの妥当性を検証
   * @param {Object} card - 検証するカードオブジェクト
   * @returns {Object} 検証結果 {valid: boolean, errors: Array}
   */
  card: function(card) {
    const errors = [];
    
    if (!card) {
      errors.push('カードが存在しません');
      return { valid: false, errors };
    }
    
    if (!card.id) {
      errors.push('カードIDが不正です');
    }
    
    if (!card.name || typeof card.name !== 'string') {
      errors.push('カード名が不正です');
    }
    
    if (!card.card_type) {
      errors.push('カードタイプが不正です');
    }
    
    return { valid: errors.length === 0, errors };
  },
  
  /**
   * プレイヤー状態の妥当性を検証
   * @param {Object} player - 検証するプレイヤーオブジェクト
   * @param {number} playerId - プレイヤーID
   * @returns {Object} 検証結果
   */
  player: function(player, playerId) {
    const errors = [];
    
    if (!player) {
      errors.push(`プレイヤー${playerId}が存在しません`);
      return { valid: false, errors };
    }
    
    if (!player.cards) {
      errors.push(`プレイヤー${playerId}のカードエリアが存在しません`);
    }
    
    if (!Array.isArray(player.hand)) {
      errors.push(`プレイヤー${playerId}の手札が配列ではありません`);
    }
    
    return { valid: errors.length === 0, errors };
  },
  
  /**
   * フェーズの妥当性を検証
   * @param {number} phase - フェーズ番号
   * @returns {Object} 検証結果
   */
  phase: function(phase) {
    const errors = [];
    const validPhases = [-1, 0, 1, 2, 3, 4, 5]; // -1は準備フェーズ
    
    if (!validPhases.includes(phase)) {
      errors.push(`無効なフェーズ: ${phase}`);
    }
    
    return { valid: errors.length === 0, errors };
  }
};

/**
 * エラーハンドリング用のラッパー関数
 * 非同期処理の安全な実行
 */
window.safeAsync = async function(asyncFunction, fallbackValue = null, context = 'unknown') {
  try {
    return await asyncFunction();
  } catch (error) {
    window.errorLog(`非同期処理エラー [${context}]:`, error);
    return fallbackValue;
  }
};

/**
 * DOM操作の安全な実行
 * 要素が存在しない場合のエラー回避
 */
window.safeDomOperation = function(selector, operation, fallbackValue = null) {
  try {
    const element = document.querySelector(selector);
    if (!element) {
      window.warnLog(`DOM要素が見つかりません: ${selector}`);
      return fallbackValue;
    }
    return operation(element);
  } catch (error) {
    window.errorLog(`DOM操作エラー [${selector}]:`, error);
    return fallbackValue;
  }
};

// 初期化処理
document.addEventListener('DOMContentLoaded', function() {
  // ダークモードの初期化
  window.initializeDarkMode();
  
  window.debugLog('共通ユーティリティ初期化完了');
});
