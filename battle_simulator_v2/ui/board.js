/**
 * 盤面レンダリング（エンジンの state → DOM）
 *
 * 毎回フル再描画するシンプルな実装。
 * - ドラッグ&ドロップ用の識別子を data 属性で付与する:
 *     data-src  = "side:zone:index"（掴める対象。例 "0:hand:2", "0:back:1", "0:center:0"）
 *     data-drop = "side:zone:..."（落とせる場所。例 "0:zone:back", "1:mem:center:0"）
 * - クリックでカード詳細（インスペクタ）を開くため hooks.onInspect を呼ぶ
 */

const SLEEVE = 'images/card_sleeve.jpg'; // 公式カード裏面

function el(tag, className, parent) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (parent) parent.appendChild(e);
  return e;
}

/** 山札系の「厚み」: 枚数に応じた多段シャドウ */
function stackShadow(count) {
  const layers = Math.min(8, Math.ceil(count / 6));
  const shadows = [];
  for (let i = 1; i <= layers; i++) {
    shadows.push(`${i * 1.5}px ${i * 1.5}px 0 rgba(8, 9, 20, 0.9)`);
  }
  return shadows.join(', ');
}

function cardEl(card, opts = {}) {
  const e = el('div', 'card');
  if (opts.faceDown || !card) {
    e.classList.add('facedown');
  } else {
    if (card.imageUrl) {
      const img = document.createElement('img');
      img.src = card.imageUrl;
      img.alt = card.name;
      img.loading = 'lazy';
      img.draggable = false;
      e.appendChild(img);
    }
    e.dataset.preview = card.imageUrl || '';
    e.dataset.previewName = card.name;
  }
  return e;
}

/** ステージのホロメン1人（スタックの厚み・エール・付けたサポートを可視化） */
function holomemEl(holomem, sideIdx, zone, index, hooks) {
  const group = el('div', 'holomem-group');
  group.dataset.drop = `${sideIdx}:mem:${zone}:${index}`;
  group.dataset.src = `${sideIdx}:${zone}:${index}`;
  if (holomem.rested) group.classList.add('rested');

  // 重なっている下のカード（Bloom元）: 上端を少しずつ見せて厚みを出す
  const lower = holomem.stack.slice(1);
  lower.forEach((card, i) => {
    const under = cardEl(card, { faceDown: holomem.faceDown });
    under.classList.add('stack-under');
    under.style.transform = `translateY(${-7 * (lower.length - i)}px)`;
    under.style.zIndex = String(i);
    group.appendChild(under);
  });

  // 本体（一番上のカード）
  const main = cardEl(holomem.stack[0], { faceDown: holomem.faceDown });
  main.classList.add('holomem-main');
  main.style.zIndex = String(lower.length + 1);
  group.appendChild(main);

  // 付いているエール（左下にファン状に見せる）
  const showCheers = holomem.cheers.slice(0, 6);
  showCheers.forEach((cheer, i) => {
    const mini = el('div', 'mini-card cheer-mini', group);
    if (cheer.imageUrl) {
      const img = document.createElement('img');
      img.src = cheer.imageUrl;
      img.alt = cheer.name;
      img.draggable = false;
      mini.appendChild(img);
    }
    mini.style.left = `${-14 - i * 13}px`;
    mini.style.bottom = `${-12 + i * 3}px`;
    mini.style.transform = `rotate(${-8 - i * 6}deg)`;
    mini.style.zIndex = String(-1 - i);
    mini.dataset.preview = cheer.imageUrl || '';
    mini.dataset.previewName = cheer.name;
  });
  if (holomem.cheers.length > 6) {
    const more = el('div', 'badge cheers-more', group);
    more.textContent = `+${holomem.cheers.length - 6}`;
  }

  // 付いているサポート（ツール/マスコット/ファン: 右下にファン状）
  holomem.attachments.slice(0, 4).forEach((att, i) => {
    const mini = el('div', 'mini-card attach-mini', group);
    if (att.imageUrl) {
      const img = document.createElement('img');
      img.src = att.imageUrl;
      img.alt = att.name;
      img.draggable = false;
      mini.appendChild(img);
    }
    mini.style.right = `${-14 - i * 13}px`;
    mini.style.bottom = `${-12 + i * 3}px`;
    mini.style.transform = `rotate(${8 + i * 6}deg)`;
    mini.style.zIndex = String(-1 - i);
    mini.dataset.preview = att.imageUrl || '';
    mini.dataset.previewName = att.name;
  });

  // HPバッジ（残りHP/最大HP。装着カードのHP修正込みの実効値。残量に応じて色が変わる）
  // 無傷でも常に表示する
  {
    const maxHp = hooks.effectiveHp ? hooks.effectiveHp(holomem) : (holomem.stack[0].hp ?? 0);
    if (maxHp > 0 && !holomem.faceDown) {
      const remain = Math.max(0, maxHp - holomem.damage);
      const b = el('div', 'badge damage', group);
      b.textContent = `${remain}/${maxHp}`;
      const ratio = remain / maxHp;
      if (ratio <= 0.3) b.classList.add('hp-low');
      else if (ratio <= 0.6) b.classList.add('hp-mid');
      b.style.zIndex = String(lower.length + 2);
    }
  }

  // アーツ補正バッジ（継続効果・装着・アウラ等によるアーツ±N。アーツを持つホロメンのみ・左上）
  if (!holomem.faceDown && hooks.artsBonus && (holomem.stack[0].arts || []).length) {
    const bonus = hooks.artsBonus(holomem, sideIdx) || 0;
    if (bonus !== 0) {
      const badge = el('div', 'badge arts-mod' + (bonus < 0 ? ' neg' : ''), group);
      badge.textContent = `⚔${bonus > 0 ? '+' : ''}${bonus}`;
      badge.title = `継続効果でアーツ${bonus > 0 ? '+' : ''}${bonus}`;
      badge.style.zIndex = String(lower.length + 3);
    }
  }

  // バトンタッチ必要コスト変化バッジ（センターのみ・継続効果でバトン必要エールが増減している時）
  if (!holomem.faceDown && zone === 'center' && hooks.batonDelta) {
    const d = hooks.batonDelta(holomem, sideIdx) || 0;
    if (d !== 0) {
      const badge = el('div', 'badge baton-mod' + (d < 0 ? ' down' : ''), group);
      badge.textContent = `🔁${d > 0 ? '+' : ''}${d}`;
      badge.title = `継続効果でバトンタッチ必要エール${d > 0 ? '+' : ''}${d}`;
      badge.style.zIndex = String(lower.length + 3);
    }
  }

  // クリックで詳細（スタック全体 + 付いているカード）
  group.addEventListener('click', (e) => {
    e.stopPropagation();
    if (holomem.faceDown) return;
    hooks.onInspect({
      title: `${holomem.stack[0].name}（${zone === 'center' ? 'センター' : zone === 'collab' ? 'コラボ' : 'バック'}）`,
      sections: [
        { label: holomem.stack.length > 1 ? 'ホロメン（上から順）' : 'ホロメン', cards: holomem.stack },
        ...(holomem.cheers.length ? [{ label: `エール (${holomem.cheers.length})`, cards: holomem.cheers }] : []),
        ...(holomem.attachments.length ? [{ label: 'サポート', cards: holomem.attachments }] : []),
      ],
      note: (() => {
        const maxHp = hooks.effectiveHp ? hooks.effectiveHp(holomem) : (holomem.stack[0].hp ?? 0);
        const base = holomem.stack[0].hp ?? 0;
        const bonus = maxHp - base;
        return `残りHP: ${Math.max(0, maxHp - holomem.damage)}/${maxHp}` +
          `${bonus !== 0 ? `（基礎${base}${bonus > 0 ? '+' : ''}${bonus}）` : ''}` +
          `（累計ダメージ${holomem.damage}）${holomem.rested ? '（お休み中）' : ''}`;
      })(),
    });
  });

  return group;
}

function zoneEl(className, label, parent, dropKey) {
  const z = el('div', `zone ${className}`, parent);
  const l = el('span', 'zone-label', z);
  l.textContent = label;
  if (dropKey) z.dataset.drop = dropKey;
  return z;
}

function pileEl(count, opts = {}) {
  const e = el('div', `pile ${opts.className || ''}`);
  e.style.backgroundImage = `url(${SLEEVE})`;
  if (count > 0) e.style.boxShadow = stackShadow(count);
  const n = el('span', 'pile-count', e);
  n.textContent = count;
  if (count === 0) e.classList.add('empty');
  return e;
}

/** 片側プレイヤーの盤面を描画 */
export function renderSide(container, p, sideIdx, hooks) {
  container.innerHTML = '';
  container.dataset.drop = `${sideIdx}:zone:table`; // サポート使用などの「場に出す」ドロップ先

  // ライフ（カード自体は横向き、縦に少しずつ重ねて表示）
  const life = zoneEl('life', 'ライフ', container);
  for (let i = 0; i < p.life.length; i++) {
    const slot = el('div', 'life-slot', life);
    el('div', 'life-inner', slot);
  }

  const collab = zoneEl('collab', 'コラボ', container, `${sideIdx}:zone:collab`);
  if (p.collab) collab.appendChild(holomemEl(p.collab, sideIdx, 'collab', 0, hooks));

  const center = zoneEl('center', 'センター', container, `${sideIdx}:zone:center`);
  if (p.center) center.appendChild(holomemEl(p.center, sideIdx, 'center', 0, hooks));

  const oshi = zoneEl('oshi', '推し', container);
  if (p.oshi) {
    const oc = cardEl(p.oshi);
    // 推しスキルが発動可能なら金色に光らせる（クリックでスキル選択）
    if (hooks.oshiCanAct?.(sideIdx)) oc.classList.add('can-act');
    oc.addEventListener('click', (e) => {
      e.stopPropagation();
      if (hooks.onOshi) hooks.onOshi(sideIdx, p.oshi, e);
      else hooks.onInspect({ title: `推しホロメン: ${p.oshi.name}`, sections: [{ label: '推しホロメン', cards: [p.oshi] }] });
    });
    oshi.appendChild(oc);
  }

  // ホロパワーはプレイシート準拠でカードを横向きに置く
  const holopower = zoneEl('holopower', 'ホロパワー', container);
  const hpPile = el('div', 'pile landscape');
  el('div', 'pile-rot', hpPile);
  if (p.holoPower.length > 0) hpPile.style.filter = `drop-shadow(2px 2px 0 rgba(8,9,20,0.9))`;
  else hpPile.classList.add('empty');
  const hpCount = el('span', 'pile-count', hpPile);
  hpCount.textContent = p.holoPower.length;
  holopower.appendChild(hpPile);

  const deck = zoneEl('deck', 'デッキ', container, `${sideIdx}:zone:deck`);
  deck.appendChild(pileEl(p.deck.length));

  const backs = zoneEl('backs', 'バック', container, `${sideIdx}:zone:back`);
  p.back.forEach((h, i) => backs.appendChild(holomemEl(h, sideIdx, 'back', i, hooks)));

  const cheer = zoneEl('cheerdeck', 'エールデッキ', container);
  cheer.appendChild(pileEl(p.cheerDeck.length));

  // 公開中のカード（エールステップ/ライフ処理で移動先選択中のカード）
  if (p.revealed.length > 0) {
    const rev = zoneEl('revealed', '公開中', container);
    p.revealed.forEach((card, i) => {
      const c = cardEl(card);
      c.dataset.src = `${sideIdx}:revealed:${i}`;
      c.classList.add('revealed-card');
      rev.appendChild(c);
    });
  }

  // アーカイブ（クリックで一覧）
  const archive = zoneEl('archive', 'アーカイブ', container);
  const ar = el('div', 'pile archive-pile', archive);
  if (p.archive.length > 0) {
    const last = p.archive[p.archive.length - 1];
    if (last.imageUrl) {
      const img = document.createElement('img');
      img.src = last.imageUrl;
      img.alt = last.name;
      img.draggable = false;
      ar.appendChild(img);
    }
    ar.style.boxShadow = stackShadow(p.archive.length);
  } else {
    ar.classList.add('empty');
  }
  const n = el('span', 'pile-count', ar);
  n.textContent = p.archive.length;
  ar.addEventListener('click', (e) => {
    e.stopPropagation();
    hooks.onArchive(sideIdx);
  });
}

/** 手札を描画（acting player のもの） */
export function renderHand(container, hand, sideIdx, hooks) {
  container.innerHTML = '';
  hand.forEach((card, i) => {
    const e = cardEl(card);
    e.dataset.src = `${sideIdx}:hand:${i}`;
    e.addEventListener('click', (ev) => {
      ev.stopPropagation();
      hooks.onInspect({ title: card.name, sections: [{ label: '手札', cards: [card] }] });
    });
    container.appendChild(e);
  });
}

/** 相手の手札。通常は裏向きミニカード（枚数のみ）。showFaces=true（観戦時）は表向きで中身を見せる。 */
export function renderOppHand(container, handOrCount, showFaces = false) {
  container.innerHTML = '';
  if (showFaces && Array.isArray(handOrCount)) {
    for (const card of handOrCount) {
      const c = el('div', 'mini-face', container);
      c.style.backgroundImage = `url(${card.imageUrl || card.image_url || ''})`;
      c.title = card.name || '';
    }
    return;
  }
  const count = Array.isArray(handOrCount) ? handOrCount.length : handOrCount;
  for (let i = 0; i < count; i++) {
    const c = el('div', 'mini-back', container);
    c.style.backgroundImage = `url(${SLEEVE})`;
  }
}
