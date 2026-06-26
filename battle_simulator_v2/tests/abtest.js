/**
 * A/Bテストハーネス（AI強化の「本当に強くなったか」を勝率で測る）
 *
 * 現行AI(core/ai = NEW) と 凍結ベースライン(core/ai_frozen = OLD) を直接対戦させ、勝率を出す。
 * 自己対戦のミラー戦は「両側が同じAI」なので強化を測れない（常に互角＋先攻有利）。
 * ここでは NEW vs OLD を戦わせ、さらに先攻有利を相殺するため各シードを
 * 「NEW先攻」「OLD先攻」の2方向で打つ（firstPlayer を固定）。
 *
 * 判定: NEWの勝率が 50% を有意に上回れば強化成功。50%±なら同等、下回れば退化。
 *
 * URLパラメータ:
 *   ?seeds=1-20   各方向で使うシード範囲（既定 1-12）→ 1シードにつき2戦（先後入替）
 *   &turns=3      先読み深さ（既定3＝出荷時）
 *   &a=Azki単 &b=FUWAMOCO  対戦デッキ（既定 Azki単 / FUWAMOCO）。両デッキで NEW/OLD を入替えて測る
 * 出力プレフィックス: AB-PAIR| / AB-AGG| / 完了: ABTEST DONE
 */

import { CardLibrary } from '../core/cards.js';
import { Engine } from '../core/engine.js';
import { EffectRegistry } from '../core/effects/registry.js';
import { LookaheadAI as LookaheadNEW } from '../core/ai/lookahead.js';
import { LookaheadAI as LookaheadOLD } from '../core/ai_frozen/lookahead.js';

async function loadDeck(name) {
  for (const cand of [name, name.normalize('NFD'), name.normalize('NFC')]) {
    try { const r = await fetch('../test_deck/' + encodeURIComponent(cand) + '.json'); if (r.ok) return await r.json(); } catch { /* next */ }
  }
  throw new Error('デッキ読込不可: ' + name);
}

/**
 * 1ゲーム実行。aiKind=['NEW'|'OLD', 'NEW'|'OLD'] で各プレイヤーのAIを指定。
 * firstPlayer を固定（先攻決定の決定ポイントを介さず engine 構築時に指定）。
 * decks[0]/decks[1] はプレイヤー0/1のデッキ。
 * @returns {number} winner: 0 or 1 ('draw'は-1)
 */
function runGame(lib, decks, registry, seed, turns, aiKind, firstPlayer) {
  const e = new Engine({
    decks: [lib.buildGameDeck(decks[0]), lib.buildGameDeck(decks[1])],
    seed, names: ['P0', 'P1'], registry, firstPlayer,
  });
  e.start();
  const mk = (idx) => (aiKind[idx] === 'NEW' ? new LookaheadNEW(idx, { turns }) : new LookaheadOLD(idx, { turns }));
  const ais = [mk(0), mk(1)];
  let applies = 0; let prev = null; let same = 0; let prevSel = -1;
  while (e.state.phase !== 'ended' && applies < 8000) {
    const pd = e.state.pending;
    if (!pd) break;
    let id;
    try { id = pd.player == null ? pd.options[0].id : ais[pd.player].choose(e); } catch { break; }
    if (id == null) break;
    const selLen = pd.multiSelect ? pd.multiSelect.selected.length : -1;
    const stalled = pd === prev && !(pd.multiSelect && selLen !== prevSel);
    if (stalled) { if (++same > 6) break; } else { same = 0; prev = pd; }
    prevSel = selLen;
    try { e.apply(id); } catch { break; }
    applies++;
  }
  if (e.state.phase !== 'ended') return -1;
  return e.state.winner === 'draw' ? -1 : e.state.winner;
}

export async function runAbtest() {
  const params = new URLSearchParams(location.search);
  const turns = Number(params.get('turns')) || 3;
  const nameA = params.get('a') || 'Azki単';
  const nameB = params.get('b') || 'FUWAMOCO';
  let seeds = [];
  const sp = params.get('seeds');
  if (sp && /^\d+-\d+$/.test(sp)) { const [lo, hi] = sp.split('-').map(Number); for (let s = lo; s <= hi; s++) seeds.push(s); }
  else if (sp) seeds = sp.split(',').map(Number);
  else for (let s = 1; s <= 12; s++) seeds.push(s);

  const lib = await CardLibrary.load('../../json_file/card_data.json');
  const dmA = await loadDeck(nameA);
  const dmB = await loadDeck(nameB);
  const registry = new EffectRegistry();
  const ids = [...new Set([...Object.keys(dmA), ...Object.keys(dmB)])];
  await registry.preload(ids.map((id) => lib.get(id)?.number).filter(Boolean), lib);

  console.log(`AB-START| NEW vs OLD / ${nameA} & ${nameB} / turns=${turns} / seeds=${seeds[0]}..${seeds[seeds.length - 1]} (×2方向×2デッキ割当)`);
  let newWins = 0; let oldWins = 0; let draws = 0; let games = 0;
  // 各シードで4戦: {デッキ割当A/B} × {どちらがNEWか}。先攻は常に firstPlayer=0 に固定し、
  // 「NEWが先攻」「OLDが先攻」を aiKind の割当で作る（先攻有利を相殺）。
  for (const seed of seeds) {
    // ペア1: decks=[A,B]
    for (const decks of [[dmA, dmB], [dmB, dmA]]) {
      for (const newSide of [0, 1]) {
        const aiKind = newSide === 0 ? ['NEW', 'OLD'] : ['OLD', 'NEW'];
        const w = runGame(lib, decks, registry, seed, turns, aiKind, 0); // firstPlayer=0固定
        games++;
        if (w === -1) draws++;
        else if (aiKind[w] === 'NEW') newWins++;
        else oldWins++;
      }
    }
    console.log(`AB-PAIR| seed=${seed} cumulative NEW=${newWins} OLD=${oldWins} draw=${draws} / ${games}`);
  }
  const wr = games - draws > 0 ? (newWins / (games - draws) * 100).toFixed(1) : 'NA';
  console.log(`AB-AGG| games=${games} NEW=${newWins} OLD=${oldWins} draw=${draws} NEW勝率=${wr}% (draw除く)`);
  console.log('ABTEST DONE');
  return { games, newWins, oldWins, draws };
}
