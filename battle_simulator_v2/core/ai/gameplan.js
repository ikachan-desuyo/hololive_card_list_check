/**
 * ゲームプラン層（ポケカAI UniversalBot の移植。docs/AI_REFERENCE_POKEMON.md ①）
 *
 * 自分のデッキ構成（＝公開情報であるデッキリスト知識: デッキ+手札+ステージ+アーカイブの自カード）から、
 * 試合前に「主役アタッカーのライン（同名グループ）と必要エール色」を自動導出する。
 * 導出はカードデータ由来（firepower.js と同じ実効火力プローブ）で、カード番号のハードコードはしない。
 *
 * 使い方: score.js が gamePlanOf(engine, idx) を呼び、
 *   - エール配分: 主役ラインへの必要色エールに加点（序盤から勝ち筋の色を正しいラインへ貯める）
 *   - Bloom: 主役ラインへのBloomに加点（勝ち筋の完成を急ぐ）
 * の「プラン一致ボーナス」として使う。ボーナスは控えめな加点に留め、
 * 実際の優劣判断は従来のスコアラ＋先読みに委ねる（プランは方向付けのみ）。
 *
 * 公平性: 参照するのは自分のカード群のみ（自分のデッキリストは既知＝適法）。相手側は見ない。
 */

import { detectProfile } from './deck-profiles.js';

const COLORS = ['赤', '青', '黄', '緑', '紫', '白'];
const PROBE_CHEERS = 6;

// デッキ構成（ユニーク番号列）→ プラン のキャッシュ。構成は試合中不変なので、
// 先読みの再生エンジン（reconstruct）ごとに再計算しない。
const _cache = new Map();
const CACHE_MAX = 16;

function makeCheers(spec, n) {
  const out = [];
  if (spec === 'rainbow') {
    for (let i = 0; i < n; i++) out.push({ kind: 'cheer', color: COLORS[i % COLORS.length], number: `__plan_cheer_${i}` });
  } else {
    for (let i = 0; i < n; i++) out.push({ kind: 'cheer', color: spec, number: `__plan_cheer_${i}` });
  }
  return out;
}

/** カード1枚の「効果込み最大実効火力」と、その時のアーツ（firepower.js と同じベストケース探索の軽量版） */
function bestPotential(engine, idx, card) {
  let best = 0;
  let bestArt = null;
  for (const art of (card.arts || [])) {
    const tokColor = art.tokkou?.[0]?.color || card.color || null;
    let d = art.dmg || 0;
    for (const spec of ['rainbow', ...COLORS]) {
      const probe = { stack: [card], cheers: makeCheers(spec, PROBE_CHEERS), attachments: [], damage: 0, rested: false, bloomedTurn: 0 };
      try {
        d = Math.max(d, engine._artEffectiveDamage(probe, art, idx, tokColor));
      } catch { /* 見積り失敗は基本値のまま */ }
    }
    if (d > best) { best = d; bestArt = art; }
  }
  return { dmg: best, art: bestArt };
}

/** 自分の全カード（デッキリスト知識）からホロメンのユニーク一覧を集める */
function ownHolomenPool(engine, idx) {
  const p = engine.state.players[idx];
  const cards = [...p.deck, ...p.hand, ...p.archive];
  for (const h of engine._stageHolomems(p)) cards.push(...h.stack);
  const seen = new Set();
  const out = [];
  for (const c of cards) {
    if (!c || c.kind !== 'holomen' || seen.has(c.number)) continue;
    seen.add(c.number);
    out.push(c);
  }
  return out;
}

function computePlan(engine, idx) {
  const pool = ownHolomenPool(engine, idx);
  // 同名ライン（Bloomは同名なので「名前＋別名」でグループ化。合体ユニットの nameAliases も同ラインに含める）
  const groups = new Map(); // 代表名 → { names:Set, cards:[] }
  for (const c of pool) {
    const names = [c.name, ...(c.nameAliases || [])];
    let g = null;
    for (const n of names) { for (const [, gg] of groups) if (gg.names.has(n)) { g = gg; break; } if (g) break; }
    if (!g) { g = { names: new Set(), cards: [] }; groups.set(c.name, g); }
    for (const n of names) g.names.add(n);
    g.cards.push(c);
  }
  // 各ラインの最大実効火力と、その主役アーツの必要色（無色除く）
  const lines = [];
  for (const [, g] of groups) {
    let best = { dmg: 0, art: null };
    for (const c of g.cards) {
      const r = bestPotential(engine, idx, c);
      if (r.dmg > best.dmg) best = r;
    }
    if (best.dmg <= 0) continue;
    const colors = (best.art?.cost || []).filter((col) => col !== '無色');
    lines.push({ names: [...g.names], dmg: best.dmg, colors });
  }
  lines.sort((a, b) => b.dmg - a.dmg);
  return { lines: lines.slice(0, 2) }; // 主役ライン上位2つ
}

/**
 * プレイヤー idx のゲームプラン（デッキ構成キャッシュ付き）。
 * デッキプロファイル（deck-profiles.js）が構成にマッチすれば、その知識（主役ライン等）で自動導出を上書きする。
 * @returns {{ lines: Array<{names: string[], dmg: number, colors: string[]}>, profile: object|null }}
 */
export function gamePlanOf(engine, idx) {
  const p = engine.state.players[idx];
  if (!p) return { lines: [], profile: null };
  // キャッシュキー = 自分のユニーク番号集合（構成は試合中不変。先読みの別エンジンでも同一キーになる）
  // プロファイル判別はサポート等も見るため、番号は全カード種から集める
  const nums = new Set();
  for (const c of [...p.deck, ...p.hand, ...p.archive]) if (c?.number) nums.add(c.number);
  for (const h of engine._stageHolomems(p)) {
    for (const c of h.stack) if (c?.number) nums.add(c.number);
    for (const c of h.attachments) if (c?.number) nums.add(c.number);
  }
  const key = idx + '|' + (p.oshi?.number || '') + '|' + [...nums].sort().join(',');
  let plan = _cache.get(key);
  if (!plan) {
    plan = computePlan(engine, idx);
    const profile = detectProfile(nums, p.oshi?.number || null);
    if (profile) {
      plan.profile = profile;
      // 主役ラインの上書き（プロファイルが lines を持つ場合のみ。色は明示指定を尊重）
      if (profile.lines?.length) {
        plan.lines = profile.lines.map((l) => ({ names: [...l.names], colors: [...(l.colors || [])], dmg: 0 }));
      }
    } else {
      plan.profile = null;
    }
    if (_cache.size >= CACHE_MAX) _cache.clear();
    _cache.set(key, plan);
  }
  return plan;
}

/**
 * カード（またはホロメンのトップ）が主役ライン上なら加点値を返す（第1ライン>第2ライン）。
 * @returns 0 | second | first
 */
export function planLineBonus(engine, idx, card, first = 10, second = 6) {
  if (!card) return 0;
  const plan = gamePlanOf(engine, idx);
  const names = [card.name, ...(card.nameAliases || [])];
  for (let i = 0; i < plan.lines.length; i++) {
    if (plan.lines[i].names.some((n) => names.includes(n))) return i === 0 ? first : second;
  }
  return 0;
}

/** 主役ラインの主役アーツがその色エールを必要とするか（無色のみのアーツは任意色=常にtrue） */
export function planNeedsColor(engine, idx, card, color) {
  if (!card) return false;
  const plan = gamePlanOf(engine, idx);
  const names = [card.name, ...(card.nameAliases || [])];
  for (const line of plan.lines) {
    if (!line.names.some((n) => names.includes(n))) continue;
    return line.colors.length === 0 || line.colors.includes(color);
  }
  return false;
}
