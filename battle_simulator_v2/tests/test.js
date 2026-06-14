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
import { EffectRegistry } from '../core/effects/registry.js';
import { EffectContext } from '../core/effects/context.js';
import { compileCard } from '../core/effects/text-compiler.js';
import { HeuristicAI } from '../core/ai/heuristic.js';
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

async function testAsync(name, fn) {
  try {
    await fn();
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

/**
 * ジェネレータ効果（ctx.dealSpecialDamage 等）をテストから直接駆動する。
 * 途中の割り込み決定ポイント（confirm）は既定で answer（既定 false=使わない）で応答する。
 */
function drive(gen, answer = false) {
  let r = gen.next();
  let guard = 0;
  while (!r.done && guard++ < 50) r = gen.next(answer);
  return r.value;
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

/** デッキマップから効果レジストリを構築（手書き > 自動コンパイル） */
async function buildRegistry(lib, deckMap) {
  const registry = new EffectRegistry();
  await registry.preload(Object.keys(deckMap).map((id) => lib.get(id)?.number).filter(Boolean), lib);
  return registry;
}

/** ランダムプレイアウト: シード付きで最後まで自動プレイし、不変条件を検査 */
async function randomPlayout(lib, deckMap, seed, maxApplies = 5000) {
  const deck0 = lib.buildGameDeck(deckMap);
  const deck1 = lib.buildGameDeck(deckMap);
  assert(deck0.errors.length === 0, `デッキエラー: ${deck0.errors.join(', ')}`);
  const registry = await buildRegistry(lib, deckMap);
  const engine = new Engine({ decks: [deck0, deck1], seed, names: ['P1', 'P2'], registry });
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

  test('デッキ構築: 同名カードの各コピーは独立したオブジェクト', () => {
    const d = lib.buildGameDeck({ 'hY04-001_C': 20, 'hBP04-004_OSR': 1, 'hBP04-043_C': 50 });
    assertEq(d.errors.length, 0, `デッキエラー: ${d.errors.join(',')}`);
    assert(d.cheerDeck[0] !== d.cheerDeck[1], '青エール同士が同一オブジェクトになっている');
    assert(d.deck[0] !== d.deck[1], 'ホロメンのコピー同士が同一オブジェクトになっている');
    assertEq(d.cheerDeck[0].name, d.cheerDeck[1].name, 'コピーの内容は同一であるべき');
  });

  test('デッキ構築: カードID配列・構造化形式も受け付ける（デッキビルダー保存形式の互換）', () => {
    // 配列形式（デッキビルダーが localStorage に保存する形）。以前は Object.entries が添字を拾い
    // 「カードが見つかりません: 0」になっていた回帰を防ぐ。
    const arr = [];
    arr.push('hBP04-004_OSR');
    for (let i = 0; i < 50; i++) arr.push('hBP04-043_C');
    for (let i = 0; i < 20; i++) arr.push('hY04-001_C');
    const fromArray = lib.buildGameDeck(arr);
    assertEq(fromArray.errors.length, 0, `配列デッキのエラー: ${fromArray.errors.join(',')}`);
    assertEq(fromArray.deck.length, 50, 'メインデッキ50枚');
    assertEq(fromArray.cheerDeck.length, 20, 'エールデッキ20枚');
    assert(fromArray.oshi, '推しが取れていない');
    // 正規化単体: 配列 → {id:枚数}
    const norm = CardLibrary.normalizeDeckMap(['a', 'a', 'b']);
    assertEq(norm.a, 2, '配列のカウントが正しくない');
    assertEq(norm.b, 1, '配列のカウントが正しくない');
    // 構造化形式（deck_manager の {oshi, holomen, support, yell}）
    const struct = CardLibrary.normalizeDeckMap({
      oshi: { id: 'hBP04-004_OSR' }, holomen: ['hBP04-043_C', 'hBP04-043_C'], support: [], yell: ['hY04-001_C'],
    });
    assertEq(struct['hBP04-043_C'], 2, '構造化形式のカウントが正しくない');
    assertEq(struct['hBP04-004_OSR'], 1, '構造化形式の推しカウントが正しくない');
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

  test('バトンコスト: 2ndは無色2・Debutは無色1（card_data の baton_touch 配列を反映）', () => {
    // card_data.json の baton_touch はコレクタ修正後「色配列」（個数付き）。collector が全アイコンを収集する。
    const debut = lib.getByNumber('hBP07-008'); // 角巻わため Debut → ◇（無色1）
    const second = lib.getByNumber('hBP07-013'); // 角巻わため 2nd → ◇◇（無色2）
    assert(debut && second, 'hBP07-008 / hBP07-013 が無い');
    assertEq(debut.batonTouch.length, 1, 'Debut のバトンコストが無色1でない');
    assertEq(second.batonTouch.length, 2, '2nd のバトンコストが無色2でない');
    assert(second.batonTouch.every((c) => c === '無色'), 'バトンコストが無色でない');
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

  test('onDownOshiSkill: 配列・SP・run・downedHolomem（ダウン時推しスキルの新機構）', () => {
    // 推しの onDownOshiSkill を「通常スキル＋SPスキル」の配列で定義し、
    // run（対話的ジェネレータ）・sp フラグ（ゲームに1回）・ctx.downedHolomem の受け渡しを検証する。
    const reg = new EffectRegistry();
    reg.defs.set('TEST-OSHI-DOWN', {
      number: 'TEST-OSHI-DOWN',
      onDownOshiSkill: [
        {
          cost: 1, title: 'regular',
          canUse(engine, ownerIdx) { return engine.state.players[ownerIdx].holoPower.length >= 1; },
          *run(ctx) { ctx.player.__regularDownedName = ctx.downedHolomem.stack[0].name; },
        },
        {
          sp: true, cost: 2, title: 'sp',
          canUse(engine, ownerIdx) { return engine.state.players[ownerIdx].holoPower.length >= 2; },
          *run(ctx) { ctx.player.__spRan = true; },
        },
      ],
    });
    const oshi = fakeHolomen({ number: 'TEST-OSHI-DOWN', name: '推しテスト', life: 5 });
    const e2 = new Engine({
      decks: [
        { oshi, deck: [], cheerDeck: [] },
        { oshi: fakeHolomen({ number: 'TEST-OSHI-2', name: '推し2' }), deck: [], cheerDeck: [] },
      ],
      seed: 1, registry: reg,
    });
    const p0 = e2.state.players[0];
    p0.center = { stack: [fakeHolomen({ name: 'X' })], cheers: [], attachments: [], damage: 0, rested: false, faceDown: false };
    p0.holoPower = [{ name: 'hp1' }, { name: 'hp2' }, { name: 'hp3' }];
    p0.archive = [];
    p0.life = [{ name: 'l1' }, { name: 'l2' }];
    e2.state.turnPlayer = 1;   // 相手のターン
    e2.state.phase = 'playing';
    let done = false;
    e2._processDown(p0, { zone: 'center', index: 0 }, () => { done = true; });
    // 通常ダウン推しスキルの発動確認 → yes（resume を直接駆動して _autoResolve を回避）
    assertEq(e2.state.pending.type, 'effectChoice', '通常ダウン推しスキルの確認が出ていない');
    e2.state.pending.resume(true);
    // SPダウン推しスキルの発動確認 → yes
    assertEq(e2.state.pending.type, 'effectChoice', 'SPダウン推しスキルの確認が出ていない');
    e2.state.pending.resume(true);
    assert(done, 'ダウン処理が完了していない');
    assertEq(p0.__regularDownedName, 'X', '通常スキルの run が ctx.downedHolomem を受け取れていない');
    assertEq(p0.__spRan, true, 'SPスキルの run が実行されていない');
    assertEq(p0.holoPower.length, 0, 'ホロパワーのコスト(1+2)が支払われていない');
    assertEq(p0.usedOshiSkillThisTurn, 1, '通常推しスキルの使用回数が1になっていない');
    assertEq(p0.usedSpOshiSkillThisGame, true, 'SP推しスキルの使用フラグが立っていない');
    assertEq(p0.center, null, 'ダウンしたホロメンが場から取り除かれていない');
  });

  test('onCollab: コラボしたホロメンの装着カードの onCollab が発火する（新機構）', () => {
    // 「このカードが付いているホロメンがコラボした時」型の装着トリガーを検証する。
    // コラボ処理が、コラボしたホロメン（ホスト）の attachments の triggers.onCollab を
    // sourceHolomem=ホスト で発火することを確認。
    const reg = new EffectRegistry();
    reg.defs.set('TEST-CA', {
      number: 'TEST-CA',
      triggers: { * onCollab(ctx) { ctx.player.__collabAttFired = ctx.sourceHolomem.stack[0].name; } },
    });
    const e2 = new Engine({
      decks: [
        { oshi: fakeHolomen({ number: 'OSHI-A' }), deck: [], cheerDeck: [] },
        { oshi: fakeHolomen({ number: 'OSHI-B' }), deck: [], cheerDeck: [] },
      ],
      seed: 1, registry: reg,
    });
    const p0 = e2.state.players[0];
    const p1 = e2.state.players[1];
    const att = { id: 'TEST-CA_x', number: 'TEST-CA', name: '装着テスト', kind: 'support', supportType: 'マスコット' };
    p0.back = [{ stack: [fakeHolomen({ name: 'ホスト' })], cheers: [], attachments: [att], damage: 0, rested: false, faceDown: false }];
    p0.center = { stack: [fakeHolomen({ name: 'C0' })], cheers: [], attachments: [], damage: 0, rested: false, faceDown: false };
    p0.collab = null;
    p0.life = [{ name: 'l' }, { name: 'l' }];
    p0.deck = [fakeHolomen({ name: 'd1' })]; // コラボでデッキ上1枚がホロパワーへ
    p1.center = { stack: [fakeHolomen({ name: 'C1' })], cheers: [], attachments: [], damage: 0, rested: false, faceDown: false };
    p1.life = [{ name: 'l' }, { name: 'l' }];
    e2.state.turnPlayer = 0;
    e2.state.step = 'main';
    e2.state.phase = 'playing';
    e2._executeMainAction({ kind: 'collab', backIndex: 0 });
    assertEq(p0.collab?.stack[0].name, 'ホスト', 'ホロメンがコラボに移動していない');
    assertEq(p0.__collabAttFired, 'ホスト', '装着カードの onCollab が発火していない（sourceHolomem=ホスト）');
  });

  // ---- 統合テスト: 実デッキでのプレイアウト ----
  const deckRes = await fetch('../test_deck/' + encodeURIComponent('ラミィデッキ.json'));
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

  await testAsync('ランダムプレイアウト×5シード（保存則・クラッシュ無し・決着）', async () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { engine, applies } = await randomPlayout(lib, deckMap, seed);
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

  await testAsync('同一シードなら同一結果（再現性）', async () => {
    const a = await randomPlayout(lib, deckMap, 7);
    const b = await randomPlayout(lib, deckMap, 7);
    assertEq(a.applies, b.applies, '手数が一致しない');
    assertEq(a.engine.state.winner, b.engine.state.winner, '勝者が一致しない');
    assertEq(a.engine.state.logs.length, b.engine.state.logs.length, 'ログ数が一致しない');
  });

  // ---- カード効果のシナリオテスト ----

  /** セットアップを済ませてメインステップまで進めたエンジンを作る */
  async function setupMainStep(deckMapArg, seed) {
    const d0 = lib.buildGameDeck(deckMapArg);
    const d1 = lib.buildGameDeck(deckMapArg);
    const registry = await buildRegistry(lib, deckMapArg);
    const e = new Engine({ decks: [d0, d1], seed, firstPlayer: 0, names: ['P1', 'P2'], registry });
    e.start();
    while (e.state.pending && e.state.phase === 'setup') {
      const pd = e.state.pending;
      if (pd.type === 'redraw') e.apply('no');
      else if (pd.type === 'placementBack') e.apply('done');
      else e.apply(pd.options[0].id);
    }
    while (e.state.pending && !(e.state.step === 'main' && e.state.pending.type === 'main')) {
      e.apply(e.state.pending.options[0].id);
    }
    return e;
  }

  /** 効果の選択が出ている間、最初の選択肢を選び続けてメインに戻す */
  function resolveChoices(e, pick = () => 0) {
    let guard = 0;
    while (e.state.pending && e.state.pending.type === 'effectChoice' && guard++ < 50) {
      const options = e.state.pending.options;
      e.apply(options[Math.min(pick(options), options.length - 1)].id);
    }
  }

  await testAsync('サポート効果: 春先のどか で3枚ドロー→アーカイブ', async () => {
    const e = await setupMainStep(deckMap, 11);
    e.state.turn = 3; // LIMITED の先攻1ターン目制限を回避
    const p = e.state.players[0];
    const nodoka = lib.get('hSD01-016_C');
    p.hand.push(nodoka);
    e._queueMainPending();
    const action = e.actions().find((a) => a.kind === 'support' && p.hand[a.handIndex] === nodoka);
    assert(action, '春先のどかをプレイできない');
    const handBefore = p.hand.length;
    const deckBefore = p.deck.length;
    e.apply(action.id);
    resolveChoices(e);
    assertEq(p.hand.length, handBefore - 1 + 3, '手札が-1+3になっていない');
    assertEq(p.deck.length, deckBefore - 3, 'デッキが3枚減っていない');
    assert(p.archive.includes(nodoka), '使用後にアーカイブされていない');
  });

  await testAsync('サポート使用条件: マネちゃんは手札が他に無いと使えない', async () => {
    const e = await setupMainStep(deckMap, 12);
    e.state.turn = 3;
    const p = e.state.players[0];
    const mane = lib.get('hSD01-017_02_C') || lib.get('hSD01-017_C');
    p.hand = [mane]; // 他に手札なし
    e._queueMainPending();
    assert(!e.actions().some((a) => a.kind === 'support'), '手札1枚なのにマネちゃんが使えてしまう');
    p.hand = [mane, lib.get('hBP04-043_C')];
    e._queueMainPending();
    const action = e.actions().find((a) => a.kind === 'support');
    assert(action, '条件を満たしてもマネちゃんが使えない');
    e.apply(action.id);
    resolveChoices(e);
    assertEq(p.hand.length, 5, '手札5枚になっていない（戻して5枚ドロー）');
  });

  await testAsync('雪民: 付け先制限と特殊ダメージ修正', async () => {
    const e = await setupMainStep(deckMap, 13);
    const yukimin = lib.get('hBP04-106_U');
    const lamy = e._createHolomem(lib.get('hBP04-043_C'), 1);
    const shion = e._createHolomem(lib.get('hBP02-042_C'), 1);
    assert(e._canAttachSupport(lamy, yukimin), '雪花ラミィに雪民が付けられない');
    assert(!e._canAttachSupport(shion, yukimin), '雪花ラミィ以外に雪民が付けられてしまう');
    lamy.attachments.push(yukimin, yukimin); // 何枚でも付けられる
    const bonusCenter = e.effects.specialDamageBonus(lamy, { pos: { zone: 'center' }, holomem: shion, top: shion.stack[0] }, 0);
    const bonusBack = e.effects.specialDamageBonus(lamy, { pos: { zone: 'back' }, holomem: shion, top: shion.stack[0] }, 0);
    assertEq(bonusCenter, 20, '雪民2枚で相手センターへの特殊ダメージ+20になっていない');
    assertEq(bonusBack, 0, 'センター以外なのに修正が乗っている');
  });

  await testAsync('だいふく: アーツ+10とラミィ限定HP+20（実効HP）', async () => {
    const e = await setupMainStep(deckMap, 14);
    const p = e.state.players[0];
    const daifuku = lib.get('hBP04-101_C');
    const lamy = e._createHolomem(lib.get('hBP04-043_C'), 1); // HP90
    lamy.attachments.push(daifuku);
    p.back.push(lamy);
    assertEq(e.effects.artsBonus(lamy, 0), 10, 'アーツ+10が乗っていない');
    assertEq(e.effectiveHp(lamy), 110, 'HP90+20=110になっていない');
  });

  await testAsync('hSD13-001 推しスキル「秩序の先駆者」: アーツダメージの受け手を[Buzz/2nd]赤ホロメンに差し替え', async () => {
    const e = await setupMainStep(deckMap, 99);
    await e.registry.preload(['hSD13-001'], lib); // 推しの効果定義を登録
    e.state.turn = 3;
    e.state.turnPlayer = 0;        // 攻撃側=P1
    const def = e.state.players[1]; // 防御側=P2（推しが hSD13-001）
    def.oshi = { number: 'hSD13-001', name: 'エリザベス・ローズ・ブラッドフレイム' };
    def.holoPower = [fakeHolomen(), fakeHolomen(), fakeHolomen()]; // [ホロパワー：-3]
    def.usedOshiSkillThisTurn = 0;
    const original = e._createHolomem(fakeHolomen({ name: '元の対象', color: '青' }), 1);
    const redirectTgt = e._createHolomem(fakeHolomen({ name: '受け手', color: '赤', bloomLevel: '2nd' }), 1);
    def.center = original;
    def.collab = null;
    def.back = [redirectTgt];

    let captured = null;
    e._offerDamageOshiSkill(original, 50, (finalDmg, redirectTo) => { captured = { finalDmg, redirectTo }; });
    assert(e.state.pending, '推しスキルの使用確認が出ていない');
    e.apply('yes'); // 推しスキルを使う
    // 受け手選択（候補は赤2ndの1人）
    if (e.state.pending) e.apply(e.state.pending.options[0].id);

    assert(captured, 'ダメージ適用コールバックが呼ばれていない');
    assertEq(captured.redirectTo, redirectTgt, '受け手が[Buzz/2nd]赤ホロメンに差し替わっていない');
    assertEq(captured.finalDmg, 50, '差し替え後もダメージ値が保持されていない（「そのダメージ」を移す）');
    assertEq(def.usedOshiSkillThisTurn, 1, '推しスキル使用回数が加算されていない');
    assertEq(def.holoPower.length, 0, 'ホロパワーが-3支払われていない');
  });

  await testAsync('hSD11-001 SP「ニコたんの名を呼ぶがいいさ！」: #FLOW GLOW能力で捨てたエール枚数ぶんの特殊ダメージ', async () => {
    const e = await setupMainStep(deckMap, 101);
    await e.registry.preload(['hSD11-001'], lib);
    e.state.turn = 3;
    e.state.turnPlayer = 0;
    const p0 = e.state.players[0];
    const p1 = e.state.players[1];
    p0.oshi = { number: 'hSD11-001', name: '虎金妃笑虎' };
    p0.holoPower = [fakeHolomen(), fakeHolomen()]; // [ホロパワー：-2]
    p0.usedSpOshiSkillThisGame = false;
    // 発生源: #FLOW GLOW ホロメン（エール2枚付き）
    const src = e._createHolomem(fakeHolomen({ name: 'FLOWGLOWホロメン', tags: ['FLOW', 'GLOW'] }), 1);
    const mkCheer = () => ({ id: 'cheer', number: 'cheer', name: '青エール', kind: 'cheer', color: '青' });
    src.cheers.push(mkCheer(), mkCheer());
    p0.center = src;
    p0.collab = null;
    p0.back = [];
    // 相手のセンター（被弾対象）
    const oppCenter = e._createHolomem(fakeHolomen({ name: '相手センター', hp: 300 }), 1);
    p1.center = oppCenter;
    p1.collab = null;

    // #FLOW GLOWホロメンの「能力」でエール2枚をアーカイブする効果を実行
    const ability = { *run(ctx) {
      yield* ctx.archiveCheer(src, src.cheers[0]);
      yield* ctx.archiveCheer(src, src.cheers[0]);
    } };
    let finished = false;
    e._runEffect(ability, { playerIdx: 0, sourceHolomem: src }, () => { finished = true; });
    // 効果完了後、枚数ぶんのSP推しスキルの確認が出る
    assert(e.state.pending, 'SP推しスキルの使用確認が出ていない');
    e.apply('yes');
    // 相手のセンターorコラボ選択（候補はセンター1人）
    if (e.state.pending) e.apply(e.state.pending.options[0].id);

    assert(finished, '効果が完了していない');
    assertEq(oppCenter.damage, 60, 'アーカイブしたエール2枚×30=60の特殊ダメージになっていない');
    assert(p0.usedSpOshiSkillThisGame, 'SP推しスキルが使用済みになっていない');
    assertEq(p0.holoPower.length, 0, 'ホロパワーが-2支払われていない');
  });

  await testAsync('hBP06-030 ギフト「みんなへ感謝の気持ち」: ダウン時、装着ルーナイトをアーカイブせずバックの姫森ルーナへ付け替え', async () => {
    const e = await setupMainStep(deckMap, 102);
    await e.registry.preload(['hBP06-030', 'hBP03-105'], lib);
    e.state.turn = 3;
    e.state.turnPlayer = 1; // 相手のターン（防御側＝index0）
    const p0 = e.state.players[0];
    const p1 = e.state.players[1];
    p0.oshi = { number: 'NONE', name: 'テスト推し' }; // ダウン時推しスキルの干渉を避ける
    // index0 のステージ: センター姫森ルーナ（ルーナイト付き）/ コラボ姫森ルーナ（ギフト源）/ バック姫森ルーナ（受け手）
    const runaCenter = e._createHolomem(lib.get('hBP06-030_R'), 1);
    const runaCollab = e._createHolomem(lib.get('hBP06-030_R'), 1);
    const runaBack = e._createHolomem(lib.get('hBP06-030_R'), 1);
    const runaito = lib.get('hBP03-105_U');
    runaCenter.attachments.push(runaito);
    p0.center = runaCenter;
    p0.collab = runaCollab;
    p0.back = [runaBack];
    // 相手側はトリガーの無いダミーで固定
    p1.center = e._createHolomem(fakeHolomen({ name: 'ダミー' }), 1);
    p1.collab = null;
    p1.back = [];

    let downDone = false;
    e._processDown(p0, { zone: 'center' }, () => { downDone = true; });
    assert(e.state.pending, '付け替えの使用確認が出ていない');
    e.apply('yes');
    // 付け替え先のバック姫森ルーナを選択
    if (e.state.pending) e.apply(e.state.pending.options[0].id);

    assert(downDone, 'ダウン処理が完了していない');
    assert(runaBack.attachments.includes(runaito), 'ルーナイトがバックの姫森ルーナに付け替えられていない');
    assert(!p0.archive.includes(runaito), 'ルーナイトがアーカイブされてしまっている（付け替えに失敗）');
    assert(p0.center !== runaCenter, 'ダウンしたセンターが場から除かれていない');
  });

  await testAsync('hBP07-083 ブルームエフェクト「みんなのエナジードリンク」: 全員アーツ+40 / 2nd桃鈴ねね+60、次の相手ターン終了まで継続', async () => {
    const e = await setupMainStep(deckMap, 103);
    await e.registry.preload(['hBP07-083'], lib);
    e.state.turn = 5; // 適当な自分のターン T
    e.state.turnPlayer = 0;
    const p0 = e.state.players[0];
    const p1 = e.state.players[1];
    const nene = e._createHolomem(fakeHolomen({ name: '桃鈴ねね', bloomLevel: '2nd', color: '黄' }), 1);
    const ally = e._createHolomem(fakeHolomen({ name: '味方その他', color: '青' }), 1);
    p0.center = nene; p0.collab = null; p0.back = [ally];
    const oppH = e._createHolomem(fakeHolomen({ name: '相手ホロメン' }), 1);
    p1.center = oppH; p1.collab = null; p1.back = [];

    const baseNene = e.effects.artsBonus(nene, 0);
    let done = false;
    e._runEffect(
      { run: e.registry.get('hBP07-083').bloomEffect.run },
      { playerIdx: 0, sourceHolomem: nene },
      () => { done = true; },
    );
    assert(done, 'ブルームエフェクトが完了していない');

    assertEq(e.effects.artsBonus(nene, 0), baseNene + 100, '2nd桃鈴ねねのアーツ+100（40+60）になっていない');
    assertEq(e.effects.artsBonus(ally, 0), 40, '味方ホロメンのアーツ+40になっていない');
    assertEq(e.effects.artsBonus(oppH, 1), 40, '相手ホロメンのアーツ+40になっていない（お互いの全員が対象）');

    // 持続: 自分のターン終了（turn=5のエンドステップ）では消えない
    e.effects.expireTurnModifiers();
    assertEq(e.effects.artsBonus(ally, 0), 40, '自分のターン終了で消えてしまっている');
    // 次の相手のターン（turn=6）終了で消滅
    e.state.turn = 6;
    e.effects.expireTurnModifiers();
    assertEq(e.effects.artsBonus(ally, 0), 0, '次の相手のターン終了後も継続効果が残っている');
  });

  await testAsync('相手の手札ステップで自分の手札が増えない', async () => {
    const e = await setupMainStep(deckMap, 21); // P1(先攻)のメインステップ
    // P1のターンを終わらせてP2のターンへ
    e.apply('pass'); // メイン → パフォーマンス（先攻1Tはスキップ）→ エンド → ターン2
    const p0 = e.state.players[0];
    const p1 = e.state.players[1];
    // ターン2（P2）の手札ステップ直前まで進める
    let guard = 0;
    while (e.state.pending && !(e.state.turnPlayer === 1 && e.state.step === 'draw') && guard++ < 50) {
      e.apply(e.state.pending.options[0].id);
    }
    assertEq(e.state.step, 'draw', 'P2の手札ステップに到達しない');
    const p0Before = p0.hand.length;
    const p1Before = p1.hand.length;
    // 手札ステップの「間」を進めてドローを実行させる
    e.apply('ok');
    assertEq(p0.hand.length, p0Before, 'P2のドローでP1の手札が変化した');
    assertEq(p1.hand.length, p1Before + 1, 'P2の手札が1枚増えていない');
  });

  await testAsync('特殊ダメージのダウン: 「ライフは減らない」の有無で2パターン', async () => {
    // パターン1: 記載なしの特殊ダメージで倒す → ライフが減る
    {
      const e = await setupMainStep(deckMap, 17);
      const p1 = e.state.players[1];
      p1.back.push(e._createHolomem(lib.get('hBP02-042_C'), 1)); // ステージ全滅を避ける
      const center = p1.center;
      center.damage = e.effectiveHp(center) - 10;
      const lifeBefore = p1.life.length;
      const ctx = new EffectContext(e, 0, {});
      drive(ctx.dealSpecialDamage({ pos: { zone: 'center' }, holomem: center, top: center.stack[0] }, 10));
      e._checkTiming(() => {});
      let guard = 0;
      while (e.state.pending && guard++ < 10) e.apply(e.state.pending.options[0].id);
      assertEq(p1.life.length, lifeBefore - 1, '記載なしの特殊ダメージで倒したのにライフが減っていない');
    }
    // パターン2: 「ライフは減らない」記載ありで倒す → ライフは減らない
    {
      const e = await setupMainStep(deckMap, 17);
      const p1 = e.state.players[1];
      p1.back.push(e._createHolomem(lib.get('hBP02-042_C'), 1));
      const center = p1.center;
      center.damage = e.effectiveHp(center) - 10;
      const lifeBefore = p1.life.length;
      const ctx = new EffectContext(e, 0, {});
      drive(ctx.dealSpecialDamage({ pos: { zone: 'center' }, holomem: center, top: center.stack[0] }, 10, { noLifeOnDown: true }));
      e._checkTiming(() => {});
      assertEq(p1.life.length, lifeBefore, '「ライフは減らない」なのにライフが減った');
    }
    // パターン3: 記載ありの特殊ダメージで倒れず、後から別のダメージで倒れた → ライフは減る
    {
      const e = await setupMainStep(deckMap, 17);
      const p1 = e.state.players[1];
      p1.back.push(e._createHolomem(lib.get('hBP02-042_C'), 1));
      const center = p1.center;
      const lifeBefore = p1.life.length;
      const ctx = new EffectContext(e, 0, {});
      // ダウンに至らない「ライフは減らない」特殊ダメージ
      drive(ctx.dealSpecialDamage({ pos: { zone: 'center' }, holomem: center, top: center.stack[0] }, 10, { noLifeOnDown: true }));
      assert(center.damage < e.effectiveHp(center), '前提が崩れている（この時点で倒れてはいけない）');
      // その後、通常ダメージで倒す
      center.damage = e.effectiveHp(center);
      e._checkTiming(() => {});
      let guard = 0;
      while (e.state.pending && guard++ < 10) e.apply(e.state.pending.options[0].id);
      assertEq(p1.life.length, lifeBefore - 1, '後から通常ダメージで倒したのにライフが減っていない（フラグの残留）');
    }
  });

  await testAsync('ターン修正: アーツ+20がエンドステップで消滅する', async () => {
    const e = await setupMainStep(deckMap, 15);
    const p = e.state.players[0];
    e.state.modifiers.push({ kind: 'artsPlus', amount: 20, ownerIdx: 0, duration: 'turn' });
    assertEq(e.effects.artsBonus(p.center, 0), 20, 'ターン修正が乗っていない');
    e.effects.expireTurnModifiers();
    assertEq(e.effects.artsBonus(p.center, 0), 0, 'ターン修正が消えていない');
  });

  // ---- テキストコンパイラ ----

  await testAsync('コンパイラ: ドローサポート（注釈を無視して全文解釈）', async () => {
    const def = compileCard(lib.get('hSD01-016_C')); // 春先のどか: 3枚引く + LIMITED注釈
    assert(def?.support?.run, 'サポート効果がコンパイルされていない');
    assert(def.autoCompiled, 'autoCompiled フラグが無い');
    const e = await setupMainStep(deckMap, 101);
    const p0 = e.state.players[0];
    const before = p0.hand.length;
    let done = false;
    e._runEffect(def.support, { playerIdx: 0 }, () => { done = true; });
    assert(done, '実行が完了しない');
    assertEq(p0.hand.length, before + 3, '3枚ドローされていない');
  });

  await testAsync('コンパイラ: ブルームエフェクト（エールデッキの上から送る）', async () => {
    const def = compileCard(lib.get('hBP01-041_U')); // 上から1枚をセンターかコラボに送る
    assert(def?.bloomEffect?.run, 'ブルームエフェクトがコンパイルされていない');
    const e = await setupMainStep(deckMap, 102);
    const p0 = e.state.players[0];
    const cheersBefore = p0.center.cheers.length;
    const cheerDeckBefore = p0.cheerDeck.length;
    let done = false;
    e._runEffect(def.bloomEffect, { playerIdx: 0 }, () => { done = true; });
    let guard = 0;
    while (!done && e.state.pending && guard++ < 10) e.apply(e.state.pending.options[0].id);
    assert(done, '実行が完了しない');
    assertEq(p0.center.cheers.length, cheersBefore + 1, 'センターにエールが送られていない');
    assertEq(p0.cheerDeck.length, cheerDeckBefore - 1, 'エールデッキが減っていない');
  });

  await testAsync('コンパイラ: アーツの特殊ダメージ（センター直接・選択なし）', async () => {
    const card = lib.get('hBP07-039_C'); // 相手のセンターホロメンに特殊ダメージ20
    const art = card.arts.find((a) => a.text);
    const def = compileCard(card);
    assert(def?.arts?.[art.name]?.run, 'アーツ効果がコンパイルされていない');
    const e = await setupMainStep(deckMap, 103);
    const p1 = e.state.players[1];
    const dmgBefore = p1.center.damage;
    let done = false;
    e._runEffect(def.arts[art.name], { playerIdx: 0, sourceHolomem: e.state.players[0].center }, () => { done = true; });
    assert(done, '選択なしで完了するはず');
    assertEq(p1.center.damage, dmgBefore + 20, '特殊ダメージ20が入っていない');
  });

  await testAsync('コンパイラ: 条件付きアーツ+N（dmgBonus）', async () => {
    const card = lib.get('hBP01-055_R'); // リレーションスカイ: 他の#IDがいる時+50
    const def = compileCard(card);
    const artDef = def?.arts?.['リレーションスカイ'];
    assert(artDef?.dmgBonus, 'dmgBonus がコンパイルされていない');
    const e = await setupMainStep(deckMap, 104);
    const p0 = e.state.players[0];
    p0.center = e._createHolomem(lib.get('hBP01-055_R'), 1); // イオフィ自身のみ
    p0.back = [];
    const ctx = new EffectContext(e, 0, { sourceHolomem: p0.center });
    assertEq(artDef.dmgBonus(ctx), 0, 'イオフィのみなのに+50されている');
    p0.back = [e._createHolomem(lib.get('hBP02-018_C'), 1)]; // レイネ（#ID）追加
    assertEq(artDef.dmgBonus(ctx), 50, '他の#IDがいるのに+50されない');
  });

  await testAsync('コンパイラ: だいふく相当（条件付きHP+20）が手書きと同じ挙動', async () => {
    const def = compileCard(lib.get('hBP04-101_C'));
    assert(def?.attached, '装着修正がコンパイルされていない');
    assertEq(def.attached.artsPlus(), 10, 'アーツ+10でない');
    const lamy = { stack: [lib.get('hBP04-043_C')] };
    const shion = { stack: [lib.get('hBP02-042_C')] };
    assertEq(def.attached.hpPlus(lamy), 20, 'ラミィでHP+20になっていない');
    assertEq(def.attached.hpPlus(shion), 0, 'ラミィ以外でHP+20になっている');
  });

  await testAsync('コンパイラ: 「上からN枚見る→選ぶ→残りを下へ」（シオン1stと同等挙動）', async () => {
    const def = compileCard(lib.get('hBP02-045_U'));
    assert(def?.bloomEffect?.run, '「見る」系ブルームエフェクトがコンパイルされていない');
    const e = await setupMainStep(deckMap, 105);
    const p0 = e.state.players[0];
    // デッキの上3枚を固定: [青ラミィ, 青ラミィ, シオン] → 候補から1枚選んで残り2枚は下へ
    const deckBefore = p0.deck.length;
    const handBefore = p0.hand.length;
    let done = false;
    e._runEffect(def.bloomEffect, { playerIdx: 0 }, () => { done = true; });
    let guard = 0;
    while (!done && e.state.pending && guard++ < 15) {
      // カード選択は最初の候補、順番選択は「この順のまま戻す」(skip) を選ぶ
      const skip = e.state.pending.options.find((o) => o.id === 'skip');
      e.apply((skip && /順/.test(skip.label) ? skip : e.state.pending.options[0]).id);
    }
    assert(done, '実行が完了しない');
    assertEq(p0.hand.length, handBefore + 1, '1枚手札に加わっていない');
    assertEq(p0.deck.length, deckBefore - 1, 'デッキが1枚減（3枚見て1枚取り2枚戻し）になっていない');
    assertEq(p0.revealed.length, 0, '公開中にカードが残っている');
  });

  await testAsync('コンパイラ: 解釈できない枠は実装しない（安全側）', async () => {
    // ゼータのマスコット: 能力追加が「アーツを使った時～」でHP+N以外 → 装着枠ごと不採用
    const def = compileCard(lib.get('hBP07-105_C'));
    assert(!def?.attached, '解釈できない装着効果が実装されてしまっている');
    // 鈍器でぶっ叩くわよ！: 「能力変更可能」は未対応 → サポート枠不採用
    const def2 = compileCard(lib.get('hBP01-110_U'));
    assert(!def2?.support, '解釈できないサポート効果（能力変更可能）が実装されてしまっている');
  });

  await testAsync('手書き定義のアーツ名・コラボ名がカードデータと一致する', async () => {
    // 推測で書いた名前が実データとズレていないか（ズレると効果が紐づかず無言で発動しない）
    const checks = [
      ['hBP01-009_C', 'arts', 'こんかなた～'],
      ['hBP01-031_R', 'arts', '約束の力'],
      ['hBP01-031_R', 'collab', '希望の庭園'],
      ['hBP01-095_R', 'arts', '早送り'],
      ['hBP01-095_R', 'collab', '巻き戻し'],
      ['hSD01-007_C', 'collab', 'HOPE'],
      ['hSD01-009_R', 'collab', '広がる地図'],
      ['hSD01-015_U', 'collab', 'SoAzKo'],
    ];
    for (const [id, kind, name] of checks) {
      const card = lib.get(id);
      assert(card, `${id} が無い`);
      if (kind === 'arts') {
        assert(card.arts.some((a) => a.name === name), `${id} にアーツ「${name}」が無い`);
      } else {
        assert(card.keywords.some((k) => k.subtype === 'コラボエフェクト' && k.name === name),
          `${id} にコラボエフェクト「${name}」が無い`);
      }
    }
  });

  await testAsync('手書き: ハコスのコラボ（両者手札をデッキ下→同数ドロー）でカード保存則維持', async () => {
    const e = await setupMainStep(deckMap, 111);
    const s = e.state;
    const def = (await buildRegistry(lib, deckMap)).get('hBP01-075');
    // deckMap にハコスがいない可能性があるので registry を直接構築
    const reg = new EffectRegistry();
    await reg.preload(['hBP01-075'], lib);
    const hakos = reg.get('hBP01-075');
    assert(hakos?.collabEffect, 'ハコスのコラボが読み込めない');
    const p0 = s.players[0];
    const p1 = s.players[1];
    const h0 = p0.hand.length;
    const h1 = p1.hand.length;
    const before0 = totalCards(p0);
    const before1 = totalCards(p1);
    let done = false;
    e._runEffect(hakos.collabEffect, { playerIdx: 0 }, () => { done = true; });
    let guard = 0;
    while (!done && s.pending && guard++ < 20) e.apply(s.pending.options[0].id);
    assert(done, '完了しない');
    assertEq(p0.hand.length, h0, '自分の手札枚数が元に戻っていない');
    assertEq(p1.hand.length, h1, '相手の手札枚数が元に戻っていない');
    assertEq(totalCards(p0), before0, '自分のカード保存則が崩れた');
    assertEq(totalCards(p1), before1, '相手のカード保存則が崩れた');
  });

  await testAsync('コンパイラ: サイコロ分岐アーツ（奇数で+50・1でさらに+50）', async () => {
    // hSD01-011 AZKi: 「サイコロを1回振れる：奇数の時、このアーツ+50。1の時、さらに、このアーツ+50。」
    const def = compileCard(lib.get('hSD01-011_RR'));
    const artName = lib.get('hSD01-011_RR').arts.find((a) => /奇数/.test(a.text)).name;
    assert(def?.arts?.[artName]?.run, 'サイコロ分岐アーツがコンパイルされていない');
    // 実行してクラッシュしないこと（結果はシード依存なので保存則のみ確認）
    const e = await setupMainStep(deckMap, 112);
    let done = false;
    const ctx0 = e.state.players[0].center;
    e._runEffect(def.arts[artName], { playerIdx: 0, sourceHolomem: ctx0,
      ctx: new EffectContext(e, 0, { sourceHolomem: ctx0 }) }, () => { done = true; });
    let guard = 0;
    while (!done && e.state.pending && guard++ < 10) e.apply(e.state.pending.options[0].id);
    assert(done, 'サイコロ分岐アーツが完了しない');
  });

  await testAsync('コンパイラ: 推しスキル（天音かなた「ぎゅっぎゅっ」: 残りHPを50に）', async () => {
    const def = compileCard(lib.get('hBP01-001_OSR'));
    assert(def?.oshiSkill?.run, '推しスキルがコンパイルされていない');
    const e = await setupMainStep(deckMap, 113);
    const p1 = e.state.players[1];
    p1.center.damage = 0; // 満タン
    const eff = e.effectiveHp(p1.center);
    let done = false;
    e._runEffect(def.oshiSkill, { playerIdx: 0 }, () => { done = true; });
    assert(done, '完了しない');
    assertEq(eff - p1.center.damage, 50, '相手センターの残りHPが50になっていない');
  });

  await testAsync('手書き: 全色扱い（treatedAllColors/colorOverrideAll）を特攻判定が読む', async () => {
    // engine._isTreatedAllColors が色上書きターン修正を読む（特攻ループの消費側。hBP08-006/068/073/074）
    const e = await setupMainStep(deckMap, 121);
    const target = e.state.players[1].center;
    const other = e.state.players[1].back[0] || e.state.players[0].center;
    assert(!e._isTreatedAllColors(target), '修正前から全色扱いになっている');
    e.state.modifiers.push({ kind: 'treatedAllColors', ownerIdx: 0, match: (h) => h === target });
    assert(e._isTreatedAllColors(target), '対象が全色扱いにならない');
    assert(!e._isTreatedAllColors(other), '無関係なホロメンまで全色扱いになっている');
    // colorOverrideAll 別名でも機能する（hBP08-074）
    e.state.modifiers = [{ kind: 'colorOverrideAll', ownerIdx: 0, match: (h) => h === other }];
    assert(e._isTreatedAllColors(other), 'colorOverrideAll 名が読まれていない');
  });

  await testAsync('手書き: 推しスキルコスト書き換え（hBP08-060 ギフトでモコちゃん！が-3→-2）', async () => {
    const e = await setupMainStep(deckMap, 122);
    // hBP08-060 を既存 engine の registry に追加（_effectiveOshiCost は engine.registry を見る）
    await e.registry.preload(['hBP08-060'], lib);
    assert(e.registry.get('hBP08-060')?.oshiSkillCostMod, 'コスト書き換えフックが無い');
    const p0 = e.state.players[0];
    const fuwamoco = e._createHolomem(lib.getByNumber('hBP08-060'), 1);
    const skill = { cost: 3, text: '[ホロパワー：-3][ターンに1回]…モコちゃん！…', sp: false };
    p0.back = [fuwamoco];
    p0.collab = null;
    assertEq(e._effectiveOshiCost(skill, 0), 3, 'バックにいる時はコスト据え置きのはず');
    p0.back = [];
    p0.collab = fuwamoco;
    assertEq(e._effectiveOshiCost(skill, 0), 2, 'コラボにいる時は-3→-2にならない');
    const other = { cost: 2, text: '[ホロパワー：-2]別のスキル', sp: false };
    assertEq(e._effectiveOshiCost(other, 0), 2, 'モコちゃん！以外まで軽減されている');
  });

  await testAsync('手書き: 無限の体力でアクティブ化したホロメンのアーツ+50（hBP06-069）', async () => {
    const e = await setupMainStep(deckMap, 123);
    const reg = new EffectRegistry();
    await reg.preload(['hBP06-069'], lib);
    const def = reg.get('hBP06-069');
    const artDef = def?.arts?.['しばきあげパンチング'];
    assert(artDef?.dmgBonus, 'しばきあげパンチングの dmgBonus が無い');
    const src = e.state.players[0].center;
    const ctx = new EffectContext(e, 0, { sourceHolomem: src });
    assertEq(artDef.dmgBonus(ctx), 0, 'アクティブ化していないのに+50されている');
    e.state.modifiers.push({
      kind: 'activatedByOshiSkill', skillName: '無限の体力', ownerIdx: 0, match: (h) => h === src,
    });
    assertEq(artDef.dmgBonus(ctx), 50, '無限の体力でアクティブ化したのに+50されない');
    // 別スキル名の印では発動しない
    e.state.modifiers = [{ kind: 'activatedByOshiSkill', skillName: '別のスキル', ownerIdx: 0, match: (h) => h === src }];
    assertEq(artDef.dmgBonus(ctx), 0, '別スキルの印で+50されている');
  });

  await testAsync('手書き: ブルームエフェクトの発動経路マーカー（hBP04-061 は蘇るオリー経由のみ回復）', async () => {
    const e = await setupMainStep(deckMap, 124);
    await e.registry.preload(['hBP04-061'], lib);
    const def = e.registry.get('hBP04-061');
    assert(def?.bloomEffect?.run, 'ブルームエフェクトが無い');
    const p0 = e.state.players[0];
    const olly = e._createHolomem(lib.getByNumber('hBP04-061'), 1);
    p0.center = olly; p0.collab = null; p0.back = [];

    // (1) 経路マーカー無し（通常Bloom相当） → 回復しない
    olly.damage = 100;
    let done = false;
    e._runEffect(def.bloomEffect, { playerIdx: 0, sourceHolomem: olly,
      ctx: new EffectContext(e, 0, { sourceHolomem: olly }) }, () => { done = true; });
    let guard = 0;
    while (!done && e.state.pending && guard++ < 10) e.apply(e.state.pending.options[0].id);
    assert(done, 'マーカー無しの実行が完了しない');
    assertEq(olly.damage, 100, 'マーカー無しなのに回復している');

    // (2) SP推しスキル「蘇るオリー」経由マーカー → HP全回復
    olly.damage = 100;
    done = false;
    e._runEffect(def.bloomEffect, { playerIdx: 0, sourceHolomem: olly,
      ctx: new EffectContext(e, 0, { sourceHolomem: olly, bloomSourceSkill: 'SP推しスキル:蘇るオリー' }) },
    () => { done = true; });
    guard = 0;
    while (!done && e.state.pending && guard++ < 10) e.apply(e.state.pending.options[0].id);
    assert(done, 'マーカー有りの実行が完了しない');
    assertEq(olly.damage, 0, '蘇るオリー経由なのにHP全回復していない');
  });

  await testAsync('手書き: サイコロ出目の倍化（diceDouble）と共通ダイス回数カウンタ', async () => {
    const e = await setupMainStep(deckMap, 125);
    const p0 = e.state.players[0];
    const roller = p0.center;
    const rollerName = roller.stack[0].name;
    // 発生源カードが roller 名なら出目を倍化
    e.state.modifiers.push({
      kind: 'diceDouble', ownerIdx: 0, duration: 'turn',
      match: (c) => !!c && c.name === rollerName,
    });
    const before = e.state.modifiers.filter((m) => m.kind === 'abilityDiceRoll' && m.ownerIdx === 0).length;
    let result = null;
    let done = false;
    const eff = { *run(ctx) { result = yield* ctx.rollDice(); } };
    e._runEffect(eff, { playerIdx: 0, sourceHolomem: roller, sourceCard: roller.stack[0] }, () => { done = true; });
    let guard = 0;
    while (!done && e.state.pending && guard++ < 10) e.apply(e.state.pending.options[0].id);
    assert(done, 'rollDice が完了しない');
    // 倍化後の出目は 2..12 の偶数（1..6 を 2 倍）
    assert(result >= 2 && result <= 12 && result % 2 === 0, `倍化後の出目が不正: ${result}`);
    // 共通カウンタが1増える
    const after = e.state.modifiers.filter((m) => m.kind === 'abilityDiceRoll' && m.ownerIdx === 0).length;
    assertEq(after, before + 1, '共通ダイス回数カウンタが増えていない');
    assertEq(new EffectContext(e, 0, {}).abilityDiceCountThisTurn(), after, 'abilityDiceCountThisTurn が一致しない');
  });

  await testAsync('手書き: ターン終了時の遅延効果（scheduleEndOfTurn）が実行・除去される', async () => {
    const e = await setupMainStep(deckMap, 126);
    let ran = 0;
    const ctx = new EffectContext(e, 0, {});
    ctx.scheduleEndOfTurn(function* () { ran++; }, 'テスト遅延');
    // 別プレイヤー(1)の遅延効果は今ターン(0)では実行されない
    new EffectContext(e, 1, {}).scheduleEndOfTurn(function* () { ran += 100; }, '相手の遅延');
    assertEq((e.state.endOfTurnEffects || []).length, 2, '遅延効果が予約されていない');
    let done = false;
    e._runEndOfTurnEffects(() => { done = true; });
    let guard = 0;
    while (!done && e.state.pending && guard++ < 10) e.apply(e.state.pending.options[0].id);
    assert(done, '遅延効果の実行が完了しない');
    assertEq(ran, 1, 'ターンプレイヤーの遅延効果のみ実行されるはず');
    assert(!(e.state.endOfTurnEffects || []).some((x) => x.ownerIdx === 0), 'ターンプレイヤーの遅延効果が除去されていない');
    assert((e.state.endOfTurnEffects || []).some((x) => x.ownerIdx === 1), '相手の遅延効果まで除去されている');
  });

  await testAsync('手書き: hBP08-007 はターン終了時推しスキル枠（onEndOfTurnOshiSkill）を持つ', async () => {
    const e = await setupMainStep(deckMap, 127);
    await e.registry.preload(['hBP08-007'], lib);
    const def = e.registry.get('hBP08-007');
    assert(def?.onEndOfTurnOshiSkill?.run, 'ターン終了時推しスキルが無い');
    assertEq(def.onEndOfTurnOshiSkill.cost, 2, 'コストが2でない');
    assert(typeof def.onEndOfTurnOshiSkill.canUse === 'function', 'canUse が無い');
  });

  await testAsync('手書き: アーカイブ起点の起動型Bloom（hBP08-044 光、再び灯りて）', async () => {
    const e = await setupMainStep(deckMap, 128);
    await e.registry.preload(['hBP08-044'], lib);
    const def = e.registry.get('hBP08-044');
    assert(def?.archiveActivatedAbilities?.[0]?.run, 'アーカイブ起動型能力が無い');
    const ability = def.archiveActivatedAbilities[0];
    const p0 = e.state.players[0];
    // 1st 小鳥遊キアラをセンターに（前のターンに出した扱い＝Bloム可能）
    const target = e._createHolomem(lib.get('hBP08-043_R'), 0);
    target.placedTurn = 0;
    p0.center = target; p0.collab = null; p0.back = [];
    // アーカイブに キアラ2nd(hBP08-044) ＋ ホロメン9枚（計10枚）
    const kiara2nd = lib.getByNumber('hBP08-044');
    p0.archive = [kiara2nd];
    for (let i = 0; i < 9; i++) p0.archive.push(lib.get('hBP08-041_C'));
    // canUse: アーカイブ10枚＋Bloム先あり
    const ctx = new EffectContext(e, 0, { sourceCard: kiara2nd });
    assert(ability.canUse(ctx), 'アーカイブ10枚＋Bloム先ありなのに使えない');
    // アーカイブ9枚（10枚未満）なら使えない
    const ctxShort = new EffectContext(e, 0, { sourceCard: kiara2nd });
    const saved = p0.archive.pop();
    assert(!ability.canUse(ctxShort), 'アーカイブ9枚なのに使える判定になっている');
    p0.archive.push(saved);
    // 実行: Bloム先を選んでアーカイブから取り出して重ねる
    const beforeArchive = p0.archive.length;
    let done = false;
    e._runEffect(ability, { playerIdx: 0, sourceCard: kiara2nd }, () => { done = true; });
    let guard = 0;
    while (!done && e.state.pending && guard++ < 10) e.apply(e.state.pending.options[0].id);
    assert(done, '実行が完了しない');
    assertEq(target.stack[0].number, 'hBP08-044', 'センターがhBP08-044にBloomしていない');
    assertEq(p0.archive.length, beforeArchive - 1, 'アーカイブからキアラ2ndが取り出されていない');
  });

  await testAsync('手書き: Xコスト推しスキル（hBP08-006）がホロパワーぶん全色扱いを付与', async () => {
    const e = await setupMainStep(deckMap, 129);
    await e.registry.preload(['hBP08-006'], lib);
    const p0 = e.state.players[0];
    const p1 = e.state.players[1];
    p0.oshi = lib.getByNumber('hBP08-006');
    p0.holoPower = [p0.deck.shift(), p0.deck.shift()].filter(Boolean); // ホロパワー2枚
    assert(p1.center, '相手センターがいない前提');
    e._queueMainPending();
    const oshiAct = e.actions().find((a) => a.kind === 'oshiSkill');
    assert(oshiAct, 'Xコスト推しスキルが提示されていない');
    assert(/ホロパワー-X/.test(oshiAct.label), 'Xコスト表記になっていない');
    const hpBefore = p0.holoPower.length;
    e.apply(oshiAct.id);
    // サブフロー: 「さらに払う?」は『やめる』(X=1)、対象選択は先頭。main に戻ったら終了
    let guard = 0;
    while (e.state.pending && e.state.pending.type !== 'main' && guard++ < 20) {
      const opts = e.state.pending.options;
      const stop = opts.find((o) => /やめる/.test(o.label));
      e.apply((stop || opts[0]).id);
    }
    assertEq(p0.holoPower.length, hpBefore - 1, 'ホロパワーが1枚支払われていない（X=1）');
    const mods = e.state.modifiers.filter((m) => m.kind === 'treatedAllColors' && m.ownerIdx === 0);
    assertEq(mods.length, 1, '全色扱い修正がX=1ぶん付与されていない');
  });

  await testAsync('手書き: わため推しスキル「角ドリルしたろか？」がステージの〈角巻わため〉に+100', async () => {
    const e = await setupMainStep(deckMap, 130);
    await e.registry.preload(['hBP07-001'], lib);
    const def = e.registry.get('hBP07-001');
    assert(def?.oshiSkill?.run, '角ドリルが無い');
    const p0 = e.state.players[0];
    const watame = e._createHolomem(lib.getByNumber('hBP07-009'), 0); // 白〈角巻わため〉Debut
    assertEq(watame.stack[0].name, '角巻わため', 'テスト用わためが用意できていない');
    p0.center = watame; p0.collab = null; p0.back = [];
    assertEq(e.effects.artsBonus(watame, 0), 0, '事前に+0でない');
    let done = false;
    e._runEffect(def.oshiSkill, { playerIdx: 0 }, () => { done = true; });
    let guard = 0;
    while (!done && e.state.pending && guard++ < 5) e.apply(e.state.pending.options[0].id);
    assert(done, '完了しない');
    assertEq(e.effects.artsBonus(watame, 0), 100, '角ドリルで〈角巻わため〉に+100されない');
  });

  await testAsync('手書き: チャキ丸の被ダメージ反撃（1st風真いろは装着時・相手センターに特殊20）', async () => {
    const e = await setupMainStep(deckMap, 131);
    await e.registry.preload(['hSD06-011'], lib);
    const def = e.registry.get('hSD06-011');
    assert(def?.attached?.onDamageReceivedForced, '反撃トリガーが無い');
    // 防御側 = p1（ownerIdx 1）、相手ターンは p0。1st〈風真いろは〉にチャキ丸を装着。
    const host = e._createHolomem(lib.getByNumber('hBP01-050'), 0); // 風真いろは 1st
    assertEq(host.stack[0].name, '風真いろは', 'テスト用ホストが用意できていない');
    const tool = { ...lib.getByNumber('hSD06-011') };
    host.attachments = [tool];
    e.state.players[1].back = [host];
    const oppCenter = e.state.players[0].center;
    assert(oppCenter, '相手センターがいない前提');
    const before = oppCenter.damage;
    // 相手ターン(p0)に host が被ダメージ → 強制反撃
    def.attached.onDamageReceivedForced(host, e, tool, 1);
    assertEq(oppCenter.damage, before + 20, '相手センターに特殊20が入っていない');
    // [ターンに1回]: 同一ターンの2回目は発火しない
    def.attached.onDamageReceivedForced(host, e, tool, 1);
    assertEq(oppCenter.damage, before + 20, '[ターンに1回]を超えて反撃している');
  });

  await testAsync('デッキサーチ: 対象の有無に関わらずデッキ全体を確認でき、確認後シャッフルされる', async () => {
    const e = await setupMainStep(deckMap, 132);
    const p0 = e.state.players[0];
    const deckLen = p0.deck.length;

    // (1) 候補ありのサーチ: deckSearch フラグ + デッキ全体が「選択枠 + 確認枠」に分かれて出る
    let done1 = false;
    const eff1 = { *run(ctx) {
      const cand = ctx.deckCards((c) => c.kind === 'holomen');
      yield ctx.chooseCard({ cards: cand, title: 'test1', optional: true });
    } };
    e._runEffect(eff1, { playerIdx: 0 }, () => { done1 = true; });
    let req = e.state.pending && e.state.pending.request;
    assert(req && req.deckSearch === true, 'deckSearch フラグが立っていない');
    const selCount = e.state.pending.options.filter((o) => o.card).length;
    assert(selCount > 0, '選択候補(ホロメン)が無い前提が崩れている');
    assertEq(selCount + req.displayCards.length, deckLen, '選択枠+確認枠がデッキ全体に一致しない');
    // skip で解決 → 確認後シャッフル保証フラグが flush される
    e.apply(e.state.pending.options.find((o) => o.id === 'skip').id);
    let guard = 0;
    while (!done1 && e.state.pending && guard++ < 10) e.apply(e.state.pending.options[0].id);
    assert(done1, '(1)完了しない');
    assert(!p0._deckViewedNeedsShuffle, '確認後シャッフル保証フラグが残っている(flushされていない)');

    // (2) 候補0のサーチ: 自動スキップされず、デッキ確認モーダルが出る
    let done2 = false;
    const eff2 = { *run(ctx) {
      const cand = ctx.deckCards((c) => c.name === '___存在しないカード名___');
      yield ctx.chooseCard({ cards: cand, title: 'test2', optional: true, skipLabel: '見つからなかったことにする' });
    } };
    e._runEffect(eff2, { playerIdx: 0 }, () => { done2 = true; });
    assert(e.state.pending && e.state.pending.request.deckSearch, '候補0でモーダルが出ていない(自動スキップされた)');
    assert((e.state.pending.request.displayCards || []).length > 0, '候補0でもデッキ確認枠があるべき');
    assert(!done2, '候補0で即完了してしまっている(モーダルが出ていない)');
    e.apply(e.state.pending.options.find((o) => o.id === 'skip').id);
    assert(done2, '(2)完了しない');
  });

  await testAsync('エクストラ: 「デッキに何枚でも入れられる」Debutを認識し、フレンドリーパソコンの対象になる', async () => {
    // card_data に エクストラ「何枚でも」Debut が収録され、正規化で keywords + unlimitedInDeck が付く
    const ex = [...lib.byNumber.values()].find((c) => c.unlimitedInDeck && c.bloomLevel === 'Debut');
    assert(ex, 'エクストラ「何枚でも」Debutがライブラリに無い（コレクタ未取得？）');
    assert((ex.keywords || []).some((k) => (k.text || '').includes('デッキに何枚でも')), 'keywordsにエクストラ文言が無い');

    const e = await setupMainStep(deckMap, 133);
    await e.registry.preload(['hBP05-074'], lib);
    const def = e.registry.get('hBP05-074');
    const p0 = e.state.players[0];
    p0.deck.unshift({ ...lib.getByNumber(ex.number) }); // デッキにエクストラDebutを1枚仕込む
    let done = false;
    e._runEffect(def.support, { playerIdx: 0 }, () => { done = true; });
    // 1枚目の選択にエクストラDebutが候補として出る
    const opts = e.state.pending ? e.state.pending.options : [];
    assert(opts.some((o) => o.card && o.card.number === ex.number), 'フレンドリーパソコンがエクストラDebutを候補にできていない');
    // エクストラDebutを1枚選び、以降はスキップして完了させる
    let guard = 0; let picked = false;
    while (!done && e.state.pending && guard++ < 12) {
      const o = e.state.pending.options;
      const exOpt = o.find((x) => x.card && x.card.number === ex.number);
      const skip = o.find((x) => x.id === 'skip');
      if (exOpt && !picked) { picked = true; e.apply(exOpt.id); }
      else if (skip) e.apply(skip.id);
      else e.apply(o[0].id);
    }
    assert(picked, 'エクストラDebutを選択できていない');
    assert(done, '完了しない');
  });

  await testAsync('設定: 任意効果の発動確認ON/OFF（OFFは発動ゲートを自動発動、独自ラベルは常に確認）', async () => {
    const e = await setupMainStep(deckMap, 134);

    // (1) ON（既定）: 「発動する/発動しない」ゲートは確認モーダルを出す
    e.confirmOptionalEffects = true;
    let r1 = null; let done1 = false;
    e._runEffect({ * run(ctx) { r1 = yield ctx.confirm('発動しますか？'); } }, { playerIdx: 0 }, () => { done1 = true; });
    assert(!done1 && e.state.pending && e.state.pending.request.kind === 'confirm', 'ON: 確認モーダルが出ていない');
    e.apply(e.state.pending.options.find((o) => o.id === 'yes').id);
    assert(done1 && r1 === true, 'ON: 「発動する」で完了しない');

    // (2) OFF: 発動ゲートは確認を出さず自動で true（発動）
    e.confirmOptionalEffects = false;
    let r2 = null; let done2 = false;
    e._runEffect({ * run(ctx) { r2 = yield ctx.confirm('発動しますか？'); } }, { playerIdx: 0 }, () => { done2 = true; });
    assert(done2 && r2 === true, 'OFF: 自動発動(true)で完了していない');
    assert(!e.state.pending, 'OFF: 余計な pending が残っている');

    // (3) OFF でも独自ラベルの confirm（中途選択）は確認を出す
    let done3 = false;
    e._runEffect({ * run(ctx) { yield ctx.confirm('振りますか？', '振る', '振らない'); } }, { playerIdx: 0 }, () => { done3 = true; });
    assert(!done3 && e.state.pending && e.state.pending.request.kind === 'confirm', 'OFF: 独自ラベルconfirmまで自動化されている');
    e.apply(e.state.pending.options[0].id);
    assert(done3, '(3)完了しない');
  });

  await testAsync('推しステージスキル: AZKi/セシリア/Ina/FUWAMOCO/ルイ/わため', async () => {
    const e = await setupMainStep(deckMap, 140);
    await e.registry.preload(['hBP07-006', 'hBP08-002', 'hBP08-006', 'hBP08-003', 'hBP08-005', 'hBP07-001'], lib);
    const p0 = e.state.players[0]; const p1 = e.state.players[1];

    // AZKi: センター〈AZKi〉にホロパワー×20
    p0.oshi = lib.getByNumber('hBP07-006');
    const azki = { stack: [{ name: 'AZKi' }], cheers: [], attachments: [] };
    p0.center = azki; p0.collab = null; p0.back = [];
    p0.holoPower = [{}, {}, {}];
    assertEq(e.effects.artsBonus(azki, 0), 60, 'AZKi: ホロパワー3枚で+60にならない');
    p0.holoPower = [];
    assertEq(e.effects.artsBonus(azki, 0), 0, 'AZKi: ホロパワー0で+0にならない');

    // セシリア: blocksReset
    p0.oshi = lib.getByNumber('hBP08-002');
    const cecDef = e.registry.get('hBP08-002').oshiStageSkill;
    assert(cecDef.blocksReset({ stack: [{ name: 'セシリア・イマーグリーン' }] }), 'セシリアがblocksReset対象でない');
    assert(!cecDef.blocksReset({ stack: [{ name: '別' }] }), '別ホロメンまでblocksReset');

    // Ina: 相手全員が相手推しと異なる色ならエール不要
    p0.oshi = lib.getByNumber('hBP08-006');
    const ina = { stack: [{ name: '一伊那尓栖' }], cheers: [], attachments: [] };
    p0.center = ina; p0.collab = null; p0.back = [];
    p1.oshi = { color: '赤' };
    p1.center = { stack: [{ name: 'X', color: '青' }], cheers: [], attachments: [] }; p1.collab = null; p1.back = [];
    let red = e.effects.artsCostReduction(ina, 0);
    assert((red['青'] || 0) >= 99 && (red['無色'] || 0) >= 99, 'Ina: 条件成立でエール不要にならない');
    p1.center = { stack: [{ name: 'Y', color: '赤' }], cheers: [], attachments: [] }; // 推しと同色
    red = e.effects.artsCostReduction(ina, 0);
    assert(!(red['青'] >= 99), 'Ina: 推しと同色がいるのに軽減されている');

    // FUWAMOCO: フワワ/モココの赤エールが青コストを払える
    p0.oshi = lib.getByNumber('hBP08-003');
    const fuwawa = { stack: [{ name: 'フワワ・アビスガード' }], cheers: [{ color: '赤' }], attachments: [] };
    assert(e._canPayArtCost(fuwawa, ['青'], 0), 'FUWAMOCO: 赤エールが青コストを払えない');
    assert(e._canPayArtCost(fuwawa, ['赤'], 0), 'FUWAMOCO: 赤コストを払えない');
    assert(!e._canPayArtCost({ stack: [{ name: '別' }], cheers: [{ color: '赤' }], attachments: [] }, ['青'], 0), 'FUWAMOCO: 対象外の赤が青を払えている');

    // ルイ: ターン終了時、センター=ルイ&コラボあり→手札4枚までドロー
    p0.oshi = lib.getByNumber('hBP08-005');
    const ruiDef = e.registry.get('hBP08-005').oshiStageSkill;
    p0.center = { stack: [{ name: '鷹嶺ルイ' }] }; p0.collab = { stack: [{ name: 'C' }] }; p0.back = [];
    p0.hand = [{}, {}];
    const deckBefore = p0.deck.length;
    let done = false;
    e._runEffect({ run: ruiDef.onTurnEnd }, { playerIdx: 0 }, () => { done = true; });
    assert(done && p0.hand.length === 4 && p0.deck.length === deckBefore - 2, 'ルイ: 4枚までドローしていない');

    // わため: 〈角巻わため〉アーツ使用時、デッキ上1枚をホロパワーに
    p0.oshi = lib.getByNumber('hBP07-001');
    const wataDef = e.registry.get('hBP07-001').oshiStageSkill;
    const hp0 = p0.holoPower.length; const dk0 = p0.deck.length;
    let d2 = false;
    e._runEffect({ run: wataDef.onArtsUse }, { playerIdx: 0, sourceHolomem: { stack: [{ name: '角巻わため' }] } }, () => { d2 = true; });
    assert(d2 && p0.holoPower.length === hp0 + 1 && p0.deck.length === dk0 - 1, 'わため: デッキ上1枚がホロパワーに行っていない');
  });

  await testAsync('エクストラ: 名前読み替え（ラムダックが〈角巻わため〉にBloomできる / nameIs別名一致）', async () => {
    const e = await setupMainStep(deckMap, 150);
    const ramuduck = lib.getByNumber('hBP06-083'); // ラムダック1st、nameAliases=[角巻わため,大空スバル]
    assert((ramuduck.nameAliases || []).includes('角巻わため'), 'nameAliases が正規化されていない');
    const base = e._createHolomem(lib.getByNumber('hBP07-008'), 0); // Debut〈角巻わため〉
    base.placedTurn = 0;
    assertEq(base.stack[0].name, '角巻わため', 'テスト用の素体が〈角巻わため〉でない');
    assert(e._canBloom(base, ramuduck), 'ラムダックが〈角巻わため〉にBloomできない（別名Bloム）');
    const ctx = new EffectContext(e, 0, {});
    assert(ctx.nameIs(ramuduck, '角巻わため') && ctx.nameIs(ramuduck, '大空スバル'), 'nameIs が別名に一致しない');
    assert(!ctx.nameIs(ramuduck, '無関係'), 'nameIs が無関係名に一致している');
  });

  await testAsync('エクストラ: ダウン時ライフ-2（非Buzz）の正規化 / Bloomできない（Spot）の正規化', async () => {
    assertEq(lib.getByNumber('hBP07-019').extraLifeLossOnDown, 2, '非Buzzの「ライフ-2」が正規化されていない');
    assert(lib.getByNumber('hBP01-096').cannotBloom === true, 'Spotの cannotBloom が立っていない');
    // Buzz は従来どおり（extraLifeLossOnDown が無くても card.buzz=2 経路）/ 通常ホロメンは undefined
    const e = await setupMainStep(deckMap, 151);
    // Spot にはBloムできない（同名上位でも不可。_canBloomIgnoreName の Spot/cannotBloom 判定）
    const spotH = e._createHolomem(lib.getByNumber('hBP01-096'), 0); spotH.placedTurn = 0;
    assert(!e._canBloomIgnoreName(spotH, { bloomLevel: '1st', hp: 200 }), 'Spot/cannotBloom にBloомできてしまう');
  });

  await testAsync('推しステージ: はあちゃまなう（〈赤井はあと〉が能力でデッキに戻ると2枚ドロー・ターンに1回）', async () => {
    const e = await setupMainStep(deckMap, 152);
    await e.registry.preload(['hBP07-004'], lib);
    const p0 = e.state.players[0];
    p0.oshi = lib.getByNumber('hBP07-004');
    const haatoDebut = [...lib.byNumber.values()].find((c) => c.name === '赤井はあと' && c.bloomLevel === 'Debut');
    assert(haatoDebut, 'Debut〈赤井はあと〉がライブラリに無い');
    const ctx = new EffectContext(e, 0, {});

    const h1 = e._createHolomem(lib.getByNumber(haatoDebut.number), 0);
    p0.back = [h1];
    const handBefore = p0.hand.length;
    drive(ctx.returnHolomemToDeck(h1)); // generator化したため drive で駆動
    assertEq(p0.hand.length, handBefore + 2, 'はあちゃまなうで2枚引いていない');
    assert(!p0.back.includes(h1), 'はあとがバックから除去されていない');

    // [ターンに1回]: 同一ターンの2回目は引かない
    const h2 = e._createHolomem(lib.getByNumber(haatoDebut.number), 0);
    p0.back = [h2];
    const handBefore2 = p0.hand.length;
    drive(ctx.returnHolomemToDeck(h2)); // generator化したため drive で駆動
    assertEq(p0.hand.length, handBefore2, '[ターンに1回]を超えて引いている');
  });

  await testAsync('装着: ネリッサの杖（2ndネリッサの能力で手札アーカイブ→相手前衛に特殊20・ターンに1回）', async () => {
    const e = await setupMainStep(deckMap, 153);
    await e.registry.preload(['hBP05-061', 'hBP05-083'], lib);
    const p0 = e.state.players[0]; const p1 = e.state.players[1];
    const nerissa = e._createHolomem(lib.getByNumber('hBP05-061'), 0);
    assertEq(nerissa.stack[0].name, 'ネリッサ・レイヴンクロフト', 'テスト用2ndネリッサが用意できていない');
    assertEq(nerissa.stack[0].bloomLevel, '2nd', '2ndでない');
    nerissa.attachments = [{ ...lib.getByNumber('hBP05-083') }];
    p0.center = nerissa; p0.collab = null; p0.back = [];
    p1.collab = null; // 相手前衛をセンターのみ＝対象1人で自動選択
    assert(p1.center, '相手センターがいない前提');
    const before = p1.center.damage;
    p0.hand = [{ name: 'A', kind: 'support' }, { name: 'B', kind: 'support' }];
    let done = false;
    const eff = { * run(ctx) { yield* ctx.archiveHandCard(ctx.player.hand[0]); yield* ctx.archiveHandCard(ctx.player.hand[0]); } };
    e._runEffect(eff, { playerIdx: 0, sourceHolomem: nerissa }, () => { done = true; });
    let guard = 0;
    while (!done && e.state.pending && guard++ < 10) e.apply(e.state.pending.options[0].id);
    assert(done, '完了しない');
    assertEq(p1.center.damage, before + 20, '相手前衛に特殊20（ターンに1回）が正しく入っていない');
  });

  await testAsync('推しスキル: IOFORIA~!（被ダメージ割り込み中にエール付け替え・generator版）', async () => {
    const e = await setupMainStep(deckMap, 154);
    await e.registry.preload(['hBP05-002'], lib);
    const p0 = e.state.players[0]; const p1 = e.state.players[1];
    p0.oshi = lib.getByNumber('hBP05-002'); // アイラニ・イオフィフティーン（#ID1期生）
    p0.holoPower = [{}];
    e.state.turnPlayer = 1; // 相手(p1)のターン
    const target = { stack: [{ name: 'T', tags: ['ID1期生'], hp: 100, arts: [], bloomLevel: 'Debut' }], cheers: [{ name: 'cheerX', color: '白' }], attachments: [] };
    const dest = { stack: [{ name: 'D', tags: ['ID1期生'], hp: 100, arts: [], bloomLevel: 'Debut' }], cheers: [], attachments: [] };
    p0.center = target; p0.back = [dest]; p0.collab = null;

    let done = false;
    const atk = { * run(ctx) { yield* ctx.dealSpecialDamage({ holomem: target, top: target.stack[0] }, 30); } };
    e._runEffect(atk, { playerIdx: 1 }, () => { done = true; });
    let guard = 0;
    while (!done && e.state.pending && guard++ < 15) {
      const opts = e.state.pending.options;
      const yes = opts.find((o) => o.id === 'yes');
      e.apply((yes || opts[0]).id);
    }
    assert(done, 'IOFORIA~! の割り込みが完了しない');
    assertEq(target.cheers.length, 0, '対象からエールが外れていない');
    assertEq(dest.cheers.length, 1, '他の#ID1期生にエールが付け替えられていない');
    assert(p0.usedOshiSkillThisTurn >= 1, '推しスキルが使用済みになっていない（コスト/回数処理）');
  });

  await testAsync('推しスキル: 女幹部の采配（赤ホロメンの手札アーカイブをホロパワーで置換）', async () => {
    const e = await setupMainStep(deckMap, 155);
    await e.registry.preload(['hBP01-005'], lib);
    const p0 = e.state.players[0];
    p0.oshi = lib.getByNumber('hBP01-005');
    p0.holoPower = [{ name: 'hp1' }, { name: 'hp2' }];

    // 赤ホロメンの能力で手札アーカイブ → 置換「はい」: 手札は残り、ホロパワー1枚がアーカイブ
    const redHost = { stack: [{ name: 'R', color: '赤' }], cheers: [], attachments: [] };
    p0.center = redHost;
    const handCard = { name: 'H', kind: 'support' };
    p0.hand = [handCard];
    const hpBefore = p0.holoPower.length; const arcBefore = p0.archive.length;
    let done = false;
    e._runEffect({ * run(ctx) { yield* ctx.archiveHandCard(handCard); } }, { playerIdx: 0, sourceHolomem: redHost }, () => { done = true; });
    let guard = 0;
    while (!done && e.state.pending && guard++ < 5) { const yes = e.state.pending.options.find((o) => o.id === 'yes'); e.apply((yes || e.state.pending.options[0]).id); }
    assert(done, '完了しない');
    assert(p0.hand.includes(handCard), '手札カードが残っていない（置換されていない）');
    assertEq(p0.holoPower.length, hpBefore - 1, 'ホロパワーが1枚減っていない');
    assertEq(p0.archive.length, arcBefore + 1, 'ホロパワーがアーカイブされていない');

    // 非赤ホロメンでは置換オファー無し（通常どおり手札をアーカイブ）
    const blueHost = { stack: [{ name: 'B', color: '青' }], cheers: [], attachments: [] };
    p0.center = blueHost;
    const h2 = { name: 'H2', kind: 'support' }; p0.hand = [h2];
    let done2 = false;
    e._runEffect({ * run(ctx) { yield* ctx.archiveHandCard(h2); } }, { playerIdx: 0, sourceHolomem: blueHost }, () => { done2 = true; });
    assert(done2 && !e.state.pending, '非赤で余計な確認が出た');
    assert(!p0.hand.includes(h2) && p0.archive.includes(h2), '非赤で手札がアーカイブされていない');
  });

  await testAsync('コンパイラ: 全カードでクラッシュせず、一定数を自動実装できる', async () => {
    let compiled = 0;
    let slots = 0;
    for (const card of lib.byNumber.values()) {
      let def;
      try {
        def = compileCard(card);
      } catch (e) {
        throw new Error(`${card.number} のコンパイルで例外: ${e.message}`);
      }
      if (def) {
        compiled++;
        slots += ['bloomEffect', 'collabEffect', 'support', 'attached']
          .filter((k) => def[k]).length + Object.keys(def.arts || {}).length;
      }
    }
    console.log(`自動コンパイル: ${compiled}種のカード / ${slots}スキル枠`);
    assert(compiled >= 50, `自動実装数が少なすぎる: ${compiled}`);
  });

  // ---- AI ----

  await testAsync('AI同士の対戦が決着する（3シード・保存則維持）', async () => {
    for (const seed of [31, 32, 33]) {
      const d0 = lib.buildGameDeck(deckMap);
      const d1 = lib.buildGameDeck(deckMap);
      const registry = await buildRegistry(lib, deckMap);
      const e = new Engine({ decks: [d0, d1], seed, names: ['AI1', 'AI2'], registry });
      e.start();
      const ais = [new HeuristicAI(0), new HeuristicAI(1)];
      let applies = 0;
      while (e.state.phase !== 'ended' && applies < 4000) {
        const pending = e.state.pending;
        assert(pending, `seed=${seed}: pending が無いのに終わっていない`);
        const id = ais[pending.player].choose(e);
        e.apply(id);
        applies++;
      }
      assert(e.state.phase === 'ended', `seed=${seed}: ${applies}手で決着しなかった`);
      for (const p of e.state.players) {
        assertEq(totalCards(p), 70, `seed=${seed}: ${p.name} のカード総数が崩れた`);
      }
    }
  });

  await testAsync('AI: 倒せる相手を優先して攻撃する（リーサル選択）', async () => {
    const e = await setupMainStep(deckMap, 41);
    const s = e.state;
    s.turn = 3; // 先攻1ターン目のパフォーマンススキップを回避
    const p0 = s.players[0];
    const p1 = s.players[1];
    // 自分のセンターにエールを持たせてアーツを撃てる状態にする
    p0.center.cheers.push(...p0.cheerDeck.splice(0, 3));
    // 相手: センターは残りHP10（倒せる）、バックは満タン
    p1.back.push(e._createHolomem(lib.get('hBP02-042_C'), 1));
    p1.center.damage = e.effectiveHp(p1.center) - 10;
    // パフォーマンスステップに入る
    s.pending = null;
    e._performanceStep();
    assert(s.pending?.type === 'performance', 'パフォーマンスの決定ポイントになっていない');
    const ai = new HeuristicAI(0);
    const id = ai.choose(e);
    const opt = s.pending.options.find((o) => o.id === id);
    assert(opt && opt.kind === 'art', `AIがアーツを選ばなかった (${id})`);
    assertEq(opt.target.zone, 'center', 'AIが倒せるセンターを狙っていない');
  });

  // ---- AI判断の質 ----

  await testAsync('AI: エールを撃てるホロメンに過剰投資しない', async () => {
    const e = await setupMainStep(deckMap, 51);
    const s = e.state;
    const p0 = s.players[0];
    // センター: 2ndラミィ（最大コスト3）に既に3枚 → これ以上は不要
    p0.center = e._createHolomem(lib.get('hBP04-048_RR'), 1);
    p0.center.cheers.push(...p0.cheerDeck.splice(0, 3));
    // バック: エール0枚の1stラミィ（青1+無色1で50点アーツ）
    p0.back = [e._createHolomem(lib.get('hBP04-047_R'), 1)];
    s.pending = null;
    e._cheerStep();
    while (s.pending?.type === 'stepPause') e.apply('ok');
    assertEq(s.pending?.type, 'attachCheer', 'エール送付の決定ポイントになっていない');
    const ai = new HeuristicAI(0);
    const id = ai.choose(e);
    const opt = s.pending.options.find((o) => o.id === id);
    assertEq(opt.pos.zone, 'back', '満タンのセンターではなくバックに送るべき');
  });

  await testAsync('AI: 利益のないBloomをしない / 利益のあるBloomは選ぶ', async () => {
    const e = await setupMainStep(deckMap, 52);
    const s = e.state;
    s.turn = 3;
    const p0 = s.players[0];
    p0.turnCount = 2; // 最初のターン制限を回避
    // センター: 1stラミィ hBP04-045（HP150・効果なし）
    p0.center = e._createHolomem(lib.get('hBP04-045_C'), 1);
    const ai = new HeuristicAI(0);
    // ケース1: 同一カードへのBloom（利益ゼロ）→ 選ばない
    p0.hand = [lib.get('hBP04-045_C')];
    e._queueMainPending();
    const id1 = ai.choose(e);
    const opt1 = s.pending.options.find((o) => o.id === id1);
    assert(opt1.kind !== 'bloom', '利益のない同一カードBloomを選んでしまった');
    // ケース2: 2nd hBP04-048（HP190+ブルームエフェクト）へのBloom → 選ぶ
    p0.hand = [lib.get('hBP04-048_RR')];
    e._queueMainPending();
    const id2 = ai.choose(e);
    const opt2 = s.pending.options.find((o) => o.id === id2);
    assertEq(opt2.kind, 'bloom', '利益のあるBloomを選ばなかった');
  });

  // ---- 推しスキル ----

  await testAsync('推しスキル: ラミィSP（特殊ダメージ+100とダウン時2ドロー）', async () => {
    const e = await setupMainStep(deckMap, 53);
    const s = e.state;
    const p0 = s.players[0];
    const p1 = s.players[1];
    p0.center = e._createHolomem(lib.get('hBP04-043_C'), 1); // 雪花ラミィ
    p0.holoPower.push(...p0.deck.splice(0, 3));
    p1.back.push(e._createHolomem(lib.get('hBP02-042_C'), 1));
    e._queueMainPending();
    const action = e.actions().find((a) => a.kind === 'oshiSkill');
    assert(action, 'SP推しスキルがアクションに出ていない');
    e.apply(action.id);
    // 対象の雪花ラミィを選択
    assertEq(s.pending?.type, 'effectChoice', '対象選択になっていない');
    e.apply(s.pending.options[0].id);
    assertEq(s.modifiers?.length ?? e.state.modifiers.length, 2, 'ターン修正が2件積まれていない');
    // 特殊ダメージ+100の確認: ラミィから相手センターへ10点 → 110点になる
    const ctx = new EffectContext(e, 0, { sourceHolomem: p0.center });
    const target = { pos: { zone: 'center' }, holomem: p1.center, top: p1.center.stack[0] };
    const handBefore = p0.hand.length;
    const dmgBefore = p1.center.damage;
    drive(ctx.dealSpecialDamage(target, 10));
    assert(p1.center.damage - dmgBefore >= 110, `特殊ダメージ+100が乗っていない（実際: ${p1.center.damage - dmgBefore}）`);
    // ダウンしたはず → 2枚ドローのトリガー
    assertEq(p0.hand.length, handBefore + 2, 'ダウンさせた時の2枚ドローが発動していない');
  });

  await testAsync('推しスキル: ラミィ「愛してる」（相手ターンのダウン時にファン回収）', async () => {
    const e = await setupMainStep(deckMap, 54);
    const s = e.state;
    const p0 = s.players[0];
    s.turnPlayer = 1; // 相手のターンにする
    p0.center = e._createHolomem(lib.get('hBP04-043_C'), 1);
    const yukimin = lib.get('hBP04-106_U');
    p0.center.attachments.push(yukimin);
    p0.back.push(e._createHolomem(lib.get('hBP02-042_C'), 1)); // 全滅回避
    p0.holoPower.push(p0.deck.shift());
    p0.usedOshiSkillThisTurn = 0;
    // センターを倒す
    p0.center.damage = e.effectiveHp(p0.center);
    s.pending = null;
    e._checkTiming(() => {});
    assertEq(s.pending?.type, 'effectChoice', '推しスキルの確認が出ていない');
    const handBefore = p0.hand.length;
    e.apply('yes');
    assert(p0.hand.includes(yukimin), '雪民が手札に戻っていない');
    assertEq(p0.holoPower.length, 0, 'ホロパワーのコストが払われていない');
    // 残りのダウン処理（ライフ送り）を消化
    let guard = 0;
    while (s.pending && guard++ < 10) e.apply(s.pending.options[0].id);
    assertEq(p0.hand.length, handBefore + 1, '手札が1枚（雪民）増えているはず');
  });

  await testAsync('バトンタッチ: アーカイブするエールを選択できる', async () => {
    const e = await setupMainStep(deckMap, 91);
    const s = e.state;
    const p0 = s.players[0];
    // センター: エール2枚ちょうど（どちらを払うか選べる状態）。バック: アクティブ1人
    const center = p0.center;
    const cheerA = p0.cheerDeck.shift();
    const cheerB = p0.cheerDeck.shift();
    center.cheers = [cheerA, cheerB]; // エールステップで付いた分は除いて2枚に固定
    p0.back = [e._createHolomem(lib.get('hBP02-042_C'), 1)];
    e._queueMainPending();
    const action = e.actions().find((a) => a.kind === 'baton');
    assert(action, 'バトンタッチがアクションに出ていない');
    e.apply(action.id);
    // エール選択の決定ポイントが出る（候補2枚）
    assertEq(s.pending?.type, 'effectChoice', 'エール選択になっていない');
    assertEq(s.pending.options.filter((o) => o.card).length, 2, '候補が2枚出ていない');
    // 2枚目（cheerB）を選んで支払う
    const optB = s.pending.options.find((o) => o.card === cheerB);
    e.apply(optB.id);
    // 交代が完了し、選んだ方がアーカイブされている
    assert(p0.archive.includes(cheerB), '選んだエールがアーカイブされていない');
    assert(!p0.archive.includes(cheerA), '選んでいないエールまでアーカイブされた');
    assertEq(p0.center.stack[0].name, '紫咲シオン', 'バックのホロメンがセンターに来ていない');
    const oldCenterNowBack = p0.back[p0.back.length - 1];
    assert(oldCenterNowBack.cheers.includes(cheerA), '残したエールが元センターに付いたままになっていない');
  });

  await testAsync('バックのホロメンも特殊ダメージでダウンする（回帰）', async () => {
    const e = await setupMainStep(deckMap, 71);
    const s = e.state;
    const p1 = s.players[1];
    // 相手バックにホロメン2人（全滅回避用に1人余分に）
    p1.back.push(e._createHolomem(lib.get('hBP02-042_C'), 1)); // HP130
    p1.back.push(e._createHolomem(lib.get('hBP04-043_C'), 1));
    const backH = p1.back[0];
    const archiveBefore = p1.archive.length;
    const ctx = new EffectContext(e, 0, {});
    drive(ctx.dealSpecialDamage({ pos: { zone: 'back', index: 0 }, holomem: backH, top: backH.stack[0] }, 130));
    s.pending = null;
    e._checkTiming(() => {});
    let guard = 0;
    while (s.pending && guard++ < 10) e.apply(s.pending.options[0].id);
    assert(!p1.back.includes(backH), 'バックのホロメンがダウンしていない');
    assert(p1.archive.length > archiveBefore, 'ダウンしたカードがアーカイブされていない');
  });

  await testAsync('HP修正付きホロメンは基礎HP超のダメージでも実効HP未満なら生存', async () => {
    const e = await setupMainStep(deckMap, 72);
    const s = e.state;
    const p1 = s.players[1];
    const lamy = e._createHolomem(lib.get('hBP04-043_C'), 1); // HP90
    lamy.attachments.push(lib.get('hBP04-101_C'));            // だいふく: ラミィならHP+20
    p1.back.push(lamy);
    lamy.damage = 100; // 基礎HP(90)超・実効HP(110)未満
    s.pending = null;
    e._checkTiming(() => {});
    assert(p1.back.includes(lamy), '実効HP未満なのにダウンしてしまった');
    lamy.damage = 110; // 実効HP到達
    e._checkTiming(() => {});
    let guard = 0;
    while (s.pending && guard++ < 10) e.apply(s.pending.options[0].id);
    assert(!p1.back.includes(lamy), '実効HP到達でダウンしていない');
  });

  // ---- 第2デッキ（あの青空のせいだ: オリー/イオフィ/レイネ）----

  const res2 = await fetch('../test_deck/' + encodeURIComponent('あの青空のせいだ.json'));
  const deckMap2 = await res2.json();

  await testAsync('ランダムプレイアウト（あの青空のせいだ）×3シード', async () => {
    for (const seed of [61, 62, 63]) {
      const { engine, applies } = await randomPlayout(lib, deckMap2, seed);
      assert(engine.state.phase === 'ended', `seed=${seed}: ${applies}手で決着しなかった`);
    }
  });

  await testAsync('AREA 15: 「1枚ずつを1～3人に」= 同じホロメンに2枚送れない', async () => {
    const d0 = lib.buildGameDeck(deckMap2);
    const d1 = lib.buildGameDeck(deckMap2);
    const registry = await buildRegistry(lib, deckMap2);
    const e = new Engine({ decks: [d0, d1], seed: 81, firstPlayer: 0, names: ['P1', 'P2'], registry });
    e.start();
    while (e.state.pending && e.state.phase === 'setup') {
      const pd = e.state.pending;
      if (pd.type === 'redraw') e.apply('no');
      else if (pd.type === 'placementBack') e.apply('done');
      else e.apply(pd.options[0].id);
    }
    const p0 = e.state.players[0];
    // #IDホロメン2人をステージに用意（エール0枚から開始）
    const iofi2nd = e._createHolomem(lib.get('hBP01-055_R'), 1);
    const reine = e._createHolomem(lib.get('hBP02-018_C'), 1);
    p0.center = iofi2nd;
    p0.back = [reine];
    p0.collab = null;
    // アーカイブにエール3枚
    p0.archive.push(...p0.cheerDeck.splice(0, 3));
    // AREA 15 を直接実行（常に最初の選択肢を選ぶ = 毎回同じ対象を選ぼうとする）
    const def = registry.get('hBP01-055');
    let finished = false;
    e._runEffect(def.collabEffect, { playerIdx: 0, sourceCard: iofi2nd.stack[0], sourceHolomem: iofi2nd }, () => { finished = true; });
    let guard = 0;
    while (!finished && e.state.pending && guard++ < 20) {
      e.apply(e.state.pending.options[0].id);
    }
    assert(finished, 'AREA 15 が完了しなかった');
    // 2人とも最大1枚ずつしか付いていないこと
    assert(iofi2nd.cheers.length <= 1, `同じホロメンに${iofi2nd.cheers.length}枚送られた（イオフィ）`);
    assert(reine.cheers.length <= 1, `同じホロメンに${reine.cheers.length}枚送られた（レイネ）`);
    assertEq(iofi2nd.cheers.length + reine.cheers.length, 2, '2人に1枚ずつ（計2枚）送られるはず');
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
