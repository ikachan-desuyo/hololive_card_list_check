/**
 * 現在の実装済みカード効果の詳細リスト
 * 2025-08-22 時点での実装状況
 */

const IMPLEMENTED_CARDS_STATUS = {
  // 実装完了・検証済みカード (PRODUCTION_READY: Level 5)
  production_ready: [
    {
      cardId: 'hBP04-048',
      cardName: '雪花ラミィ',
      bloomLevel: '2nd',
      color: '青',
      effects: [
        { type: 'ブルームエフェクト', name: 'ユニーリアの令嬢', implemented: true, modal: true, validated: true },
        { type: 'アーツ', name: '今日も祝福がありますように', implemented: true, modal: true, validated: true }
      ],
      issues: [],
      lastValidated: '2025-08-22',
      notes: '名前修正済み（ねぇ、聞いて♪ → 今日も祝福がありますように）'
    },
    {
      cardId: 'hBP02-042',
      cardName: '紫咲シオン',
      bloomLevel: 'Debut',
      color: '紫',
      effects: [
        { type: 'アーツ', name: 'どうも～', implemented: true, modal: true, validated: true }
      ],
      issues: [],
      lastValidated: '2025-08-22',
      notes: '完全実装・検証済み'
    },
    {
      cardId: 'hBP02-045',
      cardName: '紫咲シオン',
      bloomLevel: '1st',
      color: '紫',
      effects: [
        { type: 'ブルームエフェクト', name: '久しぶりの全体ライブーっ！！', implemented: true, modal: true, validated: true },
        { type: 'アーツ', name: '最高にハッピーです！！', implemented: true, modal: true, validated: true }
      ],
      issues: [],
      lastValidated: '2025-08-22',
      notes: '完全実装・検証済み'
    }
  ],

  // 実装完了・未検証カード (VALIDATED: Level 4)
  validated: [
    {
      cardId: 'hBP02-076',
      cardName: 'カスタムパソコン',
      cardType: 'サポート・アイテム',
      effects: [
        { type: 'サポート効果', name: 'デッキサーチ効果', implemented: true, modal: true, validated: false }
      ],
      issues: [],
      lastValidated: '2025-08-22',
      notes: 'モーダル対応済み、動作検証要'
    },
    {
      cardId: 'hBP04-043',
      cardName: '雪花ラミィ',
      bloomLevel: 'Debut',
      color: '青',
      effects: [
        { type: 'アーツ', name: 'こんらみ～', implemented: true, modal: true, validated: false }
      ],
      issues: [],
      lastValidated: '2025-08-22',
      notes: 'モーダル対応済み、動作検証要'
    },
    {
      cardId: 'hBP04-044',
      cardName: '雪花ラミィ',
      bloomLevel: 'Debut',
      color: '青',
      effects: [
        { type: 'コラボエフェクト', name: 'Snow flower', implemented: true, modal: true, validated: false },
        { type: 'アーツ', name: 'うぅ…', implemented: true, modal: true, validated: false }
      ],
      issues: ['構文エラー修正済み'],
      lastValidated: '2025-08-22',
      notes: '重大なバグ修正済み、動作検証要'
    },
    {
      cardId: 'hBP04-045',
      cardName: '雪花ラミィ',
      bloomLevel: '1st',
      color: '青',
      effects: [
        { type: 'アーツ', name: 'おつらみ', implemented: true, modal: true, validated: false },
        { type: 'アーツ', name: 'ボスが攻略できな～い', implemented: true, modal: true, validated: false }
      ],
      issues: [],
      lastValidated: '2025-08-22',
      notes: '2つのアーツ実装済み'
    },
    {
      cardId: 'hBP04-046',
      cardName: '雪花ラミィ',
      bloomLevel: '1st',
      color: '青',
      effects: [
        { type: 'アーツ', name: 'いっぱい頑張るよ！', implemented: true, modal: true, validated: false }
      ],
      issues: [],
      lastValidated: '2025-08-22',
      notes: 'モーダル対応済み'
    },
    {
      cardId: 'hBP04-047',
      cardName: '雪花ラミィ',
      bloomLevel: '1st',
      color: '青',
      effects: [
        { type: 'コラボエフェクト', name: 'fleur', implemented: true, modal: true, validated: false },
        { type: 'アーツ', name: '雪が煌く花束', implemented: true, modal: true, validated: false }
      ],
      issues: [],
      lastValidated: '2025-08-22',
      notes: 'コラボエフェクト + アーツ実装済み'
    },
    {
      cardId: 'hBP04-004',
      cardName: '雪花ラミィ',
      cardType: '推しホロメン',
      color: '青',
      effects: [
        { type: '推しスキル', name: '愛してる', implemented: true, modal: true, validated: false },
        { type: 'SP推しスキル', name: 'ぶーん、バリバリバリバリ', implemented: true, modal: true, validated: false }
      ],
      issues: [],
      lastValidated: '2025-08-22',
      notes: '推しホロメン両効果実装済み'
    }
  ],

  // 完全実装済み・モーダル未対応 (FULL_IMPL: Level 3)
  full_implementation: [
    {
      cardId: 'hBP01-104',
      cardName: 'ふつうのパソコン',
      cardType: 'サポート・アイテム',
      effects: [
        { type: 'サポート効果', name: 'サポート効果', implemented: true, modal: true, validated: false }
      ],
      issues: [],
      lastValidated: '2025-08-22',
      notes: 'モーダル対応済み'
    },
    {
      cardId: 'hBP02-084',
      cardName: 'みっころね24',
      cardType: 'サポート・イベント・LIMITED',
      effects: [
        { type: 'サポート効果', name: 'サポート効果', implemented: true, modal: true, validated: false }
      ],
      issues: [],
      lastValidated: '2025-08-22',
      notes: 'LIMITED効果・モーダル対応済み'
    },
    {
      cardId: 'hBP04-089',
      cardName: 'ツートンカラーパソコン',
      cardType: 'サポート・アイテム・LIMITED',
      effects: [
        { type: 'サポート効果', name: 'サポート効果', implemented: true, modal: true, validated: false }
      ],
      issues: [],
      lastValidated: '2025-08-22',
      notes: '複雑なLIMITED効果実装済み'
    },
    {
      cardId: 'hSD01-014',
      cardName: '天音かなた',
      bloomLevel: 'Spot',
      color: '無色',
      effects: [
        { type: 'アーツ', name: 'へい', implemented: true, modal: true, validated: false }
      ],
      issues: [],
      lastValidated: '2025-08-22',
      notes: 'Spotホロメン・2色コスト'
    },
    {
      cardId: 'hSD01-016',
      cardName: '春先のどか',
      cardType: 'サポート・スタッフ',
      effects: [
        { type: 'サポート効果', name: 'ドロー効果', implemented: true, modal: true, validated: false }
      ],
      issues: [],
      lastValidated: '2025-08-22',
      notes: 'LIMITED・ドロー効果'
    },
    {
      cardId: 'hSD01-017',
      cardName: 'マネちゃん',
      cardType: 'サポート・スタッフ',
      effects: [
        { type: 'サポート効果', name: '手札リフレッシュ', implemented: true, modal: true, validated: false }
      ],
      issues: [],
      lastValidated: '2025-08-22',
      notes: 'LIMITED・手札シャッフル効果'
    },
    {
      cardId: 'hY04-001',
      cardName: '青エール',
      cardType: 'エール',
      color: '青',
      effects: [
        { type: 'エール効果', name: '青エール', implemented: true, modal: true, validated: false }
      ],
      issues: [],
      lastValidated: '2025-08-22',
      notes: 'エールカード・パッシブ効果'
    }
  ],

  // 部分実装 (PARTIAL_IMPL: Level 2)
  partial_implementation: [],

  // スケルトンのみ (SKELETON_ONLY: Level 1)
  skeleton_only: [],

  // 未着手 (NOT_STARTED: Level 0)
  not_started: []
};

// 統計情報
const IMPLEMENTATION_STATS = {
  "total_implemented": 17,
  "production_ready": 0,
  "validated": 0,
  "full_implementation": 0,
  "partial_implementation": 0,
  "skeleton_only": 17,
  "not_started": 0,
  "modal_support_rate": 0,
  "syntax_error_count": 17,
  "by_effect_type": {
    "ブルームエフェクト": 13,
    "サポート効果": 6,
    "アーツ": 10,
    "推しスキル": 1,
    "SP推しスキル": 1,
    "コラボエフェクト": 2,
    "エール効果": 1
  },
  "by_card_type": {
    "サポート・アイテム": 3,
    "ホロメン": 9,
    "サポート・イベント・LIMITED": 1,
    "推しホロメン": 1,
    "サポート・スタッフ": 2,
    "エール": 1
  },
  "detailed_breakdown": [
    {
      "cardId": "hBP01-104",
      "implementationLevel": 1,
      "levelName": "スケルトンのみ",
      "hasModalSupport": false,
      "syntaxValid": false,
      "effectsImplemented": 0,
      "issues": [
        "基本的なカード効果構造が不完全"
      ]
    },
    {
      "cardId": "hBP02-042",
      "implementationLevel": 1,
      "levelName": "スケルトンのみ",
      "hasModalSupport": false,
      "syntaxValid": false,
      "effectsImplemented": 0,
      "issues": [
        "基本的なカード効果構造が不完全"
      ]
    },
    {
      "cardId": "hBP02-045",
      "implementationLevel": 1,
      "levelName": "スケルトンのみ",
      "hasModalSupport": false,
      "syntaxValid": false,
      "effectsImplemented": 0,
      "issues": [
        "基本的なカード効果構造が不完全"
      ]
    },
    {
      "cardId": "hBP02-076",
      "implementationLevel": 1,
      "levelName": "スケルトンのみ",
      "hasModalSupport": false,
      "syntaxValid": false,
      "effectsImplemented": 0,
      "issues": [
        "基本的なカード効果構造が不完全"
      ]
    },
    {
      "cardId": "hBP02-084",
      "implementationLevel": 1,
      "levelName": "スケルトンのみ",
      "hasModalSupport": false,
      "syntaxValid": false,
      "effectsImplemented": 0,
      "issues": [
        "基本的なカード効果構造が不完全"
      ]
    },
    {
      "cardId": "hBP04-004",
      "implementationLevel": 1,
      "levelName": "スケルトンのみ",
      "hasModalSupport": false,
      "syntaxValid": false,
      "effectsImplemented": 0,
      "issues": [
        "基本的なカード効果構造が不完全"
      ]
    },
    {
      "cardId": "hBP04-043",
      "implementationLevel": 1,
      "levelName": "スケルトンのみ",
      "hasModalSupport": false,
      "syntaxValid": false,
      "effectsImplemented": 0,
      "issues": [
        "基本的なカード効果構造が不完全"
      ]
    },
    {
      "cardId": "hBP04-044",
      "implementationLevel": 1,
      "levelName": "スケルトンのみ",
      "hasModalSupport": false,
      "syntaxValid": false,
      "effectsImplemented": 0,
      "issues": [
        "基本的なカード効果構造が不完全"
      ]
    },
    {
      "cardId": "hBP04-045",
      "implementationLevel": 1,
      "levelName": "スケルトンのみ",
      "hasModalSupport": false,
      "syntaxValid": false,
      "effectsImplemented": 0,
      "issues": [
        "基本的なカード効果構造が不完全"
      ]
    },
    {
      "cardId": "hBP04-046",
      "implementationLevel": 1,
      "levelName": "スケルトンのみ",
      "hasModalSupport": false,
      "syntaxValid": false,
      "effectsImplemented": 0,
      "issues": [
        "基本的なカード効果構造が不完全"
      ]
    },
    {
      "cardId": "hBP04-047",
      "implementationLevel": 1,
      "levelName": "スケルトンのみ",
      "hasModalSupport": false,
      "syntaxValid": false,
      "effectsImplemented": 0,
      "issues": [
        "基本的なカード効果構造が不完全"
      ]
    },
    {
      "cardId": "hBP04-048",
      "implementationLevel": 1,
      "levelName": "スケルトンのみ",
      "hasModalSupport": false,
      "syntaxValid": false,
      "effectsImplemented": 0,
      "issues": [
        "基本的なカード効果構造が不完全"
      ]
    },
    {
      "cardId": "hBP04-089",
      "implementationLevel": 1,
      "levelName": "スケルトンのみ",
      "hasModalSupport": false,
      "syntaxValid": false,
      "effectsImplemented": 0,
      "issues": [
        "基本的なカード効果構造が不完全"
      ]
    },
    {
      "cardId": "hSD01-014",
      "implementationLevel": 1,
      "levelName": "スケルトンのみ",
      "hasModalSupport": false,
      "syntaxValid": false,
      "effectsImplemented": 0,
      "issues": [
        "基本的なカード効果構造が不完全"
      ]
    },
    {
      "cardId": "hSD01-016",
      "implementationLevel": 1,
      "levelName": "スケルトンのみ",
      "hasModalSupport": false,
      "syntaxValid": false,
      "effectsImplemented": 0,
      "issues": [
        "基本的なカード効果構造が不完全"
      ]
    },
    {
      "cardId": "hSD01-017",
      "implementationLevel": 1,
      "levelName": "スケルトンのみ",
      "hasModalSupport": false,
      "syntaxValid": false,
      "effectsImplemented": 0,
      "issues": [
        "基本的なカード効果構造が不完全"
      ]
    },
    {
      "cardId": "hY04-001",
      "implementationLevel": 1,
      "levelName": "スケルトンのみ",
      "hasModalSupport": false,
      "syntaxValid": false,
      "effectsImplemented": 0,
      "issues": [
        "基本的なカード効果構造が不完全"
      ]
    }
  ],
  "last_updated": "2025-08-21"
};

// 優先実装リスト（次に実装すべきカード）
const PRIORITY_IMPLEMENTATION_LIST = [
  // 高優先度：基本的なホロメンカード
  'hBP01-001', // ときのそら (Debut)
  'hBP01-002', // ときのそら (1st)
  'hBP01-003', // ときのそら (2nd)
  'hBP01-004', // ときのそら (推しホロメン)
  
  // 中優先度：人気キャラクター
  'hBP02-001', // さくらみこ系
  'hBP03-001', // 白上フブキ系
  'hBP04-001', // 他のラミィカード
  
  // 低優先度：特殊効果カード
  'hBP01-100', // 各種サポートカード
  'hBP02-100'  // 各種イベントカード
];

// エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    IMPLEMENTED_CARDS_STATUS,
    IMPLEMENTATION_STATS,
    PRIORITY_IMPLEMENTATION_LIST
  };
} else if (typeof window !== 'undefined') {
  window.IMPLEMENTED_CARDS_STATUS = IMPLEMENTED_CARDS_STATUS;
  window.IMPLEMENTATION_STATS = IMPLEMENTATION_STATS;
  window.PRIORITY_IMPLEMENTATION_LIST = PRIORITY_IMPLEMENTATION_LIST;
}
