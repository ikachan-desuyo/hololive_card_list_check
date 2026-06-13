/**
 * 効果テキストコンパイラ
 *
 * 手書き定義（cards/<番号>.js）が無いカードの効果テキストを定型パターンに分解し、
 * プリミティブ（EffectContext）の組み合わせとして自動実装する。
 *
 * 安全原則:
 *   - スキル枠（ブルーム/コラボ/サポート/アーツ/装着）単位で、その枠の全文を
 *     解釈できた場合のみ実装する。1文でも解釈できなければその枠は「未実装」のまま
 *     （誤った動作をするより、動かない方が安全）
 *   - 解釈できる枠だけ部分的に実装する（例: ブルームは自動、アーツは未実装）
 *
 * 対応パターンを増やす時はこのファイルに SENTENCE_RULES / 各パーサを追加し、
 * 必ず tests/test.js にそのパターンのユニットテストを足すこと。
 *
 * 未対応（手書きが必要）: ギフト、推しスキル、サイコロ分岐、コスト付き効果（～できる：）、
 * 「～につき」の複合、条件前置（～時、）付きの大半、能力追加の特殊効果
 */

// ---------- テキスト正規化 ----------

const Z2H = { '０': '0', '１': '1', '２': '2', '３': '3', '４': '4', '５': '5', '６': '6', '７': '7', '８': '8', '９': '9' };

function normalize(text) {
  return (text || '')
    .replace(/[０-９]/g, (c) => Z2H[c])
    .replace(/\r/g, '')
    .replace(/\n+/g, '\n')
    .trim();
}

/** 文に分割（。区切り。空文は除去） */
function sentences(text) {
  return normalize(text)
    .replace(/\n/g, '')
    .split('。')
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------- フィルタ/対象のパーサ ----------

/**
 * カード条件のパーサ（デッキサーチ等の対象）。
 * 例: 'Debutホロメン' '[〈A〉か〈B〉]' '青ホロメンか紫ホロメン' '〈雪民〉' '#絵を持つホロメン'
 * 戻り値: (card) => bool、解釈不能なら null
 */
function parseCardFilter(spec) {
  spec = spec.replace(/^\[|\]$/g, '').trim();
  // 「AかB」分解
  const parts = spec.split('か').map((p) => p.trim()).filter(Boolean);
  const preds = [];
  for (const part of parts) {
    let m;
    if ((m = /^〈(.+?)〉$/.exec(part))) {
      const name = m[1];
      preds.push((c) => c.name === name);
    } else if ((m = /^(白|緑|赤|青|紫|黄)エール$/.exec(part))) {
      const color = m[1];
      preds.push((c) => c.kind === 'cheer' && c.color === color);
    } else if (part === 'エール') {
      preds.push((c) => c.kind === 'cheer');
    } else if ((m = /^(Debut|1st|2nd|Spot)ホロメン$/.exec(part))) {
      const lv = m[1];
      preds.push((c) => c.kind === 'holomen' && c.bloomLevel === lv);
    } else if ((m = /^(白|緑|赤|青|紫|黄)ホロメン$/.exec(part))) {
      const color = m[1];
      preds.push((c) => c.kind === 'holomen' && c.color === color);
    } else if ((m = /^#(\S+?)を持つホロメン$/.exec(part))) {
      const tag = m[1];
      preds.push((c) => c.kind === 'holomen' && (c.tags || []).includes(tag));
    } else if (part === 'ホロメン') {
      preds.push((c) => c.kind === 'holomen');
    } else {
      return null; // 解釈できない条件
    }
  }
  if (preds.length === 0) return null;
  return (c) => preds.some((p) => p(c));
}

/**
 * 自分のホロメン対象のパーサ。
 * 例: '自分のセンターホロメン' '自分のセンターホロメンかコラボホロメン' '自分のホロメン1人'
 *     '自分の〈X〉' '#TAGを持つ自分のホロメン1人' '自分の#TAGを持つホロメン'
 *     '自分の〈X〉以外の#TAGを持つホロメン'
 * 戻り値: { filter(ctx)=>entryフィルタ, choice: 選択が必要か } / null
 */
function parseSelfTarget(spec) {
  spec = spec.trim().replace(/1人$/, '').trim();
  let m;
  if ((m = /^(?:自分の)?センターホロメンかコラボホロメン$/.exec(spec))) {
    return { make: () => (e) => e.pos.zone === 'center' || e.pos.zone === 'collab' };
  }
  if (/^(?:自分の)?センターホロメン$/.test(spec)) {
    return { make: () => (e) => e.pos.zone === 'center' };
  }
  if (/^(?:自分の)?コラボホロメン$/.test(spec)) {
    return { make: () => (e) => e.pos.zone === 'collab' };
  }
  if (/^(?:自分の)?バックホロメン$/.test(spec)) {
    return { make: () => (e) => e.pos.zone === 'back' };
  }
  if (/^(?:自分の)?ホロメン$/.test(spec)) {
    return { make: () => () => true };
  }
  if ((m = /^自分の〈(.+?)〉$/.exec(spec))) {
    const name = m[1];
    return { make: () => (e) => e.top.name === name };
  }
  if ((m = /^(?:自分の)?〈(.+?)〉以外の#(\S+?)を持つ(?:自分の)?ホロメン$/.exec(spec))) {
    const name = m[1];
    const tag = m[2];
    return { make: () => (e) => e.top.name !== name && (e.top.tags || []).includes(tag) };
  }
  if ((m = /^(?:自分の)?#(\S+?)を持つ(?:自分の)?ホロメン$/.exec(spec))) {
    const tag = m[1];
    return { make: () => (e) => (e.top.tags || []).includes(tag) };
  }
  return null;
}

/**
 * 相手のホロメン対象のパーサ（特殊ダメージ用）。
 * 戻り値: { filter, choice } / null。choice=false は対象が一意（センター直接など）
 */
function parseOppTarget(spec) {
  spec = spec.trim();
  let m;
  if ((m = /^相手の(センター|コラボ)ホロメン$/.exec(spec))) {
    const zone = m[1] === 'センター' ? 'center' : 'collab';
    return { filter: (e) => e.pos.zone === zone, choice: false };
  }
  if (/^相手のセンターホロメンかバックホロメン1人$/.test(spec)) {
    return { filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'back', choice: true };
  }
  if (/^相手のセンターホロメンかコラボホロメン(1人)?$/.test(spec)) {
    return { filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab', choice: true };
  }
  if (/^相手のホロメン1人$/.test(spec)) {
    return { filter: () => true, choice: true };
  }
  return null;
}

// ---------- 文 → ステップ ----------

/** 無視してよい注釈文（カード情報側で処理済みのもの） */
const IGNORABLE = [
  /^LIMITED：ターンに1枚しか使えない$/,
  /^(ツール|マスコット)は、自分のホロメン1人につき1枚だけ付けられる$/,
];

/**
 * 1文をステップに変換。解釈できなければ null。
 * step: { kind, ...params } または { kind: 'ignore' }
 */
function compileSentence(s) {
  let m;
  if (IGNORABLE.some((rx) => rx.test(s))) return { kind: 'ignore' };

  // ドロー
  if ((m = /^自分のデッキを(\d+)枚引く$/.exec(s))) {
    return { kind: 'draw', n: Number(m[1]) };
  }
  // シャッフル
  if (/^そしてデッキをシャッフルする$/.test(s)) return { kind: 'shuffleDeck' };
  if (/^そしてエールデッキをシャッフルする$/.test(s)) return { kind: 'shuffleCheerDeck' };

  // デッキサーチ → 手札
  if ((m = /^自分のデッキから、?(.+?)(\d+)枚を?公開し、?手札に加える$/.exec(s))) {
    const filter = parseCardFilter(m[1]);
    if (!filter) return null;
    return { kind: 'searchToHand', filter, n: Number(m[2]) };
  }

  // エールデッキの上から送る
  if ((m = /^自分のエールデッキの上から(\d+)枚を、?(.+?)に送る$/.exec(s))) {
    const target = parseSelfTarget(m[2]);
    if (!target) return null;
    return { kind: 'cheerDeckTopTo', n: Number(m[1]), target };
  }

  // アーカイブのエールを送る（「ずつ」=別々の対象に1枚ずつ）
  if ((m = /^自分のアーカイブの(.+?)(\d+)枚(ずつ)?を、?(.+?)に送(る|れる)$/.exec(s))) {
    const cheerFilter = parseCardFilter(m[1]);
    const target = parseSelfTarget(m[4]);
    if (!cheerFilter || !target) return null;
    return {
      kind: 'archiveCheerTo',
      n: Number(m[2]),
      each: !!m[3],
      target,
      cheerFilter,
      optional: m[5] === 'れる',
    };
  }

  // 特殊ダメージ
  if ((m = /^(相手の.+?)に特殊ダメージ(\d+)を与える$/.exec(s))) {
    const target = parseOppTarget(m[1]);
    if (!target) return null;
    return { kind: 'specialDamage', target, n: Number(m[2]), noLife: false };
  }
  // 直前の特殊ダメージへの修飾
  if (/^ただし、ダウンしても相手のライフは減らない$/.test(s)) {
    return { kind: 'modifyPrevNoLife' };
  }

  // HP回復（対象を選ぶ）
  if ((m = /^自分のホロメン(\d+)人のHP(\d+)回復(する)?$/.exec(s))) {
    return { kind: 'healChoose', count: Number(m[1]), amount: Number(m[2]) };
  }

  // デッキの上からN枚を見る（後続の「その中から～」「残ったカードを～」とセットで使う）
  if ((m = /^自分のデッキの上から(\d+)枚を見る$/.exec(s))) {
    return { kind: 'lookTop', n: Number(m[1]) };
  }
  if ((m = /^その中から、?(.+?)(\d+)枚(まで)?を?公開し、?手札に加える$/.exec(s))) {
    const filter = parseCardFilter(m[1]);
    if (!filter) return null;
    return { kind: 'pickFromLooked', filter, n: Number(m[2]), upTo: !!m[3] };
  }
  if (/^そして残ったカードを好きな順でデッキの下に戻す$/.test(s)) {
    return { kind: 'lookedToBottom' };
  }

  return null;
}

/** 文の列をステップ列へ（全文成功時のみ） */
function compileSteps(text) {
  const list = sentences(text);
  if (list.length === 0) return null;
  const steps = [];
  for (const s of list) {
    const step = compileSentence(s);
    if (!step) return null;
    if (step.kind === 'modifyPrevNoLife') {
      const prev = steps[steps.length - 1];
      if (!prev || prev.kind !== 'specialDamage') return null;
      prev.noLife = true;
      continue;
    }
    if (step.kind !== 'ignore') steps.push(step);
  }
  // 「見る」系の整合性: pickFromLooked / lookedToBottom は lookTop とセットでなければ不正。
  // 見たカードを残したまま終わる（lookTop があるのに lookedToBottom が無い）のも不採用
  const hasLook = steps.some((st) => st.kind === 'lookTop');
  const usesLook = steps.some((st) => st.kind === 'pickFromLooked' || st.kind === 'lookedToBottom');
  if (usesLook && !hasLook) return null;
  if (hasLook && !steps.some((st) => st.kind === 'lookedToBottom')) return null;
  return steps.length > 0 ? steps : null;
}

// ---------- ステップ実行 ----------

const RUNNERS = {
  *draw(ctx, step) {
    ctx.draw(step.n);
  },
  *shuffleDeck(ctx) {
    ctx.shuffleDeck();
  },
  *shuffleCheerDeck(ctx) {
    ctx.shuffleCheerDeck();
  },
  *searchToHand(ctx, step) {
    for (let i = 0; i < step.n; i++) {
      const candidates = ctx.deckCards(step.filter);
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: 'デッキから手札に加えるカードを選択',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (!picked) break;
      ctx.removeFromDeck(picked);
      ctx.addToHand(picked);
    }
  },
  *cheerDeckTopTo(ctx, step) {
    for (let i = 0; i < step.n; i++) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: step.target.make(ctx),
        title: 'エールデッキの上から送る先のホロメンを選択',
      });
      if (!entry) break;
      ctx.sendCheerFromCheerDeckTop(entry.holomem);
    }
  },
  *archiveCheerTo(ctx, step) {
    const used = new Set();
    for (let i = 0; i < step.n; i++) {
      const cheers = ctx.player.archive.filter(step.cheerFilter);
      if (cheers.length === 0) break;
      const targetFilter = step.target.make(ctx);
      const eligible = ctx.holomems('self', (e) =>
        targetFilter(e) && (!step.each || !used.has(e.holomem)));
      if (eligible.length === 0) break;
      const picked = yield ctx.chooseCard({
        cards: cheers,
        title: `アーカイブから送るエールを選択（${i + 1}/${step.n}）`,
        optional: step.optional,
        skipLabel: '送らない',
      });
      if (!picked) break;
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => targetFilter(e) && (!step.each || !used.has(e.holomem)),
        title: 'エールを送るホロメンを選択',
      });
      if (!entry) break;
      used.add(entry.holomem);
      ctx.removeFromArchive(picked);
      ctx.attachCheer(picked, entry.holomem);
    }
  },
  *specialDamage(ctx, step) {
    let entry = null;
    if (step.target.choice) {
      entry = yield ctx.chooseHolomem({
        side: 'opp',
        filter: step.target.filter,
        title: `特殊ダメージ${step.n}を与える相手ホロメンを選択`,
      });
    } else {
      entry = ctx.holomems('opp', step.target.filter)[0] || null;
    }
    if (entry) ctx.dealSpecialDamage(entry, step.n, { noLifeOnDown: step.noLife });
  },
  *healChoose(ctx, step) {
    for (let i = 0; i < step.count; i++) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.holomem.damage > 0,
        title: `HPを${step.amount}回復するホロメンを選択`,
      });
      if (!entry) break;
      ctx.heal(entry.holomem, step.amount);
    }
  },

  *lookTop(ctx, step, state) {
    state.looked = ctx.lookTopDeck(step.n);
  },
  *pickFromLooked(ctx, step, state) {
    const pool = state.looked || [];
    for (let i = 0; i < step.n; i++) {
      const candidates = pool.filter(step.filter);
      if (candidates.length === 0) break;
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: '手札に加えるカードを選択',
        optional: step.upTo,
        skipLabel: '加えない',
        displayCards: pool,
      });
      if (!picked) break;
      pool.splice(pool.indexOf(picked), 1);
      ctx.addToHand(picked);
    }
  },
  *lookedToBottom(ctx, step, state) {
    const pool = state.looked || [];
    if (pool.length > 0) {
      const ordered = yield* ctx.orderCardsFlow(pool, 'デッキの下に戻す順番');
      ctx.deckToBottom(ordered);
      ctx.log(`残り${ordered.length}枚をデッキの下に戻した`);
    }
    state.looked = [];
  },
};

function makeRun(steps) {
  return function* run(ctx) {
    const state = {}; // ステップ間で共有する状態（「見た」カードの保持など）
    for (const step of steps) {
      yield* RUNNERS[step.kind](ctx, step, state);
    }
  };
}

// ---------- アーツの dmgBonus ----------

/** アーツ説明文 → { dmgBonus } or ステップ or null（文単位） */
function compileArtSentence(s) {
  let m;
  // 「自分のステージに～がいる時、このアーツ+N」
  if ((m = /^自分のステージに(.+?)がいる時、このアーツ\+(\d+)$/.exec(s))) {
    const target = parseSelfTarget(m[1]);
    if (!target) return null;
    const n = Number(m[2]);
    return { bonus: (ctx) => (ctx.holomems('self', target.make(ctx)).length > 0 ? n : 0) };
  }
  // 「自分のステージにエールが2色以上ある時、このアーツ+N」
  if ((m = /^自分のステージにエールが(\d+)色以上ある時、このアーツ\+(\d+)$/.exec(s))) {
    const colors = Number(m[1]);
    const n = Number(m[2]);
    return { bonus: (ctx) => (ctx.ownStageCheerColors().length >= colors ? n : 0) };
  }
  // 「自分のステージのエール1色につき、このアーツ+N」
  if ((m = /^自分のステージのエール1色につき、このアーツ\+(\d+)$/.exec(s))) {
    const n = Number(m[1]);
    return { bonus: (ctx) => ctx.ownStageCheerColors().length * n };
  }
  // 「このホロメンに付いている〈X〉1枚につき、このアーツ+N」
  if ((m = /^このホロメンに付いている〈(.+?)〉1枚につき、このアーツ\+(\d+)$/.exec(s))) {
    const name = m[1];
    const n = Number(m[2]);
    return {
      bonus: (ctx) => (ctx.sourceHolomem?.attachments.filter((a) => a.name === name).length || 0) * n,
    };
  }
  // 通常ステップ（特殊ダメージ等）も許容
  const step = compileSentence(s);
  return step ? { step } : null;
}

function compileArt(text) {
  const list = sentences(text);
  if (list.length === 0) return null;
  const bonuses = [];
  const steps = [];
  for (const s of list) {
    const r = compileArtSentence(s);
    if (!r) return null;
    if (r.bonus) bonuses.push(r.bonus);
    else if (r.step) {
      if (r.step.kind === 'modifyPrevNoLife') {
        const prev = steps[steps.length - 1];
        if (!prev || prev.kind !== 'specialDamage') return null;
        prev.noLife = true;
        continue;
      }
      if (r.step.kind !== 'ignore') steps.push(r.step);
    }
  }
  const def = {};
  if (bonuses.length > 0) def.dmgBonus = (ctx) => bonuses.reduce((sum, b) => sum + b(ctx), 0);
  if (steps.length > 0) def.run = makeRun(steps);
  return (def.dmgBonus || def.run) ? def : null;
}

// ---------- 装着カード（ツール/マスコット/ファン） ----------

function compileAttached(text, supportType) {
  // 段落（空行区切り）単位で処理。全段落を解釈できた場合のみ採用
  const blocks = normalize(text).split(/\n+/).map((b) => b.trim()).filter(Boolean);
  const attached = {};
  const def = {};
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i].replace(/。$/, '');
    let m;
    if (IGNORABLE.some((rx) => rx.test(b))) {
      i++;
      continue;
    }
    // アーツ+N
    if ((m = new RegExp(`^この(マスコット|ツール|ファン)が付いているホロメンのアーツ\\+(\\d+)$`).exec(b))) {
      const n = Number(m[2]);
      const prev = attached.artsPlus;
      attached.artsPlus = prev ? (h, e) => prev(h, e) + n : () => n;
      i++;
      continue;
    }
    // HP+N（無条件）
    if ((m = /^この(マスコット|ツール|ファン)が付いているホロメンのHP\+(\d+)$/.exec(b))) {
      const n = Number(m[2]);
      attached.hpPlus = () => n;
      i++;
      continue;
    }
    // 相手のセンターホロメンへの特殊ダメージ+N
    if ((m = /^この(ファン|マスコット|ツール)が付いているホロメンが、相手のセンターホロメンに与える特殊ダメージ\+(\d+)$/.exec(b))) {
      const n = Number(m[2]);
      attached.specialDmgPlus = (src, targetEntry) => (targetEntry.pos.zone === 'center' ? n : 0);
      i++;
      continue;
    }
    // ファンの付け先ルール
    if ((m = /^このファンは、自分の〈(.+?)〉だけに付けられ、1人につき何枚でも付けられる$/.exec(b))) {
      const name = m[1];
      def.attachRule = { canAttach: (h) => h.stack[0].name === name, unlimited: true };
      i++;
      continue;
    }
    // ◆〈X〉に付いていたら能力追加 + 次の段落が HP+N のみ対応
    if ((m = /^◆〈(.+?)〉に付いていたら能力追加$/.exec(b))) {
      const name = m[1];
      const next = (blocks[i + 1] || '').replace(/。$/, '');
      const hm = /^この(マスコット|ツール|ファン)が付いているホロメンのHP\+(\d+)$/.exec(next);
      if (!hm) return null; // HP+N 以外の能力追加は手書き対象
      const n = Number(hm[2]);
      attached.hpPlus = (h) => (h.stack[0].name === name ? n : 0);
      i += 2;
      continue;
    }
    return null; // 解釈できない段落
  }
  if (Object.keys(attached).length === 0 && !def.attachRule) return null;
  if (Object.keys(attached).length > 0) def.attached = attached;
  return def;
}

// ---------- サポート（スタッフ/アイテム/イベント） ----------

function compileSupport(text) {
  const norm = normalize(text).replace(/\n+/g, '');
  let canUse = null;
  let body = norm;
  // 使用条件: 手札枚数
  const condM = /^このカードは、自分の手札がこのカードを含まずに(\d+)枚(以上|以下)で?なければ使えない。/.exec(norm);
  if (condM) {
    const n = Number(condM[1]);
    const over = condM[2] === '以上';
    canUse = (ctx) => {
      const others = ctx.player.hand.length - 1; // プレイ前なので自分を除く
      return over ? others >= n : others <= n;
    };
    body = norm.slice(condM[0].length);
  }
  const steps = compileSteps(body);
  if (!steps) return null;
  const def = { run: makeRun(steps) };
  if (canUse) def.canUse = canUse;
  return def;
}

// ---------- カード全体のコンパイル ----------

/**
 * 正規化済みカード1種をコンパイルし、解釈できたスキル枠だけの定義を返す。
 * 1枠も解釈できなければ null。
 */
export function compileCard(card) {
  const def = {};

  // キーワード（ブルーム/コラボ。ギフトは未対応）
  for (const kw of card.keywords || []) {
    if (kw.subtype === 'ブルームエフェクト' || kw.subtype === 'コラボエフェクト') {
      const steps = compileSteps(kw.text);
      if (steps) {
        const slot = kw.subtype === 'ブルームエフェクト' ? 'bloomEffect' : 'collabEffect';
        def[slot] = { name: kw.name, run: makeRun(steps) };
      }
    }
  }

  // サポート
  if (card.kind === 'support' && card.supportText) {
    if (['ツール', 'マスコット', 'ファン'].includes(card.supportType)) {
      const attachedDef = compileAttached(card.supportText, card.supportType);
      if (attachedDef) Object.assign(def, attachedDef);
    } else {
      const supportDef = compileSupport(card.supportText);
      if (supportDef) def.support = supportDef;
    }
  }

  // アーツ
  for (const art of card.arts || []) {
    if (!art.text) continue;
    const artDef = compileArt(art.text);
    if (artDef) {
      def.arts = def.arts || {};
      def.arts[art.name] = artDef;
    }
  }

  if (Object.keys(def).length === 0) return null;
  def.number = card.number;
  def.autoCompiled = true;
  return def;
}
