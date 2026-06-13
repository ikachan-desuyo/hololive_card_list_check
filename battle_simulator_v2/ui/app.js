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
import { STEP_NAMES } from '../core/constants.js';
import { renderSide, renderHand, renderOppHand } from './board.js';

const TEST_DECKS = ['ラミィデッキ', 'あの青空のせいだ'];

let lib = null;
let engine = null;
let showAllActions = false;

// ============ デッキ選択画面 ============

async function loadDeckSources() {
  const sources = [];
  for (const name of TEST_DECKS) {
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
  const kind = key.slice(0, key.indexOf(':'));
  const name = key.slice(key.indexOf(':') + 1);
  if (kind === 'test') {
    const res = await fetch(`battle_simulator/test_deck/${encodeURIComponent(name)}.json`);
    if (!res.ok) throw new Error(`テストデッキの読み込みに失敗: ${name}`);
    return res.json();
  }
  const saved = JSON.parse(localStorage.getItem('deckData') || '{}');
  if (!saved[name]) throw new Error(`保存デッキが見つかりません: ${name}`);
  return saved[name];
}

async function initSetupScreen() {
  const sources = await loadDeckSources();
  for (const id of ['deck-p1', 'deck-p2']) {
    const select = document.getElementById(id);
    select.innerHTML = '';
    for (const s of sources) {
      const opt = document.createElement('option');
      opt.value = s.key;
      opt.textContent = s.label;
      select.appendChild(opt);
    }
  }
  document.getElementById('start-button').addEventListener('click', startGame);
}

async function startGame() {
  const errBox = document.getElementById('setup-error');
  errBox.textContent = '';
  try {
    const map1 = await resolveDeckMap(document.getElementById('deck-p1').value);
    const map2 = await resolveDeckMap(document.getElementById('deck-p2').value);
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
    const seedInput = document.getElementById('seed-input').value;
    const seed = seedInput ? Number(seedInput) : Math.floor(Math.random() * 1e9);
    currentSeed = seed;
    // カード効果定義の事前読み込み（両デッキのカードナンバー）
    const registry = new EffectRegistry();
    const numbers = [...Object.keys(map1), ...Object.keys(map2)]
      .map((id) => lib.get(id)?.number)
      .filter(Boolean);
    await registry.preload(numbers);
    engine = new Engine({
      decks: [deck1, deck2],
      seed,
      names: ['プレイヤー1', 'プレイヤー2'],
      onChange: render,
      registry,
    });
    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('game-screen').classList.add('active');
    engine.start();
  } catch (e) {
    errBox.textContent = e.message;
  }
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
  const ghost = document.createElement('div');
  ghost.className = 'drag-ghost';
  const img = st.srcEl.querySelector('img');
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
    const cost = art.cost.map((c) => `<span class="cost-chip">${escapeText(c)}</span>`).join('');
    rows.push(
      `<div class="detail-skill art">` +
      `<div class="art-head"><b>アーツ: ${escapeText(art.name)}</b>` +
      `<span class="art-dmg">${art.dmg}${art.dmgPlus ? '+' : ''}</span></div>` +
      `<div class="art-cost">コスト: ${cost}` +
      `${art.tokkou?.length ? `　特攻: ${art.tokkou.map((t) => `${escapeText(t.color)}+${t.value}`).join(', ')}` : ''}</div>` +
      `${art.text ? `<div>${escapeText(art.text)}</div>` : ''}` +
      `</div>`
    );
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
function showChooser(x, y, options) {
  const chooser = document.getElementById('chooser');
  chooser.innerHTML = '';
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
    showChooser(ev.clientX, ev.clientY, [
      ...acts,
      { label: '📄 カード詳細を見る', run: () => showInspector(detail) },
    ]);
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

  // 手札表示: 人間が1人だけなら常にその人の手札を固定表示（AIの手札は見せない）
  const humans = [0, 1].filter((i) => !aiEnabled(i));
  const handPlayer = humans.length === 1
    ? humans[0]
    : (s.pending ? s.pending.player : s.turnPlayer);
  renderHand(document.getElementById('hand'), s.players[handPlayer].hand, handPlayer, hooks);
  renderOppHand(document.getElementById('opp-hand'), s.players[1 - handPlayer].hand.length);

  // ホットシート: 下の手札が誰のものかを明示する（切り替わりに気づけるように）
  const ownerTag = document.getElementById('hand-owner');
  ownerTag.textContent = `🖐 ${s.players[handPlayer].name} の手札（${s.players[handPlayer].hand.length}枚）`;
  ownerTag.className = handPlayer === 0 ? 'p1' : 'p2';

  wireDnD();
  renderStatus(s, handPlayer);
  renderActions(s);
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

function renderEffectChoiceModal(s) {
  const modal = document.getElementById('choice-modal');
  const bar = document.getElementById('choice-bar');
  let isEffect = s.pending?.type === 'effectChoice';
  // AIの選択は表示しない（デッキサーチ候補などの非公開情報が見えてしまうため）
  if (isEffect && aiEnabled(s.pending.player)) isEffect = false;

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
  // 新しい選択が来たらピーク（盤面確認）状態を解除する
  if (lastChoicePending !== s.pending) {
    lastChoicePending = s.pending;
    modal.classList.remove('peek');
    document.getElementById('choice-restore').classList.remove('show');
  }
  document.getElementById('choice-title').textContent =
    `${s.players[s.pending.player].name}: ${s.pending.request.title || '選択してください'}`;
  const grid = document.getElementById('choice-grid');
  grid.innerHTML = '';
  const footer = document.getElementById('choice-footer');
  footer.innerHTML = '';
  for (const opt of s.pending.options) {
    if (opt.card) {
      const c = document.createElement('div');
      c.className = 'archive-grid-card';
      c.innerHTML = `<img src="${opt.card.imageUrl || ''}" alt="${escapeText(opt.card.name)}" loading="lazy"><div>${escapeText(opt.card.name)}</div>`;
      c.addEventListener('click', () => engine.apply(opt.id));
      grid.appendChild(c);
    } else {
      const btn = document.createElement('button');
      btn.textContent = opt.label;
      btn.addEventListener('click', () => engine.apply(opt.id));
      footer.appendChild(btn);
    }
  }
  // 選択対象外だが公開されているカード（「上からN枚見る」の残り等）はグレー表示
  for (const card of s.pending.request.displayCards || []) {
    const c = document.createElement('div');
    c.className = 'archive-grid-card display-only';
    c.innerHTML = `<img src="${card.imageUrl || ''}" alt="${escapeText(card.name)}" loading="lazy"><div>${escapeText(card.name)}（対象外）</div>`;
    grid.appendChild(c);
  }
}

function renderStatus(s, handPlayer) {
  const status = document.getElementById('status');
  const stepName = s.step ? STEP_NAMES[s.step] : 'セットアップ';
  const pendingName = s.pending ? s.players[s.pending.player].name : '';
  status.innerHTML = `
    <div class="turn-banner">ターン${s.turn || '-'} ・ ${stepName}</div>
    <div>ターンプレイヤー: ${s.players[s.turnPlayer]?.name || '-'}</div>
    <div>${pendingName ? `🎯 ${escapeText(pendingName)} の操作` : ''}</div>
    <div style="color:#889">手札表示: ${escapeText(s.players[handPlayer].name)}</div>
  `;
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

  const hint = document.createElement('div');
  hint.className = 'actions-title';
  hint.textContent = pendingHint(s.pending);
  box.appendChild(hint);

  // 効果の選択はモーダル/盤面クリックで行うため、ここではボタンを出さない
  if (s.pending.type === 'effectChoice') {
    return;
  }

  // D&D で操作できない選択肢（パス・引き直し・推しスキル等）はボタンで出す
  const buttonOptions = s.pending.options.filter((opt) => !optionDnD(s.pending, opt));
  for (const opt of buttonOptions) {
    const btn = document.createElement('button');
    btn.textContent = opt.label;
    if (opt.kind === 'pass' || opt.id === 'done' || opt.id === 'no') btn.classList.add('pass-btn');
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
let aiTimer = null;
const AI_DELAY_MS = 600;

function aiEnabled(idx) {
  if (aiOverride) return aiOverride[idx];
  return !!(getSettings().aiPlayers || [false, false])[idx];
}

/** AI担当プレイヤーの決定ポイントを少し間を置いて自動で進める */
function handleAI(s) {
  if (!s.pending || s.phase === 'ended') return;
  const idx = s.pending.player;
  if (!aiEnabled(idx)) return;
  if (aiTimer) return;
  const pendingRef = s.pending;
  aiTimer = setTimeout(() => {
    aiTimer = null;
    if (!engine || engine.state.pending !== pendingRef) return;
    if (!aiAgents[idx]) aiAgents[idx] = new HeuristicAI(idx);
    try {
      const id = aiAgents[idx].choose(engine);
      if (id != null) engine.apply(id);
    } catch (e) {
      console.error('AIの手の適用に失敗:', e);
    }
  }, AI_DELAY_MS);
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

  // ログコピー
  document.getElementById('copy-log-button').addEventListener('click', async () => {
    if (!engine) return;
    const text = `[seed=${currentSeed}]\n` + engine.state.logs.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      document.getElementById('copy-log-button').textContent = '✅ コピーしました';
      setTimeout(() => {
        document.getElementById('copy-log-button').textContent = '📋 ログをコピー';
      }, 1500);
    } catch { /* クリップボード不可の環境は無視 */ }
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

function refreshSettingsUI() {
  const speed = getSettings().stepSpeed;
  for (const btn of document.querySelectorAll('#pause-speed-buttons button')) {
    btn.classList.toggle('active', btn.dataset.speed === speed);
  }
  for (const btn of document.querySelectorAll('#ai-buttons button')) {
    btn.classList.toggle('active', aiEnabled(Number(btn.dataset.ai)));
  }
  document.getElementById('seed-display').textContent = `シード値: ${currentSeed ?? '-'}`;
}

/**
 * 盤面のレスポンシブスケーリング。
 * テーブルは 1060x800 の固定レイアウトなので、ウィンドウが狭いと左右端
 * （ライフ・アーカイブ）が見切れる。シーンの実寸に合わせて全体を縮小する。
 */
function updateBoardScale() {
  const sceneW = window.innerWidth - 320 - 16; // サイドパネルと余白を除く
  const sceneH = window.innerHeight - 16;
  // rotateX(34deg) 投影後の高さは約 0.83 倍 + 手前へのはみ出し分を見込む
  const scale = Math.min(1, sceneW / 1100, sceneH / 760);
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
  updateBoardScale();
  window.addEventListener('resize', updateBoardScale);
  document.getElementById('restart-button').addEventListener('click', () => location.reload());
  console.log('✅ バトルシミュレーターv2 初期化完了');

  // 開発用: ?ai=1|2|both でAI適用を一時的に上書き（設定には保存しない）
  const params = new URLSearchParams(location.search);
  const aiParam = params.get('ai');
  if (aiParam) {
    aiOverride = [aiParam === '1' || aiParam === 'both', aiParam === '2' || aiParam === 'both'];
  }

  // 開発・スモークテスト用: ?autostart=1&seed=42 で即ゲーム開始
  if (params.get('autostart')) {
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
