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
    engine = new Engine({
      decks: [deck1, deck2],
      seed,
      names: ['プレイヤー1', 'プレイヤー2'],
      onChange: render,
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
let currentDragSrc = null;

function wireDnD() {
  dndMap = buildDndMap();
  const srcs = new Set(dndMap.map((x) => x.dnd.src));
  for (const e of document.querySelectorAll('[data-src]')) {
    if (srcs.has(e.dataset.src)) {
      e.draggable = true;
      e.classList.add('can-drag');
    }
  }
}

/** ドロップ先要素から、現在のドラッグに合う drop キーを探す（内側→外側） */
function findDropKey(target, dsts) {
  let node = target;
  while (node && node !== document.body) {
    const key = node.dataset?.drop;
    if (key && dsts.includes(key)) return key;
    node = node.parentElement;
  }
  return null;
}

function setupDnDListeners() {
  const screen = document.getElementById('game-screen');

  screen.addEventListener('dragstart', (e) => {
    const src = e.target.closest?.('[data-src]')?.dataset.src;
    if (!src) return;
    currentDragSrc = src;
    e.dataTransfer.effectAllowed = 'move';
    // ドラッグ中は装飾要素のヒット判定を切る（css: body.dragging）
    document.body.classList.add('dragging');
    // ドロップ可能な場所をハイライト
    const dsts = new Set(dndMap.filter((x) => x.dnd.src === src).flatMap((x) => x.dnd.dsts));
    for (const el of document.querySelectorAll('[data-drop]')) {
      if (dsts.has(el.dataset.drop)) el.classList.add('drop-ok');
    }
  });

  screen.addEventListener('dragend', () => {
    currentDragSrc = null;
    document.body.classList.remove('dragging');
    for (const el of document.querySelectorAll('.drop-ok')) el.classList.remove('drop-ok');
  });

  screen.addEventListener('dragover', (e) => {
    if (!currentDragSrc) return;
    const dsts = dndMap.filter((x) => x.dnd.src === currentDragSrc).flatMap((x) => x.dnd.dsts);
    if (findDropKey(e.target, dsts)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    }
  });

  screen.addEventListener('drop', (e) => {
    if (!currentDragSrc) return;
    e.preventDefault();
    const candidates = dndMap.filter((x) => x.dnd.src === currentDragSrc);
    const dsts = candidates.flatMap((x) => x.dnd.dsts);
    const key = findDropKey(e.target, dsts);
    if (!key) return;
    const matched = candidates.filter((x) => x.dnd.dsts.includes(key));
    currentDragSrc = null;
    // 再描画で dragend が発火しないことがあるため、ここでも後始末する
    document.body.classList.remove('dragging');
    for (const el of document.querySelectorAll('.drop-ok')) el.classList.remove('drop-ok');
    if (matched.length === 1) {
      engine.apply(matched[0].opt.id);
    } else if (matched.length > 1) {
      // 同じ移動で複数の選択肢（例: 複数アーツ）→ 小さな選択ポップアップ
      showChooser(e.clientX, e.clientY, matched.map((x) => x.opt));
    }
  });
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
    const cost = art.cost.join('');
    rows.push(`<div class="detail-skill"><b>アーツ: ${escapeText(art.name)}</b>（${escapeText(cost)}）ダメージ ${art.dmg}${art.dmgPlus ? '+' : ''}${art.tokkou?.length ? ` / 特攻: ${art.tokkou.map((t) => `${t.color}+${t.value}`).join(', ')}` : ''}${art.text ? `<br>${escapeText(art.text)}` : ''}</div>`);
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

/** 同一ドロップに複数の選択肢があるときの小ポップアップ（例: アーツ選択） */
function showChooser(x, y, options) {
  const chooser = document.getElementById('chooser');
  chooser.innerHTML = '';
  for (const opt of options) {
    const btn = document.createElement('button');
    btn.textContent = opt.label;
    btn.addEventListener('click', () => {
      chooser.style.display = 'none';
      engine.apply(opt.id);
    });
    chooser.appendChild(btn);
  }
  chooser.style.display = 'flex';
  chooser.style.left = `${Math.min(x, window.innerWidth - 340)}px`;
  chooser.style.top = `${Math.min(y, window.innerHeight - 40 * options.length - 20)}px`;
}

function setupModals() {
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
};

let lastTurnKey = null;

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

  const handPlayer = s.pending ? s.pending.player : s.turnPlayer;
  renderHand(document.getElementById('hand'), s.players[handPlayer].hand, handPlayer, hooks);
  renderOppHand(document.getElementById('opp-hand'), s.players[1 - handPlayer].hand.length);

  wireDnD();
  renderStatus(s, handPlayer);
  renderActions(s);
  renderLog(s);
  renderResult(s);
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
  };
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
  document.getElementById('restart-button').addEventListener('click', () => location.reload());
  console.log('✅ バトルシミュレーターv2 初期化完了');

  // 開発・スモークテスト用: ?autostart=1&seed=42 で即ゲーム開始
  const params = new URLSearchParams(location.search);
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
}

main();
