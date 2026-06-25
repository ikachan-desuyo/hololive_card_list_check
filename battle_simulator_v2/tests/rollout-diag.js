/**
 * ロールアウト診断ハーネス（モンテカルロの「信号 vs ノイズ」を数値で見る）
 *
 * ヘッドレスで読み込み、ヒューリスティックで実戦をある決定点まで進め、そこで LookaheadAI._rolloutValue を
 * 各候補について K 回（既定30）回して、平均・標準偏差・最小最大・「3標本だけの平均」を比較出力する。
 *   → 「候補間の真の差(=mean の広がり)」と「1ロールアウトのばらつき(=sd)」を直接比べられる。
 *   → 3標本で選ぶ手と、K標本で選ぶ手が一致するか（=3標本に意味があるか）も出す。
 *
 * URLパラメータ:
 *   ?seed=7 &turn=7 &k=30 &a=Azki単 &b=FUWAMOCO
 *   turn: この手番以降で「プレイヤー0のメイン決定・候補3以上」に来たら、そこを解析対象にする。
 * 出力プレフィックス: DIAG|  / 完了: DIAG DONE
 */

import { CardLibrary } from '../core/cards.js';
import { Engine } from '../core/engine.js';
import { EffectRegistry } from '../core/effects/registry.js';
import { LookaheadAI } from '../core/ai/lookahead.js';
import { HeuristicAI } from '../core/ai/heuristic.js';
import { scoreOptions } from '../core/ai/score.js';
import { createRng } from '../core/rng.js';

async function loadDeck(name) {
  for (const cand of [name, name.normalize('NFD'), name.normalize('NFC')]) {
    try { const r = await fetch('../test_deck/' + encodeURIComponent(cand) + '.json'); if (r.ok) return await r.json(); } catch { /* next */ }
  }
  throw new Error('デッキ読込不可: ' + name);
}

export async function runDiag() {
  const params = new URLSearchParams(location.search);
  const seed = Number(params.get('seed')) || 7;
  const targetTurn = Number(params.get('turn')) || 7;
  const K = Number(params.get('k')) || 30;
  const nameA = params.get('a') || 'Azki単';
  const nameB = params.get('b') || 'FUWAMOCO';

  const lib = await CardLibrary.load('../../json_file/card_data.json');
  const dmA = await loadDeck(nameA); const dmB = await loadDeck(nameB);
  const registry = new EffectRegistry();
  const ids = [...new Set([...Object.keys(dmA), ...Object.keys(dmB)])];
  await registry.preload(ids.map((id) => lib.get(id)?.number).filter(Boolean), lib);

  const e = new Engine({ decks: [lib.buildGameDeck(dmA), lib.buildGameDeck(dmB)], seed, names: ['A', 'B'], registry, detailLog: false });
  e.start();
  // ヒューリスティックで進め、プレイヤー0のメイン決定（候補3以上・targetTurn以降）で停止
  const ais = [new HeuristicAI(0), new HeuristicAI(1)];
  let applies = 0;
  while (e.state.phase !== 'ended' && applies < 8000) {
    const pd = e.state.pending; if (!pd) break;
    if (pd.type === 'main' && pd.player === 0 && e.state.turn >= targetTurn && pd.options.length >= 3) break;
    const id = pd.player == null ? pd.options[0].id : ais[pd.player].choose(e);
    if (id == null) break;
    try { e.apply(id); } catch { break; }
    applies++;
  }
  const pd = e.state.pending;
  if (!pd || pd.type !== 'main' || pd.player !== 0) { console.log('DIAG| 解析対象のメイン決定点に到達できず'); console.log('DIAG DONE'); return; }

  console.log(`DIAG| seed=${seed} turn=${e.state.turn} player=0 候補数=${pd.options.length} K=${K}（各候補をK回ロールアウト）`);
  const la = new LookaheadAI(0, { turns: 5 });
  let prior = {}; try { prior = scoreOptions(e, 0, pd) || {}; } catch { /* ignore */ }

  const rows = [];
  for (const opt of pd.options) {
    const vals = [];
    for (let k = 0; k < K; k++) {
      const v = la._rolloutValue(e, opt.id, createRng(0x9e37 + k * 2654435761));
      if (Number.isFinite(v)) vals.push(v);
    }
    if (!vals.length) { rows.push({ opt, ok: false }); continue; }
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const sd = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
    const mean3 = vals.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, vals.length);
    rows.push({ opt, ok: true, mean, sd, mn: Math.min(...vals), mx: Math.max(...vals), mean3, prior: prior[opt.id] ?? 0 });
  }

  const ok = rows.filter((r) => r.ok);
  for (const r of ok) {
    const label = (r.opt.label || `${r.opt.kind}:${r.opt.id}`).slice(0, 44);
    console.log(`DIAG| ${label} | meanK=${r.mean.toFixed(0)} sd=${r.sd.toFixed(0)} [${r.mn.toFixed(0)}..${r.mx.toFixed(0)}] | mean3=${r.mean3.toFixed(0)} prior=${r.prior.toFixed(0)}`);
  }
  if (ok.length >= 2) {
    const means = ok.map((r) => r.mean);
    const spread = Math.max(...means) - Math.min(...means);
    const avgSd = ok.reduce((a, r) => a + r.sd, 0) / ok.length;
    const bestK = ok.reduce((a, b) => (b.mean > a.mean ? b : a));
    const best3 = ok.reduce((a, b) => (b.mean3 > a.mean3 ? b : a));
    const lbl = (r) => (r.opt.label || r.opt.id).slice(0, 30);
    console.log(`DIAG| --- 候補間の平均の広がり(信号)=${spread.toFixed(0)} / 1ロールアウトの平均ばらつき(ノイズsd)=${avgSd.toFixed(0)} / 3標本平均の標準誤差≈${(avgSd / Math.sqrt(3)).toFixed(0)}`);
    console.log(`DIAG| --- K=${K}標本の最良手= [${lbl(bestK)}] / 3標本だけの最良手= [${lbl(best3)}] / 一致=${bestK.opt.id === best3.opt.id ? 'YES' : 'NO（=3標本では別の手を選ぶ）'}`);
  }
  console.log('DIAG DONE');
}
