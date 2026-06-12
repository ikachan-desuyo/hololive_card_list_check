/**
 * 盤面レンダリング（エンジンの state → DOM）
 * 毎回フル再描画するシンプルな実装（カード枚数は高々数十なので十分軽い）
 */

function el(tag, className, parent) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (parent) parent.appendChild(e);
  return e;
}

function cardEl(card, opts = {}) {
  const e = el('div', 'card');
  if (opts.faceDown) {
    e.classList.add('facedown');
  } else if (card?.imageUrl) {
    const img = document.createElement('img');
    img.src = card.imageUrl;
    img.alt = card.name;
    img.loading = 'lazy';
    e.appendChild(img);
  }
  if (card && !opts.faceDown) {
    e.dataset.preview = card.imageUrl || '';
    e.dataset.previewName = card.name;
  }
  if (opts.rested) e.classList.add('rested');
  return e;
}

function holomemEl(holomem) {
  const top = holomem.stack[0];
  const e = cardEl(top, { faceDown: holomem.faceDown, rested: holomem.rested });
  e.classList.add('holomem');
  if (holomem.stack.length > 1) {
    e.classList.add('stack-badge');
    e.dataset.count = holomem.stack.length;
  }
  if (holomem.damage > 0) {
    const b = el('div', 'badge damage', e);
    b.textContent = holomem.damage;
  }
  if (holomem.cheers.length > 0) {
    const b = el('div', 'badge cheers', e);
    b.textContent = `エール${holomem.cheers.length}`;
    b.title = holomem.cheers.map((c) => c.name).join(' / ');
  }
  if (holomem.attachments.length > 0) {
    const b = el('div', 'badge attach', e);
    b.textContent = `+${holomem.attachments.length}`;
    b.title = holomem.attachments.map((c) => c.name).join(' / ');
  }
  return e;
}

function zoneEl(className, label, parent) {
  const z = el('div', `zone ${className}`, parent);
  const l = el('span', 'zone-label', z);
  l.textContent = label;
  return z;
}

function pileEl(count, className = '') {
  const e = el('div', `pile ${className}`);
  e.textContent = count;
  return e;
}

/** 片側プレイヤーの盤面を描画 */
function renderSide(container, p) {
  container.innerHTML = '';

  const life = zoneEl('life', 'ライフ', container);
  for (let i = 0; i < p.life.length; i++) el('div', 'life-card', life);

  const collab = zoneEl('collab', 'コラボ', container);
  if (p.collab) collab.appendChild(holomemEl(p.collab));

  const center = zoneEl('center', 'センター', container);
  if (p.center) center.appendChild(holomemEl(p.center));

  const oshi = zoneEl('oshi', '推し', container);
  if (p.oshi) oshi.appendChild(cardEl(p.oshi));

  const holopower = zoneEl('holopower', 'ホロパワー', container);
  const hp = pileEl(p.holoPower.length, 'small');
  holopower.appendChild(hp);

  const deck = zoneEl('deck', 'デッキ', container);
  deck.appendChild(pileEl(p.deck.length));

  const backs = zoneEl('backs', 'バック', container);
  for (const h of p.back) backs.appendChild(holomemEl(h));

  const cheer = zoneEl('cheerdeck', 'エールデッキ', container);
  cheer.appendChild(pileEl(p.cheerDeck.length));

  const archive = zoneEl('archive', 'アーカイブ', container);
  const ar = pileEl(p.archive.length, 'archive-pile');
  if (p.archive.length > 0) {
    ar.title = '直近: ' + p.archive.slice(-5).map((c) => c.name).join(' / ');
  }
  archive.appendChild(ar);
}

/** 手札を描画。onClickCard(index) でアクションパネルのフィルタに使う */
function renderHand(container, hand, selectedIndex, onClickCard) {
  container.innerHTML = '';
  hand.forEach((card, i) => {
    const e = cardEl(card);
    if (i === selectedIndex) e.classList.add('selected');
    e.addEventListener('click', () => onClickCard(i));
    container.appendChild(e);
  });
}

function renderOppHand(container, count) {
  container.innerHTML = '';
  for (let i = 0; i < count; i++) el('div', 'mini-back', container);
}

export { renderSide, renderHand, renderOppHand };
