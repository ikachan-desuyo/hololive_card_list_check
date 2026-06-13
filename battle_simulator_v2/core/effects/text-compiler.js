/**
 * 効果テキストコンパイラ
 *
 * 手書き定義（cards/<番号>.js）が無いカードの効果テキストを定型パターンに分解し、
 * プリミティブ（EffectContext）の組み合わせとして自動実装する。
 *
 * 安全原則:
 *   - スキル枠（ブルーム/コラボ/サポート/アーツ/装着/推しスキル）単位で、その枠の
 *     全文を解釈できた場合のみ実装する。1文でも解釈できなければその枠は「未実装」
 *     のまま（誤った動作をするより、動かない方が安全）
 *   - 解釈できる枠だけ部分的に実装する（例: ブルームは自動、アーツは未実装）
 *
 * 対応パターンを増やす時はこのファイルに追加し、必ず tests/test.js に
 * そのパターンのユニットテストを足すこと。
 *
 * 未対応（手書きまたはエンジン拡張が必要）:
 *   ギフト全般 / 「～時に使える」タイミング推しスキル / ダメージ・アーツ使用などの
 *   トリガーで発動する◆能力 / 対象拡張（バックも対象にできる）/ 移動・交代の禁止 /
 *   能力変更可能 / 置換効果
 */

// ---------- テキスト正規化 ----------

const Z2H = { '０': '0', '１': '1', '２': '2', '３': '3', '４': '4', '５': '5', '６': '6', '７': '7', '８': '8', '９': '9' };

function normalize(text) {
  return (text || '')
    .replace(/[０-９]/g, (c) => Z2H[c])
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, '')
    .trim();
}

/** 文に分割（。区切り。「：」を含む文はサイコロ/コスト構文として丸ごと1要素） */
function sentences(text) {
  const flat = normalize(text).replace(/\n+/g, '');
  const out = [];
  let buf = '';
  let inColon = false;
  for (const part of flat.split('。')) {
    if (!part) continue;
    if (inColon) {
      buf += part + '。';
      continue;
    }
    if (part.includes('：')) {
      inColon = true;
      buf = part + '。';
      continue;
    }
    out.push(part);
  }
  if (buf) out.push(buf.replace(/。$/, ''));
  return out;
}

// ---------- フィルタ/対象のパーサ ----------

/**
 * カード条件のパーサ（デッキサーチ等の対象）。
 * 戻り値: (card, ctx) => bool、解釈不能なら null
 */
export function parseCardFilter(spec) {
  spec = spec.replace(/^\[|\]$/g, '').replace(/^、|、$/g, '').trim();

  // 前置修飾: 「#TAGを持つ」「Buzz以外の」「自分の推しホロメンと同色の」「自分のホロメン1人と同色の」
  const mods = [];
  let rest = spec;
  let changed = true;
  while (changed) {
    changed = false;
    let m;
    if ((m = /^#(\S+?)を持つ(.*)$/.exec(rest))) {
      const tag = m[1];
      mods.push((c) => (c.tags || []).includes(tag));
      rest = m[2];
      changed = true;
    } else if ((m = /^Buzz以外の(.*)$/.exec(rest))) {
      mods.push((c) => !c.buzz);
      rest = m[1];
      changed = true;
    } else if ((m = /^自分の推しホロメンと同色の(.*)$/.exec(rest))) {
      mods.push((c, ctx) => !!ctx && c.color === ctx.player.oshi.color);
      rest = m[1];
      changed = true;
    } else if ((m = /^LIMITEDの(.*)$/.exec(rest))) {
      mods.push((c) => c.limited);
      rest = m[1];
      changed = true;
    }
  }

  const parts = rest.split('か').map((p) => p.trim()).filter(Boolean);
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
    } else if (part === 'Buzzホロメン') {
      preds.push((c) => c.kind === 'holomen' && c.buzz);
    } else if (part === 'ホロメン') {
      preds.push((c) => c.kind === 'holomen');
    } else if (['ツール', 'マスコット', 'ファン', 'アイテム', 'イベント', 'スタッフ'].includes(part)) {
      preds.push((c) => c.kind === 'support' && c.supportType === part);
    } else if (part === 'サポートカード') {
      preds.push((c) => c.kind === 'support');
    } else {
      return null;
    }
  }
  if (preds.length === 0 && mods.length === 0) return null;
  const orPred = preds.length > 0 ? (c) => preds.some((p) => p(c)) : () => true;
  return (c, ctx) => orPred(c) && mods.every((mod) => mod(c, ctx));
}

/**
 * 自分のホロメン対象のパーサ。
 * 戻り値: { make: (ctx) => (entry) => bool } / null
 */
export function parseSelfTarget(spec) {
  spec = spec.trim().replace(/1人$/, '').trim();
  let m;
  if (/^(?:自分の)?センターホロメンかコラボホロメン$/.test(spec) ||
      /^(?:自分の)?\[センターホロメンとコラボホロメン\]$/.test(spec)) {
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
  if ((m = /^(?:自分の)?(白|緑|赤|青|紫|黄)センターホロメン$/.exec(spec))) {
    const color = m[1];
    return { make: () => (e) => e.pos.zone === 'center' && e.top.color === color };
  }
  if ((m = /^(?:自分の)?(白|緑|赤|青|紫|黄)ホロメン$/.exec(spec))) {
    const color = m[1];
    return { make: () => (e) => e.top.color === color };
  }
  if (/^(?:自分の)?ホロメン$/.test(spec) || spec === 'このホロメン') {
    return { make: () => () => true };
  }
  if ((m = /^自分の〈(.+?)〉以外の#(\S+?)を持つホロメン$/.exec(spec)) ||
      (m = /^〈(.+?)〉以外の#(\S+?)を持つ(?:自分の)?ホロメン$/.exec(spec))) {
    const name = m[1];
    const tag = m[2];
    return { make: () => (e) => e.top.name !== name && (e.top.tags || []).includes(tag) };
  }
  if ((m = /^(?:自分の)?#(\S+?)を持つ(?:自分の)?ホロメン$/.exec(spec))) {
    const tag = m[1];
    return { make: () => (e) => (e.top.tags || []).includes(tag) };
  }
  if ((m = /^自分の〈(.+?)〉$/.exec(spec))) {
    const name = m[1];
    return { make: () => (e) => e.top.name === name };
  }
  if ((m = /^自分の他の#(\S+?)を持つホロメン$/.exec(spec))) {
    const tag = m[1];
    return { make: (ctx) => (e) => e.holomem !== ctx.sourceHolomem && (e.top.tags || []).includes(tag) };
  }
  if (/^自分の他のホロメン$/.test(spec)) {
    return { make: (ctx) => (e) => e.holomem !== ctx.sourceHolomem };
  }
  return null;
}

/**
 * 相手のホロメン対象のパーサ（特殊ダメージ等）。
 * 戻り値: { filter, choice, all } / null
 */
export function parseOppTarget(spec) {
  spec = spec.trim();
  let m;
  if ((m = /^相手の(センター|コラボ)ホロメン$/.exec(spec))) {
    const zone = m[1] === 'センター' ? 'center' : 'collab';
    return { filter: () => (e) => e.pos.zone === zone, choice: false };
  }
  if (/^相手のセンターホロメンかバックホロメン(1人|どちらか)?$/.test(spec)) {
    return { filter: () => (e) => e.pos.zone === 'center' || e.pos.zone === 'back', choice: true };
  }
  if (/^相手のセンターホロメンかコラボホロメン(1人|どちらか)?$/.test(spec)) {
    return { filter: () => (e) => e.pos.zone === 'center' || e.pos.zone === 'collab', choice: true };
  }
  if ((m = /^相手のバックホロメン(\d+)人$/.exec(spec))) {
    return { filter: () => (e) => e.pos.zone === 'back', choice: true, count: Number(m[1]) };
  }
  if (/^相手のバックホロメン全員$/.test(spec)) {
    return { filter: () => (e) => e.pos.zone === 'back', choice: false, all: true };
  }
  if ((m = /^相手のHPが(\d+)以上減っているバックホロメン1人$/.exec(spec))) {
    const n = Number(m[1]);
    return { filter: () => (e) => e.pos.zone === 'back' && e.holomem.damage >= n, choice: true };
  }
  if (/^相手のホロメン(1人)?$/.test(spec)) {
    return { filter: () => () => true, choice: true };
  }
  return null;
}

// ---------- 文 → ステップ ----------

/** 無視してよい注釈文（カード情報側で処理済みのもの） */
const IGNORABLE = [
  /^LIMITED：ターンに1枚しか使えない$/,
  /^(ツール|マスコット)は、自分のホロメン1人につき1枚だけ付けられる$/,
];

/** サイコロの条件節のパーサ: '奇数' '偶数' '3以下' '4以上' '3か5か6' '1' */
function parseDiceCond(spec) {
  let m;
  if (spec === '奇数') return (v) => v % 2 === 1;
  if (spec === '偶数') return (v) => v % 2 === 0;
  if ((m = /^(\d+)以下$/.exec(spec))) { const n = Number(m[1]); return (v) => v <= n; }
  if ((m = /^(\d+)以上$/.exec(spec))) { const n = Number(m[1]); return (v) => v >= n; }
  if (/^\d+(か\d+)*$/.test(spec)) {
    const set = new Set(spec.split('か').map(Number));
    return (v) => set.has(v);
  }
  return null;
}

/**
 * 1文をステップに変換。解釈できなければ null。
 */
export function compileSentence(s) {
  let m;
  s = s.replace(/^その後、/, '').replace(/^次に、/, '').replace(/^さらに、/, '');
  if (IGNORABLE.some((rx) => rx.test(s))) return { kind: 'ignore' };

  // --- サイコロ構文（文全体）: 「サイコロをN回振る／振れる：(条件)の時、(効果)。…」 ---
  if ((m = /^サイコロを(\d+)回(振る|振れる)：(.+)$/.exec(s))) {
    const optional = m[2] === '振れる';
    const tail = m[3];
    // 「出た目の(合計)?数1につき、このアーツ+N」
    let dm;
    if ((dm = /^出た目の(合計)?数1につき、このアーツ\+(\d+)$/.exec(tail.replace(/。$/, '')))) {
      return { kind: 'diceArtBonusPer', rolls: Number(m[1]), per: Number(dm[2]), optional };
    }
    // 条件分岐: 「X の時、…。Y の時、…。」（「N の時、さらに、…」の連鎖にも対応）
    const branches = [];
    const re = /(奇数|偶数|\d+以上|\d+以下|\d+(?:か\d+)*)の時、((?:(?!(?:奇数|偶数|\d+以上|\d+以下|\d+(?:か\d+)*)の時、).)+?)(?=。(?:奇数|偶数|\d+以上|\d+以下|\d+(?:か\d+)*)の時、|。?$)/g;
    let bm;
    let consumed = 0;
    while ((bm = re.exec(tail))) {
      const cond = parseDiceCond(bm[1]);
      if (!cond) return null;
      const subSteps = [];
      for (const sub of bm[2].split('。').filter(Boolean)) {
        const stp = compileSentence(sub);
        if (!stp) return null;
        if (stp.kind === 'modifyPrevNoLife') {
          const prev = subSteps[subSteps.length - 1];
          if (!prev || prev.kind !== 'specialDamage') return null;
          prev.noLife = true;
          continue;
        }
        if (stp.kind !== 'ignore') subSteps.push(stp);
      }
      branches.push({ cond, steps: subSteps, label: bm[1] });
      consumed = re.lastIndex;
    }
    if (branches.length === 0) return null;
    if (tail.slice(consumed).replace(/。/g, '').length > 0) return null; // 取りこぼし
    return { kind: 'diceBranch', rolls: Number(m[1]), optional, branches };
  }

  // --- コスト構文（文全体）: 「(コスト)できる：(効果)。…」 ---
  if ((m = /^(.+?)をアーカイブできる：(.+)$/.exec(s))) {
    const cost = parseArchiveCost(m[1]);
    if (!cost) return null;
    const subSteps = [];
    for (const sub of m[2].split('。').filter(Boolean)) {
      const stp = compileSentence(sub);
      if (!stp) return null;
      if (stp.kind === 'modifyPrevNoLife') {
        const prev = subSteps[subSteps.length - 1];
        if (!prev || prev.kind !== 'specialDamage') return null;
        prev.noLife = true;
        continue;
      }
      if (stp.kind !== 'ignore') subSteps.push(stp);
    }
    if (subSteps.length === 0) return null;
    return { kind: 'optionalCost', cost, steps: subSteps };
  }

  // このアーツ+N（サイコロ分岐などのサブ文として。アーツ以外の文脈では無害）
  if ((m = /^このアーツ\+(\d+)$/.exec(s))) {
    return { kind: 'artBonusFlat', n: Number(m[1]) };
  }

  // ドロー（後続のアーカイブ付き: 「N枚引いた後、手札M枚をアーカイブする」）
  if ((m = /^自分のデッキを(\d+)枚引いた後、手札(\d+)枚をアーカイブする$/.exec(s))) {
    return { kind: 'drawThenArchive', draw: Number(m[1]), archive: Number(m[2]) };
  }
  if ((m = /^自分のデッキを(\d+)枚引く$/.exec(s))) {
    return { kind: 'draw', n: Number(m[1]) };
  }
  // 手札をアーカイブ（単独文）
  if ((m = /^手札(\d+)枚をアーカイブする$/.exec(s))) {
    return { kind: 'archiveHand', n: Number(m[1]) };
  }
  // シャッフル
  if (/^(そして)?デッキをシャッフルする$/.test(s)) return { kind: 'shuffleDeck' };
  if (/^(そして)?エールデッキをシャッフルする$/.test(s)) return { kind: 'shuffleCheerDeck' };

  // デッキサーチ → 手札 / 付ける
  if ((m = /^自分のデッキから、?(.+?)(\d+)枚を?公開し、?手札に加える$/.exec(s))) {
    const filter = parseCardFilter(m[1]);
    if (!filter) return null;
    return { kind: 'searchToHand', filter, n: Number(m[2]) };
  }
  if ((m = /^自分のデッキから、?(.+?)(\d+)枚を?公開し、?(.+?)に付ける$/.exec(s))) {
    const filter = parseCardFilter(m[1]);
    const target = parseSelfTarget(m[3]);
    if (!filter || !target) return null;
    return { kind: 'searchAttach', filter, n: Number(m[2]), target };
  }
  if ((m = /^自分のデッキから、?(.+?)(\d+)枚を?公開し、?ステージに出す$/.exec(s))) {
    const filter = parseCardFilter(m[1]);
    if (!filter) return null;
    return { kind: 'searchToStage', filter, n: Number(m[2]) };
  }

  // エールデッキの上から送る
  if ((m = /^自分のエールデッキの上から(\d+)枚を、?(.+?)に送る$/.exec(s))) {
    const target = parseSelfTarget(m[2]);
    if (!target) return null;
    return { kind: 'cheerDeckTopTo', n: Number(m[1]), target };
  }
  // エールデッキからサーチして送る（同色条件付き含む）
  if ((m = /^自分のエールデッキから、?(.+?)(\d+)枚を?公開し、?(.+?)に送る$/.exec(s))) {
    let cheerFilter = parseCardFilter(m[1]);
    // 「自分のホロメン1人と同色のエール」「自分の#TAGを持つホロメン1人と同色のエール」
    if (!cheerFilter) {
      const cm = /^(?:自分の)?(?:#(\S+?)を持つ)?ホロメン1人と同色のエール$/.exec(m[1]);
      if (!cm) return null;
      const tag = cm[1];
      cheerFilter = (c, ctx) => {
        if (c.kind !== 'cheer' || !ctx) return false;
        return ctx.holomems('self', (e) => !tag || (e.top.tags || []).includes(tag))
          .some((e) => e.top.color === c.color);
      };
    }
    const target = parseSelfTarget(m[3]);
    if (!target) return null;
    return { kind: 'cheerDeckSearchTo', filter: cheerFilter, n: Number(m[2]), target };
  }

  // アーカイブのエールを送る
  if ((m = /^自分のアーカイブの(.+?)(\d+)枚(ずつ)?を、?(.+?)に送(る|れる)$/.exec(s))) {
    const cheerFilter = parseCardFilter(m[1]);
    const target = parseSelfTarget(m[4]);
    if (!cheerFilter || !target) return null;
    return { kind: 'archiveCheerTo', n: Number(m[2]), each: !!m[3], target, cheerFilter, optional: m[5] === 'れる' };
  }
  // アーカイブのエールN～M枚を割り振って送る／エールデッキに戻す
  if ((m = /^自分のアーカイブの(.*?エール)を?(\d+)～(\d+)枚を?、?(.+?)に割り振って送(る|れる)$/.exec(s))) {
    const cheerFilter = parseCardFilter(m[1]);
    const target = parseSelfTarget(m[4]);
    if (!cheerFilter || !target) return null;
    return { kind: 'archiveCheerTo', n: Number(m[3]), min: Number(m[2]), each: false, target, cheerFilter, optional: true };
  }
  if ((m = /^自分のアーカイブのエール(\d+)～(\d+)枚をエールデッキに戻(す|せる)$/.exec(s))) {
    return { kind: 'archiveCheerToCheerDeck', max: Number(m[2]), optional: m[3] === 'せる' };
  }

  // アーカイブからカードを手札に戻す
  if ((m = /^自分のアーカイブの(.+?)(\d+)(?:～(\d+))?枚を手札に戻(す|せる)$/.exec(s))) {
    const filter = parseCardFilter(m[1]);
    if (!filter) return null;
    return { kind: 'archiveToHand', n: Number(m[3] || m[2]), optional: m[4] === 'せる' };
  }
  // アーカイブのツール等をホロメンに付ける
  if ((m = /^自分のアーカイブの(.+?)(\d+)枚を(.+?)に付け(る|られる)$/.exec(s))) {
    const filter = parseCardFilter(m[1]);
    const target = parseSelfTarget(m[3]);
    if (!filter || !target) return null;
    return { kind: 'archiveAttach', filter, n: Number(m[2]), target, optional: m[4] === 'られる' };
  }

  // 特殊ダメージ（括弧の「ライフは減らない」内包形にも対応）
  if ((m = /^(相手の.+?)に特殊ダメージ(\d+)を与える(（ダウンしても相手のライフは減らない）)?$/.exec(s))) {
    const target = parseOppTarget(m[1]);
    if (!target) return null;
    return { kind: 'specialDamage', target, n: Number(m[2]), noLife: !!m[3] };
  }
  if (/^ただし、ダウンしても相手のライフは減らない$/.test(s)) {
    return { kind: 'modifyPrevNoLife' };
  }
  // 効果によるダウン
  if ((m = /^(相手の.+?)をダウンさせる(（ダウンしても相手のライフは減らない）)?$/.exec(s))) {
    const target = parseOppTarget(m[1]);
    if (!target) return null;
    return { kind: 'forceDown', target, noLife: !!m[2] };
  }

  // HP回復
  if ((m = /^(.+?)(\d+)人のHP(\d+)回復(する)?$/.exec(s))) {
    const target = parseSelfTarget(m[1]);
    if (!target) return null;
    return { kind: 'healChoose', target, count: Number(m[2]), amount: Number(m[3]) };
  }
  if ((m = /^このホロメンのHP(\d+)回復$/.exec(s))) {
    return { kind: 'healSelf', amount: Number(m[1]) };
  }
  if ((m = /^(.+?)のHPすべて回復$/.exec(s))) {
    const target = parseSelfTarget(m[1]);
    if (!target) return null;
    return { kind: 'healAllChoose', target };
  }

  // 残りHPをNにする（かなた推しスキル）
  if ((m = /^相手のセンターホロメンの残りHPを(\d+)にする$/.exec(s))) {
    return { kind: 'setOppCenterRemainHp', n: Number(m[1]) };
  }

  // デッキの上からN枚を見る系
  if ((m = /^自分のデッキの上から(\d+)枚を見る$/.exec(s))) {
    return { kind: 'lookTop', n: Number(m[1]) };
  }
  if ((m = /^その中から、?(.+?)(\d+)枚(まで)?を?公開し、?手札に加える$/.exec(s))) {
    const filter = parseCardFilter(m[1]);
    if (!filter) return null;
    return { kind: 'pickFromLooked', filter, n: Number(m[2]), upTo: !!m[3] };
  }
  // 「〈A〉と〈B〉を好きな枚数公開し、公開したホロメンを手札に加える」
  if ((m = /^その中から、?(.+?)を好きな枚数公開し、?公開したホロメンを手札に加える$/.exec(s))) {
    const spec = m[1].replace(/と/g, 'か');
    const filter = parseCardFilter(spec);
    if (!filter) return null;
    return { kind: 'pickFromLooked', filter, n: 99, upTo: true };
  }
  if (/^そして残ったカードを好きな順でデッキの下に戻す$/.test(s)) {
    return { kind: 'lookedToBottom' };
  }
  if (/^そして残ったカードをアーカイブする$/.test(s)) {
    return { kind: 'lookedToArchive' };
  }

  // 交代
  if (/^自分のセンターホロメンとお休みしていないバックホロメン1人を交代させる$/.test(s)) {
    return { kind: 'swapOwnCenterWithBack', activeOnly: true };
  }
  if (/^相手のセンターホロメンとバックホロメン1人を交代させる$/.test(s)) {
    return { kind: 'swapOppCenterWithBack' };
  }

  // エールの付け替え
  if ((m = /^自分のステージのエール(\d+)枚を、?(.+?)に付け替え(る|られる)$/.exec(s))) {
    const target = parseSelfTarget(m[2]);
    if (!target) return null;
    return { kind: 'moveStageCheer', n: Number(m[1]), target, optional: m[3] === 'られる' };
  }

  // ターン中のアーツ修正: 「このターンの間、(対象)のアーツ+N」
  if ((m = /^このターンの間、(.+?)のアーツ\+(\d+)$/.exec(s))) {
    // 「ホロメン1人の」は全員ではなく選んだ1人だけに適用する
    const single = /1人$/.test(m[1].trim());
    const target = parseSelfTarget(m[1]);
    if (!target) return null;
    return { kind: 'turnArtsPlus', target, n: Number(m[2]), single };
  }
  // 「(対象)が#TAGを持つ時、さらに、(対象)のアーツ+N」（連結条件）
  if ((m = /^(.+?)が#(\S+?)を持つ時、(.+?)のアーツ\+(\d+)$/.exec(s))) {
    const condTarget = parseSelfTarget(m[1]);
    const target = parseSelfTarget(m[3]);
    if (!condTarget || !target) return null;
    return { kind: 'turnArtsPlusCond', condTarget, condTag: m[2], target, n: Number(m[4]) };
  }

  // 条件付き実行: 「自分のセンターホロメンが#TAGを持つ時、(効果)」
  if ((m = /^自分のセンターホロメンが#(\S+?)を持つ時、(.+)$/.exec(s))) {
    const sub = compileSentence(m[2]);
    if (!sub || sub.kind === 'ignore') return null;
    return { kind: 'ifCenterTag', tag: m[1], step: sub };
  }
  // 「自分の推しホロメンが〈X〉の時、(効果)」
  if ((m = /^自分の推しホロメンが〈(.+?)〉の時、(.+)$/.exec(s))) {
    const sub = compileSentence(m[2]);
    if (!sub || sub.kind === 'ignore') return null;
    return { kind: 'ifOshiName', name: m[1], step: sub };
  }
  // 「自分のステージにホロメンの〈X〉がいる時、(効果)」
  if ((m = /^自分のステージにホロメンの〈(.+?)〉がいる時、(.+)$/.exec(s))) {
    const sub = compileSentence(m[2]);
    if (!sub || sub.kind === 'ignore') return null;
    return { kind: 'ifStageName', name: m[1], step: sub };
  }
  // 「このホロメンにツールが付いている時、(効果)」
  if ((m = /^このホロメンに(ツール|マスコット|ファン)が付いている時、(.+)$/.exec(s))) {
    const sub = compileSentence(m[2]);
    if (!sub || sub.kind === 'ignore') return null;
    return { kind: 'ifSelfAttached', supportType: m[1], step: sub };
  }

  return null;
}

/** アーカイブコストのパーサ（「(これ)をアーカイブできる：」の前半） */
function parseArchiveCost(spec) {
  let m;
  if ((m = /^自分の手札(\d+)(?:～(\d+))?枚$/.exec(spec))) {
    return { kind: 'hand', min: Number(m[1]), max: Number(m[2] || m[1]) };
  }
  if ((m = /^このホロメンの(?:\[?(.+?)\]?)?エール(\d+)枚$/.exec(spec))) {
    const colorSpec = m[1];
    let filter = null;
    if (colorSpec) {
      filter = parseCardFilter(`[${colorSpec}エール]`.replace('[[', '[').replace(']]', ']'));
      if (!filter) return null;
    }
    return { kind: 'selfCheer', n: Number(m[2]), filter };
  }
  if ((m = /^このホロメンの\[(.+?)\](\d+)枚$/.exec(spec))) {
    const filter = parseCardFilter(m[1]);
    if (!filter) return null;
    return { kind: 'selfCheer', n: Number(m[2]), filter };
  }
  if ((m = /^自分の#(\S+?)を持つホロメンのエール(\d+)枚$/.exec(spec))) {
    return { kind: 'taggedCheer', tag: m[1], n: Number(m[2]) };
  }
  if ((m = /^このホロメンに重なっているホロメン(\d+)枚$/.exec(spec))) {
    return { kind: 'stacked', n: Number(m[1]) };
  }
  return null;
}

/** 文の列をステップ列へ（全文成功時のみ） */
export function compileSteps(text) {
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
  const hasLook = steps.some((st) => st.kind === 'lookTop');
  const usesLook = steps.some((st) => st.kind === 'pickFromLooked' || st.kind === 'lookedToBottom' || st.kind === 'lookedToArchive');
  if (usesLook && !hasLook) return null;
  if (hasLook && !steps.some((st) => st.kind === 'lookedToBottom' || st.kind === 'lookedToArchive')) return null;
  return steps.length > 0 ? steps : null;
}

// ---------- ステップ実行 ----------

function* chooseSelfEntry(ctx, target, title, optional = false) {
  return yield ctx.chooseHolomem({ side: 'self', filter: target.make(ctx), title, optional });
}

const RUNNERS = {
  *draw(ctx, step) { ctx.draw(step.n); },
  *drawThenArchive(ctx, step) {
    ctx.draw(step.draw);
    yield* RUNNERS.archiveHand(ctx, { n: step.archive });
  },
  *archiveHand(ctx, step) {
    for (let i = 0; i < step.n && ctx.player.hand.length > 0; i++) {
      const card = yield ctx.chooseCard({
        cards: ctx.player.hand,
        title: `アーカイブする手札を選択（${i + 1}/${step.n}）`,
      });
      if (!card) break;
      ctx.removeFromHand(card);
      ctx.player.archive.push(card);
      ctx.log(`${card.name} をアーカイブした`);
    }
  },
  *shuffleDeck(ctx) { ctx.shuffleDeck(); },
  *shuffleCheerDeck(ctx) { ctx.shuffleCheerDeck(); },

  *searchToHand(ctx, step) {
    for (let i = 0; i < step.n; i++) {
      const candidates = ctx.deckCards((c) => step.filter(c, ctx));
      const picked = yield ctx.chooseCard({
        cards: candidates, title: 'デッキから手札に加えるカードを選択',
        optional: true, skipLabel: '見つからなかったことにする',
      });
      if (!picked) break;
      ctx.removeFromDeck(picked);
      ctx.addToHand(picked);
    }
  },
  *searchAttach(ctx, step) {
    for (let i = 0; i < step.n; i++) {
      const candidates = ctx.deckCards((c) => step.filter(c, ctx));
      const picked = yield ctx.chooseCard({
        cards: candidates, title: 'デッキから付けるカードを選択',
        optional: true, skipLabel: '見つからなかったことにする',
      });
      if (!picked) break;
      const entry = yield* chooseSelfEntry(ctx, step.target, `${picked.name} を付けるホロメンを選択`);
      if (!entry) break;
      ctx.removeFromDeck(picked);
      if (picked.kind === 'cheer') ctx.attachCheer(picked, entry.holomem);
      else ctx.attachSupport(picked, entry.holomem);
    }
  },
  *searchToStage(ctx, step) {
    for (let i = 0; i < step.n; i++) {
      if (ctx.engine._stageCount(ctx.player) >= 6) break;
      const candidates = ctx.deckCards((c) => step.filter(c, ctx));
      const picked = yield ctx.chooseCard({
        cards: candidates, title: 'ステージに出すカードを選択',
        optional: true, skipLabel: '見つからなかったことにする',
      });
      if (!picked) break;
      ctx.removeFromDeck(picked);
      ctx.putToBack(picked);
    }
  },

  *cheerDeckTopTo(ctx, step) {
    for (let i = 0; i < step.n; i++) {
      const entry = yield* chooseSelfEntry(ctx, step.target, 'エールデッキの上から送る先のホロメンを選択');
      if (!entry) break;
      ctx.sendCheerFromCheerDeckTop(entry.holomem);
    }
  },
  *cheerDeckSearchTo(ctx, step) {
    for (let i = 0; i < step.n; i++) {
      const candidates = ctx.player.cheerDeck.filter((c) => step.filter(c, ctx));
      const picked = yield ctx.chooseCard({
        cards: candidates, title: 'エールデッキから送るエールを選択',
        optional: true, skipLabel: '見つからなかったことにする',
      });
      if (!picked) break;
      const entry = yield* chooseSelfEntry(ctx, step.target, 'エールを送るホロメンを選択');
      if (!entry) break;
      ctx.removeFromCheerDeck(picked);
      ctx.log(`${ctx.player.name}: エールデッキから ${picked.name} を公開`);
      ctx.flashReveal(picked);
      ctx.attachCheer(picked, entry.holomem);
    }
    ctx.shuffleCheerDeck();
  },

  *archiveCheerTo(ctx, step) {
    const used = new Set();
    for (let i = 0; i < step.n; i++) {
      const cheers = ctx.player.archive.filter((c) => step.cheerFilter(c, ctx));
      if (cheers.length === 0) break;
      const targetFilter = step.target.make(ctx);
      const eligible = ctx.holomems('self', (e) => targetFilter(e) && (!step.each || !used.has(e.holomem)));
      if (eligible.length === 0) break;
      const forced = step.min != null && i < step.min;
      const picked = yield ctx.chooseCard({
        cards: cheers, title: `アーカイブから送るエールを選択（${i + 1}/${step.n}）`,
        optional: step.optional && !forced, skipLabel: '終了する',
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
  *archiveCheerToCheerDeck(ctx, step) {
    for (let i = 0; i < step.max; i++) {
      const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      if (cheers.length === 0) break;
      const picked = yield ctx.chooseCard({
        cards: cheers, title: `エールデッキに戻すエールを選択（${i + 1}/${step.max}）`,
        optional: true, skipLabel: '終了する',
      });
      if (!picked) break;
      ctx.removeFromArchive(picked);
      ctx.player.cheerDeck.push(picked);
      ctx.log(`${picked.name} をエールデッキに戻した`);
    }
  },
  *archiveToHand(ctx, step) {
    for (let i = 0; i < step.n; i++) {
      const candidates = ctx.player.archive.filter((c) => step.filter ? step.filter(c, ctx) : true);
      if (candidates.length === 0) break;
      const picked = yield ctx.chooseCard({
        cards: candidates, title: 'アーカイブから手札に戻すカードを選択',
        optional: step.optional, skipLabel: '戻さない',
      });
      if (!picked) break;
      ctx.removeFromArchive(picked);
      ctx.player.hand.push(picked);
      ctx.log(`${picked.name} を手札に戻した`);
    }
  },
  *archiveAttach(ctx, step) {
    for (let i = 0; i < step.n; i++) {
      const candidates = ctx.player.archive.filter((c) => step.filter(c, ctx));
      if (candidates.length === 0) break;
      const picked = yield ctx.chooseCard({
        cards: candidates, title: 'アーカイブから付けるカードを選択',
        optional: step.optional, skipLabel: '付けない',
      });
      if (!picked) break;
      const entry = yield* chooseSelfEntry(ctx, step.target, `${picked.name} を付けるホロメンを選択`);
      if (!entry) break;
      ctx.removeFromArchive(picked);
      if (picked.kind === 'cheer') ctx.attachCheer(picked, entry.holomem);
      else ctx.attachSupport(picked, entry.holomem);
    }
  },

  *specialDamage(ctx, step) {
    const filter = step.target.filter(ctx);
    if (step.target.all) {
      for (const entry of ctx.holomems('opp', filter)) {
        yield* ctx.dealSpecialDamage(entry, step.n, { noLifeOnDown: step.noLife });
      }
      return;
    }
    // 対象が一意（「相手のセンターホロメンに～」等）なら選択なしで直接与える
    if (!step.target.choice) {
      const entry = ctx.holomems('opp', filter)[0];
      if (entry) yield* ctx.dealSpecialDamage(entry, step.n, { noLifeOnDown: step.noLife });
      return;
    }
    const count = step.target.count || 1;
    const chosen = new Set();
    for (let i = 0; i < count; i++) {
      const entry = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => filter(e) && !chosen.has(e.holomem),
        title: `特殊ダメージ${step.n}を与える相手ホロメンを選択${count > 1 ? `（${i + 1}/${count}）` : ''}`,
      });
      if (!entry) break;
      chosen.add(entry.holomem);
      yield* ctx.dealSpecialDamage(entry, step.n, { noLifeOnDown: step.noLife });
    }
  },
  *forceDown(ctx, step) {
    const filter = step.target.filter(ctx);
    const entry = yield ctx.chooseHolomem({
      side: 'opp', filter, title: 'ダウンさせる相手ホロメンを選択',
    });
    if (entry) ctx.forceDown(entry, { noLifeOnDown: step.noLife });
  },

  *healChoose(ctx, step) {
    for (let i = 0; i < step.count; i++) {
      const filter = step.target.make(ctx);
      const entry = yield ctx.chooseHolomem({
        side: 'self', filter: (e) => filter(e) && e.holomem.damage > 0,
        title: `HPを${step.amount}回復するホロメンを選択`,
      });
      if (!entry) break;
      ctx.heal(entry.holomem, step.amount);
    }
  },
  *healSelf(ctx, step) {
    if (ctx.sourceHolomem) ctx.heal(ctx.sourceHolomem, step.amount);
  },
  *healAllChoose(ctx, step) {
    const filter = step.target.make(ctx);
    const entry = yield ctx.chooseHolomem({
      side: 'self', filter: (e) => filter(e) && e.holomem.damage > 0,
      title: 'HPをすべて回復するホロメンを選択',
    });
    if (entry) ctx.healAll(entry.holomem);
  },
  *setOppCenterRemainHp(ctx, step) {
    const center = ctx.opponent.center;
    if (!center) return;
    const eff = ctx.engine.effectiveHp(center);
    if (eff - center.damage > step.n) {
      center.damage = eff - step.n;
      ctx.log(`相手のセンターホロメンの残りHPを${step.n}にした（累計${center.damage}/${eff}）`);
    }
  },

  *lookTop(ctx, step, state) {
    state.looked = ctx.lookTopDeck(step.n);
  },
  *pickFromLooked(ctx, step, state) {
    const pool = state.looked || [];
    for (let i = 0; i < step.n; i++) {
      const candidates = pool.filter((c) => step.filter(c, ctx));
      if (candidates.length === 0) break;
      const picked = yield ctx.chooseCard({
        cards: candidates, title: '手札に加えるカードを選択',
        optional: step.upTo, skipLabel: '加えない', displayCards: pool,
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
  *lookedToArchive(ctx, step, state) {
    const pool = state.looked || [];
    for (const card of pool) {
      ctx._unreveal(card);
      ctx.player.archive.push(card);
    }
    if (pool.length > 0) ctx.log(`残り${pool.length}枚をアーカイブした`);
    state.looked = [];
  },

  *swapOwnCenterWithBack(ctx, step) {
    const p = ctx.player;
    if (!p.center) return;
    const entry = yield ctx.chooseHolomem({
      side: 'self',
      filter: (e) => e.pos.zone === 'back' && (!step.activeOnly || !e.holomem.rested),
      title: 'センターと交代するバックホロメンを選択',
    });
    if (!entry) return;
    const i = entry.pos.index;
    const c = p.center;
    p.center = p.back[i];
    p.back[i] = c;
    ctx.log(`${p.center.stack[0].name} がセンターに移動（交代）`);
  },
  *swapOppCenterWithBack(ctx) {
    const opp = ctx.opponent;
    if (!opp.center || opp.back.length === 0) return;
    const entry = yield ctx.chooseHolomem({
      side: 'opp', filter: (e) => e.pos.zone === 'back',
      title: '相手のセンターと交代させるバックホロメンを選択',
    });
    if (!entry) return;
    const i = entry.pos.index;
    const c = opp.center;
    opp.center = opp.back[i];
    opp.back[i] = c;
    ctx.log(`${opp.center.stack[0].name} が相手のセンターに移動（交代）`);
  },

  *moveStageCheer(ctx, step) {
    for (let i = 0; i < step.n; i++) {
      const entries = [];
      for (const e of ctx.holomems('self')) {
        for (const cheer of e.holomem.cheers) entries.push({ cheer, from: e.holomem });
      }
      if (entries.length === 0) break;
      const picked = yield ctx.chooseCard({
        cards: entries.map((e) => e.cheer), title: '付け替えるエールを選択',
        optional: step.optional, skipLabel: '付け替えない',
      });
      if (!picked) break;
      const from = entries.find((e) => e.cheer === picked).from;
      const entry = yield* chooseSelfEntry(ctx, step.target, '付け替え先のホロメンを選択');
      if (!entry) break;
      ctx.moveCheer(picked, from, entry.holomem);
    }
  },

  *turnArtsPlus(ctx, step) {
    const owner = ctx.playerIdx;
    const engine = ctx.engine;
    const filter = step.target.make(ctx);
    if (step.single) {
      // 「ホロメン1人の」→ 対象を選んでその1人だけに適用
      const entry = yield ctx.chooseHolomem({
        side: 'self', filter, title: `このターンの間アーツ+${step.n}するホロメンを選択`,
      });
      if (!entry) return;
      const chosen = entry.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: step.n, ownerIdx: owner,
        match: (h) => h === chosen,
        description: `このターンの間、${chosen.stack[0].name} のアーツ+${step.n}`,
      });
      return;
    }
    ctx.addTurnModifier({
      kind: 'artsPlus', amount: step.n, ownerIdx: owner,
      match: (h) => {
        const p = engine.state.players[owner];
        const pos = engine._stagePositions(p).find((q) => engine._holomemAt(p, q) === h);
        if (!pos) return false;
        return filter({ pos, holomem: h, top: h.stack[0] });
      },
      description: `このターンの間、対象のアーツ+${step.n}`,
    });
  },
  *turnArtsPlusCond(ctx, step) {
    const owner = ctx.playerIdx;
    const engine = ctx.engine;
    const condFilter = step.condTarget.make(ctx);
    const targetFilter = step.target.make(ctx);
    ctx.addTurnModifier({
      kind: 'artsPlus', amount: step.n, ownerIdx: owner,
      match: (h) => {
        const p = engine.state.players[owner];
        const condOk = engine._stagePositions(p).some((q) => {
          const hh = engine._holomemAt(p, q);
          return condFilter({ pos: q, holomem: hh, top: hh.stack[0] }) &&
            (hh.stack[0].tags || []).includes(step.condTag);
        });
        if (!condOk) return false;
        const pos = engine._stagePositions(p).find((q) => engine._holomemAt(p, q) === h);
        if (!pos) return false;
        return targetFilter({ pos, holomem: h, top: h.stack[0] });
      },
      description: `このターンの間、条件付きでアーツ+${step.n}`,
    });
  },

  *diceBranch(ctx, step, state) {
    if (step.optional) {
      const ok = yield ctx.confirm('サイコロを振りますか？', '振る', '振らない');
      if (!ok) return;
    }
    for (let r = 0; r < step.rolls; r++) {
      const value = (yield* ctx.rollDice());
      for (const branch of step.branches) {
        if (branch.cond(value)) {
          for (const sub of branch.steps) {
            yield* RUNNERS[sub.kind](ctx, sub, state);
          }
        }
      }
    }
  },
  *diceArtBonusPer(ctx, step) {
    if (step.optional) {
      const ok = yield ctx.confirm('サイコロを振りますか？', '振る', '振らない');
      if (!ok) return;
    }
    let total = 0;
    for (let r = 0; r < step.rolls; r++) total += (yield* ctx.rollDice());
    ctx.addArtBonus(total * step.per, `出た目合計${total}`);
  },

  *optionalCost(ctx, step, state) {
    const cost = step.cost;
    // 支払い可能かチェック
    const payable = (() => {
      const p = ctx.player;
      if (cost.kind === 'hand') return p.hand.length >= cost.min;
      if (cost.kind === 'selfCheer') {
        if (!ctx.sourceHolomem) return false;
        const pool = ctx.sourceHolomem.cheers.filter((c) => !cost.filter || cost.filter(c, ctx));
        return pool.length >= cost.n;
      }
      if (cost.kind === 'taggedCheer') {
        return ctx.holomems('self', (e) => (e.top.tags || []).includes(cost.tag))
          .some((e) => e.holomem.cheers.length >= cost.n);
      }
      if (cost.kind === 'stacked') {
        return ctx.sourceHolomem && ctx.sourceHolomem.stack.length - 1 >= cost.n;
      }
      return false;
    })();
    if (!payable) return;
    const ok = yield ctx.confirm('コストを支払って効果を発動しますか？');
    if (!ok) return;
    // コスト支払い
    if (cost.kind === 'hand') {
      const max = cost.max;
      let paid = 0;
      for (let i = 0; i < max && ctx.player.hand.length > 0; i++) {
        const card = yield ctx.chooseCard({
          cards: ctx.player.hand,
          title: `アーカイブする手札を選択（${i + 1}/${max}）`,
          optional: i >= cost.min,
          skipLabel: 'これ以上払わない',
        });
        if (!card) break;
        ctx.removeFromHand(card);
        ctx.player.archive.push(card);
        ctx.log(`${card.name} をアーカイブした（コスト）`);
        paid++;
      }
      if (paid < cost.min) return;
      state.costPaid = paid;
    } else if (cost.kind === 'selfCheer') {
      for (let i = 0; i < cost.n; i++) {
        const pool = ctx.sourceHolomem.cheers.filter((c) => !cost.filter || cost.filter(c, ctx));
        const cheer = yield ctx.chooseCard({ cards: pool, title: 'アーカイブするエールを選択（コスト）' });
        if (!cheer) return;
        ctx.archiveCheer(ctx.sourceHolomem, cheer);
      }
      state.costPaid = cost.n;
    } else if (cost.kind === 'taggedCheer') {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => (e.top.tags || []).includes(cost.tag) && e.holomem.cheers.length >= cost.n,
        title: 'エールをアーカイブするホロメンを選択（コスト）',
      });
      if (!entry) return;
      for (let i = 0; i < cost.n; i++) {
        const cheer = yield ctx.chooseCard({ cards: entry.holomem.cheers, title: 'アーカイブするエールを選択（コスト）' });
        if (!cheer) return;
        ctx.archiveCheer(entry.holomem, cheer);
      }
      state.costPaid = cost.n;
    } else if (cost.kind === 'stacked') {
      for (let i = 0; i < cost.n; i++) {
        const lower = ctx.sourceHolomem.stack.slice(1);
        const card = yield ctx.chooseCard({ cards: lower, title: 'アーカイブする重なっているホロメンを選択（コスト）' });
        if (!card) return;
        const idx = ctx.sourceHolomem.stack.indexOf(card);
        ctx.sourceHolomem.stack.splice(idx, 1);
        ctx.player.archive.push(card);
        ctx.log(`${card.name} をアーカイブした（コスト）`);
      }
      state.costPaid = cost.n;
    }
    // 効果本体
    for (const sub of step.steps) {
      yield* RUNNERS[sub.kind](ctx, sub, state);
    }
  },

  *ifCenterTag(ctx, step, state) {
    const center = ctx.player.center;
    if (center && (center.stack[0].tags || []).includes(step.tag)) {
      yield* RUNNERS[step.step.kind](ctx, step.step, state);
    }
  },
  *ifOshiName(ctx, step, state) {
    if (ctx.player.oshi?.name === step.name) {
      yield* RUNNERS[step.step.kind](ctx, step.step, state);
    }
  },
  *ifStageName(ctx, step, state) {
    if (ctx.holomems('self', (e) => e.top.name === step.name).length > 0) {
      yield* RUNNERS[step.step.kind](ctx, step.step, state);
    }
  },
  *ifSelfAttached(ctx, step, state) {
    if (ctx.sourceHolomem?.attachments.some((a) => a.supportType === step.supportType)) {
      yield* RUNNERS[step.step.kind](ctx, step.step, state);
    }
  },
};

function makeRun(steps) {
  return function* run(ctx) {
    const state = {}; // ステップ間で共有する状態（「見た」カード・支払ったコスト数など）
    for (const step of steps) {
      yield* RUNNERS[step.kind](ctx, step, state);
    }
  };
}

// ---------- アーツの dmgBonus ----------

function compileArtSentence(s) {
  let m;
  if ((m = /^自分のステージに(.+?)がいる時、このアーツ\+(\d+)$/.exec(s))) {
    // 「ホロメンの〈X〉がいる時」も含む
    const inner = m[1].replace(/^ホロメンの/, '');
    const n = Number(m[2]);
    let nm;
    if ((nm = /^〈(.+?)〉$/.exec(inner))) {
      const name = nm[1];
      return { bonus: (ctx) => (ctx.holomems('self', (e) => e.top.name === name).length > 0 ? n : 0) };
    }
    const target = parseSelfTarget(inner);
    if (!target) return null;
    return { bonus: (ctx) => (ctx.holomems('self', target.make(ctx)).length > 0 ? n : 0) };
  }
  if ((m = /^自分のステージにエールが(\d+)色以上ある時、このアーツ\+(\d+)$/.exec(s))) {
    const colors = Number(m[1]);
    const n = Number(m[2]);
    return { bonus: (ctx) => (ctx.ownStageCheerColors().length >= colors ? n : 0) };
  }
  if ((m = /^自分のステージのエール1色につき、このアーツ\+(\d+)$/.exec(s))) {
    const n = Number(m[1]);
    return { bonus: (ctx) => ctx.ownStageCheerColors().length * n };
  }
  if ((m = /^このホロメンに付いている〈(.+?)〉1枚につき、このアーツ\+(\d+)$/.exec(s))) {
    const name = m[1];
    const n = Number(m[2]);
    return { bonus: (ctx) => (ctx.sourceHolomem?.attachments.filter((a) => a.name === name).length || 0) * n };
  }
  if ((m = /^自分の#(\S+?)を持つホロメン1人につき、このアーツ\+(\d+)$/.exec(s))) {
    const tag = m[1];
    const n = Number(m[2]);
    return { bonus: (ctx) => ctx.holomems('self', (e) => (e.top.tags || []).includes(tag)).length * n };
  }
  if ((m = /^自分のアーカイブのホロメン1枚につき、このアーツ\+(\d+)$/.exec(s))) {
    const n = Number(m[1]);
    return { bonus: (ctx) => ctx.player.archive.filter((c) => c.kind === 'holomen').length * n };
  }
  if ((m = /^このホロメンにツールが付いている時、このアーツ\+(\d+)$/.exec(s))) {
    const n = Number(m[1]);
    return { bonus: (ctx) => (ctx.sourceHolomem?.attachments.some((a) => a.supportType === 'ツール') ? n : 0) };
  }
  if ((m = /^このターンに自分がサポートカードを使っていた時、このアーツ\+(\d+)$/.exec(s))) {
    const n = Number(m[1]);
    return { bonus: (ctx) => (ctx.player.usedSupportThisTurn ? n : 0) };
  }
  // サイコロ条件のアーツ+N（diceBranch 内の addArtBonus として処理）
  if ((m = /^このアーツ\+(\d+)$/.exec(s))) {
    return { step: { kind: 'artBonusFlat', n: Number(m[1]) } };
  }
  const step = compileSentence(s);
  return step ? { step } : null;
}

RUNNERS.artBonusFlat = function* (ctx, step) {
  ctx.addArtBonus(step.n);
};

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

/**
 * 装着カードのコンパイル。
 * 基礎効果（アーツ+N / HP+N / 受けるダメージ±N / 相手センターへの特殊ダメージ+N /
 * ファンの付け先ルール / ◆条件付きHP+N・アーツ+N）はすべて解釈できる場合のみ採用する。
 * トリガー型の◆能力（「アーツを使った時」「コラボした時」「ダウンした時」等）など
 * 解釈できない段落が1つでもあれば、その装着枠は基礎効果ごと不採用にする（安全側／全文解釈できた枠のみ実装）。
 * → 付け先ルール（ファンの「〈X〉だけに付けられる」）だけは効果ではないため残す。
 */
function compileAttached(text) {
  const blocks = normalize(text).split(/\n+/).map((b) => b.trim()).filter(Boolean);
  const attached = {};
  const def = {};
  let tainted = false; // 解釈できない効果段落を含むか（含むなら attached を採用しない）
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i].replace(/^■/, '').replace(/。$/, '');
    let m;
    if (IGNORABLE.some((rx) => rx.test(b)) || /^[ 　]*$/.test(b)) { i++; continue; }
    if ((m = /^この(マスコット|ツール|ファン)が付いているホロメンのアーツ\+(\d+)$/.exec(b))) {
      const n = Number(m[2]);
      const prev = attached.artsPlus;
      attached.artsPlus = prev ? (h, e) => prev(h, e) + n : () => n;
      i++; continue;
    }
    if ((m = /^この(マスコット|ツール|ファン)が付いているホロメンのHP\+(\d+)$/.exec(b))) {
      const n = Number(m[2]);
      attached.hpPlus = () => n;
      i++; continue;
    }
    // 受けるダメージ±N（無条件）
    if ((m = /^この(マスコット|ツール|ファン)が付いているホロメンが受けるダメージ([+-])(\d+)$/.exec(b))) {
      const delta = (m[2] === '-' ? -1 : 1) * Number(m[3]);
      attached.damageDelta = () => delta;
      i++; continue;
    }
    // 受けるダメージ±N（センター/コラボ限定）
    if ((m = /^この(マスコット|ツール|ファン)が付いているホロメンがセンターポジションかコラボポジションで受けるダメージ([+-])(\d+)$/.exec(b))) {
      const delta = (m[2] === '-' ? -1 : 1) * Number(m[3]);
      attached.damageDelta = (h, zone) => (zone === 'center' || zone === 'collab' ? delta : 0);
      i++; continue;
    }
    if ((m = /^この(マスコット|ツール|ファン)が付いている#(\S+?)を持たないホロメンが受けるダメージ([+-])(\d+)$/.exec(b))) {
      const tag = m[2];
      const delta = (m[3] === '-' ? -1 : 1) * Number(m[4]);
      attached.damageDelta = (h) => ((h.stack[0].tags || []).includes(tag) ? 0 : delta);
      i++; continue;
    }
    if ((m = /^この(ファン|マスコット|ツール)が付いているホロメンが、相手のセンターホロメンに与える特殊ダメージ\+(\d+)$/.exec(b))) {
      const n = Number(m[2]);
      attached.specialDmgPlus = (src, targetEntry) => (targetEntry.pos.zone === 'center' ? n : 0);
      i++; continue;
    }
    if ((m = /^このファンは、自分の〈(.+?)〉だけに付けられ、1人につき何枚でも付けられる$/.exec(b))) {
      const name = m[1];
      def.attachRule = { canAttach: (h) => h.stack[0].name === name, unlimited: true };
      i++; continue;
    }
    if ((m = /^◆(?:1st以上の)?〈(.+?)〉に付いていたら能力追加$/.exec(b))) {
      const name = m[1];
      const next = (blocks[i + 1] || '').replace(/^■/, '').replace(/。$/, '');
      const hm = /^この(マスコット|ツール|ファン)が付いているホロメンのHP\+(\d+)$/.exec(next);
      const am = /^この(マスコット|ツール|ファン)が付いているホロメンのアーツ\+(\d+)$/.exec(next);
      if (hm) {
        const n = Number(hm[2]);
        attached.hpPlus = (h) => (h.stack[0].name === name ? n : 0);
        i += 2; continue;
      }
      if (am) {
        const n = Number(am[2]);
        const prev = attached.artsPlus;
        attached.artsPlus = (h, e) => (prev ? prev(h, e) : 0) + (h.stack[0].name === name ? n : 0);
        i += 2; continue;
      }
      // HP+N / アーツ+N 以外の能力追加（トリガー型）は解釈不能 → この枠は不採用にする（安全側）
      tainted = true;
      i += 2; continue;
    }
    // 解釈できない段落（トリガー型の常時テキスト等）→ この枠は不採用にする（安全側）
    tainted = true;
    i++;
  }
  // 解釈できない段落を含む装着枠は、基礎効果ごと不採用（全文解釈できた枠のみ実装する原則）。
  // ただし付け先ルール（効果ではない配置制限）だけは残す。
  if (tainted) return def.attachRule ? { attachRule: def.attachRule } : null;
  if (Object.keys(attached).length === 0 && !def.attachRule) return null;
  if (Object.keys(attached).length > 0) def.attached = attached;
  return def;
}

// ---------- サポート（スタッフ/アイテム/イベント） ----------

function compileSupport(text) {
  let norm = normalize(text).replace(/\n+/g, '');
  let canUse = null;
  const preCosts = [];
  let m;

  // 使用条件: 手札枚数
  if ((m = /^このカードは、自分の手札がこのカードを含まずに(\d+)枚(以上|以下)で?なければ使えない。/.exec(norm))) {
    const n = Number(m[1]);
    const over = m[2] === '以上';
    canUse = (ctx) => {
      const others = ctx.player.hand.length - 1;
      return over ? others >= n : others <= n;
    };
    norm = norm.slice(m[0].length);
  }
  // 使用条件: ライフ枚数
  if ((m = /^このカードは、自分のライフが(\d+)以下でなければ使えない。/.exec(norm))) {
    const n = Number(m[1]);
    const prev = canUse;
    canUse = (ctx) => (!prev || prev(ctx)) && ctx.player.life.length <= n;
    norm = norm.slice(m[0].length);
  }
  // 使用条件 + 強制コスト: ホロパワー / ステージのエール
  if ((m = /^このカードは、自分のホロパワー(\d+)枚をアーカイブしなければ使えない。/.exec(norm))) {
    const n = Number(m[1]);
    const prevCanUse = canUse;
    canUse = (ctx) => (!prevCanUse || prevCanUse(ctx)) && ctx.player.holoPower.length >= n;
    preCosts.push(function* (ctx) {
      ctx.player.archive.push(...ctx.player.holoPower.splice(0, n));
      ctx.log(`ホロパワー${n}枚をアーカイブした（コスト）`);
    });
    norm = norm.slice(m[0].length);
  }
  if ((m = /^このカードは、自分のステージのエール(\d+)枚をアーカイブしなければ使えない。/.exec(norm))) {
    const n = Number(m[1]);
    const prevCanUse = canUse;
    canUse = (ctx) =>
      (!prevCanUse || prevCanUse(ctx)) &&
      ctx.holomems('self').reduce((sum, e) => sum + e.holomem.cheers.length, 0) >= n;
    preCosts.push(function* (ctx) {
      for (let i = 0; i < n; i++) {
        const entries = [];
        for (const e of ctx.holomems('self')) {
          for (const cheer of e.holomem.cheers) entries.push({ cheer, from: e.holomem });
        }
        if (entries.length === 0) return;
        const picked = yield ctx.chooseCard({
          cards: entries.map((e) => e.cheer), title: 'アーカイブするエールを選択（コスト）',
        });
        if (!picked) return;
        ctx.archiveCheer(entries.find((e) => e.cheer === picked).from, picked);
      }
    });
    norm = norm.slice(m[0].length);
  }

  const steps = compileSteps(norm);
  if (!steps) return null;
  const bodyRun = makeRun(steps);
  const def = {
    run: function* (ctx) {
      for (const pre of preCosts) yield* pre(ctx);
      yield* bodyRun(ctx);
    },
  };
  if (canUse) def.canUse = canUse;
  return def;
}

// ---------- 推しスキル ----------

function compileOshiSkill(skillText) {
  const norm = normalize(skillText).replace(/\n+/g, '');
  // 形式: [ホロパワー：-N]スキル名[ターンに1回|ゲームに1回]本文
  const m = /^\[ホロパワー：-?(\d+|X)(?:消費)?\](.*?)\[(ターンに1回|ゲームに1回)\](.+)$/.exec(norm);
  if (!m) return null;
  if (m[1] === 'X') return null;                 // Xコストは未対応
  const body = m[4];
  if (/時に使える：/.test(body)) return null;     // タイミング系は未対応
  const steps = compileSteps(body);
  if (!steps) return null;
  return { name: m[2], run: makeRun(steps) };
}

// ---------- カード全体のコンパイル ----------

/**
 * 正規化済みカード1種をコンパイルし、解釈できたスキル枠だけの定義を返す。
 * 1枠も解釈できなければ null。
 */
export function compileCard(card) {
  const def = {};

  for (const kw of card.keywords || []) {
    if (kw.subtype === 'ブルームエフェクト' || kw.subtype === 'コラボエフェクト') {
      let text = normalize(kw.text);
      let guard = null;
      // 「DebutからBloomした時、…」（Bloom元の条件）
      const gm = /^DebutからBloomした時、(.*)$/.exec(text.replace(/\n/g, ''));
      if (gm && kw.subtype === 'ブルームエフェクト') {
        guard = (ctx) => ctx.sourceHolomem?.stack[1]?.bloomLevel === 'Debut';
        text = gm[1];
      }
      const steps = compileSteps(text);
      if (steps) {
        const inner = makeRun(steps);
        const run = guard
          ? function* (ctx) { if (guard(ctx)) yield* inner(ctx); else ctx.log('発動条件を満たしていない'); }
          : inner;
        const slot = kw.subtype === 'ブルームエフェクト' ? 'bloomEffect' : 'collabEffect';
        def[slot] = { name: kw.name, run };
      }
    }
  }

  if (card.kind === 'support' && card.supportText) {
    if (['ツール', 'マスコット', 'ファン'].includes(card.supportType)) {
      const attachedDef = compileAttached(card.supportText);
      if (attachedDef) Object.assign(def, attachedDef);
    } else {
      const supportDef = compileSupport(card.supportText);
      if (supportDef) def.support = supportDef;
    }
  }

  for (const art of card.arts || []) {
    if (!art.text) continue;
    const artDef = compileArt(art.text);
    if (artDef) {
      def.arts = def.arts || {};
      def.arts[art.name] = artDef;
    }
  }

  // 推しスキル（メインステップで使える起動型のみ）
  if (card.kind === 'oshi') {
    for (const skill of card.oshiSkills || []) {
      const compiled = compileOshiSkill(skill.text);
      if (compiled) {
        if (skill.sp) def.spOshiSkill = compiled;
        else def.oshiSkill = compiled;
      }
    }
  }

  if (Object.keys(def).length === 0) return null;
  def.number = card.number;
  def.autoCompiled = true;
  return def;
}
