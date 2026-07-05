/**
 * 定数定義
 * ルールの根拠は battle_simulator_v2/docs/RULES_SPEC.md（条番号は総合ルール ver.1.9.0）
 */

// 色（内部表現は日本語で統一。card_data.json の color フィールドと一致させる）
export const COLORS = ['白', '緑', '赤', '青', '紫', '黄'];
export const COLORLESS = '無色';

// アーツコストアイコン（card_data.json の icons.main の英語表記 → 内部表現）
export const ICON_COLOR_MAP = {
  white: '白',
  green: '緑',
  red: '赤',
  blue: '青',
  purple: '紫',
  yellow: '黄',
  any: COLORLESS,
};

export const BLOOM_LEVELS = ['Debut', '1st', '2nd', 'Spot'];

// ターンのステップ（7章）
export const STEPS = ['reset', 'draw', 'cheer', 'main', 'performance', 'end'];

export const STEP_NAMES = {
  reset: 'リセットステップ',
  draw: '手札ステップ',
  cheer: 'エールステップ',
  main: 'メインステップ',
  performance: 'パフォーマンスステップ',
  end: 'エンドステップ',
};

// ステージ全体のホロメン上限（4.6.2.1）
export const STAGE_LIMIT = 6;

// マリガン上限（6.2.1.9.1: 引き直し回数が6回に達したら敗北）
export const MULLIGAN_LIMIT = 6;

// 初期手札枚数（6.2.1.6）
export const INITIAL_HAND = 7;

// デッキ構築（6.1）
export const DECK_SIZE = 50;
export const CHEER_DECK_SIZE = 20;
export const MAX_COPIES = 4;

// 敗北理由
export const LOSS_REASONS = {
  LIFE_ZERO: 'ライフが0になった',
  NO_STAGE: 'ステージにホロメンがいない',
  DECK_OUT: 'デッキからカードを引けない',
  MULLIGAN_OUT: '引き直し回数が上限に達した',
  CONCEDE: '投了',
};
