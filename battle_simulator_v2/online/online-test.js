/**
 * オンライン同期モデルの検証（ヘッドレス）。
 * Loopback Net 上に host/guest 2セッションを作り、両者が同じ手ログを購読してフルエンジンを回す。
 * 「責任者が手を書く→全員が同じ順で適用」で、両エンジンの appliedIds が完全一致し、対局が決着するかを確認する。
 */
import { CardLibrary } from '../core/cards.js';
import { Engine } from '../core/engine.js';
import { EffectRegistry } from '../core/effects/registry.js';
import { HeuristicAI } from '../core/ai/heuristic.js';
import { createLoopbackNet } from './net.js';
import { OnlineSession } from './online.js';

async function loadDeck(name) {
  const r = await fetch('../test_deck/' + encodeURIComponent(name) + '.json');
  return r.json();
}

/** 手の責任者（app.js と同じ規則）。 */
function responsibleIdx(state) {
  const pd = state.pending;
  if (!pd) return null;
  if (pd.player != null) return pd.player;
  return state.turnPlayer != null ? state.turnPlayer : 0; // stepPause等は手番側、未確定はホスト
}
function autoId(pd) { return pd.type === 'stepPause' ? 'ok' : (pd.options[0]?.id); }

let pass = 0; let fail = 0;
function check(cond, msg) { if (cond) { pass++; console.log('✅ ' + msg); } else { fail++; console.log('❌ ' + msg); } }

export async function runOnlineSyncTest() {
  const lib = await CardLibrary.load('../../json_file/card_data.json');
  const deckA = await loadDeck('FUWAMOCO');
  const deckB = await loadDeck('ござる');
  const registry = new EffectRegistry();
  const ids = [...new Set([...Object.keys(deckA), ...Object.keys(deckB)])];
  await registry.preload(ids.map((id) => lib.get(id)?.number).filter(Boolean), lib);

  // 2クライアント（同一world＝共有DB）
  const netHost = createLoopbackNet('room-sync');
  const netGuest = createLoopbackNet('room-sync');

  const engines = {}; // role -> engine
  const ais = {};
  const buildEngine = (cfg, who) => {
    const e = new Engine({
      decks: [lib.buildGameDeck(cfg.deckA), lib.buildGameDeck(cfg.deckB)],
      seed: cfg.seed, firstPlayer: cfg.first, names: ['P1', 'P2'], registry,
    });
    e.start();
    engines[who] = e;
    ais[who] = [new HeuristicAI(0), new HeuristicAI(1)];
    return e;
  };

  const sHost = new OnlineSession(netHost, {
    onStart: (cfg) => buildEngine(cfg, 'host'),
    onMove: (seq, id) => applyMove('host', id),
    onError: (m) => console.log('host err:', m),
  });
  const sGuest = new OnlineSession(netGuest, {
    onStart: (cfg) => buildEngine(cfg, 'guest'),
    onMove: (seq, id) => applyMove('guest', id),
    onError: (m) => console.log('guest err:', m),
  });

  function applyMove(who, id) {
    const e = engines[who];
    if (!e) return;
    if (typeof id === 'string' && id.startsWith('__concede:')) { e.concede(Number(id.split(':')[1])); return; }
    try { e.apply(id); } catch (err) { console.log(`${who} apply失敗 ${id}: ${err.message}`); }
  }

  // ルーム作成→参加（両デッキ揃うとホストが status=playing にし、両者 onStart）
  const code = await sHost.host({ name: 'ホスト', deckKey: 'FUWAMOCO', deckMap: deckA });
  await sGuest.join(code, { name: 'ゲスト', deckKey: 'ござる', deckMap: deckB });

  check(!!engines.host && !!engines.guest, '両クライアントでエンジンが構築された（status=playing で同期開始）');
  if (!engines.host || !engines.guest) { console.log(`ONLINE-TEST: ${pass} passed / ${fail} failed`); return; }

  // 対局を進める: ホストのエンジンを基準に、責任者セッションが手を書く（Loopbackは同期発火で両者適用）
  const sessByIdx = { 0: sHost, 1: sGuest };
  let applies = 0;
  while (engines.host.state.phase !== 'ended' && applies < 8000) {
    const st = engines.host.state;
    if (!st.pending) break;
    const ridx = responsibleIdx(st);
    const sess = sessByIdx[ridx];
    const pd = st.pending;
    let id;
    if (pd.player != null) {
      // 責任者は自分のエンジンで判断する（=ホスト or ゲストのエンジン。両者一致のはず）
      const e = ridx === 0 ? engines.host : engines.guest;
      try { id = ais[ridx === 0 ? 'host' : 'guest'][ridx].choose(e); } catch { id = autoId(pd); }
    } else {
      id = autoId(pd);
    }
    if (id == null) break;
    await sess.writeMove(id);
    applies++;
  }

  // 検証: 両エンジンの appliedIds が完全一致 / 決着 / 保存則
  const ha = engines.host.state.appliedIds.join(',');
  const ga = engines.guest.state.appliedIds.join(',');
  check(ha === ga, `両エンジンの手列が完全一致（host ${engines.host.state.appliedIds.length}手 / guest ${engines.guest.state.appliedIds.length}手）`);
  check(engines.host.state.phase === 'ended', `対局が決着した（${applies}手・winner=${engines.host.state.winner}）`);
  check(engines.host.state.winner === engines.guest.state.winner, '勝者が両エンジンで一致');
  const total = (p) => p.deck.length + p.cheerDeck.length + p.hand.length + p.archive.length + p.holoPower.length + p.life.length + p.revealed.length
    + [p.center, p.collab, ...p.back].filter(Boolean).reduce((s, h) => s + h.stack.length + h.cheers.length + h.attachments.length, 0);
  check(engines.host.state.players.every((p) => total(p) === 70), '保存則維持（各70枚）');

  // 観戦者（途中入室）が手ログ再適用で追いつけるか
  const netSpec = createLoopbackNet('room-sync');
  let specEngine = null;
  const sSpec = new OnlineSession(netSpec, {
    onStart: (cfg) => { specEngine = new Engine({ decks: [lib.buildGameDeck(cfg.deckA), lib.buildGameDeck(cfg.deckB)], seed: cfg.seed, firstPlayer: cfg.first, names: ['P1', 'P2'], registry }); specEngine.start(); },
    onMove: (seq, id) => { if (specEngine) { if (id.startsWith && id.startsWith('__concede:')) specEngine.concede(Number(id.split(':')[1])); else { try { specEngine.apply(id); } catch { /* noop */ } } } },
  });
  await sSpec.spectate(code, { name: '観戦' });
  check(specEngine && specEngine.state.appliedIds.join(',') === ha, '途中入室の観戦者が手ログ再適用で同一状態に追いついた');

  console.log(`\nONLINE-TEST: ${pass} passed / ${fail} failed`);
  if (fail > 0) throw new Error(`${fail} 件失敗`);
}
