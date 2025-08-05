/**
 * カード効果の動的ローダー
 * cardsディレクトリ内のカードファイルを動的に読み込む
 */

class CardEffectLoader {
  constructor() {
    this.loadedCards = new Set();
    this.loadingPromises = new Map();
  }

  /**
   * 指定されたカードIDの効果ファイルを読み込む
   * @param {string} cardId - カードID (例: 'hBP04-048_RR')
   */
  async loadCard(cardId) {
    // カードIDを正規化
    const normalizedCardId = this.normalizeCardId(cardId);
    
    // 既に読み込み済みの場合はスキップ
    if (this.loadedCards.has(normalizedCardId)) {
      return true;
    }

    // 既に読み込み中の場合は同じPromiseを返す
    if (this.loadingPromises.has(normalizedCardId)) {
      return this.loadingPromises.get(normalizedCardId);
    }

    // カードIDからファイル名を生成 (例: hBP04-048_RR -> hBP04-048.js)
    const fileName = this.getEffectFileName(normalizedCardId);
    const scriptPath = `battle_simulator/card-effects/cards/${fileName}`;

    const loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = scriptPath;
      script.onload = () => {
        this.loadedCards.add(normalizedCardId);
        console.log(`🔮 [Card Loader] 読み込み成功: ${fileName}`);
        resolve(true);
      };
      script.onerror = () => {
        console.warn(`🔮 [Card Loader] 効果ファイルが見つかりません: ${fileName}`);
        resolve(false); // エラーでもresolveしてゲームを続行
      };
      document.head.appendChild(script);
    });

    this.loadingPromises.set(normalizedCardId, loadPromise);
    return loadPromise;
  }

  /**
   * カードIDを正規化（レアリティ表記を除去など）
   * @param {string} cardId - 元のカードID
   * @returns {string} 正規化されたカードID
   */
  normalizeCardId(cardId) {
    if (!cardId) return '';
    
    // 文字列に変換
    let id = String(cardId);
    
    // レアリティ表記を除去 (例: hBP04-048_RR -> hBP04-048)
    id = id.split('_')[0];
    
    // 追加の正規化：複雑なカードID対応
    // 例: hBP02-084_02_U -> hBP02-084_02 -> hBP02-084
    // 例: hSD01-017_02_C -> hSD01-017_02 -> hSD01-017
    
    // 末尾の数字とアンダースコアのパターンを除去
    // _02, _03 などの連番表記を除去
    id = id.replace(/_\d+$/, '');
    
    return id;
  }

  /**
   * カードIDから効果ファイル名を生成
   * @param {string} cardId - 正規化されたカードID
   * @returns {string} 効果ファイル名
   */
  getEffectFileName(cardId) {
    return `${cardId}.js`;
  }

  /**
   * 複数のカードを一括読み込み
   * @param {string[]} cardIds - カードIDの配列
   */
  async loadCards(cardIds) {
    const results = await Promise.all(
      cardIds.map(cardId => this.loadCard(cardId))
    );
    return results;
  }

  /**
   * デッキ内の全カードを読み込み
   * @param {Object[]} deck - デッキのカード配列
   */
  async loadDeck(deck) {
    const cardIds = deck.map(card => card.id || card.number).filter(Boolean);
    return this.loadCards(cardIds);
  }

  /**
   * 読み込み済みカードリストを取得
   */
  getLoadedCards() {
    return Array.from(this.loadedCards);
  }

  /**
   * カードが読み込み済みかチェック
   * @param {string} cardId - カードID
   */
  isLoaded(cardId) {
    const normalizedCardId = this.normalizeCardId(cardId);
    return this.loadedCards.has(normalizedCardId);
  }
}

// グローバルインスタンスを作成
window.cardEffectLoader = new CardEffectLoader();

