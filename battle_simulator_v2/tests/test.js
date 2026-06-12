/**
 * コアエンジンのルールテスト
 *
 * 実行方法:
 *   - ブラウザ: battle_simulator_v2/tests/test.html を開く
 *   - 自動: scripts/tools/smoke-test-battle-sim.ps1 -V2Tests（ヘッドレスEdge）
 * 結果はコンソールと DOM に出力。全て成功なら「ALL TESTS PASSED」を出す。
 */

import { CardLibrary, CardKind } from '../core/cards.js';
import { Engine } from '../core/engine.js';
import { createRng } from '../core/rng.js';

const results = [];

function test(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
    console.log(`TEST PASS: ${name}`);
  } catch (e) {
    results.push({ name, ok: false, error: e.message });
    console.error(`TEST FAIL: ${name} — ${e.message}`);
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}

function assertEq(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error(`${msg || 'assertEq'}: expected=${expected} actual=${actual}`);
  }
}

/** プレイヤーの全カード枚数（領域間でカードが消えていないかの保存則） */
function totalCards(p) {
  let n = p.deck.length + p.cheerDeck.length + p.hand.length +
    p.archive.length + p.holoPower.length + p.life.length + p.revealed.length;
  for (const h of [p.center, p.collab, ...p.back]) {
    if (h) n += h.stack.length + h.cheers.length + h.attachments.length;
  }
  return n;
}

/** ランダムプレイアウト: シード付きで最後まで自動プレイし、不変条件を検査 */
function randomPlayout(lib, deckMap, seed, maxApplies = 5000) {
  const deck0 = lib.buildGameDeck(deckMap);
  const deck1 = lib.buildGameDeck(deckMap);
  assert(deck0.errors.length === 0, `デッキエラー: ${deck0.errors.join(', ')}`);
  const engine = new Engine({ decks: [deck0, deck1], seed, names: ['P1', 'P2'] });
  const rng = createRng(seed + 999);
  engine.start();
  let applies = 0;
  while (engine.state.phase !== 'ended' && applies < maxApplies) {
    const actions = engine.actions();
    assert(actions.length > 0, `決定ポイントに選択肢が無い (phase=${engine.state.phase}, step=${engine.state.step})`);
    const action = actions[Math.floor(rng() * actions.length)];
    engine.apply(action.id);
    applies++;
    // 保存則: カードの総数は常に 50 + 20 = 70
    for (const p of engine.state.players) {
      const total = totalCards(p);
      if (total !== 70) {
        throw new Error(`カード総数が崩れた: ${p.name}=${total}（期待70） step=${engine.state.step} 直前=${action.id}`);
      }
      // ダメージは負にならない
      for (const h of [p.center, p.collab, ...p.back]) {
        if (h) assert(h.damage >= 0, 'ダメージが負');
      }
    }
  }
  return { engine, applies };
}

/** 合成カード（ユニットテスト用） */
function fakeHolomen(over = {}) {
  return {
    id: 'TEST-001_C', number: 'TEST-001', name: 'テストホロメン', kind: CardKind.HOLOMEN,
    rawType: 'ホロメン', buzz: false, supportType: null, limited: false,
    color: '白', hp: 100, bloomLevel: 'Debut', batonTouch: ['無色'], life: null,
    tags: [], imageUrl: '', arts: [], keywords: [], oshiSkills: [], supportText: null,
    ...over,
  };
}

export async function runTests() {
  const lib = await CardLibrary.load('../../json_file/card_data.json');

  // ---- カード正規化 ----
  test('カードデータが読み込める', () => {
    assert(lib.cards.size > 2000, `カード数が少なすぎる: ${lib.cards.size}`);
  });

  test('ホロメンの正規化（HP・Bloomレベル・アーツコスト）', () => {
    const c = lib.get('hBP01-024_02_C');
    assert(c, 'hBP01-024_02_C が無い');
    assertEq(c.kind, CardKind.HOLOMEN);
    assertEq(c.hp, 100);
    assertEq(c.bloomLevel, 'Debut');
    assertEq(c.arts.length, 1);
    assertEq(c.arts[0].dmg, 30);
    assertEq(c.arts[0].cost.length, 1);
    assertEq(c.arts[0].cost[0], '無色');
  });

  test('推しホロメンの正規化（ライフ・推しスキルコスト）', () => {
    const c = lib.get('hBP07-001_OSR');
    assert(c, 'hBP07-001_OSR が無い');
    assertEq(c.kind, CardKind.OSHI);
    assertEq(c.life, 5);
    assert(c.oshiSkills.length >= 1, '推しスキルが無い');
    assertEq(c.oshiSkills[0].cost, 6);
  });

  test('Buzzホロメン・特攻・キーワードの正規化', () => {
    const c = lib.get('hBP07-019_R');
    assert(c.buzz, 'Buzzでない');
    assert(c.keywords.some((k) => k.subtype === 'ブルームエフェクト'), 'ブルームエフェクトが無い');
    const w = lib.get('hBP07-013_U');
    const art = w.arts.find((a) => a.tokkou.length > 0);
    assert(art, '特攻アーツが無い');
    assertEq(art.tokkou[0].color, '紫');
    assertEq(art.tokkou[0].value, 50);
  });

  test('サポートカードの正規化（LIMITED・補助タイプ）', () => {
    const tool = lib.get('hBP07-101_C');
    assertEq(tool.kind, CardKind.SUPPORT);
    assertEq(tool.supportType, 'ツール');
    assertEq(tool.limited, false);
    const lim = lib.get('hBP07-092_U');
    assertEq(lim.limited, true);
  });

  // ---- エンジンのユニットテスト ----
  const dummyDecks = { decks: [{ oshi: fakeHolomen(), deck: [], cheerDeck: [] }, { oshi: fakeHolomen(), deck: [], cheerDeck: [] }] };
  const eng = new Engine({ ...dummyDecks, seed: 1 });

  test('エールコスト判定: 指定色と無色', () => {
    const cheers = [{ color: '白' }, { color: '緑' }];
    assert(eng._canPayCheers(cheers, ['白']), '白1が払えない');
    assert(eng._canPayCheers(cheers, ['白', '無色']), '白+無色が払えない');
    assert(!eng._canPayCheers(cheers, ['白', '白']), '白2が払えてしまう');
    assert(!eng._canPayCheers(cheers, ['赤']), '赤が払えてしまう');
    assert(eng._canPayCheers(cheers, ['無色', '無色']), '無色2が払えない');
    assert(!eng._canPayCheers(cheers, ['無色', '無色', '無色']), '無色3が払えてしまう');
  });

  test('Bloom判定: レベル遷移・同名・HP条件', () => {
    eng.state.turn = 5;
    const debut = fakeHolomen({ name: 'A', bloomLevel: 'Debut', hp: 100 });
    const first = fakeHolomen({ name: 'A', bloomLevel: '1st', hp: 150 });
    const second = fakeHolomen({ name: 'A', bloomLevel: '2nd', hp: 200 });
    const h = { stack: [debut], cheers: [], attachments: [], damage: 0, rested: false, faceDown: false, placedTurn: 1, bloomedTurn: null };
    assert(eng._canBloom(h, first), 'Debut→1st ができない');
    assert(!eng._canBloom(h, second), 'Debut→2nd ができてしまう');
    assert(!eng._canBloom(h, fakeHolomen({ name: 'B', bloomLevel: '1st', hp: 150 })), '別名でBloomできてしまう');
    // 1st→1st は可、1st→Debut は不可
    const h2 = { ...h, stack: [first] };
    assert(eng._canBloom(h2, fakeHolomen({ name: 'A', bloomLevel: '1st', hp: 140 })), '1st→1st ができない');
    assert(eng._canBloom(h2, second), '1st→2nd ができない');
    // HP条件: 新カードのHPが累積ダメージ「より大きい」(8.3.3)
    const h3 = { ...h, damage: 150 };
    assert(!eng._canBloom(h3, first), 'HP150でダメージ150なのにBloomできてしまう（超過が必要）');
    assert(eng._canBloom({ ...h, damage: 149 }, first), 'HP150でダメージ149なのにBloomできない');
    // このターンに出た/Bloomしたホロメンは不可
    assert(!eng._canBloom({ ...h, placedTurn: 5 }, first), '出したターンにBloomできてしまう');
    assert(!eng._canBloom({ ...h, bloomedTurn: 5 }, first), '同一ターン2回Bloomできてしまう');
    // お休み中でもBloomは可能（ルールブックp12）
    assert(eng._canBloom({ ...h, rested: true }, first), 'お休み中にBloomできない');
  });

  // ---- 統合テスト: 実デッキでのプレイアウト ----
  const deckRes = await fetch('../../battle_simulator/test_deck/' + encodeURIComponent('ラミィデッキ.json'));
  const deckMap = await deckRes.json();

  test('セットアップ: 手札7枚・ライフ・先攻後攻', () => {
    const d0 = lib.buildGameDeck(deckMap);
    const d1 = lib.buildGameDeck(deckMap);
    assertEq(d0.errors.length, 0, `デッキエラー: ${d0.errors.join(',')}`);
    const e = new Engine({ decks: [d0, d1], seed: 42, firstPlayer: 0 });
    e.start();
    // 引き直き判断（両者しない）→ 配置へ
    while (e.state.pending && e.state.pending.type === 'redraw') e.apply('no');
    for (const p of e.state.players) {
      assert(p.hand.length >= 7 - p.mulliganCount, '手札が少なすぎる');
    }
    // 配置を進める: センター必須 → バック全部置かず終了
    while (e.state.pending && e.state.phase === 'setup') {
      const pd = e.state.pending;
      if (pd.type === 'placementBack') e.apply('done');
      else e.apply(pd.options[0].id);
    }
    assertEq(e.state.phase, 'playing', 'ゲームが開始していない');
    for (const p of e.state.players) {
      assert(p.center, 'センターが空');
      assertEq(p.life.length, p.oshi.life, 'ライフ枚数が推しのライフと不一致');
      assertEq(totalCards(p), 70, 'カード総数が70でない');
    }
    // 先攻のターン1から開始
    assertEq(e.state.turn, 1);
    assertEq(e.state.turnPlayer, 0);
  });

  test('ランダムプレイアウト×5シード（保存則・クラッシュ無し・決着）', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { engine, applies } = randomPlayout(lib, deckMap, seed);
      assert(
        engine.state.phase === 'ended',
        `seed=${seed}: ${applies}手で決着しなかった`
      );
      assert(
        engine.state.winner === 0 || engine.state.winner === 1 || engine.state.winner === 'draw',
        `seed=${seed}: 勝者が不正`
      );
    }
  });

  test('同一シードなら同一結果（再現性）', () => {
    const a = randomPlayout(lib, deckMap, 7);
    const b = randomPlayout(lib, deckMap, 7);
    assertEq(a.applies, b.applies, '手数が一致しない');
    assertEq(a.engine.state.winner, b.engine.state.winner, '勝者が一致しない');
    assertEq(a.engine.state.logs.length, b.engine.state.logs.length, 'ログ数が一致しない');
  });

  // ---- 結果出力 ----
  const failed = results.filter((r) => !r.ok);
  const summary = `${results.length - failed.length}/${results.length} passed`;
  if (failed.length === 0) {
    console.log(`ALL TESTS PASSED (${summary})`);
  } else {
    console.error(`TESTS FAILED (${summary})`);
  }
  return { results, failed };
}
