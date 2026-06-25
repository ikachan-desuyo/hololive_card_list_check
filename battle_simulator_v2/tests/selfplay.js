/**
 * CPU自己対戦ハーネス（AI改善ループ用の計測基盤）
 *
 * ヘッドレスEdgeで読み込み、指定デッキ同士を先読みAI(既定5手)で複数シード対戦させ、
 * 「理想的な動き」からのズレを数値指標として console に出力する。Node.js不要。
 *
 * URLパラメータ:
 *   ?seeds=1-20            対戦シード範囲（既定 1-12）
 *   &turns=5               先読み深さ（既定5）
 *   &a=Azki単 &b=FUWAMOCO  対戦デッキ名（既定 Azki単 / FUWAMOCO）
 *   &full=3                指定シードの全詳細ログを出力（解析用。0/未指定で出さない）
 *
 * 出力行プレフィックス: 集計=「SP-AGG|」, 1ゲーム=「SP-GAME|」, 全ログ=「SP-LOG|」, 完了=「SELFPLAY DONE」
 *
 * 指標（プレイヤーごと。「理想 = 毎ターン最大火力で殴り続ける」からのズレを捉える）:
 *   atk          : アーツ攻撃の総回数
 *   atkTurns     : 1回以上攻撃したターン数
 *   noAtkLate    : 中盤以降(>=7T)に「攻撃できる前衛が居らず攻撃機会ゼロ」だったターン数（テンポ崩壊）
 *   strandFuel   : 攻撃機会ゼロなのに盤面に3枚以上エールが眠っていたターン数（燃料死蔵=配置ミス）
 *   passedAtk    : 攻撃可能だったのに攻撃しなかったターン数
 *   baton        : バトンタッチ回数
 *   maxCheers    : 1体に乗ったエール最大枚数（過剰集中の指標）
 *   lifeTaken    : 相手から奪ったライフ
 */

import { CardLibrary } from '../core/cards.js';
import { Engine } from '../core/engine.js';
import { EffectRegistry } from '../core/effects/registry.js';
import { LookaheadAI } from '../core/ai/lookahead.js';
import { isDevelopSupport } from '../core/ai/score.js';

const LATE_TURN = 7; // このターン以降の「攻撃機会ゼロ」は明確なテンポ崩壊とみなす

async function loadDeck(name) {
  for (const cand of [name, name.normalize('NFD'), name.normalize('NFC')]) {
    try {
      const r = await fetch('../test_deck/' + encodeURIComponent(cand) + '.json');
      if (r.ok) return await r.json();
    } catch { /* 次候補 */ }
  }
  throw new Error('デッキ読込不可: ' + name);
}

function maxCheersOnBoard(p) {
  let m = 0;
  for (const h of [p.center, p.collab, ...p.back]) if (h) m = Math.max(m, h.cheers.length);
  return m;
}
function boardCheerTotal(p) {
  let n = 0;
  for (const h of [p.center, p.collab, ...p.back]) if (h) n += h.cheers.length;
  return n;
}

function runGame(lib, dmA, dmB, registry, seed, turns) {
  const e = new Engine({
    decks: [lib.buildGameDeck(dmA), lib.buildGameDeck(dmB)],
    seed, names: ['A', 'B'], registry, detailLog: true,
  });
  e.start();
  const ais = [new LookaheadAI(0, { turns }), new LookaheadAI(1, { turns })];
  const m = {
    atk: [0, 0], atkTurns: [0, 0], koTurns: [0, 0], noAtkLate: [0, 0], strandFuel: [0, 0],
    passedAtk: [0, 0], baton: [0, 0], batonNoAtk: [0, 0], missedKO: [0, 0], skipPlace: [0, 0], skipDev: [0, 0], maxCheers: [0, 0], lifeTaken: [0, 0],
  };
  // ターンごとのパフォーマンス記録（最初の入場時に確定）
  const perfSeen = new Set();         // `${turn}_${player}` 入場済み
  const turnAttacked = new Set();     // 攻撃した
  const turnHadArt = new Set();       // 攻撃可能だった
  const turnKO = new Set();           // 相手ライフを削った（KO到達）ターン
  const hadPlace = new Set();         // 盤面に空き(＜6)があり手札Debutを出せた（place選択肢あり）ターン
  const didPlace = new Set();         // 実際にDebutを展開したターン
  const turnBaton = new Set();        // バトンタッチしたターン
  const hadKO = new Set();            // 開始時点で「1発で倒せる攻撃」が存在したターン
  const hadFreeSup = new Set();       // フリープレイ支援を使える手番があった
  const didFreeSup = new Set();       // 実際にフリープレイ支援を使った

  let applies = 0; let prev = null; let same = 0; let prevSel = -1;
  const prevLife = [e.state.players[0].life.length, e.state.players[1].life.length];
  while (e.state.phase !== 'ended' && applies < 8000) {
    const pd = e.state.pending;
    if (!pd) break;
    const player = pd.player;
    let id;
    try { id = player == null ? pd.options[0].id : ais[player].choose(e); } catch { break; }
    if (id == null) break;
    const chosen = pd.options.find((o) => o.id === id);

    if (pd.type === 'performance' && player != null) {
      const key = `${e.state.turn}_${player}`;
      const hasArt = pd.options.some((o) => o.kind === 'art');
      if (!perfSeen.has(key)) {
        perfSeen.add(key);
        const p = e.state.players[player];
        if (hasArt) turnHadArt.add(key);
        else if (e.state.turn >= LATE_TURN) {
          m.noAtkLate[player]++;
          if (boardCheerTotal(p) >= 3) m.strandFuel[player]++;
        }
        // 開始時点で「単発で相手前衛を倒せるアーツ」があったか（missedKO診断用）
        const oppP = e.state.players[1 - player];
        for (const o of pd.options) {
          if (o.kind !== 'art') continue;
          const ah = p[o.zone]; const tgt = e._targetHolomem(oppP, o.target);
          if (!ah || !tgt) continue;
          const art = o.artObj || ah.stack[0].arts?.[o.artIndex];
          if (!art) continue;
          if (e._artEffectiveDamage(ah, art, player) >= e.effectiveHp(tgt) - tgt.damage) { hadKO.add(key); break; }
        }
      }
      if (hasArt) turnHadArt.add(key);
      if (chosen && chosen.kind === 'art') { m.atk[player]++; turnAttacked.add(key); }
    }
    if (pd.type === 'main' && player != null && chosen && chosen.kind === 'baton') { m.baton[player]++; turnBaton.add(`${e.state.turn}_${player}`); }
    if (pd.type === 'main' && player != null) {
      const key = `${e.state.turn}_${player}`;
      if (pd.options.some((o) => o.kind === 'place')) hadPlace.add(key); // 出せるDebutが手札にあり盤面に空き
      if (chosen && chosen.kind === 'place') didPlace.add(key);
      const mp = e.state.players[player];
      if (pd.options.some((o) => o.kind === 'support' && mp.hand[o.handIndex] && isDevelopSupport(e, mp.hand[o.handIndex]))) hadFreeSup.add(key);
      if (chosen && chosen.kind === 'support' && mp.hand[chosen.handIndex] && isDevelopSupport(e, mp.hand[chosen.handIndex])) didFreeSup.add(key);
    }

    // 停滞ガード（chooseCardsの複数applyは進捗とみなす）
    const selLen = pd.multiSelect ? pd.multiSelect.selected.length : -1;
    const stalled = pd === prev && !(pd.multiSelect && selLen !== prevSel);
    if (stalled) { if (++same > 6) break; } else { same = 0; prev = pd; }
    prevSel = selLen;

    try { e.apply(id); } catch { break; }
    // KO検出: どこかのapplyで相手ライフが減ったら、その時の手番側(攻撃側)のそのターンをKOターンとして記録。
    // （ライフ減少はアーツapplyと別applyで処理されるため、毎apply後に監視して帰属する。）
    for (let v = 0; v < 2; v++) {
      if (e.state.players[v].life.length < prevLife[v]) {
        const attacker = e.state.turnPlayer;
        if (attacker != null && attacker !== v) turnKO.add(`${e.state.turn}_${attacker}`);
      }
      prevLife[v] = e.state.players[v].life.length;
    }
    for (let pl = 0; pl < 2; pl++) m.maxCheers[pl] = Math.max(m.maxCheers[pl], maxCheersOnBoard(e.state.players[pl]));
    applies++;
  }

  // 後処理: attackTurns / passedAtk
  for (const key of turnHadArt) {
    const pl = Number(key.split('_')[1]);
    if (turnAttacked.has(key)) m.atkTurns[pl]++;
    else m.passedAtk[pl]++;
  }
  for (const key of turnKO) m.koTurns[Number(key.split('_')[1])]++;
  // place選択肢があったのに展開しなかったターン（盤面に空きがあるのにDebutを出さない）
  for (const key of hadPlace) if (!didPlace.has(key)) m.skipPlace[Number(key.split('_')[1])]++;
  for (const key of hadFreeSup) if (!didFreeSup.has(key)) m.skipDev[Number(key.split('_')[1])]++;
  // バトンしたのに攻撃しなかったターン（攻撃機会を捨てた疑いのあるバトン＝無駄バトンの候補）
  for (const key of turnBaton) if (!turnAttacked.has(key)) m.batonNoAtk[Number(key.split('_')[1])]++;
  // 単発で倒せる攻撃があったのに、そのターンKOできなかった（=倒し切りの取りこぼし）
  for (const key of hadKO) if (!turnKO.has(key)) m.missedKO[Number(key.split('_')[1])]++;
  for (let pl = 0; pl < 2; pl++) m.lifeTaken[pl] = 5 - e.state.players[1 - pl].life.length;

  // エンジンの公式勝者を使う（0/1/'draw'）。未終了は-2。
  let winner = -2;
  if (e.state.phase === 'ended') winner = e.state.winner === 'draw' ? -1 : e.state.winner;
  // デッキ切れ等の「ライフ以外での敗北」を検出（敗者がライフを残したまま負けている＝過剰churnの兆候）。
  const reason = e.state.lossReason || '';
  const deckOut = /山札|引け|デッキ/.test(reason) ? 1 : 0;
  return { winner, reason, deckOut, turn: e.state.turn, applies, m, detailLogs: e.state.detailLogs };
}

export async function runSelfplay() {
  const params = new URLSearchParams(location.search);
  const turns = Number(params.get('turns')) || 5;
  const nameA = params.get('a') || 'Azki単';
  const nameB = params.get('b') || 'FUWAMOCO';
  const full = Number(params.get('full')) || 0;
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

  console.log(`SP-START| ${nameA} vs ${nameB} / turns=${turns} / seeds=${seeds[0]}..${seeds[seeds.length - 1]}`);
  const agg = { wins: [0, 0], draws: 0, deckOut: 0, turnSum: 0,
    atk: [0, 0], atkTurns: [0, 0], koTurns: [0, 0], noAtkLate: [0, 0], strandFuel: [0, 0], passedAtk: [0, 0], baton: [0, 0], batonNoAtk: [0, 0], missedKO: [0, 0], skipPlace: [0, 0], skipDev: [0, 0], maxCheers: [0, 0], lifeTaken: [0, 0] };
  for (const seed of seeds) {
    const g = runGame(lib, dmA, dmB, registry, seed, turns);
    const m = g.m;
    if (g.winner === 0) agg.wins[0]++; else if (g.winner === 1) agg.wins[1]++; else agg.draws++;
    agg.deckOut += g.deckOut;
    agg.turnSum += g.turn;
    for (let pl = 0; pl < 2; pl++) for (const k of ['atk', 'atkTurns', 'koTurns', 'noAtkLate', 'strandFuel', 'passedAtk', 'baton', 'batonNoAtk', 'missedKO', 'skipPlace', 'skipDev', 'lifeTaken']) agg[k][pl] += m[k][pl];
    for (let pl = 0; pl < 2; pl++) agg.maxCheers[pl] = Math.max(agg.maxCheers[pl], m.maxCheers[pl]);
    const fmt = (pl) => `atkT=${m.atkTurns[pl]} koT=${m.koTurns[pl]} missedKO=${m.missedKO[pl]} noAtkLate=${m.noAtkLate[pl]} baton=${m.baton[pl]} maxCh=${m.maxCheers[pl]} life=${m.lifeTaken[pl]}`;
    console.log(`SP-GAME| seed=${seed} win=${g.winner} turn=${g.turn} reason=${g.reason} || A[${fmt(0)}] || B[${fmt(1)}]`);
    if (full && seed === full) for (const line of g.detailLogs) console.log('SP-LOG| ' + line);
  }
  const n = seeds.length;
  const r1 = (x) => (x / n).toFixed(1);
  console.log(`SP-AGG| games=${n} winA=${agg.wins[0]} winB=${agg.wins[1]} draw=${agg.draws} deckOut=${agg.deckOut} avgTurn=${r1(agg.turnSum)}`);
  console.log(`SP-AGG| A: atkTurns=${r1(agg.atkTurns[0])} koTurns=${r1(agg.koTurns[0])} missedKO=${r1(agg.missedKO[0])} noAtkLate=${r1(agg.noAtkLate[0])} baton=${r1(agg.baton[0])} skipPlace=${r1(agg.skipPlace[0])} skipDev=${r1(agg.skipDev[0])} maxCheers=${agg.maxCheers[0]} lifeTaken=${r1(agg.lifeTaken[0])}`);
  console.log(`SP-AGG| B: atkTurns=${r1(agg.atkTurns[1])} koTurns=${r1(agg.koTurns[1])} missedKO=${r1(agg.missedKO[1])} noAtkLate=${r1(agg.noAtkLate[1])} baton=${r1(agg.baton[1])} skipPlace=${r1(agg.skipPlace[1])} skipDev=${r1(agg.skipDev[1])} maxCheers=${agg.maxCheers[1]} lifeTaken=${r1(agg.lifeTaken[1])}`);
  console.log('SELFPLAY DONE');
  return agg;
}
