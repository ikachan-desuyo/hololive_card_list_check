/**
 * AI決定監査ハーネス（AI改善ループ用）
 *
 * 本番設定のCPU（LookaheadAI turns=3 既定）で1ゲームを進めながら、各決定ポイントで
 * 「より強い審判（judge: より深い先読み・多サンプル平均）」が全選択肢を再評価し、
 * CPUの選んだ手が審判の最善から有意に劣る（差 > eps）決定を FLAG 行として出力する。
 * 出力された FLAG を人間/上位AIがレビューして、score.js / evaluate.js の原因を特定・修正する。
 *
 * URLパラメータ:
 *   ?seed=1                 対戦シード（1ゲームのみ。監査は重いので単発）
 *   &a=Azki単 &b=FUWAMOCO   デッキ名
 *   &turns=3                被監査AIの先読み深さ（既定3＝本番既定）
 *   &judgeTurns=5           審判の先読み深さ（既定5）
 *   &judgeSamples=3         審判のサンプル数（既定3。common random numbersで平均）
 *   &eps=30                 フラグ閾値（審判評価の差。評価値~30 ≒ ライフ0.25枚相当）
 *   &cap=30                 監査する決定の最大数（コスト上限）
 *   &types=main,performance,attachCheer  監査対象の決定タイプ
 *
 * 出力: FLAG| turn=.. type=.. player=.. chosen=.. best=.. diff=.. / OPT| 各選択肢の審判評価
 *       AIAUDIT-AGG| 集計 / AIAUDIT DONE
 */

import { CardLibrary } from '../core/cards.js';
import { Engine } from '../core/engine.js';
import { EffectRegistry } from '../core/effects/registry.js';
import { LookaheadAI } from '../core/ai/lookahead.js';
import { HeuristicAI } from '../core/ai/heuristic.js';
import { evaluateState } from '../core/ai/evaluate.js';
import { reconstruct } from '../core/ai/rollout.js';
import { createRng } from '../core/rng.js';

async function loadDeck(name) {
  for (const cand of [name, name.normalize('NFD'), name.normalize('NFC')]) {
    try {
      const r = await fetch('../test_deck/' + encodeURIComponent(cand) + '.json');
      if (r.ok) return await r.json();
    } catch { /* 次候補 */ }
  }
  throw new Error('デッキ読込不可: ' + name);
}

/** 盤面の1行サマリ（FLAGレビュー用の文脈） */
function boardLine(engine, idx) {
  const p = engine.state.players[idx];
  const mem = (h, tag) => h ? `${tag}:${h.stack[0].name}[${h.stack[0].bloomLevel}]HP${engine.effectiveHp(h) - h.damage}/${engine.effectiveHp(h)}ヱ${h.cheers.length}${h.rested ? '休' : ''}` : '';
  const backs = p.back.map((h, i) => mem(h, `B${i}`)).filter(Boolean).join(' ');
  return `${p.name}: ライフ${p.life.length} 手${p.hand.length} 山${p.deck.length} ${mem(p.center, 'C')} ${mem(p.collab, 'K')} ${backs}`;
}

function turnsOf(judge) { return judge.turns; }

/** _rolloutValue と同じ手順で1本ロールアウトし、地平線の評価内訳(parts)と盤面サマリを返す（分解デバッグ用） */
function rolloutInspect(engine, idx, candidateId, turns, rng) {
  const sim = reconstruct(engine);
  if (!sim.state.pending || !sim.state.pending.options.some((o) => o.id === candidateId)) return null;
  let prev = sim.state.turnPlayer; // 候補適用前に基準を取る（lookahead.js と同じ地平線合わせ）
  try { sim.apply(candidateId); } catch { return null; }
  const ais = [new HeuristicAI(0), new HeuristicAI(1)];
  let transitions = 0; let moves = 0;
  while (sim.state.phase !== 'ended' && sim.state.pending && moves < 80 * turns) {
    if (sim.state.turnPlayer !== prev) { prev = sim.state.turnPlayer; if (++transitions >= turns) break; }
    const pd = sim.state.pending;
    const mid = pd.player == null ? pd.options[0].id : ais[pd.player].choose(sim);
    if (mid == null) break;
    try { sim.apply(mid); } catch { break; }
    moves++;
  }
  const ev = evaluateState(sim, idx);
  const bl = (i) => {
    const p = sim.state.players[i];
    const mem = (h, tag) => h ? `${tag}:${h.stack[0].name}[${h.stack[0].bloomLevel}]HP${sim.effectiveHp(h) - h.damage}ヱ${h.cheers.length}${h.rested ? '休' : ''}` : '';
    return `T${sim.state.turn} ${p.name}: ラ${p.life.length} 手${p.hand.length} 山${p.deck.length} ${mem(p.center, 'C')} ${mem(p.collab, 'K')} ${p.back.map((h, j) => mem(h, `B${j}`)).join(' ')}`;
  };
  return { total: ev.total, parts: ev.parts, boardMe: bl(idx), boardOpp: bl(1 - idx) };
}

export async function runAiAudit() {
  const q = new URLSearchParams(location.search);
  const seed = Number(q.get('seed') || 1);
  const nameA = q.get('a') || 'Azki単';
  const nameB = q.get('b') || 'FUWAMOCO';
  const turns = Number(q.get('turns') || 3);
  const judgeTurns = Number(q.get('judgeTurns') || 5);
  const judgeSamples = Number(q.get('judgeSamples') || 3);
  const eps = Number(q.get('eps') || 30);
  const cap = Number(q.get('cap') || 30);
  const types = (q.get('types') || 'main,performance,attachCheer').split(',');

  const res = await fetch('../../json_file/card_data.json');
  const lib = new CardLibrary(await res.json());
  const [dmA, dmB] = [await loadDeck(nameA), await loadDeck(nameB)];
  const registry = new EffectRegistry();
  const gdA = lib.buildGameDeck(dmA);
  const gdB = lib.buildGameDeck(dmB);
  const nums = [...gdA.deck, ...gdB.deck, gdA.oshi, gdB.oshi, ...gdA.cheerDeck, ...gdB.cheerDeck]
    .filter(Boolean).map((c) => c.number);
  await registry.preload(nums, lib);

  const e = new Engine({ decks: [lib.buildGameDeck(dmA), lib.buildGameDeck(dmB)], seed, names: ['A', 'B'], registry, cardLibrary: lib });
  e.start();
  const ais = [new LookaheadAI(0, { turns }), new LookaheadAI(1, { turns })];
  // 審判: 同じ盤面で各選択肢を judgeTurns 先まで judgeSamples 回ロールアウトして平均。
  const judges = [new LookaheadAI(0, { turns: judgeTurns }), new LookaheadAI(1, { turns: judgeTurns })];

  console.log(`AIAUDIT-START| seed=${seed} a=${nameA} b=${nameB} turns=${turns} judge=${judgeTurns}x${judgeSamples} eps=${eps} cap=${cap} types=${types.join('/')}`);

  let audited = 0; let flags = 0; let applies = 0;
  while (e.state.phase !== 'ended' && e.state.pending && applies < 8000) {
    const pd = e.state.pending;
    const actor = pd.player;
    let id;
    if (actor == null) id = pd.options[0].id;
    else id = ais[actor].choose(e);
    if (id == null) break;

    // 監査対象: プレイヤーの決定・選択肢2以上・指定タイプ・上限内
    if (actor != null && pd.options.length > 1 && types.includes(pd.type) && audited < cap) {
      audited++;
      const judge = judges[actor];
      const vals = {};
      for (const opt of pd.options) {
        let sum = 0; let n = 0;
        for (let k = 0; k < judgeSamples; k++) {
          const v = judge._rolloutValue(e, opt.id, judgeSamples > 1 ? createRng(0x51ed + k * 2654435761) : null);
          if (Number.isFinite(v)) { sum += v; n++; }
        }
        vals[opt.id] = n > 0 ? sum / n : -Infinity;
      }
      let bestId = pd.options[0].id;
      for (const opt of pd.options) if (vals[opt.id] > vals[bestId]) bestId = opt.id;
      const diff = vals[bestId] - vals[id];
      if (diff > eps) {
        flags++;
        const label = (oid) => pd.options.find((o) => o.id === oid)?.label || oid;
        console.log(`FLAG| turn=${e.state.turn} step=${e.state.step} type=${pd.type} player=${actor} diff=${Math.round(diff)}`);
        console.log(`FLAG-CTX| ${boardLine(e, actor)} || 相手 ${boardLine(e, 1 - actor)}`);
        console.log(`FLAG-CHOSEN| ${label(id)} (judge=${Math.round(vals[id])})`);
        console.log(`FLAG-BEST| ${label(bestId)} (judge=${Math.round(vals[bestId])})`);
        for (const opt of pd.options) {
          if (Number.isFinite(vals[opt.id])) console.log(`OPT| ${Math.round(vals[opt.id])} ${opt.id === id ? '←選択' : opt.id === bestId ? '←最善' : ''} ${opt.label}`);
        }
        if (q.get('probe')) {
          // 選択手と最善手それぞれ1本ずつロールアウトし、地平線の評価内訳と盤面を出す（バイアス源の分解用）
          for (const pid of [id, bestId]) {
            const insp = rolloutInspect(e, actor, pid, turnsOf(judge), createRng(0x51ed));
            if (insp) {
              console.log(`PROBE| ${pid === id ? '選択' : '最善'} ${label(pid)} total=${Math.round(insp.total)} parts=${JSON.stringify(insp.parts, (k, v) => typeof v === 'number' ? Math.round(v) : v)}`);
              console.log(`PROBE-BOARD| ${insp.boardMe} || 相手 ${insp.boardOpp}`);
            }
          }
        }
      }
    }

    try { e.apply(id); } catch (err) { console.log('AIAUDIT-ERROR| apply失敗: ' + err.message); break; }
    applies++;
  }
  const w = e.state.winner;
  console.log(`AIAUDIT-AGG| audited=${audited} flags=${flags} winner=${w} turn=${e.state.turn} reason=${e.state.lossReason || '-'} applies=${applies}`);
}
