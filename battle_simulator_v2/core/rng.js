/**
 * シード可能な乱数生成器（mulberry32）
 * テストの再現性のため、エンジン内の乱数は必ずこれを使う（Math.random 禁止）
 */

export function createRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates シャッフル（配列を破壊的にシャッフル） */
export function shuffle(array, rng) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/** 1-6 のサイコロ（5.24） */
export function rollDie(rng) {
  return 1 + Math.floor(rng() * 6);
}
