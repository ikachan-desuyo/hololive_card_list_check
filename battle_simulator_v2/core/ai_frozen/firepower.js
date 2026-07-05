/**
 * デッキ火力解析（スタンドアロン）
 *
 * デッキ内の各ホロメンのアーツが「効果込みで最大どれだけ火力を出せるか（best-case potential）」を見積もり、
 * 主力火力カードを順位付けする。対戦AIには組み込まない独立ツール（デッキ分析・自動構築の素材）。
 *
 * 実効火力＝ engine._artEffectiveDamage と同じ計算: 素のアーツ火力 ＋ 効果による加算(dmgBonus／エール枚数・色数
 * スケール／条件付き+N) ＋ 特攻(対象の色) を含む（装着/継続/推しスキル等の“その場限りの外部修正”は含めない）。
 *
 * best-case の作り方: そのアーツが最も伸びる前提を探索する。
 *   - 位置: コラボ／センターの両方を試す（「コラボ限定+N」等に対応）。
 *   - エール: 単色6枚（各色）＋レインボー（全色混在）を試す（「Xエール1枚につき」「ステージの色数につき」両対応）。
 *   - 特攻: 対象色＝そのアーツの特攻色に合わせて最大化。
 *   これらの組み合わせで最大の実効火力を、そのアーツの potential とする。
 */

import { Engine } from '../engine.js';

const COLORS = ['赤', '青', '黄', '緑', '紫', '白'];

function makeCheers(spec, n) {
  const out = [];
  if (spec.startsWith('mono:')) {
    const c = spec.slice(5);
    for (let i = 0; i < n; i++) out.push({ kind: 'cheer', color: c, number: `__probe_cheer_${i}` });
  } else { // rainbow
    for (let i = 0; i < n; i++) out.push({ kind: 'cheer', color: COLORS[i % COLORS.length], number: `__probe_cheer_${i}` });
  }
  return out;
}

/**
 * @param {CardLibrary} lib
 * @param {Object} deckMap   デッキ定義（カードID→枚数）
 * @param {EffectRegistry} registry  手書き効果を preload 済みのレジストリ
 * @param {Object} opts  { topN=4, cheerCount=6 }
 * @returns {{ topCards: Array, allArts: Array }}
 *   topCards: 主力火力カード上位（各カードの最大実効火力のアーツ）。allArts: 全アーツの実効火力ランキング。
 */
export function analyzeDeckFirepower(lib, deckMap, registry, opts = {}) {
  const topN = opts.topN || 4;
  const cheerCount = opts.cheerCount || 6;

  const engine = new Engine({
    decks: [lib.buildGameDeck(deckMap), lib.buildGameDeck(deckMap)],
    seed: 1, names: ['A', 'B'], registry,
  });
  try { engine.start(); } catch { /* 解析用なので開始失敗は無視 */ }
  const p0 = engine.state.players[0];
  const savedOshi = p0.oshi;

  // 解析対象＝デッキ内のユニークなホロメン（アーツ持ち）
  const seen = new Set();
  const cards = [];
  for (const id of Object.keys(deckMap)) {
    const c = lib.get(id);
    if (!c || c.kind !== 'holomen' || !(c.arts && c.arts.length)) continue;
    if (seen.has(c.number)) continue;
    seen.add(c.number);
    cards.push(c);
  }

  const cheerSpecs = ['rainbow', ...COLORS.map((c) => 'mono:' + c)];
  const allArts = [];
  for (const card of cards) {
    for (const art of (card.arts || [])) {
      const tokColor = art.tokkou?.[0]?.color || card.color; // 特攻が最大になる対象色
      let best = art.dmg || 0; let bestNote = 'base';
      for (const zone of ['collab', 'center']) {
        for (const spec of cheerSpecs) {
          const probe = { stack: [card], cheers: makeCheers(spec, cheerCount), attachments: [], damage: 0, rested: false, bloomedTurn: 0 };
          p0.center = zone === 'center' ? probe : null;
          p0.collab = zone === 'collab' ? probe : null;
          p0.back = [];
          let d;
          try { d = engine._artEffectiveDamage(probe, art, 0, tokColor); } catch { d = art.dmg || 0; }
          if (d > best) { best = d; bestNote = `${zone}/${spec}`; }
        }
      }
      allArts.push({
        name: card.name, number: card.number, bloomLevel: card.bloomLevel || '-',
        art: art.name, base: art.dmg || 0, effective: best,
        bonus: best - (art.dmg || 0),
        tokkou: (art.tokkou || []).map((t) => `${t.color}+${t.value}`).join(',') || '-',
        setup: bestNote,
      });
    }
  }
  // 後始末
  p0.center = null; p0.collab = null; p0.back = []; p0.oshi = savedOshi;

  allArts.sort((a, b) => b.effective - a.effective);

  // 主力火力カード＝カードごとの最大実効火力アーツで順位付け（同名カードは1つに集約）
  const bestByCard = new Map();
  for (const r of allArts) {
    const prev = bestByCard.get(r.number);
    if (!prev || r.effective > prev.effective) bestByCard.set(r.number, r);
  }
  const topCards = [...bestByCard.values()].sort((a, b) => b.effective - a.effective).slice(0, topN);

  return { topCards, allArts };
}
