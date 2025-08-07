/**
 * 高頻度カード効果ファイル
 * デッキによく採用されるカードの効果を事前読み込み用にまとめたファイル
 */

// 高頻度採用カードリスト（実際のデータに基づいて調整）
const COMMON_DECK_CARDS = [
  // エールカード（どのデッキにも入る基本カード）
  'hSD01-019', 'hSD01-020', 'hBP01-085', 'hBP01-086', 'hBP01-087',
  
  // 汎用サポートカード
  'hBP01-088', 'hBP01-089', 'hBP01-090', 'hBP01-091',
  
  // 人気の推しホロメン
  'hSD01-001', 'hBP01-001', 'hBP01-002', 'hBP01-003',
  
  // よく使われるホロメンカード
  'hBP01-010', 'hBP01-015', 'hBP01-020', 'hBP01-025',
  
  // 追加で必要に応じて拡張
];

// 高頻度カードの効果定義
const COMMON_CARD_EFFECTS = {
  // エールカード効果
  'hSD01-019': {
    name: '基本エール（青）',
    pattern: 'simple_energy',
    effect: function(battleEngine) {
      // 基本的なエール効果
      return {
        energy: 1,
        color: 'blue'
      };
    }
  },
  
  'hSD01-020': {
    name: '基本エール（赤）',
    pattern: 'simple_energy',
    effect: function(battleEngine) {
      return {
        energy: 1,
        color: 'red'
      };
    }
  },
  
  // サポートカード効果
  'hBP01-088': {
    name: 'ファンレター',
    pattern: 'simple_draw',
    effect: function(battleEngine) {
      // カードドロー効果
      return {
        drawCards: 1,
        description: 'カードを1枚引く'
      };
    }
  },
  
  // 推しホロメン効果（例）
  'hSD01-001': {
    name: 'ときのそら',
    pattern: 'oshi_effect',
    effect: function(battleEngine) {
      return {
        oshiSkill: 'tokino_sora_skill',
        description: 'ときのそらの推しスキル'
      };
    }
  }
  
  // 他の高頻度カードも同様に定義
};

// メタデータ情報
const COMMON_CARD_METADATA = {};
COMMON_DECK_CARDS.forEach(cardId => {
  COMMON_CARD_METADATA[cardId] = {
    id: cardId,
    isCommon: true,
    loadPriority: 10, // 最高優先度
    hasCustomEffect: COMMON_CARD_EFFECTS[cardId] ? true : false,
    effectPattern: COMMON_CARD_EFFECTS[cardId]?.pattern || 'none',
    preloaded: true
  };
});

// エクスポート
if (typeof window !== 'undefined') {
  window.COMMON_DECK_CARDS = COMMON_DECK_CARDS;
  window.COMMON_CARD_EFFECTS = COMMON_CARD_EFFECTS;
  window.COMMON_CARD_METADATA = COMMON_CARD_METADATA;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    COMMON_DECK_CARDS,
    COMMON_CARD_EFFECTS,
    COMMON_CARD_METADATA
  };
}
