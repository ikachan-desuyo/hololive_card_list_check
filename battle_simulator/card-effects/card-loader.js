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
    // 既に読み込み済みの場合はスキップ
    if (this.loadedCards.has(cardId)) {
      return true;
    }

    // 既に読み込み中の場合は同じPromiseを返す
    if (this.loadingPromises.has(cardId)) {
      return this.loadingPromises.get(cardId);
    }

    // カードIDからファイル名を生成 (例: hBP04-048_RR -> hBP04-048.js)
    const fileName = cardId.split('_')[0] + '.js';
    const scriptPath = `battle_simulator/card-effects/cards/${fileName}`;

    const loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = scriptPath;
      script.onload = () => {
        this.loadedCards.add(cardId);
        resolve(true);
      };
      script.onerror = () => {
        resolve(false); // エラーでもresolveしてゲームを続行
      };
      document.head.appendChild(script);
    });

    this.loadingPromises.set(cardId, loadPromise);
    return loadPromise;
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
    return this.loadedCards.has(cardId);
  }
}

// グローバルインスタンスを作成
window.cardEffectLoader = new CardEffectLoader();

