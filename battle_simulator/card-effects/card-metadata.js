/**
 * カード効果メタデータ設定ファイル
 * カードIDと効果パターンの対応表
 */

// 効果パターンの定義
const EFFECT_PATTERNS = {
  // 基本パターン
  SIMPLE_DRAW: 'simple_draw',           // シンプルなドロー効果
  CONDITIONAL_SEARCH: 'conditional_search', // 条件付きサーチ
  DAMAGE_EFFECT: 'damage_effect',       // ダメージ効果
  DECK_MANIPULATION: 'deck_manipulation', // デッキ操作
  
  // 複合パターン
  SEARCH_AND_DRAW: 'search_and_draw',   // サーチ+ドロー
  DAMAGE_AND_DRAW: 'damage_and_draw',   // ダメージ+ドロー
  MULTI_SEARCH: 'multi_search',         // 複数種類のサーチ
  
  // 特殊パターン
  COLLAB_TRIGGER: 'collab_trigger',     // コラボ時発動
  BLOOM_TRIGGER: 'bloom_trigger',       // ブルーム時発動
  STAGE_DEPENDENT: 'stage_dependent',   // ステージ依存
  COLOR_DEPENDENT: 'color_dependent',   // 色依存
  
  // カスタムパターン
  CUSTOM_COMPLEX: 'custom_complex',     // 複雑なカスタム効果
  UNIQUE_EFFECT: 'unique_effect'        // 独自効果
};

// カードメタデータマッピング
const CARD_METADATA = {
  // ツール系
  'hBP04-089_U': {  // ツートンカラーパソコン
    pattern: EFFECT_PATTERNS.CONDITIONAL_SEARCH,
    complexity: 'medium',
    tags: ['search', 'color_dependent', 'deck_manipulation'],
    description: '2色以上条件でのサーチ効果',
    effectConfig: {
      requiresColors: 2,
      searchTypes: ['ホロメン'],
      searchLevel: '1st',
      maxResults: 2,
      colorMatching: true
    }
  },
  
  'hBP04-090_U': {  // 作業用パソコン
    pattern: EFFECT_PATTERNS.MULTI_SEARCH,
    complexity: 'medium',
    tags: ['search', 'deck_top', 'selective'],
    description: 'デッキトップから選択的サーチ',
    effectConfig: {
      lookAtCards: 4,
      selectTypes: [
        { types: ['ホロメン'], count: 1 },
        { types: ['ツール', 'マスコット', 'ファン'], count: 1 }
      ]
    }
  },
  
  'hBP04-091_C': {  // 基本的なドローカード（例）
    pattern: EFFECT_PATTERNS.SIMPLE_DRAW,
    complexity: 'low',
    tags: ['draw', 'basic'],
    description: '基本的なドロー効果',
    effectConfig: {
      drawCount: 2,
      conditions: []
    }
  },
  
  'hBP04-092_C': {  // コラボ依存効果（例）
    pattern: EFFECT_PATTERNS.COLLAB_TRIGGER,
    complexity: 'medium',
    tags: ['collab', 'trigger', 'conditional'],
    description: 'コラボ時に発動する効果',
    effectConfig: {
      triggerTiming: 'on_collab',
      effects: ['draw', 'damage'],
      autoTrigger: true
    }
  },
  
  'hBP04-093_R': {  // 複合効果レアカード（例）
    pattern: EFFECT_PATTERNS.SEARCH_AND_DRAW,
    complexity: 'high',
    tags: ['search', 'draw', 'multi_effect'],
    description: 'サーチ後にドロー効果',
    effectConfig: {
      searchFirst: {
        types: ['ホロメン'],
        count: 1,
        restrictions: ['same_color']
      },
      thenDraw: 1
    }
  },
  
  'hBP04-094_SR': {  // 特殊効果SRカード（例）
    pattern: EFFECT_PATTERNS.CUSTOM_COMPLEX,
    complexity: 'very_high',
    tags: ['custom', 'complex', 'game_changing'],
    description: '複雑な独自効果',
    effectConfig: {
      customImplementation: true,
      requiresSpecialUI: true,
      multiStep: true
    }
  }
};

// パターンごとの実装テンプレート情報
const PATTERN_TEMPLATES = {
  [EFFECT_PATTERNS.SIMPLE_DRAW]: {
    baseComplexity: 1,
    requiredUtils: ['drawCards', 'updateDisplay'],
    templateFile: 'simple-draw-template.js',
    configurable: ['drawCount', 'conditions']
  },
  
  [EFFECT_PATTERNS.CONDITIONAL_SEARCH]: {
    baseComplexity: 3,
    requiredUtils: ['selectCardsFromDeck', 'addCardsToHand', 'checkConditions'],
    templateFile: 'conditional-search-template.js',
    configurable: ['searchTypes', 'conditions', 'count']
  },
  
  [EFFECT_PATTERNS.MULTI_SEARCH]: {
    baseComplexity: 4,
    requiredUtils: ['selectCardsFromDeck', 'addCardsToHand', 'updateDisplay'],
    templateFile: 'multi-search-template.js',
    configurable: ['lookAtCards', 'selectTypes', 'deckPosition']
  },
  
  [EFFECT_PATTERNS.COLLAB_TRIGGER]: {
    baseComplexity: 3,
    requiredUtils: ['registerTrigger', 'drawCards', 'dealDamage'],
    templateFile: 'collab-trigger-template.js',
    configurable: ['triggerConditions', 'effects', 'autoTrigger']
  },
  
  [EFFECT_PATTERNS.CUSTOM_COMPLEX]: {
    baseComplexity: 5,
    requiredUtils: ['all'],
    templateFile: 'custom-complex-template.js',
    configurable: ['all']
  }
};

// カードの効果発動タイミング定義
const ACTIVATION_TIMINGS = {
  MANUAL: 'manual',           // 手動発動（メインフェーズ等）
  COLLAB: 'on_collab',       // コラボ時自動発動
  BLOOM: 'on_bloom',         // ブルーム時自動発動
  TURN_START: 'turn_start',  // ターン開始時
  TURN_END: 'turn_end',      // ターン終了時
  DAMAGE: 'on_damage',       // ダメージ時
  DRAW: 'on_draw',           // ドロー時
  STAGE_ENTER: 'stage_enter', // ステージ登場時
  ARCHIVE: 'on_archive'      // アーカイブ時
};

// 効果の複雑さレベル
const COMPLEXITY_LEVELS = {
  LOW: 1,        // 基本的な効果（ドロー、単純サーチ等）
  MEDIUM: 2,     // 条件付き効果
  HIGH: 3,       // 複合効果、複数ステップ
  VERY_HIGH: 4,  // 複雑な条件、UI操作必要
  EXTREME: 5     // ゲーム全体に影響する効果
};

// 効果タグ定義（検索・分類用）
const EFFECT_TAGS = {
  // 基本操作
  DRAW: 'draw',
  SEARCH: 'search',
  DAMAGE: 'damage',
  HEAL: 'heal',
  
  // 場所関連
  DECK: 'deck',
  HAND: 'hand',
  STAGE: 'stage',
  ARCHIVE: 'archive',
  
  // 条件関連
  COLOR_DEPENDENT: 'color_dependent',
  LEVEL_DEPENDENT: 'level_dependent',
  COUNT_DEPENDENT: 'count_dependent',
  
  // トリガー関連
  AUTO_TRIGGER: 'auto_trigger',
  MANUAL_TRIGGER: 'manual_trigger',
  CONDITIONAL_TRIGGER: 'conditional_trigger',
  
  // 特殊
  MULTI_EFFECT: 'multi_effect',
  GAME_CHANGING: 'game_changing',
  UI_INTENSIVE: 'ui_intensive'
};

// エクスポート
if (typeof window !== 'undefined') {
  window.CARD_EFFECT_METADATA = {
    EFFECT_PATTERNS,
    CARD_METADATA,
    PATTERN_TEMPLATES,
    ACTIVATION_TIMINGS,
    COMPLEXITY_LEVELS,
    EFFECT_TAGS
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    EFFECT_PATTERNS,
    CARD_METADATA,
    PATTERN_TEMPLATES,
    ACTIVATION_TIMINGS,
    COMPLEXITY_LEVELS,
    EFFECT_TAGS
  };
}
