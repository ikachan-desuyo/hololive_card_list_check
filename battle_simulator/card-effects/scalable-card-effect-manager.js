/**
 * 大規模カード効果管理システム (1000枚以上対応)
 * 遅延読み込み・キャッシュ・パターン認識による効率化
 */

class ScalableCardEffectManager {
  constructor(battleEngine) {
    this.battleEngine = battleEngine;
    this.effectRegistry = new Map();
    this.loadedEffects = new Map(); // 読み込み済み効果（Setから変更）
    this.effectPatterns = new Map(); // 効果パターンのテンプレート
    this.cardMetadata = new Map(); // カードメタデータ（軽量）
    this.cachedCardData = null; // キャッシュされたcard_data.json
    
    // パフォーマンス最適化
    this.batchSize = 50; // 一度に読み込むカード数
    this.lazyLoadThreshold = 100; // 遅延読み込み閾値
    
    this.initializeSystem();
  }

  /**
   * システム初期化（ページ読み込み時）
   */
  async initializeSystem() {
    console.log('🔧 ScalableCardEffectManager: システム初期化中...');
    
    try {
      // 1. 効果パターンの登録
      this.registerEffectPatterns();
      
      // 2. 高頻度カードの事前読み込み
      await this.preloadCommonCards();
      
      // 3. 基本メタデータの読み込み
      await this.loadBasicMetadata();
      
    } catch (error) {
      console.warn('⚠️ システム初期化中にエラーが発生しましたが、処理を継続します:', error);
    }
    
    console.log('✅ ScalableCardEffectManager: システム初期化完了');
  }

  /**
   * 基本メタデータの読み込み（ページ読み込み時）
   */
  async loadBasicMetadata() {
    this.showLoadingUI('基本カード情報を読み込み中...');
    
    try {
      // card_data.jsonを一度だけ読み込み
      const response = await fetch('json_file/card_data.json');
      this.cachedCardData = await response.json();
      
      console.log('📋 基本カードデータを読み込みました');
      
    } catch (error) {
      console.error('❌ 基本メタデータの読み込みに失敗:', error);
    } finally {
      this.hideLoadingUI();
    }
  }

  /**
   * 高頻度カードの事前読み込み（ページ読み込み時）
   */
  async preloadCommonCards() {
    this.showLoadingUI('よく使われるカードを準備中...');
    
    try {
      // 高頻度カードファイルが読み込まれているかチェック
      if (typeof window !== 'undefined' && window.COMMON_CARD_EFFECTS) {
        console.log('🔄 高頻度カードを事前読み込み中...');
        
        // 高頻度カードのメタデータを設定
        Object.entries(window.COMMON_CARD_METADATA).forEach(([cardId, metadata]) => {
          this.cardMetadata.set(cardId, metadata);
        });
        
        // 高頻度カードの効果を事前読み込み
        Object.entries(window.COMMON_CARD_EFFECTS).forEach(([cardId, effect]) => {
          this.loadedEffects.set(cardId, effect);
        });
        
        console.log(`✅ 高頻度カード ${Object.keys(window.COMMON_CARD_EFFECTS).length}種類を事前読み込み完了`);
      }
      
    } catch (error) {
      console.warn('⚠️ 高頻度カードの事前読み込み中にエラー:', error);
    } finally {
      this.hideLoadingUI();
    }
  }

  /**
   * デッキ選択時の軽量初期化（メタデータのみ）
   */
  async prepareDeckCards(deckData) {
    const cardIds = Object.keys(deckData);
    
    console.log(`📋 デッキカード情報を準備中... (${cardIds.length}枚)`);
    
    // デッキ内のカードのメタデータのみ読み込み
    for (const cardId of cardIds) {
      await this.loadCardMetadata(cardId);
    }
    
    console.log(`✅ デッキカード情報の準備完了`);
  }

  /**
   * ゲーム開始時のカード効果初期化（実際の効果ファイル読み込み）
   */
  async initializeDeckCards(deckData) {
    const cardIds = Object.keys(deckData);
    
    console.log(`🃏 ゲーム開始 - カード効果を初期化中... (${cardIds.length}枚)`);
    this.showLoadingUI(`デッキカードを準備中... (${cardIds.length}枚)`);
    
    try {
      // キャッシュされたデータを使用してメタデータを一括読み込み
      await this.loadDeckMetadataFromCache(cardIds);
      
      // 高優先度カードを事前読み込み
      await this.preloadDeckCards(cardIds);
      
      console.log(`✅ カード効果の初期化完了`);
      
    } catch (error) {
      console.error('❌ カード効果初期化中にエラー:', error);
    } finally {
      this.hideLoadingUI();
    }
  }

  /**
   * キャッシュからデッキメタデータを読み込み
   */
  async loadDeckMetadataFromCache(cardIds) {
    if (!this.cachedCardData) {
      console.warn('⚠️ キャッシュされたカードデータがありません');
      return;
    }
    
    let processedCount = 0;
    for (const cardId of cardIds) {
      if (!this.cardMetadata.has(cardId)) {
        const card = this.cachedCardData[cardId];
        if (card) {
          this.cardMetadata.set(cardId, {
            id: cardId,
            name: card.name,
            cardType: card.card_type,
            rarity: card.rarity,
            hasCustomEffect: await this.detectCustomEffect(card),
            effectPattern: this.detectEffectPattern(card),
            loadPriority: this.calculateLoadPriority(card)
          });
        }
      }
      processedCount++;
      
      // プログレス表示更新
      if (processedCount % 10 === 0) {
        this.updateLoadingProgress(processedCount, cardIds.length);
      }
    }
  }

  /**
   * 単一カードのメタデータを読み込み（レガシー互換・使用非推奨）
   */
  async loadCardMetadata(cardId) {
    if (this.cardMetadata.has(cardId)) return;
    
    try {
      // キャッシュされたデータを優先使用
      let card;
      if (this.cachedCardData && this.cachedCardData[cardId]) {
        card = this.cachedCardData[cardId];
      } else {
        // フォールバック: 個別読み込み
        const response = await fetch('json_file/card_data.json');
        const cardData = await response.json();
        card = cardData[cardId];
      }
      
      if (!card) return;
      
      // メタデータを保存
      this.cardMetadata.set(cardId, {
        id: cardId,
        name: card.name,
        cardType: card.card_type,
        rarity: card.rarity,
        hasCustomEffect: await this.detectCustomEffect(card),
        effectPattern: this.detectEffectPattern(card),
        loadPriority: this.calculateLoadPriority(card)
      });
      
    } catch (error) {
      console.warn(`カードメタデータの読み込みに失敗: ${cardId}`, error);
    }
  }

  /**
   * カスタム効果があるかの検出
   */
  async detectCustomEffect(card) {
    const cardNumber = this.normalizeFileId(card.number || card.id);
    if (!cardNumber) return false;

    // 静的インデックス（cards/implemented-cards.js）があればネットワークアクセス不要
    if (Array.isArray(window.IMPLEMENTED_CARD_EFFECTS)) {
      return window.IMPLEMENTED_CARD_EFFECTS.includes(cardNumber);
    }

    // フォールバック: HEAD fetch でファイル存在チェック
    const scriptPath = `battle_simulator/card-effects/cards/${cardNumber}.js`;
    try {
      return await this.checkFileExists(scriptPath);
    } catch (error) {
      return false;
    }
  }

  /**
   * 効果パターンの検出
   */
  detectEffectPattern(card) {
    if (!card.skills || card.skills.length === 0) return 'none';
    
    const skillText = card.skills[0]?.name || '';
    
    // パターン分類
    if (skillText.includes('デッキから') && skillText.includes('手札に加える')) {
      return 'deck_search';
    }
    if (skillText.includes('ドロー')) {
      return 'card_draw';
    }
    if (skillText.includes('ダメージ')) {
      return 'damage_deal';
    }
    if (skillText.includes('エール')) {
      return 'yell_manipulation';
    }
    if (skillText.includes('LIMITED')) {
      return 'limited_support';
    }
    
    return 'custom';
  }

  /**
   * 読み込み優先度の計算
   */
  calculateLoadPriority(card) {
    let priority = 0;
    
    // レアリティベース
    if (card.rarity === 'RR' || card.rarity === 'SP') priority += 10;
    if (card.rarity === 'R') priority += 5;
    
    // カードタイプベース
    if (card.card_type?.includes('サポート')) priority += 3;
    if (card.card_type?.includes('LIMITED')) priority += 2;
    
    return priority;
  }

  /**
   * 効果パターンテンプレートの登録
   *
   * TODO(Phase 4): 汎用パターン効果（deck_search / card_draw / limited_support）を
   * card-effect-utils.js ベースで実装する。
   * 旧実装は executeDeckSearch() 等の未定義メソッドを呼んでおり実行時に必ず失敗していたため、
   * 実装が用意できるまでパターン登録は行わない（カスタム効果が無いカードは「効果未実装」になる）。
   */
  registerEffectPatterns() {
    // 現状、登録するパターン効果なし
  }

  /**
   * デッキカードの事前読み込み
   */
  async preloadDeckCards(cardIds) {
    // デッキ内のカードから優先度の高いものを事前読み込み
    const deckCardMetadata = cardIds
      .map(id => this.cardMetadata.get(id))
      .filter(meta => meta)
      .sort((a, b) => b.loadPriority - a.loadPriority)
      .slice(0, this.batchSize);

    console.log(`🔄 優先度の高いデッキカードを事前読み込み中... (${deckCardMetadata.length}枚)`);

    for (const meta of deckCardMetadata) {
      await this.loadCardEffect(meta.id);
    }

    console.log(`✅ デッキカード事前読み込み完了`);
  }

  /**
   * カード効果の遅延読み込み
   */
  async loadCardEffect(cardId) {
    if (this.loadedEffects.has(cardId)) {
      return this.effectRegistry.get(cardId);
    }

    const metadata = this.cardMetadata.get(cardId);
    if (!metadata) return null;

    try {
      let effect = null;

      if (metadata.hasCustomEffect) {
        // カスタム効果ファイルを読み込み
        effect = await this.loadCustomEffect(cardId);
      } else {
        // パターンテンプレートを使用
        effect = this.createPatternEffect(metadata);
      }

      if (effect) {
        this.effectRegistry.set(cardId, effect);
        this.loadedEffects.set(cardId, effect);
      }

      return effect;
    } catch (error) {
      return null;
    }
  }

  /**
   * カード効果を取得（新システム用）
   */
  async getCardEffect(cardId) {
    // カードIDを正規化
    const normalizedId = this.normalizeCardId(cardId);
    
    // 登録済み効果を優先的に確認
    if (this.effectRegistry.has(normalizedId)) {
      return this.effectRegistry.get(normalizedId);
    }

    // グローバルに登録されている効果を確認
    const globalEffectName = `cardEffect_${normalizedId.replace(/-/g, '_')}`;
    if (window[globalEffectName]) {
      const effect = window[globalEffectName];
      this.effectRegistry.set(normalizedId, effect);
      return effect;
    }

    // 動的読み込みを試行
    return await this.loadCardEffect(normalizedId);
  }

  /**
   * カード効果を登録（新システム用）
   */
  registerCardEffect(cardId, effect) {
    const normalizedId = this.normalizeCardId(cardId);
    this.effectRegistry.set(normalizedId, effect);
    this.loadedEffects.set(normalizedId, effect);
  }

  /**
   * カードIDを正規化
   */
  normalizeCardId(cardId) {
    if (!cardId) return '';
    let id = String(cardId);
    id = id.split('_')[0]; // レアリティ表記除去
    id = id.replace(/_\d+$/, ''); // 連番除去
    return id;
  }

  /**
   * ファイル名用のIDを正規化（より厳密）
   */
  normalizeFileId(cardId) {
    if (!cardId) return '';
    let id = String(cardId);
    
    // レアリティ表記除去 (_U, _R, _RR, _C, _OSR など)
    id = id.replace(/_[A-Z]+$/, '');
    
    // 連番除去 (_02, _03 など)
    id = id.replace(/_\d+$/, '');
    
    return id;
  }

  /**
   * カスタム効果ファイルの読み込み
   */
  async loadCustomEffect(cardId) {
    // ファイル名を正規化 (例: hBP04-089_U_02 → hBP04-089)
    const fileName = this.normalizeFileId(cardId);
    const scriptPath = `battle_simulator/card-effects/cards/${fileName}.js`;

    try {
      // 既にwindow.cardEffectsに登録済みかチェック（最優先）
      if (window.cardEffects && window.cardEffects[cardId]) {
        return window.cardEffects[cardId];
      }

      // グローバル変数でも確認
      const globalEffectName = `cardEffect_${fileName.replace(/-/g, '_')}`;
      if (window[globalEffectName]) {
        // 新システムに登録して返す
        if (!window.cardEffects) window.cardEffects = {};
        window.cardEffects[cardId] = window[globalEffectName];
        return window[globalEffectName];
      }

      // 既にDOM内にスクリプトがあるかチェック
      if (document.querySelector(`script[src="${scriptPath}"]`)) {
        return this.getEffectFromGlobal(cardId);
      }

      // ファイル存在チェック（静的インデックス優先、無ければ HEAD fetch）
      const fileExists = Array.isArray(window.IMPLEMENTED_CARD_EFFECTS)
        ? window.IMPLEMENTED_CARD_EFFECTS.includes(fileName)
        : await this.checkFileExists(scriptPath);
      if (!fileExists) {
        return null;
      }

      // 動的スクリプト読み込み
      await this.loadScript(scriptPath);
      return this.getEffectFromGlobal(cardId);
    } catch (error) {
      return null;
    }
  }

  /**
   * パターンベース効果の生成
   */
  createPatternEffect(metadata) {
    const pattern = this.effectPatterns.get(metadata.effectPattern);
    if (!pattern) return null;

    return {
      cardId: metadata.id,
      name: metadata.name,
      type: 'pattern',
      pattern: metadata.effectPattern,
      execute: pattern.execute.bind(this)
    };
  }

  /**
   * 効果実行（メインエントリーポイント）
   */
  async executeEffect(card, triggerType, context = {}) {
    // 必要に応じて効果を遅延読み込み
    const effect = await this.loadCardEffect(card.id);
    
    if (!effect) {
      return { success: false, reason: '効果未実装' };
    }

    try {
      // 発動条件チェック
      if (effect.canActivate && !effect.canActivate(card, context, this.battleEngine)) {
        return { success: false, reason: '発動条件を満たしていません' };
      }

      // 効果実行
      const result = await effect.execute(card, context, this.battleEngine);
      return result;
    } catch (error) {
      return { success: false, reason: 'エラーが発生しました', error };
    }
  }

  /**
   * スクリプト動的読み込み
   */
  loadScript(src) {
    return new Promise((resolve, reject) => {
      // 既に読み込み済みかチェック
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve(); // 既に読み込み済みなので成功として扱う
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      
      // 読み込み前に重複チェック用の属性を追加
      script.setAttribute('data-card-effect', 'true');
      
      document.head.appendChild(script);
    });
  }

  /**
   * ファイル存在チェック
   */
  async checkFileExists(path) {
    try {
      const response = await fetch(path, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * グローバルから効果を取得
   */
  getEffectFromGlobal(cardId) {
    // 新システムの登録先を優先チェック
    if (window.cardEffects && window.cardEffects[cardId]) {
      return window.cardEffects[cardId];
    }
    
    // 旧システムのグローバル変数もチェック
    const globalEffectName = `cardEffect_${cardId.replace(/-/g, '_')}`;
    if (window[globalEffectName]) {
      return window[globalEffectName];
    }
    
    return null;
  }

  /**
   * 統計情報の取得
   */
  getStats() {
    return {
      totalCards: this.cardMetadata.size,
      loadedEffects: this.loadedEffects.size,
      customEffects: Array.from(this.cardMetadata.values())
        .filter(meta => meta.hasCustomEffect).length,
      patternEffects: Array.from(this.cardMetadata.values())
        .filter(meta => !meta.hasCustomEffect && meta.effectPattern !== 'none').length
    };
  }

  // =========================================
  // UI読み込み表示関連メソッド
  // =========================================

  /**
   * 読み込みUIを表示
   */
  showLoadingUI(message = 'カード情報を読み込み中...') {
    // 既存のローディング表示があれば削除
    this.hideLoadingUI();
    
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'card-effect-loading';
    loadingOverlay.innerHTML = `
      <div class="loading-backdrop">
        <div class="loading-content">
          <div class="loading-spinner"></div>
          <div class="loading-message">${message}</div>
          <div class="loading-progress">
            <div class="progress-bar" id="card-loading-progress"></div>
          </div>
        </div>
      </div>
    `;
    
    // スタイルを追加
    const style = document.createElement('style');
    style.textContent = `
      #card-effect-loading {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 9999;
      }
      
      .loading-backdrop {
        background: rgba(0, 0, 0, 0.7);
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      
      .loading-content {
        background: white;
        padding: 30px;
        border-radius: 10px;
        text-align: center;
        min-width: 300px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      }
      
      .loading-spinner {
        width: 50px;
        height: 50px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #667eea;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      .loading-message {
        font-size: 16px;
        margin-bottom: 20px;
        color: #333;
      }
      
      .loading-progress {
        width: 100%;
        height: 6px;
        background: #f0f0f0;
        border-radius: 3px;
        overflow: hidden;
      }
      
      .progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #667eea, #764ba2);
        width: 0%;
        transition: width 0.3s ease;
        border-radius: 3px;
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(loadingOverlay);
  }

  /**
   * 読み込みプログレスを更新
   */
  updateLoadingProgress(current, total) {
    const progressBar = document.getElementById('card-loading-progress');
    if (progressBar) {
      const percentage = Math.round((current / total) * 100);
      progressBar.style.width = `${percentage}%`;
      
      // メッセージも更新
      const messageElement = document.querySelector('#card-effect-loading .loading-message');
      if (messageElement) {
        messageElement.textContent = `カード情報を処理中... (${current}/${total})`;
      }
    }
  }

  /**
   * 読み込みメッセージを更新
   */
  updateLoadingMessage(message) {
    const messageElement = document.querySelector('#card-effect-loading .loading-message');
    if (messageElement) {
      messageElement.textContent = message;
    }
  }

  /**
   * 読み込みUIを非表示
   */
  hideLoadingUI() {
    const loadingElement = document.getElementById('card-effect-loading');
    if (loadingElement) {
      loadingElement.remove();
    }
    
    // スタイルも削除
    const styles = document.querySelectorAll('style');
    styles.forEach(style => {
      if (style.textContent.includes('#card-effect-loading')) {
        style.remove();
      }
    });
  }
}

// グローバルエクスポート
if (typeof window !== 'undefined') {
  window.ScalableCardEffectManager = ScalableCardEffectManager;
  window.cardEffects = window.cardEffects || {}; // 個別効果の登録用
}
