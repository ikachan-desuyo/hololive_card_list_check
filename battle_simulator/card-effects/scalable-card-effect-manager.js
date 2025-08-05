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
    // 1. カードメタデータの読み込み（全カード分の軽量データ）
    await this.loadCardMetadata();
    
    // 2. 効果パターンの登録
    this.registerEffectPatterns();
    
    // 3. 高頻度使用カードの事前読み込み
    await this.preloadCommonCards();
  }

  /**
   * カードメタデータの読み込み
   * 全カードの基本情報のみ（効果実装は含まない）
   */
  async loadCardMetadata() {
    try {
      // card_data.jsonから基本情報を抽出
      const response = await fetch('/json_file/card_data.json');
      const cardData = await response.json();
      
      for (const [cardId, card] of Object.entries(cardData)) {
        // 軽量メタデータのみ保存
        this.cardMetadata.set(cardId, {
          id: cardId,
          name: card.name,
          cardType: card.card_type,
          rarity: card.rarity,
          hasCustomEffect: this.detectCustomEffect(card),
          effectPattern: this.detectEffectPattern(card),
          loadPriority: this.calculateLoadPriority(card)
        });
      }
      
    } catch (error) {
    }
  }

  /**
   * カスタム効果があるかの検出
   */
  detectCustomEffect(card) {
    // 複雑な効果を持つカードかを判定
    if (!card.skills || card.skills.length === 0) return false;
    
    const skillText = card.skills[0]?.name || '';
    
    // カスタム実装が必要そうなキーワード
    const complexKeywords = [
      'デッキから', 'シャッフル', '選ぶ', '公開',
      'ターンに', '条件', 'なければ', 'ダメージ',
      'ドロー', 'アーカイブ', 'エール', 'ホロパワー'
    ];
    
    return complexKeywords.some(keyword => skillText.includes(keyword));
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
   * 高頻度カードの事前読み込み
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
   * カスタム効果ファイルの読み込み
   */
  async loadCustomEffect(cardId) {
    // ファイル名を正規化 (例: hBP04-089_U → hBP04-089)
    const fileName = cardId.replace(/_[A-Z]+$/, '');
    const scriptPath = `/battle_simulator/card-effects/cards/${fileName}.js`;

    try {
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
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
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
    // グローバルに登録された効果を取得
    if (window.cardEffects && window.cardEffects[cardId]) {
      return window.cardEffects[cardId];
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
