/**
 * 手動操作ドライバ（人間=Claudeが一方を操作してCPUと対戦するための再生ハーネス）
 *
 * エンジンは決定的なので、人間側の決定IDを順に並べた moves リストを毎回先頭から再生すれば、
 * 同じ局面が再現できる。人間の決定が尽きた最初の局面で「状態＋合法手」を出力して停止する。
 *   - 自分(me)の決定: moves に次のIDがあれば適用、無ければ state+options を出力して停止。
 *   - 相手(CPU): LookaheadAI が選ぶ。
 *   - 自明な決定(stepPause / 選択肢1つ / player==null): 自動適用（movesを消費しない）。
 *
 * URL: ?me=0&a=FUWAMOCO&b=ござる&first=0&seed=1&turns=3&moves=ID1,ID2,...
 * 出力プレフィックス: MP| （DOMにミラー）
 */
import { CardLibrary } from '../core/cards.js';
import { Engine } from '../core/engine.js';
import { EffectRegistry } from '../core/effects/registry.js';
import { LookaheadAI } from '../core/ai/lookahead.js';

async function loadDeck(name) {
  for (const cand of [name, name.normalize('NFD'), name.normalize('NFC')]) {
    try { const r = await fetch('../test_deck/' + encodeURIComponent(cand) + '.json'); if (r.ok) return await r.json(); } catch { /* next */ }
  }
  throw new Error('デッキ読込不可: ' + name);
}

function holoLine(engine, p, pos) {
  const h = engine._holomemAt(p, pos);
  const top = h.stack[0];
  const zone = pos.zone === 'center' ? 'センター' : pos.zone === 'collab' ? 'コラボ ' : `バック${pos.index}`;
  const eff = engine.effectiveHp(h);
  const cheers = h.cheers.map((c) => c.color).join('') || '-';
  const att = h.attachments.map((a) => a.name).join(',') || '-';
  return `    ${zone}: ${top.name}〔${top.bloomLevel}〕HP${eff - h.damage}/${eff} エール[${cheers}] 装着[${att}]${h.rested ? ' お休み' : ''}`;
}

function dumpState(engine, me, L) {
  const s = engine.state;
  L(`──── ターン${s.turn} / 手番:${s.players[s.turnPlayer].name} / ステップ:${s.step} ────`);
  for (let i = 0; i < 2; i++) {
    const p = s.players[i];
    const tag = i === me ? '★自分' : '☆CPU';
    const handTag = (c) => (c.kind === 'holomen' ? `${c.name}〔${c.bloomLevel}〕`
      : c.kind === 'support' ? `${c.name}〔${c.supportType || 'サポ'}${c.limited ? '/LIM' : ''}〕`
        : c.kind === 'cheer' ? `${c.name}〔エール〕` : `${c.name}〔${c.kind}〕`);
    const hand = i === me ? `[${p.hand.map(handTag).join(', ')}]` : `${p.hand.length}枚`;
    L(`${tag} ${p.name}: ライフ${p.life.length} 手札${hand} 山${p.deck.length} アーカイブ${p.archive.length} ホロパワー${p.holoPower.length} エール山${p.cheerDeck.length} 推し:${p.oshi?.name || '-'}`);
    for (const pos of engine._stagePositions(p)) L(holoLine(engine, p, pos));
    if (engine._stagePositions(p).length === 0) L('    （ステージにホロメン無し）');
  }
  if (s.modifiers.length) L(`  継続効果: ${s.modifiers.map((m) => m.description || m.kind).join(' / ')}`);
}

export async function runManual() {
  const params = new URLSearchParams(location.search);
  const me = Number(params.get('me') || 0);
  const nameA = params.get('a') || 'FUWAMOCO';
  const nameB = params.get('b') || 'ござる';
  const first = params.get('first') != null ? Number(params.get('first')) : 0;
  const seed = Number(params.get('seed') || 1);
  const turns = Number(params.get('turns') || 3);
  const moves = (params.get('moves') || '').split(',').map((x) => x.trim()).filter(Boolean);
  const L = (m) => console.log('MP| ' + m);

  const lib = await CardLibrary.load('../../json_file/card_data.json');
  const dmA = await loadDeck(nameA); const dmB = await loadDeck(nameB);
  const registry = new EffectRegistry();
  const ids = [...new Set([...Object.keys(dmA), ...Object.keys(dmB)])];
  await registry.preload(ids.map((id) => lib.get(id)?.number).filter(Boolean), lib);

  const autofinish = params.get('autofinish') === '1';
  const e = new Engine({ decks: [lib.buildGameDeck(dmA), lib.buildGameDeck(dmB)], seed, firstPlayer: first, names: ['あなた', 'CPU'], registry, detailLog: true });
  e.start();
  const cpu = new LookaheadAI(1 - me, { turns });
  const meAI = new LookaheadAI(me, { turns }); // autofinish時に自分側を引き継ぐ
  const emitApplied = () => L('APPLIED= ' + (e.state.appliedIds || []).join(','));

  let mi = 0; // moves index
  let usedAutofinish = false;
  let guard = 0;
  while (e.state.phase !== 'ended' && guard++ < 6000) {
    const pd = e.state.pending;
    if (!pd) { L('（pendingなしで停止）'); break; }
    // 自明な決定は自動
    if (pd.player == null) { e.apply(pd.options[0].id); continue; }
    if (pd.type === 'stepPause') { e.apply('ok'); continue; }
    if (pd.player !== me) { // CPU
      let id; try { id = cpu.choose(e); } catch (err) { L('CPU choose例外: ' + err.message); break; }
      e.apply(id || pd.options[0].id); continue;
    }
    // 自分の決定。選択肢1つなら自動。
    if (pd.options.length === 1 && !pd.multiSelect) { e.apply(pd.options[0].id); continue; }
    // 自分の番で複数選択肢。moves に次があれば適用。
    if (mi < moves.length) {
      const id = moves[mi++];
      const ok = pd.options.some((o) => o.id === id) || (pd.multiSelect && id === 'confirm');
      if (!ok) { L(`!! 不正な手: ${id}（この局面の選択肢に無い）`); dumpState(e, me, L); L(`pending=${pd.type} req=${pd.request?.kind || '-'}`); for (const o of pd.options) L(`   option ${o.id} : ${o.label || ''}`); L('STOP-INVALID'); return; }
      try { e.apply(id); } catch (err) { L(`apply例外(${id}): ${err.message}`); return; }
      continue;
    }
    // 録画が尽きた。autofinish なら自分側もAIで決着まで進める（観戦用の全手列を得る）。
    if (autofinish) {
      usedAutofinish = true;
      let id; try { id = meAI.choose(e); } catch { id = pd.options[0].id; }
      e.apply(id || pd.options[0].id); continue;
    }
    // ここが「あなたの番」。状態と選択肢を出して停止。
    L('========== あなたの意思決定 ==========');
    dumpState(e, me, L);
    L(`▼ 決定タイプ: ${pd.type}${pd.request ? ' / ' + pd.request.kind : ''}${pd.cheer ? ' / 付与エール:' + pd.cheer.name : ''}${pd.multiSelect ? ` / 複数選択(min${pd.multiSelect.min}/max${pd.multiSelect.max} 選択中${pd.multiSelect.selected.length})` : ''}`);
    for (const o of pd.options) {
      const ci = o.card ? `〔${o.card.bloomLevel || o.card.kind}〕` : '';
      L(`   [${o.id}]  ${o.label || ''}${ci}`);
    }
    L(`（これまでの自分の手数: ${moves.length}）`);
    emitApplied();
    L('STOP-DECISION');
    return;
  }
  if (e.state.phase === 'ended') {
    L('========== 決着 ==========');
    dumpState(e, me, L);
    const w = e.state.winner;
    L(`勝者: ${w === 'draw' ? '引き分け' : e.state.players[w].name}（理由: ${e.state.lossReason || '-'}）${usedAutofinish ? ' ※途中からAI引き継ぎ' : ''}`);
    emitApplied();
    L('GAME-ENDED');
  }
}
