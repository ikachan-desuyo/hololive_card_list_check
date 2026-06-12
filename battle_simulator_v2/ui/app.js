/**
 * アプリ本体: デッキ選択 → エンジン生成 → 盤面描画とアクション操作
 *
 * 現状はホットシート（1画面で両プレイヤーを操作）。CPU対戦は次フェーズ。
 */

import { CardLibrary } from '../core/cards.js';
import { Engine } from '../core/engine.js';
import { STEP_NAMES } from '../core/constants.js';
import { renderSide, renderHand, renderOppHand } from './board.js';

const TEST_DECKS = ['ラミィデッキ', 'あの青空のせいだ'];

let lib = null;
let engine = null;
let selectedHandIndex = null;

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
  const [kind, name] = [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)];
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

// ============ ゲーム画面 ============

function render() {
  if (!engine) return;
  const s = engine.state;

  // 盤面（プレイヤー1視点固定）
  renderSide(document.getElementById('side-player'), s.players[0]);
  renderSide(document.getElementById('side-opponent'), s.players[1]);

  // 手札: 決定すべきプレイヤーの手札を表示（ホットシート）
  const handPlayer = s.pending ? s.pending.player : s.turnPlayer;
  renderHand(
    document.getElementById('hand'),
    s.players[handPlayer].hand,
    selectedHandIndex,
    (i) => {
      selectedHandIndex = selectedHandIndex === i ? null : i;
      render();
    }
  );
  renderOppHand(document.getElementById('opp-hand'), s.players[1 - handPlayer].hand.length);

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
    <div>${pendingName ? `🎯 ${pendingName} の選択` : ''}</div>
    <div style="color:#889">手札表示: ${s.players[handPlayer].name}</div>
  `;
}

function renderActions(s) {
  const box = document.getElementById('actions');
  box.innerHTML = '';
  if (!s.pending) return;

  const title = document.createElement('div');
  title.className = 'actions-title';
  title.textContent = pendingTitle(s.pending);
  box.appendChild(title);

  let options = s.pending.options;
  // 手札カードを選択中なら、そのカードに関係するアクションだけに絞り込み
  if (selectedHandIndex != null) {
    const filtered = options.filter(
      (o) => o.handIndex === selectedHandIndex || o.kind === 'pass' || o.id === 'done'
    );
    if (filtered.length > 0 && filtered.length < options.length) {
      const note = document.createElement('div');
      note.className = 'actions-title';
      note.textContent = '（選択中のカードで絞り込み — もう一度カードをクリックで解除）';
      box.appendChild(note);
      options = filtered;
    }
  }

  for (const opt of options) {
    const btn = document.createElement('button');
    btn.textContent = opt.label;
    if (opt.kind === 'pass' || opt.id === 'done' || opt.id === 'no') btn.classList.add('pass-btn');
    btn.addEventListener('click', () => {
      selectedHandIndex = null;
      engine.apply(opt.id);
    });
    box.appendChild(btn);
  }
}

function pendingTitle(pending) {
  const map = {
    redraw: '手札を引き直しますか？',
    placementCenter: 'センターに置くDebutホロメンを選択',
    placementPenalty: 'デッキの下に戻すカードを選択（引き直しペナルティ）',
    placementBack: 'バックに置くホロメンを選択（任意）',
    chooseCenter: 'センターに移動するホロメンを選択',
    attachCheer: 'エールを送るホロメンを選択',
    attachLifeCheer: 'ライフのエールを送るホロメンを選択',
    main: 'メインステップ: アクションを選択',
    performance: 'パフォーマンス: アーツを選択',
  };
  return map[pending.type] || pending.type;
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
  document.getElementById('restart-button').addEventListener('click', () => location.reload());
  console.log('✅ バトルシミュレーターv2 初期化完了');

  // 開発・スモークテスト用: ?autostart=1&seed=42 で即ゲーム開始
  const params = new URLSearchParams(location.search);
  if (params.get('autostart')) {
    if (params.get('seed')) document.getElementById('seed-input').value = params.get('seed');
    await startGame();
    // さらに ?autoplay=N で N 手だけ自動プレイ（盤面確認用）
    const autoplay = Number(params.get('autoplay') || 0);
    for (let i = 0; i < autoplay && engine.state.phase !== 'ended'; i++) {
      const actions = engine.actions();
      if (actions.length === 0) break;
      // done/pass 以外を優先して選ぶ（盤面に動きを出すため）
      const active = actions.filter((a) => a.id !== 'done' && a.kind !== 'pass' && a.id !== 'yes');
      engine.apply((active[0] || actions[0]).id);
    }
    console.log('✅ autostart 完了');
  }
}

main();
