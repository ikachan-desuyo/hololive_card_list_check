/**
 * アプリ本体: デッキ選択 → エンジン生成 → 盤面描画とドラッグ&ドロップ操作
 *
 * 操作モデル:
 *   - カード操作はドラッグ&ドロップ（エンジンの決定ポイントの選択肢を src/dst にマッピング）
 *   - ステップ進行・引き直し・推しスキルなどカードを動かさない操作は右パネルのボタン
 *   - フィールドの表向きカードはクリックで詳細（インスペクタ）
 * 現状はホットシート（1画面で両プレイヤーを操作）。CPU対戦は次フェーズ。
 */

import { CardLibrary } from '../core/cards.js';
import { Engine } from '../core/engine.js';
import { EffectRegistry } from '../core/effects/registry.js';
import { HeuristicAI } from '../core/ai/heuristic.js';
import { LookaheadAI } from '../core/ai/lookahead.js';
import { scoreOptions, bestOptionId } from '../core/ai/score.js';
import { STEP_NAMES } from '../core/constants.js';
import { renderSide, renderHand, renderOppHand } from './board.js';
import { IMPLEMENTED } from '../cards/index.js';
import {
  loadCacheReplays, loadFileReplays, saveReplayToCache, deleteCacheReplay,
  exportCacheReplaysText, importReplaysText, replayLabel, buildReplayFromEngine,
} from './replays.js';

// test_deck/ にあるデッキ一覧の取得に失敗した時のフォールバック（通常は manifest.json を読む）
const TEST_DECKS_FALLBACK = ['ラミィデッキ', 'あの青空のせいだ', 'ジジ', 'FUWAMOCO'];

let lib = null;
let engine = null;
let currentDeckMaps = null; // 直近に開始した対局の [map1, map2]（デッキ構成）。リプレイ保存で自己完結データにする。
let currentDeckKeys = null; // 直近の [key1, key2]（デッキ名・表示用）
let showAllActions = false;
let resumingStart = false; // リロード後の自動再開中はビルド更新チェックを行わない

// ============ 開発中の更新反映（ゲーム開始時に最新コードを取り込む） ============
//
// v2 は SW キャッシュをバイパスしているため、ページを読み込めば最新の JS を取得できる。
// だがタブを開いたまま編集すると、メモリ上の旧 JS のまま「対戦開始」してしまう。
// そこで開始時に「主要スクリプト＋このデッキで使うカード定義」の更新時刻(Last-Modified)を確認し、
// 前回からの変化を検知したらページをリロードして最新コードで自動再開する（ハードリロード不要）。
const CORE_WATCH_FILES = [
  'ui/app.js', 'ui/board.js',
  'core/engine.js', 'core/cards.js',
  'core/effects/context.js', 'core/effects/registry.js', 'core/effects/text-compiler.js',
  'cards/index.js',
];

async function fileStamp(relPath) {
  try {
    const res = await fetch(relPath, { method: 'HEAD', cache: 'no-store' });
    if (!res.ok) return null;
    return res.headers.get('last-modified') || res.headers.get('etag') || '';
  } catch {
    return null; // 取得不可（オフライン等）は「変化なし」扱いにして開始を妨げない
  }
}

/** 主要ファイル＋使用カード定義ファイルの更新時刻マップを集める */
async function collectBuildStamps(cardNumbers) {
  const paths = [
    ...CORE_WATCH_FILES.map((p) => `battle_simulator_v2/${p}`),
    ...[...new Set(cardNumbers)].filter((n) => IMPLEMENTED[n]).map((n) => `battle_simulator_v2/cards/${n}.js`),
  ];
  const entries = await Promise.all(paths.map(async (p) => [p, await fileStamp(p)]));
  const map = {};
  for (const [p, s] of entries) if (s != null) map[p] = s;
  return map;
}

/** 前回記録と比較し、既知ファイルに変化があれば true。新規ファイルは変化扱いしない（記録は更新する） */
function buildChangedAndStore(stamps) {
  let prev = {};
  try { prev = JSON.parse(localStorage.getItem('bsv2_buildStamps') || '{}'); } catch { /* 破損は無視 */ }
  let changed = false;
  for (const [p, s] of Object.entries(stamps)) {
    if (p in prev && prev[p] !== s) changed = true;
  }
  localStorage.setItem('bsv2_buildStamps', JSON.stringify({ ...prev, ...stamps }));
  return changed;
}

// ============ デッキ選択画面 ============

async function loadDeckSources() {
  const sources = [];
  // test_deck/ の実在デッキを manifest.json（ディレクトリから生成）から取得。失敗時はフォールバック。
  let testDecks = TEST_DECKS_FALLBACK;
  try {
    const res = await fetch('battle_simulator_v2/test_deck/manifest.json', { cache: 'no-store' });
    if (res.ok) {
      const list = await res.json();
      if (Array.isArray(list) && list.length) testDecks = list;
    }
  } catch { /* フォールバックを使う */ }
  for (const name of testDecks) {
    sources.push({ label: `テスト: ${name}`, key: `test:${name}` });
  }
  try {
    const saved = JSON.parse(localStorage.getItem('deckData') || '{}');
    for (const name of Object.keys(saved)) {
      sources.push({ label: `保存デッキ: ${name}`, key: `saved:${name}` });
    }
  } catch { /* localStorage 不正は無視 */ }
  return sources;
}

async function resolveDeckMap(key) {
  const i = key.indexOf(':');
  const kind = i >= 0 ? key.slice(0, i) : null; // 'test' / 'saved' / null(接頭辞なし)
  const name = i >= 0 ? key.slice(i + 1) : key;
  // 接頭辞 test: または接頭辞なし（リプレイの素のデッキ名等）→ まずテストデッキを試す。
  if (kind === 'test' || kind === null) {
    const res = await fetch(`battle_simulator_v2/test_deck/${encodeURIComponent(name)}.json`);
    if (res.ok) return res.json();
    if (kind === 'test') throw new Error(`テストデッキの読み込みに失敗: ${name}`);
    // 接頭辞なしはテストに無ければ保存デッキへフォールバック
  }
  const saved = JSON.parse(localStorage.getItem('deckData') || '{}');
  if (!saved[name]) throw new Error(`デッキが見つかりません: ${name}`);
  return saved[name];
}

async function initSetupScreen() {
  const sources = await loadDeckSources();
  const settings = getSettings();
  const lastKey = { 'deck-p1': settings.lastDeckP1, 'deck-p2': settings.lastDeckP2 };
  for (const id of ['deck-p1', 'deck-p2']) {
    const select = document.getElementById(id);
    select.innerHTML = '';
    // 前回使用したデッキが（今も候補に）あればそれを初期選択。無ければ「選択してください」を促す
    const last = lastKey[id];
    const hasLast = last && sources.some((s) => s.key === last);
    if (!hasLast) {
      const ph = document.createElement('option');
      ph.value = '';
      ph.textContent = '選択してください';
      ph.disabled = true;
      ph.selected = true;
      select.appendChild(ph);
    }
    for (const s of sources) {
      const opt = document.createElement('option');
      opt.value = s.key;
      opt.textContent = s.label;
      if (hasLast && s.key === last) opt.selected = true;
      select.appendChild(opt);
    }
  }
  document.getElementById('start-button').addEventListener('click', startGame);

  // デッキ選択画面のCPU設定（設定パネルと同じ settings.aiPlayers を読み書き＝自動的に同期）
  document.getElementById('setup-ai-buttons').addEventListener('click', (e) => {
    const idx = e.target.dataset?.ai;
    if (idx == null) return;
    const current = getSettings().aiPlayers || [false, false];
    current[Number(idx)] = !current[Number(idx)];
    aiOverride = null; // 手動変更したらURL上書きは解除
    saveSettings({ aiPlayers: current });
    refreshSettingsUI();
  });
  refreshSettingsUI(); // 現在の設定をボタンに反映
}

/**
 * 対局を開始する。
 * @param {object} opts 省略時はデッキ選択画面の入力から開始。リプレイ再生では以下で「ドロップダウン非依存」に開始する:
 *   - map1/map2 … デッキ構成({id:枚数})を直接指定（リプレイの自己完結データ。最優先）
 *   - key1/key2 … デッキ名から解決（登録デッキ）。map が無い時のフォールバック＋表示名
 *   - seed/first … シードと先攻
 *   - isReplay … 再生用フラグ（前回デッキの保存・ビルド更新リロードをスキップ）
 */
async function startGame(opts = {}) {
  const errBox = document.getElementById('setup-error');
  errBox.textContent = '';
  try {
    const key1 = opts.key1 != null ? opts.key1 : document.getElementById('deck-p1').value;
    const key2 = opts.key2 != null ? opts.key2 : document.getElementById('deck-p2').value;
    // デッキ構成: 明示マップ(リプレイの自己完結データ)を最優先。無ければデッキ名から解決。
    //   → これにより「ドロップダウンに無い/登録されていないデッキ」でもリプレイを正しく再生できる。
    let map1; let map2;
    try {
      const src1 = opts.map1 != null ? opts.map1 : (key1 ? await resolveDeckMap(key1) : null);
      const src2 = opts.map2 != null ? opts.map2 : (key2 ? await resolveDeckMap(key2) : null);
      if (!src1 || !src2) { errBox.textContent = 'デッキを選択してください'; return; }
      map1 = CardLibrary.normalizeDeckMap(src1);
      map2 = CardLibrary.normalizeDeckMap(src2);
    } catch (e) {
      errBox.textContent = (opts.isReplay ? 'リプレイのデッキ読み込みに失敗しました: ' : 'デッキの読み込みに失敗しました: ') + e.message;
      return;
    }
    const deck1 = lib.buildGameDeck(map1);
    const deck2 = lib.buildGameDeck(map2);
    const errors = [
      ...deck1.errors.map((e) => `P1: ${e}`),
      ...deck2.errors.map((e) => `P2: ${e}`),
    ];
    if (errors.length > 0) {
      errBox.textContent = errors.join('\n');
      return;
    }
    // 最新コードの反映: 主要スクリプト＋このデッキで使うカード定義が更新されていたら、
    // リロードして最新コードで自動再開する（autostart・リプレイ再生・リロード後の再開中はスキップ）。
    const isAutostart = opts.isReplay || new URLSearchParams(location.search).has('autostart')
      || new URLSearchParams(location.search).has('replay') || new URLSearchParams(location.search).has('applied');
    if (!isAutostart && !resumingStart) {
      const deckNumbers = [...Object.keys(map1), ...Object.keys(map2)]
        .map((id) => lib.get(id)?.number)
        .filter(Boolean);
      const stamps = await collectBuildStamps(deckNumbers);
      if (buildChangedAndStore(stamps)) {
        sessionStorage.setItem('bsv2_pendingStart', JSON.stringify({
          p1: key1, p2: key2, seed: document.getElementById('seed-input').value,
        }));
        location.reload();
        return;
      }
    }
    // 正常に組めたデッキを「前回使用」として記憶（次回の初期選択に使う）。リプレイ再生では記憶しない（設定を汚さない）。
    if (!opts.isReplay && key1 && key2) saveSettings({ lastDeckP1: key1, lastDeckP2: key2 });
    currentDeckMaps = [map1, map2];
    currentDeckKeys = [key1 || null, key2 || null];
    const seedInput = document.getElementById('seed-input').value;
    const seed = opts.seed != null ? opts.seed : (seedInput ? Number(seedInput) : Math.floor(Math.random() * 1e9));
    currentSeed = seed;
    // カード効果定義の事前読み込み（手書き定義 > テキスト自動コンパイル）
    const registry = new EffectRegistry();
    const numbers = [...Object.keys(map1), ...Object.keys(map2)]
      .map((id) => lib.get(id)?.number)
      .filter(Boolean);
    await registry.preload(numbers, lib);
    engine = new Engine({
      decks: [deck1, deck2],
      seed,
      firstPlayer: opts.first != null ? opts.first : (forcedFirstPlayer != null ? forcedFirstPlayer : undefined), // リプレイ/観戦で先攻を固定
      names: ['プレイヤー1', 'プレイヤー2'],
      onChange: render,
      registry,
      confirmOptionalEffects: getSettings().confirmOptionalEffects !== false, // 任意効果の発動確認（既定ON）
      detailLog: true, // 詳細ログを常に記録（自己対戦ハーネス ?full= 等が使用。UIのコピー機能はリプレイ保存に置き換えたため廃止）
      cardLibrary: lib, // AIの相手ブルーム脅威見積り用（公開のカードプール参照）
    });
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('game-screen').classList.add('active');
    engine.start();
    // 詳細ログ用: 各プレイヤーが「人間 / CPU(先読み or 簡易)」のどれかを記録（どのAIで打ったか後で確認できる）
    for (let i = 0; i < 2; i++) {
      const mode = !aiEnabled(i) ? '人間'
        : (lookaheadEnabled(i) ? `CPU(先読みAI・${lookaheadTurns()}手)` : 'CPU(簡易AI)');
      engine.state.detailLogs.push(`[プレイヤー${i + 1}] = ${mode}`);
    }
  } catch (e) {
    errBox.textContent = e.message;
  }
}

// ============ リプレイ（観戦再生） ============

let replayTimer = null; // 再生中のタイマー（中断用）

/**
 * リプレイ(applied列)を本物の盤面で再生する。エンジンは記録と同条件で構築し、AIは動かさず記録手だけを順に適用。
 * URL(?applied=) からも、デッキ選択画面の一覧からも、この関数を呼ぶ。
 * 重要: デッキはドロップダウンの選択ではなく「リプレイのデッキ構成(deckA/deckB)」を最優先で使う＝
 *       現在選択中のデッキや、登録されていないデッキに影響されず、必ず記録どおりのデッキで再生する。
 */
async function startReplay({ a, b, deckA, deckB, seed, first, applied, delay = 1100 }) {
  if (replayTimer) { clearTimeout(replayTimer); replayTimer = null; }
  aiOverride = [false, false]; // 再生中はAIを動かさない（記録列だけ適用）
  aiAgents[0] = aiAgents[1] = null;
  await startGame({
    map1: deckA || undefined, // 自己完結データ（最優先）
    map2: deckB || undefined,
    key1: a, key2: b,          // 無い時のフォールバック＋表示名
    seed,
    first: first != null ? Number(first) : 0,
    isReplay: true,
  });
  if (!engine || engine.state.phase === 'ended' || !engine.state.pending) {
    // デッキ解決に失敗（登録外＆自己完結データ無し等）。startGame が setup-error に理由を表示済み。
    console.warn('リプレイ再生: 対局を開始できませんでした');
    return;
  }
  const seq = Array.isArray(applied) ? applied : String(applied || '').split(',').map((x) => x.trim()).filter(Boolean);
  let idx = 0;
  const drive = () => {
    replayTimer = null;
    if (!engine || engine.state.phase === 'ended' || idx >= seq.length) { console.log('▶ 観戦再生 終了'); return; }
    const pd = engine.state.pending;
    if (!pd) return;
    const id = seq[idx++];
    const valid = pd.options.some((o) => o.id === id) || (pd.multiSelect && id === 'confirm');
    const trivial = pd.type === 'stepPause' || pd.options.length === 1;
    try { engine.apply(valid ? id : pd.options[0].id); }
    catch (e) { console.warn('観戦再生: 適用失敗', id, e.message); }
    if (!valid) console.warn('観戦再生: 記録とズレ', id, '→ 自動', pd.options[0]?.id);
    replayTimer = setTimeout(drive, trivial ? 220 : delay);
  };
  replayTimer = setTimeout(drive, 900);
  console.log('▶ 観戦再生モード開始（記録手数=' + seq.length + '）');
}

/** デッキ選択画面のリプレイ一覧を再描画（キャッシュ＋replay_data/ ファイル）。 */
async function renderReplayList() {
  const box = document.getElementById('replay-list');
  if (!box) return;
  box.textContent = '読み込み中…';
  let cache = [];
  let files = [];
  try { cache = loadCacheReplays(); } catch { /* 無視 */ }
  try { files = await loadFileReplays(); } catch { /* 無視 */ }
  const all = [...cache, ...files];
  if (all.length === 0) { box.innerHTML = '<div class="replay-empty">保存済みリプレイはありません（対戦後にリザルトの「リプレイを保存」、または replay_data/ にJSONを置く）</div>'; return; }
  box.innerHTML = '';
  for (const r of all) {
    const row = document.createElement('div');
    row.className = 'replay-row';
    const tag = r.source === 'file' ? '📁' : '💾';
    const label = document.createElement('span');
    label.className = 'replay-label';
    label.textContent = `${tag} ${replayLabel(r)}`;
    const play = document.createElement('button');
    play.className = 'replay-play';
    play.textContent = '▶ 再生';
    play.addEventListener('click', () => {
      startReplay({ a: r.a, b: r.b, deckA: r.deckA, deckB: r.deckB, seed: r.seed, first: r.first, applied: r.applied });
    });
    row.appendChild(label);
    row.appendChild(play);
    if (r.source === 'cache') {
      const del = document.createElement('button');
      del.className = 'replay-del';
      del.textContent = '🗑';
      del.title = '削除';
      del.addEventListener('click', () => {
        if (deleteCacheReplay(r.id)) renderReplayList();
      });
      row.appendChild(del);
    }
    box.appendChild(row);
  }
}

/** リプレイUIのボタン群を一度だけ配線する。 */
function setupReplayUI() {
  const msg = (t) => { const m = document.getElementById('replay-msg'); if (m) { m.textContent = t; setTimeout(() => { if (m.textContent === t) m.textContent = ''; }, 2500); } };
  document.getElementById('replay-refresh')?.addEventListener('click', renderReplayList);
  document.getElementById('replay-export')?.addEventListener('click', () => {
    const text = exportCacheReplaysText();
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'bsv2-replays.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    msg('エクスポートしました');
  });
  const fileInput = document.getElementById('replay-import-file');
  document.getElementById('replay-import')?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', async () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const n = importReplaysText(text);
      msg(`${n}件インポートしました`);
      renderReplayList();
    } catch (e) { msg('インポート失敗: ' + e.message); }
    fileInput.value = '';
  });
  // リザルトの「リプレイを保存」ボタン
  document.getElementById('save-replay-button')?.addEventListener('click', () => {
    const btn = document.getElementById('save-replay-button');
    if (!engine) return;
    // デッキ名(表示用)＋デッキ構成(自己完結データ)をリプレイに含める＝再生時にドロップダウンに依存しない。
    const a = currentDeckKeys?.[0]; const b = currentDeckKeys?.[1];
    const replay = buildReplayFromEngine(engine, a, b, currentSeed, currentDeckMaps?.[0], currentDeckMaps?.[1]);
    const id = saveReplayToCache(replay);
    btn.textContent = id ? '✅ 保存しました' : '⚠ 保存失敗';
    setTimeout(() => { btn.textContent = '💾 リプレイを保存'; }, 1800);
  });
}

// ============ ドラッグ&ドロップのマッピング ============

/**
 * 決定ポイントの選択肢 → D&D の { src, dsts } 変換。
 * null を返した選択肢はボタン操作（パス・引き直し・推しスキルなど）。
 */
function optionDnD(pending, opt) {
  const a = pending.player;       // acting player
  const o = 1 - a;
  switch (pending.type) {
    case 'placementCenter':
      return { src: `${a}:hand:${opt.handIndex}`, dsts: [`${a}:zone:center`] };
    case 'placementPenalty':
      return { src: `${a}:hand:${opt.handIndex}`, dsts: [`${a}:zone:deck`] };
    case 'placementBack':
      if (opt.id === 'done') return null;
      return { src: `${a}:hand:${opt.handIndex}`, dsts: [`${a}:zone:back`] };
    case 'chooseCenter':
      return { src: `${a}:back:${opt.backIndex}`, dsts: [`${a}:zone:center`] };
    case 'attachCheer':
    case 'attachLifeCheer':
      return { src: `${a}:revealed:0`, dsts: [`${a}:mem:${opt.pos.zone}:${opt.pos.index}`] };
    case 'main':
      switch (opt.kind) {
        case 'place':
          return { src: `${a}:hand:${opt.handIndex}`, dsts: [`${a}:zone:back`] };
        case 'bloom':
          return { src: `${a}:hand:${opt.handIndex}`, dsts: [`${a}:mem:${opt.pos.zone}:${opt.pos.index}`] };
        case 'supportAttach':
          return { src: `${a}:hand:${opt.handIndex}`, dsts: [`${a}:mem:${opt.pos.zone}:${opt.pos.index}`] };
        case 'support':
          return { src: `${a}:hand:${opt.handIndex}`, dsts: [`${a}:zone:table`] };
        case 'collab':
          return { src: `${a}:back:${opt.backIndex}`, dsts: [`${a}:zone:collab`] };
        case 'baton':
          return { src: `${a}:back:${opt.backIndex}`, dsts: [`${a}:zone:center`, `${a}:mem:center:0`] };
        default:
          return null; // oshiSkill / pass はボタン
      }
    case 'performance':
      if (opt.kind !== 'art') return null;
      return {
        src: `${a}:${opt.zone}:0`,
        dsts: [`${o}:mem:${opt.target.zone}:0`, `${o}:zone:${opt.target.zone}`],
      };
    default:
      return null; // redraw などはボタン
  }
}

/** 現在の決定ポイントの D&D マップを構築 */
function buildDndMap() {
  const pending = engine?.state.pending;
  if (!pending) return [];
  return pending.options
    .map((opt) => ({ opt, dnd: optionDnD(pending, opt) }))
    .filter((x) => x.dnd);
}

let dndMap = [];

function wireDnD() {
  dndMap = buildDndMap();
  const srcs = new Set(dndMap.map((x) => x.dnd.src));
  for (const e of document.querySelectorAll('[data-src]')) {
    if (srcs.has(e.dataset.src)) e.classList.add('can-drag');
  }
}

/**
 * 自前ドラッグ&ドロップ（Pointer Events ベース）
 *
 * HTML5 ネイティブ D&D は 3D transform 下でヒットテストが不安定（カーソル点滅・
 * ドロップ不能）だったため使わない。pointerdown→move→up を自前で追跡し、
 * 判定は document.elementsFromPoint で行う（transform の影響を受けない）。
 */
let dragState = null;       // { src, srcEl, candidates, dsts, startX, startY, started, ghost }
let dragEndedAt = 0;        // ドラッグ直後のclick抑止用（フラグだと再描画でclickが
                            // 発生しなかった時に残留して次のクリックを呑むため時刻で判定）

/** カーソル位置の要素列から、有効なドロップ先を探す */
function dropTargetAt(x, y, dsts) {
  for (const node of document.elementsFromPoint(x, y)) {
    let n = node;
    while (n && n !== document.body) {
      const key = n.dataset?.drop;
      if (key && dsts.includes(key)) return { el: n, key };
      n = n.parentElement;
    }
  }
  return null;
}

function startDrag(e) {
  const st = dragState;
  st.started = true;
  document.body.classList.add('dragging');
  // ドロップ可能な場所をハイライト
  for (const el of document.querySelectorAll('[data-drop]')) {
    if (st.dsts.includes(el.dataset.drop)) el.classList.add('drop-ok');
  }
  // カーソルに追従するゴースト（掴んだカードの絵柄）
  // 注意: ホロメンはBloomで複数枚重なっている。querySelector('img') だと
  // DOM順で最初の「一番下のカード」が取れてしまうため、本体(.holomem-main)を優先する
  const ghost = document.createElement('div');
  ghost.className = 'drag-ghost';
  const img =
    st.srcEl.querySelector('.holomem-main img') ||   // ステージのホロメン（スタックの一番上）
    st.srcEl.querySelector(':scope > img') ||        // 手札・公開中カード
    st.srcEl.querySelector('img');
  ghost.style.backgroundImage = img?.src ? `url(${img.src})` : 'var(--sleeve)';
  document.body.appendChild(ghost);
  st.ghost = ghost;
  moveDrag(e);
}

function moveDrag(e) {
  const st = dragState;
  st.ghost.style.left = `${e.clientX - 46}px`;
  st.ghost.style.top = `${e.clientY - 64}px`;
  // ホバー中のドロップ先を強調
  const hit = dropTargetAt(e.clientX, e.clientY, st.dsts);
  for (const el of document.querySelectorAll('.drop-hover')) el.classList.remove('drop-hover');
  if (hit) hit.el.classList.add('drop-hover');
}

function cleanupDrag(st) {
  document.body.classList.remove('dragging');
  for (const el of document.querySelectorAll('.drop-ok')) el.classList.remove('drop-ok');
  for (const el of document.querySelectorAll('.drop-hover')) el.classList.remove('drop-hover');
  st?.ghost?.remove();
}

function endDrag(st, e) {
  const hit = dropTargetAt(e.clientX, e.clientY, st.dsts);
  cleanupDrag(st);
  if (!hit) return;
  const matched = st.candidates.filter((x) => x.dnd.dsts.includes(hit.key));
  if (matched.length === 1) {
    engine.apply(matched[0].opt.id);
  } else if (matched.length > 1) {
    // 同じ移動で複数の選択肢（例: 複数アーツ）→ 小さな選択ポップアップ
    showChooser(e.clientX, e.clientY, matched.map((x) => x.opt));
  }
}

function setupDnDListeners() {
  const screen = document.getElementById('game-screen');

  screen.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const srcEl = e.target.closest?.('[data-src]');
    if (!srcEl || !srcEl.classList.contains('can-drag')) return;
    const src = srcEl.dataset.src;
    const candidates = dndMap.filter((x) => x.dnd.src === src);
    if (candidates.length === 0) return;
    dragState = {
      src, srcEl, candidates,
      dsts: [...new Set(candidates.flatMap((x) => x.dnd.dsts))],
      startX: e.clientX, startY: e.clientY,
      started: false, ghost: null,
    };
  });

  document.addEventListener('pointermove', (e) => {
    if (!dragState) return;
    if (!dragState.started) {
      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;
      if (dx * dx + dy * dy < 36) return; // 6px動くまではクリック扱い
      startDrag(e);
    } else {
      moveDrag(e);
    }
    e.preventDefault();
  });

  document.addEventListener('pointerup', (e) => {
    if (!dragState) return;
    const st = dragState;
    dragState = null;
    if (st.started) {
      dragEndedAt = Date.now();
      endDrag(st, e);
    }
  });

  // ドラッグ直後の click はインスペクタ等を開かない（capture で握りつぶす）
  // 効果のホロメン選択（choice-target）はインスペクタより優先してここで処理する
  screen.addEventListener('click', (e) => {
    if (Date.now() - dragEndedAt < 150) {
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    const target = e.target.closest?.('[data-choice-id]');
    if (target) {
      e.stopPropagation();
      e.preventDefault();
      engine.apply(target.dataset.choiceId);
    }
  }, true);
}

// ============ モーダル/ポップアップ ============

function escapeText(s) {
  const d = document.createElement('div');
  d.textContent = s ?? '';
  return d.innerHTML;
}

// アーツ必要コスト（エール）と特攻のアイコン画像（カード一覧と同じ images/ を使用）。
// コストは日本語色（'赤'…'白'/'無色'）、特攻は {color:'紫', value:50} で来る。
const COST_ICON_IMG = {
  赤: 'images/TCG-ColorArtIcon-Red.png',
  青: 'images/TCG-ColorArtIcon-Blue.png',
  黄: 'images/TCG-ColorArtIcon-Yellow.png',
  緑: 'images/TCG-ColorArtIcon-Green.png',
  紫: 'images/TCG-ColorArtIcon-Purple.png',
  白: 'images/TCG-ColorArtIcon-White.png',
  無色: 'images/TCG-ColorArtIcon-Colorless.png',
};
const TOKKOU_ICON_IMG = {
  赤: 'images/tokkou_50_red.png',
  青: 'images/tokkou_50_blue.png',
  黄: 'images/tokkou_50_yellow.png',
  緑: 'images/tokkou_50_green.png',
  紫: 'images/tokkou_50_purple.png',
  白: 'images/tokkou_50_white.png',
};

/** 必要エール1個ぶんの表示（対応画像があれば画像、無ければ文字チップ） */
function costIconHtml(color) {
  const src = COST_ICON_IMG[color];
  return src
    ? `<img src="${src}" alt="${escapeText(color)}" class="cost-icon" style="height:18px;width:18px;object-fit:contain;vertical-align:middle;">`
    : `<span class="cost-chip">${escapeText(color)}</span>`;
}

/** 特攻1件ぶんの表示（+50 は対応画像、それ以外は文字） */
function tokkouIconHtml(t) {
  const src = t.value === 50 ? TOKKOU_ICON_IMG[t.color] : null;
  return src
    ? `<img src="${src}" alt="特攻:${escapeText(t.color)}+${t.value}" class="tokkou-icon" style="height:26px;object-fit:contain;vertical-align:middle;">`
    : `${escapeText(t.color)}+${t.value}`;
}

/** カード1枚の詳細HTML */
function cardDetailHtml(card) {
  const rows = [];
  rows.push(`<div class="detail-type">${escapeText(card.rawType)}${card.color ? ` / ${escapeText(card.color)}` : ''}${card.limited ? ' / LIMITED' : ''}</div>`);
  if (card.bloomLevel) rows.push(`<div>Bloomレベル: ${escapeText(card.bloomLevel)}</div>`);
  if (card.hp != null) rows.push(`<div>HP: ${card.hp}</div>`);
  if (card.life != null) rows.push(`<div>ライフ: ${card.life}</div>`);
  if (card.batonTouch?.length) rows.push(`<div>バトンタッチ: ${escapeText(card.batonTouch.join(''))}</div>`);
  if (card.tags?.length) rows.push(`<div class="detail-tags">${card.tags.map((t) => `<span>${escapeText(t)}</span>`).join('')}</div>`);
  for (const kw of card.keywords || []) {
    rows.push(`<div class="detail-skill"><b>《${escapeText(kw.subtype)}》${escapeText(kw.name)}</b><br>${escapeText(kw.text)}</div>`);
  }
  for (const art of card.arts || []) {
    const cost = art.cost.length ? art.cost.map(costIconHtml).join(' ') : 'なし';
    rows.push(
      `<div class="detail-skill art">` +
      `<div class="art-head"><b>アーツ: ${escapeText(art.name)}</b>` +
      `<span class="art-dmg">${art.dmg}${art.dmgPlus ? '+' : ''}</span></div>` +
      `<div class="art-cost">コスト: ${cost}` +
      `${art.tokkou?.length ? `　特攻: ${art.tokkou.map(tokkouIconHtml).join(' ')}` : ''}</div>` +
      `${art.text ? `<div>${escapeText(art.text)}</div>` : ''}` +
      `</div>`
    );
  }
  // 推しステージスキル（常時能力）は推しスキルより上に表示する
  if (card.oshiStageText) {
    rows.push(`<div class="detail-skill"><b>推しステージスキル</b><br>${escapeText(card.oshiStageText)}</div>`);
  }
  for (const skill of card.oshiSkills || []) {
    rows.push(`<div class="detail-skill"><b>${skill.sp ? 'SP' : ''}推しスキル</b><br>${escapeText(skill.text)}</div>`);
  }
  if (card.supportText) {
    rows.push(`<div class="detail-skill"><b>サポート効果</b><br>${escapeText(card.supportText)}</div>`);
  }
  return rows.join('');
}

/** インスペクタ: スタック・付帯カードを画像+詳細で表示 */
function showInspector({ title, sections, note }) {
  const modal = document.getElementById('inspector-modal');
  document.getElementById('inspector-title').textContent = title;
  const body = document.getElementById('inspector-body');
  body.innerHTML = '';
  if (note) {
    const n = document.createElement('div');
    n.className = 'inspector-note';
    n.textContent = note;
    body.appendChild(n);
  }
  for (const section of sections) {
    const h = document.createElement('div');
    h.className = 'inspector-section-label';
    h.textContent = section.label;
    body.appendChild(h);
    for (const card of section.cards) {
      const row = document.createElement('div');
      row.className = 'inspector-card';
      row.innerHTML = `
        <img src="${card.imageUrl || ''}" alt="${escapeText(card.name)}" loading="lazy">
        <div class="inspector-card-info">
          <div class="inspector-card-name">${escapeText(card.name)}</div>
          ${cardDetailHtml(card)}
        </div>`;
      body.appendChild(row);
    }
  }
  modal.classList.add('active');
}

/** アーカイブ一覧モーダル */
function showArchive(sideIdx) {
  const p = engine.state.players[sideIdx];
  const modal = document.getElementById('inspector-modal');
  document.getElementById('inspector-title').textContent = `${p.name} のアーカイブ（${p.archive.length}枚）`;
  const body = document.getElementById('inspector-body');
  body.innerHTML = '';
  if (p.archive.length === 0) {
    body.innerHTML = '<div class="inspector-note">アーカイブは空です</div>';
  } else {
    const grid = document.createElement('div');
    grid.className = 'archive-grid';
    // 新しい順に表示
    [...p.archive].reverse().forEach((card) => {
      const c = document.createElement('div');
      c.className = 'archive-grid-card';
      c.innerHTML = `<img src="${card.imageUrl || ''}" alt="${escapeText(card.name)}" loading="lazy"><div>${escapeText(card.name)}</div>`;
      c.addEventListener('click', () => {
        showInspector({ title: card.name, sections: [{ label: 'アーカイブ', cards: [card] }] });
      });
      grid.appendChild(c);
    });
    body.appendChild(grid);
  }
  modal.classList.add('active');
}

/**
 * 小ポップアップ（例: アーツ選択・推しスキル選択）。
 * opt.run があればそれを実行、無ければ engine.apply(opt.id)
 */
function showChooser(x, y, options, infoHtml = '') {
  const chooser = document.getElementById('chooser');
  chooser.innerHTML = '';
  if (infoHtml) {
    const info = document.createElement('div');
    info.className = 'chooser-info';
    info.innerHTML = infoHtml;
    chooser.appendChild(info);
  }
  for (const opt of options) {
    const btn = document.createElement('button');
    btn.textContent = opt.label;
    btn.addEventListener('click', () => {
      chooser.style.display = 'none';
      if (opt.run) opt.run();
      else engine.apply(opt.id);
    });
    chooser.appendChild(btn);
  }
  chooser.style.display = 'flex';
  chooser.style.left = `${Math.min(x, window.innerWidth - 340)}px`;
  chooser.style.top = `${Math.min(y, window.innerHeight - 40 * options.length - 20)}px`;
}

/** メインステップ中に発動可能な推しスキルのアクション一覧 */
function oshiSkillActions(sideIdx) {
  const s = engine?.state;
  if (!s?.pending || s.pending.type !== 'main' || s.pending.player !== sideIdx) return [];
  if (aiEnabled(sideIdx)) return [];
  return s.pending.options.filter((o) => o.kind === 'oshiSkill');
}

function setupModals() {
  // 選択モーダルの「盤面を確認」: モーダルを一時的に隠して場のカードを見られるようにする
  document.getElementById('choice-peek').addEventListener('click', () => {
    document.getElementById('choice-modal').classList.add('peek');
    document.getElementById('choice-restore').classList.add('show');
  });
  document.getElementById('choice-restore').addEventListener('click', () => {
    document.getElementById('choice-modal').classList.remove('peek');
    document.getElementById('choice-restore').classList.remove('show');
  });

  document.getElementById('inspector-close').addEventListener('click', () => {
    document.getElementById('inspector-modal').classList.remove('active');
  });
  document.getElementById('inspector-modal').addEventListener('click', (e) => {
    if (e.target.id === 'inspector-modal') e.currentTarget.classList.remove('active');
  });
  document.addEventListener('click', (e) => {
    const chooser = document.getElementById('chooser');
    if (chooser.style.display !== 'none' && !chooser.contains(e.target)) {
      chooser.style.display = 'none';
    }
  });
}

// ============ 描画 ============

const hooks = {
  onInspect: (data) => showInspector(data),
  onArchive: (sideIdx) => showArchive(sideIdx),
  // HP表示は装着カード等の修正込みの実効値を使う（基礎HPだと「0なのに生きてる」表示になる）
  effectiveHp: (holomem) => engine.effectiveHp(holomem),
  // 継続効果・装着・アウラ等によるアーツ補正（±N）。盤面でアーツが盛られているか可視化する
  artsBonus: (holomem, sideIdx) => engine.effects.artsBonus(holomem, sideIdx),
  // バトンタッチ必要エールの増減（実効コスト枚数 − 素のバトンコスト枚数）。継続効果で増えていれば可視化
  batonDelta: (holomem, sideIdx) => {
    const base = holomem.stack[0].batonTouch || [];
    const eff = engine._effectiveBatonCost(holomem, base, sideIdx) || [];
    return eff.length - base.length;
  },
  // 推しホロメンカード: スキル発動可能なら光らせ、クリックでその場から発動できる
  oshiCanAct: (sideIdx) => oshiSkillActions(sideIdx).length > 0,
  onOshi: (sideIdx, card, ev) => {
    const acts = oshiSkillActions(sideIdx);
    const detail = {
      title: `推しホロメン: ${card.name}`,
      sections: [{ label: '推しホロメン', cards: [card] }],
    };
    if (acts.length === 0) {
      showInspector(detail);
      return;
    }
    // 推しステージスキル（常在能力）はアクション選択ポップアップにも常時表示する
    const info = card.oshiStageText
      ? `<b>推しステージスキル</b><br>${escapeText(card.oshiStageText)}`
      : '';
    showChooser(ev.clientX, ev.clientY, [
      ...acts,
      { label: '📄 カード詳細を見る', run: () => showInspector(detail) },
    ], info);
  },
};

/**
 * ステップ境界の「間」(stepPause) を一定時間後に自動で進める。
 * タイマー発火時に pending が別物になっていたら何もしない（手動クリックとの競合防止）。
 * 速度は設定パネルで変更可能（手動 = 自動進行なし、▶次へ ボタンで送る）
 */
let pauseTimer = null;
const PAUSE_SPEEDS = { fast: 350, normal: 700, slow: 1300, manual: 0 };

function getSettings() {
  try {
    return { stepSpeed: 'normal', ...JSON.parse(localStorage.getItem('bsv2_settings') || '{}') };
  } catch {
    return { stepSpeed: 'normal' };
  }
}

function saveSettings(patch) {
  localStorage.setItem('bsv2_settings', JSON.stringify({ ...getSettings(), ...patch }));
}

function handleStepPause(s) {
  if (s.pending?.type !== 'stepPause') return;
  if (pauseTimer) return; // この pending 用に予約済み
  const ms = PAUSE_SPEEDS[getSettings().stepSpeed] ?? 700;
  if (ms === 0) return; // 手動モード
  const pendingRef = s.pending;
  pauseTimer = setTimeout(() => {
    pauseTimer = null;
    if (engine.state.pending === pendingRef) engine.apply('ok');
  }, ms);
}

let lastTurnKey = null;

// ============ ステップ表示 ============

/**
 * ステップ切り替えトースト。
 * エンジンは1回の操作で複数ステップを連続消化する（リセット→手札→エール等）ため、
 * render時のstate差分では中間ステップを取りこぼす。ログの新規行からステップ行を
 * 拾ってキューに積み、順番に短いトーストで流す。
 */
let lastLogLen = 0;
const stepToastQueue = [];
let stepToastActive = false;

function enqueueStepToasts(s) {
  const newLines = s.logs.slice(lastLogLen);
  lastLogLen = s.logs.length;
  for (const line of newLines) {
    const m = /^【(.+?)】(.*)/.exec(line);
    const dice = /^🎲 サイコロ: (\d)/.exec(line);
    if (dice) {
      showDice(Number(dice[1])); // サイコロは専用の大型表示
    } else if (m) {
      stepToastQueue.push(m[2].includes('スキップ') ? `${m[1]}（スキップ）` : m[1]);
    } else if (
      /^.*?: 1枚ドロー/.test(line) ||
      /特攻発動/.test(line) ||
      /エール(デッキから|公開)/.test(line) // エールデッキから送られたエールの種類を見せる
    ) {
      stepToastQueue.push(line.replace(/^.*?: /, ''));
    }
  }
  pumpStepToast();
}

function pumpStepToast() {
  if (stepToastActive || stepToastQueue.length === 0) return;
  stepToastActive = true;
  const t = document.getElementById('step-toast');
  t.textContent = stepToastQueue.shift();
  t.classList.remove('show');
  void t.offsetWidth;
  t.classList.add('show');
  setTimeout(() => {
    stepToastActive = false;
    pumpStepToast();
  }, 1000);
}

/** サイコロの結果を中央に大きく表示（実物風のピップ描画） */
const DICE_PIPS = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

let diceShownAt = 0; // サイコロ表示中はモーダルを遅延させるための時刻

function showDice(value) {
  diceShownAt = Date.now();
  const overlay = document.getElementById('dice-overlay');
  const die = document.getElementById('dice-face');
  die.innerHTML = '';
  for (let cell = 0; cell < 9; cell++) {
    const pip = document.createElement('div');
    pip.className = DICE_PIPS[value]?.includes(cell) ? 'pip' : 'pip empty';
    die.appendChild(pip);
  }
  document.getElementById('dice-label').textContent = `サイコロ: ${value}`;
  overlay.classList.remove('show');
  void overlay.offsetWidth; // アニメーション再生のためリフロー
  overlay.classList.add('show');
}

/** 効果で公開されたカード（エール等）を中央に大きく表示 */
let lastRevealSeq = 0;

function handleCardReveal(s) {
  const reveal = s.lastReveal;
  if (!reveal || reveal.seq === lastRevealSeq) return;
  lastRevealSeq = reveal.seq;
  diceShownAt = Date.now(); // サイコロと同様、表示中は選択モーダルを遅延させる
  const overlay = document.getElementById('reveal-overlay');
  const img = document.getElementById('reveal-image');
  img.src = reveal.card.imageUrl || '';
  img.alt = reveal.card.name;
  document.getElementById('reveal-label').textContent = `公開: ${reveal.card.name}`;
  overlay.classList.remove('show');
  void overlay.offsetWidth;
  overlay.classList.add('show');
}

/** アタック演出: 攻撃元→対象を矢印・ハイライト・ダメージ表示で可視化（engine.state.lastAttack を監視） */
let lastAttackSeq = 0;
const SVG_NS = 'http://www.w3.org/2000/svg';

function ensureAttackLayer() {
  let svg = document.getElementById('attack-fx');
  if (!svg) {
    svg = document.createElementNS(SVG_NS, 'svg');
    svg.id = 'attack-fx';
    svg.innerHTML = '<defs><marker id="fx-arrowhead" markerWidth="10" markerHeight="10" refX="7" refY="5" orient="auto">'
      + '<path d="M0,0 L10,5 L0,10 Z" fill="#ffd54a"/></marker></defs>';
    document.body.appendChild(svg);
  }
  return svg;
}

function fxCellElement(side, zone, index) {
  // まず該当ホロメンのセル。倒れて消えていればゾーン枠にフォールバック
  const cell = document.querySelector(`[data-src="${side}:${zone}:${index}"]`);
  if (cell) return cell;
  const sideEl = document.getElementById(side === 0 ? 'side-player' : 'side-opponent');
  return sideEl ? sideEl.querySelector('.' + (zone === 'back' ? 'backs' : zone)) : null;
}

function handleAttack(s) {
  const atk = s.lastAttack;
  if (!atk || atk.seq === lastAttackSeq) return;
  lastAttackSeq = atk.seq;
  const fromEl = fxCellElement(atk.attackerSide, atk.attackerZone, 0);
  const toEl = fxCellElement(atk.targetSide, atk.targetZone, atk.targetIndex || 0);
  if (!fromEl || !toEl) return;
  const fr = fromEl.getBoundingClientRect();
  const tr = toEl.getBoundingClientRect();
  const x1 = fr.left + fr.width / 2; const y1 = fr.top + fr.height / 2;
  const x2 = tr.left + tr.width / 2; const y2 = tr.top + tr.height / 2;

  const svg = ensureAttackLayer();
  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('class', 'fx-line');
  line.setAttribute('x1', x1); line.setAttribute('y1', y1);
  line.setAttribute('x2', x2); line.setAttribute('y2', y2);
  line.setAttribute('marker-end', 'url(#fx-arrowhead)');
  svg.appendChild(line);

  const label = document.createElement('div');
  label.className = 'fx-label';
  label.textContent = `⚔ ${atk.artName || 'アーツ'}`;
  label.style.left = `${(x1 + x2) / 2}px`;
  label.style.top = `${(y1 + y2) / 2}px`;
  document.body.appendChild(label);

  let dmgEl = null;
  if (atk.dmg > 0) {
    dmgEl = document.createElement('div');
    dmgEl.className = 'fx-dmg';
    dmgEl.textContent = `−${atk.dmg}`;
    dmgEl.style.left = `${x2}px`;
    dmgEl.style.top = `${y2}px`;
    document.body.appendChild(dmgEl);
  }

  fromEl.classList.add('fx-attacking');
  toEl.classList.add('fx-hit');
  setTimeout(() => {
    line.remove(); label.remove(); if (dmgEl) dmgEl.remove();
    fromEl.classList.remove('fx-attacking'); toEl.classList.remove('fx-hit');
  }, 1000);
}

/** 常時表示のステップ進行バー */
const STEP_ORDER = ['reset', 'draw', 'cheer', 'main', 'performance', 'end'];
const STEP_SHORT = { reset: 'リセット', draw: '手札', cheer: 'エール', main: 'メイン', performance: 'パフォーマンス', end: 'エンド' };

function renderStepBar(s) {
  const bar = document.getElementById('step-bar');
  bar.innerHTML = '';
  if (s.phase === 'setup') {
    const chip = document.createElement('span');
    chip.className = 'step-chip active';
    chip.textContent = 'セットアップ';
    bar.appendChild(chip);
    return;
  }
  for (const step of STEP_ORDER) {
    const chip = document.createElement('span');
    chip.className = 'step-chip' + (s.step === step ? ' active' : '');
    chip.textContent = STEP_SHORT[step];
    bar.appendChild(chip);
  }
}

/** ターンが切り替わったら中央に大きく通知 + ターン側の盤面を発光 */
function notifyTurnChange(s) {
  const sides = [document.getElementById('side-player'), document.getElementById('side-opponent')];
  sides[s.turnPlayer]?.classList.add('turn-active');
  sides[1 - s.turnPlayer]?.classList.remove('turn-active');

  if (s.phase !== 'playing') return;
  const key = `${s.turn}:${s.turnPlayer}`;
  if (key === lastTurnKey) return;
  const isFirstRender = lastTurnKey === null;
  lastTurnKey = key;
  if (isFirstRender && s.turn > 1) return; // リロード直後などは出さない
  const toast = document.getElementById('turn-toast');
  toast.textContent = `ターン${s.turn} ─ ${s.players[s.turnPlayer].name} のターン`;
  toast.classList.remove('show');
  void toast.offsetWidth; // アニメーション再生のためリフロー
  toast.classList.add('show');
}

function render() {
  if (!engine) return;
  const s = engine.state;

  renderSide(document.getElementById('side-player'), s.players[0], 0, hooks);
  renderSide(document.getElementById('side-opponent'), s.players[1], 1, hooks);
  notifyTurnChange(s);
  renderStepBar(s);
  enqueueStepToasts(s);
  handleCardReveal(s);
  handleAttack(s);

  // 手札表示: 人間が1人だけなら常にその人の手札を固定表示（AIの手札は見せない）
  const humans = [0, 1].filter((i) => !aiEnabled(i));
  const handPlayer = humans.length === 1
    ? humans[0]
    : (s.pending && s.pending.player != null ? s.pending.player : s.turnPlayer);
  renderHand(document.getElementById('hand'), s.players[handPlayer].hand, handPlayer, hooks);
  renderOppHand(document.getElementById('opp-hand'), s.players[1 - handPlayer].hand.length);

  // ホットシート: 下の手札が誰のものかを明示する（切り替わりに気づけるように）
  const ownerTag = document.getElementById('hand-owner');
  ownerTag.textContent = `🖐 ${s.players[handPlayer].name} の手札（${s.players[handPlayer].hand.length}枚）`;
  ownerTag.className = handPlayer === 0 ? 'p1' : 'p2';

  wireDnD();
  renderStatus(s, handPlayer);
  renderMobileControls(s);
  renderPregameModal(s);
  renderActions(s);
  renderEvalOverlay(s);
  renderEffectChoiceModal(s);
  renderLog(s);
  renderResult(s);
  handleStepPause(s);
  handleAI(s);
}

/**
 * 効果の選択UI。種類ごとに最も直感的な方法で提示する:
 *  - chooseCard    → カード画像のグリッドモーダル（クリックで選択）
 *  - chooseHolomem → 盤面の対象ホロメンを金色に光らせ、直接クリックで選択
 *  - confirm など  → 中央のダイアログ（ボタン）
 */
const DICE_MODAL_DELAY_MS = 1500;
let diceDelayTimer = null;
let lastChoicePending = null; // 新しい選択になったらピーク状態を解除するための参照
let selectedChoiceId = null;  // カード選択モーダルの「選択中」状態（確定前）

function renderEffectChoiceModal(s) {
  const modal = document.getElementById('choice-modal');
  const bar = document.getElementById('choice-bar');
  let isEffect = s.pending?.type === 'effectChoice';
  // AIの選択は表示しない（デッキサーチ候補などの非公開情報が見えてしまうため）
  if (isEffect && aiEnabled(s.pending.player)) isEffect = false;

  // --- エール送り（ライフめくり / エールステップ）も盤面クリックで送り先を選ぶ ---
  // 公開されたエールがどのホロメンに行くかを分かりやすくするため、送り先を金色に光らせる
  const isCheerSend = s.pending?.type === 'attachCheer' || s.pending?.type === 'attachLifeCheer';
  if (isCheerSend && !aiEnabled(s.pending.player)) {
    document.getElementById('choice-modal').classList.remove('active');
    for (const opt of s.pending.options) {
      if (!opt.pos) continue;
      const el = document.querySelector(`[data-drop="${s.pending.player}:mem:${opt.pos.zone}:${opt.pos.index}"]`);
      if (el) {
        el.classList.add('choice-target');
        el.dataset.choiceId = opt.id;
      }
    }
    bar.innerHTML = '';
    const label = document.createElement('span');
    const cheerName = s.pending.cheer?.name || 'エール';
    const src = s.pending.type === 'attachLifeCheer' ? 'ライフの ' : '';
    label.textContent = `🩷 ${src}${cheerName} を送るホロメンを選択（光っているカードをクリック）`;
    bar.appendChild(label);
    bar.classList.add('active');
    return;
  }

  // サイコロ表示中は次の選択モーダルを出さない（サイコロが隠れて見えなくなるため）
  const sinceDice = Date.now() - diceShownAt;
  if (isEffect && sinceDice < DICE_MODAL_DELAY_MS) {
    modal.classList.remove('active');
    bar.classList.remove('active');
    clearTimeout(diceDelayTimer);
    diceDelayTimer = setTimeout(() => {
      diceDelayTimer = null;
      if (engine) render();
    }, DICE_MODAL_DELAY_MS - sinceDice + 30);
    return;
  }

  const kind = isEffect ? s.pending.request?.kind : null;

  // --- 盤面クリック選択（chooseHolomem） ---
  if (kind === 'chooseHolomem') {
    modal.classList.remove('active');
    const skipOptions = [];
    for (const opt of s.pending.options) {
      if (!opt.pos) {
        skipOptions.push(opt);
        continue;
      }
      const sideIdx = opt.side === 'opp' ? 1 - s.pending.player : s.pending.player;
      const el = document.querySelector(`[data-drop="${sideIdx}:mem:${opt.pos.zone}:${opt.pos.index}"]`);
      if (el) {
        el.classList.add('choice-target');
        el.dataset.choiceId = opt.id;
      }
    }
    bar.innerHTML = '';
    const label = document.createElement('span');
    label.textContent = `👆 ${s.pending.request.title || 'ホロメンを選択'}（光っているカードをクリック）`;
    bar.appendChild(label);
    for (const opt of skipOptions) {
      const btn = document.createElement('button');
      btn.textContent = opt.label;
      btn.addEventListener('click', () => engine.apply(opt.id));
      bar.appendChild(btn);
    }
    bar.classList.add('active');
    return;
  }
  bar.classList.remove('active');

  // --- モーダル（chooseCard / confirm 等） ---
  if (!isEffect) {
    modal.classList.remove('active');
    return;
  }
  modal.classList.add('active');
  // 新しい選択が来たらピーク（盤面確認）と選択状態を解除する
  if (lastChoicePending !== s.pending) {
    lastChoicePending = s.pending;
    selectedChoiceId = null;
    modal.classList.remove('peek');
    document.getElementById('choice-restore').classList.remove('show');
  }
  // 複数選択（chooseCards）: トグルで複数選んで確定。選択状態はエンジン側 pending.multiSelect が保持。
  const ms = s.pending.multiSelect || null;
  const countHint = ms ? `（${ms.selected.length}/${ms.min === ms.max ? ms.max : `${ms.min}〜${ms.max}`}枚選択）` : '';
  document.getElementById('choice-title').textContent =
    `${s.players[s.pending.player].name}: ${s.pending.request.title || '選択してください'}${countHint}`;
  const grid = document.getElementById('choice-grid');
  grid.innerHTML = '';
  const footer = document.getElementById('choice-footer');
  footer.innerHTML = '';

  // 確定ボタン。単一選択: カードを選んでから確定。複数選択: 枚数条件を満たしたら確定可。
  const confirmBtn = document.createElement('button');
  confirmBtn.id = 'choice-confirm';
  if (ms) {
    const okCount = ms.selected.length >= ms.min && ms.selected.length <= ms.max;
    confirmBtn.textContent = `✔ 確定 (${ms.selected.length})`;
    confirmBtn.disabled = !okCount;
    confirmBtn.addEventListener('click', () => engine.apply('confirm'));
  } else {
    confirmBtn.textContent = '✔ 確定';
    confirmBtn.disabled = selectedChoiceId == null;
    confirmBtn.addEventListener('click', () => {
      if (selectedChoiceId != null) engine.apply(selectedChoiceId);
    });
  }

  const hasCards = s.pending.options.some((o) => o.card);
  const displayCards = s.pending.request.displayCards || [];
  const isDeckSearch = !!s.pending.request.deckSearch;

  // --- 上段: 選択可能なカード枠（カード以外の選択肢はフッターのボタンへ） ---
  for (const opt of s.pending.options) {
    if (opt.confirm) continue; // 複数選択の確定は専用ボタンで出す
    if (opt.card) {
      const selected = ms ? ms.selected.includes(opt.id) : (selectedChoiceId === opt.id);
      const c = document.createElement('div');
      c.className = 'archive-grid-card selectable' + (selected ? ' selected' : '');
      c.innerHTML = `<img src="${opt.card.imageUrl || ''}" alt="${escapeText(opt.card.name)}" loading="lazy"><div>${escapeText(opt.card.name)}</div>`;
      c.addEventListener('click', () => {
        if (ms) {
          engine.apply(opt.id); // トグル（エンジンが選択状態を保持→再描画）
        } else {
          selectedChoiceId = opt.id;
          for (const el of grid.querySelectorAll('.selected')) el.classList.remove('selected');
          c.classList.add('selected');
          confirmBtn.disabled = false;
        }
      });
      grid.appendChild(c);
    } else {
      const btn = document.createElement('button');
      btn.textContent = opt.label;
      btn.addEventListener('click', () => engine.apply(opt.id));
      footer.appendChild(btn);
    }
  }
  if (ms || hasCards) footer.appendChild(confirmBtn);
  // デッキサーチで選べる対象が無い場合の注記（デッキ確認のみ）
  if (isDeckSearch && !hasCards) {
    const note = document.createElement('div');
    note.style.cssText = 'grid-column:1/-1;color:#889;padding:6px 0;';
    note.textContent = '選択できる対象はありません（デッキを確認できます）';
    grid.appendChild(note);
  }

  // --- 下段: 確認用（選択不可）カード枠。デッキサーチはデッキ全体、その他は「対象外」公開カード ---
  if (displayCards.length) {
    const divider = document.createElement('div');
    divider.className = 'choice-divider';
    divider.style.cssText = 'grid-column:1/-1;margin:10px 0 4px;padding-top:8px;border-top:1px dashed #556;color:#aab;font-size:0.85em;text-align:center;';
    divider.textContent = isDeckSearch
      ? '― デッキ内（確認用・選択不可 / 確認後シャッフルされます）―'
      : '― 対象外（確認用）―';
    grid.appendChild(divider);
    for (const card of displayCards) {
      const c = document.createElement('div');
      c.className = 'archive-grid-card display-only';
      c.innerHTML = `<img src="${card.imageUrl || ''}" alt="${escapeText(card.name)}" loading="lazy"><div>${escapeText(card.name)}</div>`;
      grid.appendChild(c);
    }
  }
}

function renderStatus(s, handPlayer) {
  const status = document.getElementById('status');
  const stepName = s.step ? STEP_NAMES[s.step] : 'セットアップ';
  const pendingName = s.pending && s.pending.player != null ? s.players[s.pending.player].name : '';
  status.innerHTML = `
    <div class="turn-banner">ターン${s.turn || '-'} ・ ${stepName}</div>
    <div>ターンプレイヤー: ${s.players[s.turnPlayer]?.name || '-'}</div>
    <div>${pendingName ? `🎯 ${escapeText(pendingName)} の操作` : ''}</div>
    <div style="color:#889">手札表示: ${escapeText(s.players[handPlayer].name)}</div>
  `;
}

/**
 * スマホ用「最も使う進行操作」を1つ抽出する。
 *  - stepPause（ステップ境界の「間」）→ 'ok' で次へ
 *  - メイン/パフォーマンス等の pass（ステップ/ターン終了）
 *  - 配置完了などの done
 * AIが操作中の選択には介入しない（stepPause は誰のものでもないので対象外）。
 */
function primaryAdvanceOption(s) {
  if (!s.pending) return null;
  // ラベルは「次のステップへ進む」に統一（パス/完了等の名称は分かりづらいため）
  const LABEL = '▶ 次ステップ';
  if (s.pending.type === 'stepPause') return { id: 'ok', label: LABEL };
  if (s.pending.player != null && aiEnabled(s.pending.player)) return null;
  const opts = s.pending.options || [];
  const pass = opts.find((o) => o.kind === 'pass');
  if (pass) return { id: pass.id, label: LABEL };
  const done = opts.find((o) => o.id === 'done');
  if (done) return { id: done.id, label: LABEL };
  return null;
}

/** スマホ用コントロール（盤外の概要ステータス・▶次へ・📋アクション有無）を更新 */
function renderMobileControls(s) {
  const ms = document.getElementById('mobile-status');
  if (ms) {
    const stepName = s.step ? STEP_NAMES[s.step] : 'セットアップ';
    const pendingName = s.pending && s.pending.player != null ? s.players[s.pending.player].name : '';
    ms.innerHTML =
      `<span class="ms-turn">T${s.turn || '-'}・${escapeText(stepName)}</span> `
      + `<span>${escapeText(s.players[s.turnPlayer]?.name || '-')}</span>`
      + (pendingName ? ` <span class="ms-pending">🎯${escapeText(pendingName)}</span>` : '');
  }

  const advBtn = document.getElementById('mobile-advance');
  if (advBtn) {
    const adv = primaryAdvanceOption(s);
    advBtn.hidden = !adv;
    if (adv) { advBtn.textContent = adv.label; advBtn.dataset.applyId = adv.id; }
    else { advBtn.dataset.applyId = ''; }
  }

  const toggle = document.getElementById('panel-toggle-button');
  if (toggle) {
    const hasActions = !!(s.pending
      && s.pending.type !== 'stepPause' && s.pending.type !== 'effectChoice'
      && s.pending.type !== 'chooseFirstPlayer' && s.pending.type !== 'redraw'
      && (s.pending.player == null || !aiEnabled(s.pending.player))
      && (s.pending.options || []).length > 0);
    toggle.classList.toggle('has-actions', hasActions);
  }
}

/**
 * 対戦開始前の専用モーダル（先攻後攻の決定 / 最初の手札の引き直し）。PC・スマホ共通。
 * これらは盤面操作ではなく「対戦が始まる前の初期設定」なので、右パネルではなく
 * 中央モーダルで提示する。AIプレイヤーの手番は自動処理に任せ、モーダルは出さない。
 */
function renderPregameModal(s) {
  const modal = document.getElementById('pregame-modal');
  const pending = s.pending;
  const isPregame = !!pending && (pending.type === 'chooseFirstPlayer' || pending.type === 'redraw');
  // 引き直しがAIの手番なら自動処理（handleAI）に任せ、モーダルは出さない
  if (isPregame && pending.type === 'redraw' && aiEnabled(pending.player)) { modal.classList.remove('active'); return; }
  if (!isPregame) { modal.classList.remove('active'); return; }

  const title = document.getElementById('pregame-title');
  const body = document.getElementById('pregame-body');
  const actions = document.getElementById('pregame-actions');
  body.innerHTML = '';
  actions.innerHTML = '';

  if (pending.type === 'chooseFirstPlayer') {
    // 両者AI（人間の操作者がいない）の場合は自動でランダム決定
    if (aiEnabled(0) && aiEnabled(1)) { engine.apply('random'); return; }
    title.textContent = '⚔️ 先攻・後攻を決める';
    body.innerHTML = '<div class="pregame-note">先攻プレイヤーを決定します。ランダムで決めるか、手動で指定できます。</div>';
    for (const opt of pending.options) {
      const btn = document.createElement('button');
      btn.className = 'pregame-btn' + (opt.id === 'random' ? ' primary' : '');
      btn.textContent = opt.label;
      btn.addEventListener('click', () => engine.apply(opt.id));
      actions.appendChild(btn);
    }
  } else { // redraw
    const p = s.players[pending.player];
    title.textContent = `🃏 ${p.name}：最初の手札`;
    body.innerHTML = '<div class="pregame-note">この手札で対戦を始めますか？「引き直す」を選ぶと、手札を全てデッキに戻してシャッフルし、引き直します（このターンに1回だけ）。</div>';
    const hand = document.createElement('div');
    hand.className = 'pregame-hand';
    for (const c of p.hand) {
      const img = document.createElement('img');
      img.src = c.imageUrl || '';
      img.alt = c.name;
      img.loading = 'lazy';
      hand.appendChild(img);
    }
    body.appendChild(hand);
    for (const opt of pending.options) {
      const btn = document.createElement('button');
      btn.className = 'pregame-btn' + (opt.id === 'no' ? ' primary' : '');
      btn.textContent = opt.label;
      btn.addEventListener('click', () => engine.apply(opt.id));
      actions.appendChild(btn);
    }
  }
  modal.classList.add('active');
}

// ============ 評価値オーバーレイ（CPUと同じ score.js の数値をカード上に表示） ============

function showEvalOn() { return getSettings().showEval === true; }

function clearEvalBadges() {
  for (const b of document.querySelectorAll('.eval-badge')) b.remove();
}

/** 選択肢 opt に対応する「評価値を出す要素」のセレクタ（カード/盤上ホロメン） */
function evalElementSelector(pending, opt) {
  const a = pending.player;
  switch (pending.type) {
    case 'main':
      if (opt.kind === 'bloom' || opt.kind === 'place' || opt.kind === 'support' || opt.kind === 'supportAttach') {
        return opt.handIndex != null ? `[data-src="${a}:hand:${opt.handIndex}"]` : null;
      }
      if (opt.kind === 'collab' || opt.kind === 'baton') return `[data-src="${a}:back:${opt.backIndex}"]`;
      return null; // oshiSkill / pass はボタン側に表示
    case 'performance':
      return opt.kind === 'art' ? `[data-src="${a}:${opt.zone}:0"]` : null;
    case 'attachCheer':
    case 'attachLifeCheer':
      return opt.pos ? `[data-drop="${a}:mem:${opt.pos.zone}:${opt.pos.index}"]` : null;
    case 'placementCenter':
    case 'placementBack':
    case 'placementPenalty':
      return opt.handIndex != null ? `[data-src="${a}:hand:${opt.handIndex}"]` : null;
    case 'chooseCenter':
      return opt.backIndex != null ? `[data-src="${a}:back:${opt.backIndex}"]` : null;
    case 'effectChoice':
      if (pending.request?.kind === 'chooseHolomem' && opt.value?.pos) {
        const side = opt.side === 'opp' ? (1 - a) : a;
        return `[data-drop="${side}:mem:${opt.value.pos.zone}:${opt.value.pos.index}"]`;
      }
      return null;
    default:
      return null;
  }
}

function renderEvalOverlay(s) {
  clearEvalBadges();
  if (!showEvalOn()) return;
  const pending = s.pending;
  if (!pending || pending.player == null || pending.type === 'stepPause') return;
  if (aiEnabled(pending.player)) return; // AIの手番では出さない（相手の手を覗かない）
  const scores = scoreOptions(engine, pending.player, pending);
  const bestId = bestOptionId(engine, pending.player, pending);
  // 同じ要素に複数選択肢（アーツ複数等）が対応する場合は最大スコアを表示
  const byEl = new Map();
  for (const opt of pending.options) {
    const sel = evalElementSelector(pending, opt);
    if (!sel) continue;
    const el = document.querySelector(sel);
    if (!el) continue;
    const sc = scores[opt.id];
    if (sc == null || sc === -Infinity) continue;
    const cur = byEl.get(el);
    if (!cur || sc > cur.score) byEl.set(el, { score: sc, best: opt.id === bestId });
  }
  for (const [el, info] of byEl) {
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    const r = Math.round(info.score);
    const badge = document.createElement('div');
    badge.className = 'eval-badge ' + (info.best ? 'best' : r > 0 ? 'pos' : r < 0 ? 'neg' : '');
    badge.textContent = r > 0 ? `+${r}` : `${r}`;
    el.appendChild(badge);
  }
}

function pendingHint(pending) {
  const map = {
    redraw: '手札を引き直すか選んでください',
    placementCenter: '手札のDebutホロメンをセンターへドラッグ',
    placementPenalty: '手札のカードをデッキへドラッグ（引き直しペナルティ）',
    placementBack: '手札のDebut/Spotをバックへドラッグ（任意）→「配置を終える」',
    chooseCenter: 'バックのホロメンをセンターへドラッグ',
    attachCheer: '公開中のエールをホロメンへドラッグ',
    attachLifeCheer: '公開中のライフエールをホロメンへドラッグ',
    main: '手札やバックのカードをドラッグして行動（光っているカードが操作可能）',
    performance: '自分のセンター/コラボを相手のホロメンへドラッグして攻撃',
    stepPause: '進行中…（クリックで早送り）',
  };
  if (pending.type === 'effectChoice') return pending.request?.title || 'カード効果の選択';
  return map[pending.type] || '';
}

function renderActions(s) {
  const box = document.getElementById('actions');
  box.innerHTML = '';
  if (!s.pending) return;
  // 先攻後攻の決定・引き直しは専用モーダル(renderPregameModal)で扱うため右パネルには出さない
  if (s.pending.type === 'chooseFirstPlayer' || s.pending.type === 'redraw') return;

  const hint = document.createElement('div');
  hint.className = 'actions-title';
  hint.textContent = pendingHint(s.pending);
  box.appendChild(hint);

  // 効果の選択はモーダル/盤面クリックで行うため、ここではボタンを出さない
  if (s.pending.type === 'effectChoice') {
    return;
  }

  // 評価値（CPUと同じ score.js）。設定ON かつ 人間の手番のときボタンにも数値を付ける
  const evalScores = (showEvalOn() && s.pending.player != null && !aiEnabled(s.pending.player))
    ? scoreOptions(engine, s.pending.player, s.pending) : null;
  const appendEval = (btn, opt) => {
    if (!evalScores || evalScores[opt.id] == null || evalScores[opt.id] === -Infinity) return;
    const r = Math.round(evalScores[opt.id]);
    const span = document.createElement('span');
    span.className = 'action-eval';
    span.textContent = r > 0 ? `+${r}` : `${r}`;
    btn.appendChild(span);
  };

  // D&D で操作できない選択肢（パス・引き直し・推しスキル等）はボタンで出す
  const buttonOptions = s.pending.options.filter((opt) => !optionDnD(s.pending, opt));
  for (const opt of buttonOptions) {
    const btn = document.createElement('button');
    btn.textContent = opt.label;
    if (opt.kind === 'pass' || opt.id === 'done' || opt.id === 'no') btn.classList.add('pass-btn');
    appendEval(btn, opt);
    btn.addEventListener('click', () => engine.apply(opt.id));
    box.appendChild(btn);
  }

  // フォールバック: 全選択肢をボタンで表示するトグル（D&Dが効かない環境用）
  const dndCount = s.pending.options.length - buttonOptions.length;
  if (dndCount > 0) {
    const toggle = document.createElement('button');
    toggle.className = 'toggle-all';
    toggle.textContent = showAllActions ? '▲ ボタン操作を隠す' : `▼ 全操作をボタンで表示（${dndCount}件）`;
    toggle.addEventListener('click', () => {
      showAllActions = !showAllActions;
      render();
    });
    box.appendChild(toggle);
    if (showAllActions) {
      for (const opt of s.pending.options) {
        if (!optionDnD(s.pending, opt)) continue;
        const btn = document.createElement('button');
        btn.textContent = opt.label;
        appendEval(btn, opt);
        btn.addEventListener('click', () => engine.apply(opt.id));
        box.appendChild(btn);
      }
    }
  }
}

function renderLog(s) {
  const box = document.getElementById('log');
  const lines = s.logs.slice(-60);
  box.innerHTML = '';
  for (const line of lines) {
    const div = document.createElement('div');
    if (line.startsWith('――')) div.className = 'turn-line';
    if (line.startsWith('TODO')) div.className = 'todo-line';
    div.textContent = line;
    box.appendChild(div);
  }
  box.scrollTop = box.scrollHeight;
}

function renderResult(s) {
  const overlay = document.getElementById('result-overlay');
  if (s.phase !== 'ended') {
    overlay.classList.remove('active');
    document.getElementById('show-result-button').classList.remove('show');
    return;
  }
  overlay.classList.add('active');
  const msg = document.getElementById('result-message');
  msg.textContent = s.winner === 'draw'
    ? '引き分け'
    : `🏆 ${s.players[s.winner].name} の勝利！（${s.lossReason}）`;
}

// カードプレビュー（ホバー）
function setupPreview() {
  const preview = document.getElementById('card-preview');
  const img = preview.querySelector('img');
  const name = preview.querySelector('.preview-name');
  document.addEventListener('mouseover', (e) => {
    const card = e.target.closest('[data-preview]');
    if (card && card.dataset.preview) {
      img.src = card.dataset.preview;
      name.textContent = card.dataset.previewName || '';
      preview.style.display = 'block';
    }
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest('[data-preview]')) preview.style.display = 'none';
  });
}

// ============ AI（CPU操作） ============

const aiAgents = [null, null];
let aiOverride = null; // URLパラメータによる一時上書き（保存しない）
let forcedFirstPlayer = null; // 観戦再生(?replay)で先攻を固定する（通常はnull）
let lookaheadOverride = null; // ?lookahead=1|2|both で先読みAIを使うプレイヤー（実験用）
let aiTimer = null;
let aiBusy = false; // AI処理中フラグ。apply中の再入render→handleAIが古いpending向けタイマーを予約するのを防ぐ
// CPUの「1手ごと」の進行間隔。設定パネルの速度（stepSpeed）に連動させる＝速い/普通/ゆっくりでCPUの指す速さも変わる。
// 「手動」はステップ境界だけ手動送りにするモードで、CPUの各決定（配置/ブルーム/攻撃など）はステップ境界ではないため
// 自動で進む必要がある→0にはせず普通速度にする（CPUが止まらないように）。
const AI_DELAYS = { fast: 150, normal: 600, slow: 1200, manual: 600 };
function aiDelayMs() { return AI_DELAYS[getSettings().stepSpeed] ?? 600; }

function aiEnabled(idx) {
  if (aiOverride) return aiOverride[idx];
  return !!(getSettings().aiPlayers || [false, false])[idx];
}

function lookaheadEnabled(idx) {
  // 既定: CPUは1手先読みAI（ヒューリスティックより有意に強い）。?lookahead=0 で高速な簡易AIに切替。
  if (lookaheadOverride) return lookaheadOverride[idx];
  return true;
}

// 先読みの深さ（何ターン先まで擬似対戦するか）。1=自分のターンのみ / 2=相手の応手 / 3=自分の次まで / 5=自分のターン3回ぶん（大技展開まで）。
// 既定は3手（自己対戦での実測で最も強い。2手は「攻めると損」で消極化し弱い）。5手はじっくり読む重いモード。
function lookaheadTurns() {
  const t = Number(getSettings().lookaheadTurns);
  return (t === 1 || t === 2 || t === 5) ? t : 3;
}

/** AI担当プレイヤーの決定ポイントを少し間を置いて自動で進める */
function getAgent(idx) {
  if (!aiAgents[idx]) aiAgents[idx] = lookaheadEnabled(idx) ? new LookaheadAI(idx, { turns: lookaheadTurns() }) : new HeuristicAI(idx);
  return aiAgents[idx];
}

function handleAI(s) {
  if (!s.pending || s.phase === 'ended') return;
  const idx = s.pending.player;
  if (!aiEnabled(idx)) return;
  if (aiTimer || aiBusy) return; // 既に予約済み／処理中なら何もしない（再入で古いタイマーを増やさない）
  const pendingRef = s.pending;
  aiTimer = setTimeout(() => {
    aiTimer = null;
    if (!engine || engine.state.pending !== pendingRef) {
      // pending が既に進んでいた場合でも、現局面でAIを再起動して停止を防ぐ（タイマー空振りで止まらないように）
      if (engine && engine.state.pending && engine.state.phase !== 'ended') handleAI(engine.state);
      return;
    }
    aiBusy = true; // この間の apply→render→handleAI 再入はタイマーを予約しない（古いpending向けタイマーを作らない）
    try {
      const id = getAgent(idx).choose(engine);
      if (id != null) engine.apply(id);
      // 複数選択(chooseCards)はトグル＋確定を一気に解決する（1トグルごとに待つと遅いため）。
      let guard = 0;
      while (engine.state.pending?.type === 'effectChoice' && engine.state.pending.multiSelect
        && aiEnabled(engine.state.pending.player) && guard++ < 60) {
        const nid = getAgent(engine.state.pending.player).choose(engine);
        if (nid == null) break;
        engine.apply(nid);
      }
    } catch (e) {
      console.error('AIの手の適用に失敗:', e);
    } finally {
      aiBusy = false;
    }
    // 最終局面でAIの手番が続くなら、ここで次の1手を予約する（再入renderには予約させない）
    if (engine && engine.state.pending && engine.state.phase !== 'ended') handleAI(engine.state);
  }, aiDelayMs());
}

// ============ 設定パネル ============

let currentSeed = null;

function setupSettingsPanel() {
  const button = document.getElementById('settings-button');
  const panel = document.getElementById('settings-panel');

  button.addEventListener('click', (e) => {
    e.stopPropagation();
    panel.classList.toggle('open');
    refreshSettingsUI();
  });
  document.addEventListener('click', (e) => {
    if (panel.classList.contains('open') && !panel.contains(e.target) && e.target !== button) {
      panel.classList.remove('open');
    }
  });

  // ステップ送り速度
  document.getElementById('pause-speed-buttons').addEventListener('click', (e) => {
    const speed = e.target.dataset?.speed;
    if (!speed) return;
    saveSettings({ stepSpeed: speed });
    refreshSettingsUI();
  });

  // 任意効果の発動確認（確認する / 自動で発動）
  document.getElementById('confirm-optional-buttons').addEventListener('click', (e) => {
    const v = e.target.dataset?.confirmOptional;
    if (!v) return;
    const on = v === 'on';
    saveSettings({ confirmOptionalEffects: on });
    if (engine) engine.confirmOptionalEffects = on; // 実行中のゲームにも即反映
    refreshSettingsUI();
  });

  // 先読みの深さ（1手/2手/3手）
  document.getElementById('lookahead-turns-buttons').addEventListener('click', (e) => {
    const v = e.target.dataset?.lookaheadTurns;
    if (!v) return;
    saveSettings({ lookaheadTurns: Number(v) });
    aiAgents[0] = aiAgents[1] = null; // 深さが変わるので次の手番でAIを作り直す（実行中のゲームにも即反映）
    refreshSettingsUI();
  });

  // 評価値の表示（CPUと同じ score.js の数値をカード上に表示）
  document.getElementById('show-eval-buttons').addEventListener('click', (e) => {
    const v = e.target.dataset?.showEval;
    if (!v) return;
    saveSettings({ showEval: v === 'on' });
    refreshSettingsUI();
    if (engine) render(); // 即反映
  });

  // AI適用（CPUが操作するプレイヤーの切り替え）
  document.getElementById('ai-buttons').addEventListener('click', (e) => {
    const idx = e.target.dataset?.ai;
    if (idx == null) return;
    const current = getSettings().aiPlayers || [false, false];
    current[Number(idx)] = !current[Number(idx)];
    aiOverride = null; // 手動変更したらURL上書きは解除
    saveSettings({ aiPlayers: current });
    refreshSettingsUI();
    if (engine) render(); // AIループを起動
  });

  // 投了
  document.getElementById('concede-p1-button').addEventListener('click', () => {
    if (engine && confirm('プレイヤー1が投了します。よろしいですか？')) {
      engine.concede(0);
      document.getElementById('settings-panel').classList.remove('open');
    }
  });
  document.getElementById('concede-p2-button').addEventListener('click', () => {
    if (engine && confirm('プレイヤー2が投了します。よろしいですか？')) {
      engine.concede(1);
      document.getElementById('settings-panel').classList.remove('open');
    }
  });

  // ゲームリセット
  document.getElementById('reset-game-button').addEventListener('click', () => {
    if (confirm('ゲームをリセットしてデッキ選択に戻ります。よろしいですか？')) {
      location.reload();
    }
  });

  // TODO(CPU対戦): ここに「AI適用」（各プレイヤーをCPUに切り替える）項目を追加予定
}

/** スマホ用コントロールの配線（▶次へ / 📋パネル開閉 / シートの閉じる） */
function setupMobileControls() {
  const sidePanel = document.getElementById('side-panel');
  const advBtn = document.getElementById('mobile-advance');
  const toggle = document.getElementById('panel-toggle-button');
  const handle = document.getElementById('panel-sheet-handle');

  advBtn?.addEventListener('click', () => {
    const id = advBtn.dataset.applyId;
    if (engine && id) engine.apply(id);
  });
  toggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    sidePanel.classList.toggle('mobile-open');
  });
  handle?.addEventListener('click', () => sidePanel.classList.remove('mobile-open'));
}

function refreshSettingsUI() {
  const speed = getSettings().stepSpeed;
  for (const btn of document.querySelectorAll('#pause-speed-buttons button')) {
    btn.classList.toggle('active', btn.dataset.speed === speed);
  }
  // 設定パネルとデッキ選択画面、両方のCPUトグルを同期表示する
  for (const btn of document.querySelectorAll('#ai-buttons button, #setup-ai-buttons button')) {
    btn.classList.toggle('active', aiEnabled(Number(btn.dataset.ai)));
  }
  const confirmOptOn = getSettings().confirmOptionalEffects !== false;
  for (const btn of document.querySelectorAll('#confirm-optional-buttons button')) {
    btn.classList.toggle('active', (btn.dataset.confirmOptional === 'on') === confirmOptOn);
  }
  const showEval = getSettings().showEval === true;
  for (const btn of document.querySelectorAll('#show-eval-buttons button')) {
    btn.classList.toggle('active', (btn.dataset.showEval === 'on') === showEval);
  }
  const laTurns = lookaheadTurns();
  for (const btn of document.querySelectorAll('#lookahead-turns-buttons button')) {
    btn.classList.toggle('active', Number(btn.dataset.lookaheadTurns) === laTurns);
  }
  document.getElementById('seed-display').textContent = `シード値: ${currentSeed ?? '-'}`;
}

/**
 * 盤面のレスポンシブスケーリング。
 * テーブルは 1060x800 の固定レイアウトなので、ウィンドウが狭いと左右端
 * （ライフ・アーカイブ）が見切れる。シーンの実寸に合わせて全体を縮小する。
 */
const MOBILE_MQ = window.matchMedia('(max-width: 768px)');
function isMobileLayout() { return MOBILE_MQ.matches; }

function updateBoardScale() {
  let sceneW, sceneH, divW, divH;
  if (isMobileLayout()) {
    // スマホ: 盤面は全幅。上の概要バー(約44px)と下の手札(約120px)ぶんを縦に確保する。
    // テーブルはモバイル用に 664×720 へ詰めてあるので、その投影footprintで割る。
    sceneW = window.innerWidth - 8;
    sceneH = window.innerHeight - 44 - 116;
    divW = 690;            // 664 + 余白
    divH = 660;            // 720 * 投影0.83 + 余白
  } else {
    sceneW = window.innerWidth - 320 - 16; // サイドパネルと余白を除く
    sceneH = window.innerHeight - 16;
    divW = 1100;
    divH = 760;            // rotateX(34deg) 投影後の高さは約 0.83 倍 + はみ出し分
  }
  const scale = Math.min(1, sceneW / divW, sceneH / divH);
  document.documentElement.style.setProperty('--board-scale', String(scale));
}

// ============ 起動 ============

async function main() {
  try {
    lib = await CardLibrary.load('json_file/card_data.json');
  } catch (e) {
    document.getElementById('setup-error').textContent =
      'カードデータの読み込みに失敗しました。ローカルサーバー経由で開いてください。\n' + e.message;
    return;
  }
  await initSetupScreen();
  setupPreview();
  setupModals();
  setupDnDListeners();
  setupSettingsPanel();
  setupMobileControls();
  setupReplayUI();
  renderReplayList();
  updateBoardScale();
  window.addEventListener('resize', updateBoardScale);
  MOBILE_MQ.addEventListener?.('change', updateBoardScale);
  document.getElementById('restart-button').addEventListener('click', () => location.reload());
  // 勝敗画面で盤面を確認できるようにする（結果オーバーレイを一時的に隠す→フローティングボタンで戻す）
  document.getElementById('view-board-button').addEventListener('click', () => {
    document.getElementById('result-overlay').classList.remove('active');
    document.getElementById('show-result-button').classList.add('show');
  });
  document.getElementById('show-result-button').addEventListener('click', () => {
    document.getElementById('result-overlay').classList.add('active');
    document.getElementById('show-result-button').classList.remove('show');
  });
  console.log('✅ バトルシミュレーターv2 初期化完了');

  // 開発用: ?ai=1|2|both でAI適用を一時的に上書き（設定には保存しない）
  const params = new URLSearchParams(location.search);
  const aiParam = params.get('ai');
  if (aiParam) {
    aiOverride = [aiParam === '1' || aiParam === 'both', aiParam === '2' || aiParam === 'both'];
  }
  // CPUは既定で1手先読み。?lookahead=0|none で高速な簡易AI（ヒューリスティック）に切替。
  // ?lookahead=1|2 で片側だけ先読み等の指定も可能。
  const laParam = params.get('lookahead');
  if (laParam === '0' || laParam === 'none') lookaheadOverride = [false, false];
  else if (laParam) lookaheadOverride = [laParam === '1' || laParam === 'both', laParam === '2' || laParam === 'both'];
  // 開発・確認用: ?showeval=1 で「評価値を表示」をONにして起動
  if (params.get('showeval')) saveSettings({ showEval: true });
  // 開発・確認用: ?deep=1|2|3 で「先読みの深さ（手数）」を指定して起動
  const deepParam = params.get('deep');
  if (deepParam != null) {
    const t = Number(deepParam);
    saveSettings({ lookaheadTurns: (t === 1 || t === 2 || t === 5) ? t : 3 });
  }
  if (aiParam) refreshSettingsUI(); // URL上書きをCPUトグル表示にも反映

  // 更新検知でリロードした場合は、保存しておいた選択でそのままゲームを自動再開する
  let pendingStart = null;
  try { pendingStart = JSON.parse(sessionStorage.getItem('bsv2_pendingStart') || 'null'); } catch { /* 無視 */ }
  // 観戦再生(?applied / ?replay)・autostart 時は、過去の自動再開予約があっても無視する（観戦の起動を妨げない）。
  if (pendingStart && !params.get('autostart') && !params.get('applied') && !params.get('replay')) {
    sessionStorage.removeItem('bsv2_pendingStart');
    const sel1 = document.getElementById('deck-p1');
    const sel2 = document.getElementById('deck-p2');
    if ([...sel1.options].some((o) => o.value === pendingStart.p1)) sel1.value = pendingStart.p1;
    if ([...sel2.options].some((o) => o.value === pendingStart.p2)) sel2.value = pendingStart.p2;
    if (pendingStart.seed) document.getElementById('seed-input').value = pendingStart.seed;
    resumingStart = true; // 再開時は再チェック不要（既に最新を読み込んでいる）
    await startGame();
    resumingStart = false;
  }

  // 開発・スモークテスト用: ?autostart=1&seed=42 で即ゲーム開始
  if (params.get('autostart')) {
    // デッキ未選択（「選択してください」）の時は先頭の実デッキを選ぶ（自動起動用）
    for (const id of ['deck-p1', 'deck-p2']) {
      const sel = document.getElementById(id);
      if (!sel.value) { const real = [...sel.options].find((o) => o.value); if (real) sel.value = real.value; }
    }
    if (params.get('seed')) document.getElementById('seed-input').value = params.get('seed');
    await startGame();
    const autoplay = Number(params.get('autoplay') || 0);
    for (let i = 0; i < autoplay && engine.state.phase !== 'ended'; i++) {
      const actions = engine.actions();
      if (actions.length === 0) break;
      const active = actions.filter((a) => a.id !== 'done' && a.kind !== 'pass' && a.id !== 'yes');
      engine.apply((active[0] || actions[0]).id);
    }
    console.log('✅ autostart 完了');
  }

  // 観戦再生: ?applied=ID1,ID2,...&a=FUWAMOCO&b=ござる&seed=1&first=0&delay=1100
  //   記録した「全適用手の列(appliedIds)」を本物の盤面でそのまま順に再生する（決定的＝完全再現）。
  if (params.get('applied') != null) {
    const opts = {
      a: params.get('a'), b: params.get('b'),
      seed: params.get('seed') != null ? Number(params.get('seed')) : undefined,
      first: params.get('first') != null ? Number(params.get('first')) : 0,
      applied: params.get('applied'),
      delay: Number(params.get('delay') || 1100),
    };
    // 重要: アドレスバーから観戦パラメータを除去する。これをしないと「観戦URLのまま」になり、
    // リロードや「もう一度」のたびに勝手に再生が走る（＝トラップ）。除去後はリロードでデッキ選択へ戻る。
    try { history.replaceState(null, '', location.pathname); } catch { /* 非対応環境は無視 */ }
    await startReplay(opts);
  }

  // 観戦再生（ファイル直接指定）: ?replayfile=claude_vs_gozaru.json
  //   replay_data/ のリプレイ（デッキ構成同梱）をそのまま再生。ドロップダウン非依存で必ず記録どおりのデッキになる。
  if (params.get('replayfile')) {
    const fname = params.get('replayfile');
    try { history.replaceState(null, '', location.pathname); } catch { /* 無視 */ }
    try {
      const files = await loadFileReplays();
      const r = files.find((x) => x.file === fname);
      if (r) {
        await startReplay({ a: r.a, b: r.b, deckA: r.deckA, deckB: r.deckB, seed: r.seed, first: r.first, applied: r.applied, delay: Number(params.get('delay') || 1100) });
      } else { document.getElementById('setup-error').textContent = `リプレイが見つかりません: ${fname}`; }
    } catch (e) { document.getElementById('setup-error').textContent = 'リプレイ読み込み失敗: ' + e.message; }
  }

  // 開発用: ?fillbacks=1 で両者のバックを5体にする（レイアウト確認用）
  if (params.get('fillbacks') && engine && engine.state.phase === 'playing') {
    const debut = lib.getByNumber('hBP02-042') || lib.getByNumber('hBP04-043');
    for (const p of engine.state.players) {
      p.back = [0, 1, 2, 3, 4].map(() => engine._createHolomem(debut, 1));
    }
    render();
  }

  // 開発用: ?inspecttest=1 で手札1枚目の詳細モーダルを自動で開く（表示確認用）
  if (params.get('inspecttest')) {
    setTimeout(() => document.querySelector('#hand .card')?.click(), 300);
  }

  // 開発用: ?dicetest=N でサイコロ表示を静止表示（見た目確認用）
  if (params.get('dicetest')) {
    showDice(Number(params.get('dicetest')) || 6);
    const overlay = document.getElementById('dice-overlay');
    overlay.style.animation = 'none';
    overlay.style.opacity = '1';
    overlay.style.display = 'flex';
  }
}

main();
