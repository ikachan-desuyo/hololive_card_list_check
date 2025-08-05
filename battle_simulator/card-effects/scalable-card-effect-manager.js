/**
 * 大規模カード効果管理システム (1000枚以上対応)
 * 遅延読み込み・キャッシュ・パターン認識による効率化
 */

class ScalableCardEffectManager {
  constructor(battleEngine) {
    this.battleEngine = battleEngine;
    this.effectRegistry = new Map();
    this.loadedEffects = new Set(); // 読み込み済み効果
    this.effectPatterns = new Map(); // 効果パターンのテンプレート
    this.cardMetadata = new Map(); // カードメタデータ（軽量）
    
    // パフォーマンス最適化
    this.batchSize = 50; // 一度に読み込むカード数
    this.lazyLoadThreshold = 100; // 遅延読み込み閾値
    
    this.initializeSystem();
  }

  /**
   * システム初期化
   */
  async initializeSystem() {
    // 1. 効果パターンの登録
    this.registerEffectPatterns();
    
    // 2. カードメタデータは必要時のみ読み込み（デッキ選択時）
    // loadCardMetadata() は削除 - デッキベースで読み込み
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
    
    // メタデータが未読み込みの場合は読み込み
    for (const cardId of cardIds) {
      if (!this.cardMetadata.has(cardId)) {
        await this.loadCardMetadata(cardId);
      }
    }
    
    // 高優先度カードを事前読み込み
    await this.preloadDeckCards(cardIds);
    
    console.log(`✅ カード効果の初期化完了`);
  }

  /**
   * 単一カードのメタデータを読み込み
   */
  async loadCardMetadata(cardId) {
    if (this.cardMetadata.has(cardId)) return;
    
    try {
      // card_data.jsonから該当カードの情報を取得
      const response = await fetch('/json_file/card_data.json');
      const cardData = await response.json();
      const card = cardData[cardId];
      
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
    // ファイル名を正規化してファイル存在チェック
    const cardNumber = this.normalizeFileId(card.number || card.id);
    if (!cardNumber) return false;
    
    const scriptPath = `/battle_simulator/card-effects/cards/${cardNumber}.js`;
    
    try {
      // ファイル存在チェック
      const fileExists = await this.checkFileExists(scriptPath);
      return fileExists;
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
   */
  registerEffectPatterns() {
    // デッキ検索パターン
    this.effectPatterns.set('deck_search', {
      template: 'DeckSearchTemplate',
      async execute(card, context, battleEngine) {
        return await this.executeDeckSearch(card, context, battleEngine);
      }
    });

    // カードドローパターン
    this.effectPatterns.set('card_draw', {
      template: 'CardDrawTemplate',
      async execute(card, context, battleEngine) {
        return await this.executeCardDraw(card, context, battleEngine);
      }
    });

    // 汎用サポートパターン
    this.effectPatterns.set('limited_support', {
      template: 'LimitedSupportTemplate',
      async execute(card, context, battleEngine) {
        return await this.executeLimitedSupport(card, context, battleEngine);
      }
    });
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
   * 高頻度カードの事前読み込み（旧システム用）
   */
  async preloadCommonCards() {
    // 優先度の高いカードを事前読み込み
    const highPriorityCards = Array.from(this.cardMetadata.values())
      .filter(meta => meta.loadPriority >= 5)
      .sort((a, b) => b.loadPriority - a.loadPriority)
      .slice(0, this.batchSize);

    for (const meta of highPriorityCards) {
      await this.loadCardEffect(meta.id);
    }
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
        this.loadedEffects.add(cardId);
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
    this.loadedEffects.add(normalizedId);
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
    const scriptPath = `/battle_simulator/card-effects/cards/${fileName}.js`;

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

      // ファイル存在チェック
      const fileExists = await this.checkFileExists(scriptPath);
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
}

// グローバルエクスポート
if (typeof window !== 'undefined') {
  window.ScalableCardEffectManager = ScalableCardEffectManager;
  window.cardEffects = window.cardEffects || {}; // 個別効果の登録用
}
