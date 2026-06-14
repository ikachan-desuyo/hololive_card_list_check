/**
 * カード効果の実行コンテキスト
 *
 * 効果はジェネレータ関数 `function* run(ctx)` として実装する。
 * プレイヤーの選択が必要な箇所では ctx.chooseXxx(...) を yield する:
 *
 *   *run(ctx) {
 *     const card = yield ctx.chooseCard({ cards, title: '手札に加えるカード' });
 *     if (card) { ... }
 *   }
 *
 * yield された選択要求はエンジンが決定ポイント（pending）に変換し、
 * プレイヤーの選択後にジェネレータを再開する。
 * 選択を伴わない操作（draw 等）は普通のメソッド呼び出しでよい。
 * ただし割り込みが入りうる操作（rollDice / dealSpecialDamage）はジェネレータなので `yield* ctx.xxx(...)` で呼ぶ。
 *
 * ルール条番号は battle_simulator_v2/docs/RULES_SPEC.md / 総合ルール ver.1.9.0 参照。
 */

import { COLORLESS } from '../constants.js';
import { rollDie } from '../rng.js';

export class EffectContext {
  /**
   * @param {Engine} engine
   * @param {number} playerIdx 効果のコントローラー
   * @param {object} opts { sourceCard, sourceHolomem, artName }
   */
  constructor(engine, playerIdx, opts = {}) {
    this.engine = engine;
    this.playerIdx = playerIdx;
    this.sourceCard = opts.sourceCard || null;
    this.sourceHolomem = opts.sourceHolomem || null;
    // onAnyDown 用: ダウンしたホロメンの情報 { holomem, card, ownerIdx, zone }
    this.downedInfo = opts.downedInfo || null;
    // onOpponentPerformanceEnd 用: そのパフォーマンスステップで自分のライフが減ったか
    this.lifeDecreasedThisPerf = opts.lifeDecreasedThisPerf || false;
    // 攻撃時誘発の推しスキル用: { sourceHolomem, art, artName, dealtList:[{target,zone,dealt}], downed }
    this.attackInfo = opts.attackInfo || null;
    // onOshiSkillUsed 用: 使った推しスキルの情報 { text, sp }
    this.oshiSkillInfo = opts.oshiSkillInfo || null;
  }

  get player() { return this.engine.state.players[this.playerIdx]; }
  get opponent() { return this.engine.state.players[1 - this.playerIdx]; }
  get state() { return this.engine.state; }

  log(msg) { this.engine.log(msg); }

  // ============ 参照ヘルパー ============

  /** 自分/相手のステージのホロメン一覧 [{pos, holomem, top}] */
  holomems(side = 'self', filter = null) {
    const p = side === 'self' ? this.player : this.opponent;
    const out = [];
    for (const pos of this.engine._stagePositions(p)) {
      const holomem = this.engine._holomemAt(p, pos);
      const top = holomem.stack[0];
      if (!filter || filter({ pos, holomem, top })) out.push({ pos, holomem, top });
    }
    return out;
  }

  /** 名前一致（〈名称〉参照。追加カード名は未対応） */
  nameIs(card, name) {
    return card.name === name;
  }

  /** タグ保持判定（#ID など。タグ表記は "ID" のように # 無しで格納されている） */
  hasTag(card, tag) {
    const t = tag.replace(/^#/, '');
    return (card.tags || []).includes(t);
  }

  /** 「自分が後攻で、自分の最初のターン」か（多くのカードの条件「後攻で最初のターンなら」） */
  isFirstTurnGoingSecond() {
    return this.playerIdx !== this.engine.state.firstPlayer && this.player.turnCount === 1;
  }

  /** このターンに指定名のサポートを使ったか（「このターンに〈限界飯〉を使っていたなら」等） */
  usedSupportNamed(name) {
    return (this.player.supportsPlayedThisTurn || []).some((c) => c.name === name);
  }

  /** このターンに使った、指定タグを持つサポートの枚数（filter で supportType も絞れる） */
  countSupportThisTurn(filter) {
    return (this.player.supportsPlayedThisTurn || []).filter(filter).length;
  }

  /** ステージ上の自分のエールの色一覧（重複なし） */
  ownStageCheerColors() {
    const colors = new Set();
    for (const { holomem } of this.holomems('self')) {
      for (const cheer of holomem.cheers) {
        if (cheer.color && cheer.color !== COLORLESS) colors.add(cheer.color);
      }
    }
    return [...colors];
  }

  // ============ 選択要求（yield して使う） ============

  /**
   * カードを1枚選ぶ。optional なら「選ばない」も可（null が返る）。
   * cards: 選択可能なカード / displayCards: 選択不可だが見せるカード
   *   （「デッキの上からN枚を見る」で対象外のカードも公開するために使う）
   */
  chooseCard({ cards, title, optional = false, skipLabel = '選ばない', displayCards = [] }) {
    return {
      kind: 'chooseCard',
      player: this.playerIdx,
      title,
      displayCards: displayCards.filter((c) => !cards.includes(c)),
      buildOptions: () => [
        ...cards.map((c, i) => ({ id: `card_${i}`, label: c.name, card: c, value: c })),
        ...(optional ? [{ id: 'skip', label: skipLabel, value: null }] : []),
      ],
    };
  }

  /**
   * カードの並び順をプレイヤーに決めさせるフロー（「好きな順でデッキの下に戻す」等）。
   * 1枚ずつ「次に置くカード」を選ぶ。「この順のまま」も選べる。
   * 使い方: const ordered = yield* ctx.orderCardsFlow(cards, 'デッキの下に戻す順番');
   */
  *orderCardsFlow(cards, title) {
    const remaining = [...cards];
    const ordered = [];
    while (remaining.length > 1) {
      const picked = yield this.chooseCard({
        cards: remaining,
        title: `${title}: ${ordered.length + 1}番目（上側）に置くカードを選択`,
        optional: true,
        skipLabel: 'この順のまま戻す',
      });
      if (!picked) break;
      ordered.push(picked);
      remaining.splice(remaining.indexOf(picked), 1);
    }
    ordered.push(...remaining);
    return ordered;
  }

  /** 自分/相手のホロメンを1人選ぶ（filter適用後）。optional 可 */
  chooseHolomem({ side = 'self', filter = null, title, optional = false }) {
    const entries = this.holomems(side, filter);
    return {
      kind: 'chooseHolomem',
      player: this.playerIdx,
      title,
      buildOptions: () => [
        ...entries.map((e, i) => ({
          id: `mem_${e.pos.zone}_${e.pos.index}`,
          label: `${e.top.name}（${e.pos.zone === 'center' ? 'センター' : e.pos.zone === 'collab' ? 'コラボ' : 'バック'}${side === 'opp' ? '/相手' : ''}）`,
          value: e,
          pos: e.pos,
          side,
        })),
        ...(optional ? [{ id: 'skip', label: '選ばない', value: null }] : []),
      ],
    };
  }

  /** はい/いいえ の確認（任意効果「～できる」用） */
  confirm(title, yesLabel = '発動する', noLabel = '発動しない') {
    return {
      kind: 'confirm',
      player: this.playerIdx,
      title,
      buildOptions: () => [
        { id: 'yes', label: yesLabel, value: true },
        { id: 'no', label: noLabel, value: false },
      ],
    };
  }

  // ============ 基本操作（同期） ============

  /** デッキからN枚引く (5.7) */
  draw(n) {
    const drawn = [];
    for (let i = 0; i < n && this.player.deck.length > 0; i++) {
      const c = this.player.deck.shift();
      this.player.hand.push(c);
      drawn.push(c);
    }
    this.log(`${this.player.name}: ${drawn.length}枚ドロー（${drawn.map((c) => c.name).join(' / ')}）`);
    return drawn;
  }

  /**
   * サイコロを1個振る (5.24)。「目をNとして扱う」継続効果に対応。ジェネレータ（呼び出しは `yield* ctx.rollDice()`）。
   * 振った後、自分のファン等のダイス割り込み（onDiceRollReact。「目を4として扱う」「振り直す」等）があれば
   * コントローラー自身に決定ポイントを提示する。
   */
  *rollDice() {
    let value = rollDie(this.engine.rng);
    const fixed = this.engine.state.modifiers.find(
      (m) => m.kind === 'diceFixed' && m.ownerIdx === this.playerIdx);
    if (fixed) {
      this.log(`🎲 サイコロ: ${value} → ${fixed.value} として扱う（${fixed.description || '効果'}）`);
      value = fixed.value;
    } else {
      this.log(`🎲 サイコロ: ${value}`);
    }
    value = yield* this._offerDiceReact(value);
    return value;
  }

  /** ダイス割り込み（自分のステージの装着カードの onDiceRollReact）をコントローラーに順に提示する */
  *_offerDiceReact(value) {
    const eng = this.engine;
    for (const h of eng._stageHolomems(this.player)) {
      for (const att of [...h.attachments]) { // apply で外れても走査が崩れないようスナップショット
        const r = eng.registry.get(att.number)?.onDiceRollReact;
        if (!r) continue;
        // roller=振っているホロメン（推しスキルの場合は null）/ rollerCard=振っている能力の発生源カード（推し含む）
        const info = { ownerIdx: this.playerIdx, roller: this.sourceHolomem, rollerCard: this.sourceCard, value, fanCard: att, fanHolomem: h };
        if (r.canUse && !r.canUse(eng, info)) continue;
        const use = yield {
          kind: 'confirm', player: this.playerIdx, title: r.title,
          buildOptions: () => [
            { id: 'yes', label: r.yesLabel || '使う', value: true },
            { id: 'no', label: '使わない', value: false },
          ],
        };
        if (use) value = r.apply(eng, { ...info, value });
      }
    }
    // 自分の推しスキルによるダイス割り込み（「自分の〈X〉がサイコロを振った時：振り直す」hBP02-005 等）
    const oshiDef = eng.registry.get(this.player.oshi.number)?.onDiceRollOshiSkill;
    if (oshiDef) {
      const me = this.player;
      const used = oshiDef.sp ? me.usedSpOshiSkillThisGame : me.usedOshiSkillThisTurn;
      const info = { ownerIdx: this.playerIdx, roller: this.sourceHolomem, rollerCard: this.sourceCard, value };
      if (!used && me.holoPower.length >= oshiDef.cost && (!oshiDef.canUse || oshiDef.canUse(eng, this.playerIdx, info))) {
        const use = yield {
          kind: 'confirm', player: this.playerIdx,
          title: oshiDef.title || '推しスキルを使いますか？（サイコロ）',
          buildOptions: () => [
            { id: 'yes', label: `${oshiDef.sp ? 'SP' : ''}推しスキルを使う（ホロパワー-${oshiDef.cost}）`, value: true },
            { id: 'no', label: '使わない', value: false },
          ],
        };
        if (use) {
          me.archive.push(...me.holoPower.splice(0, oshiDef.cost));
          if (oshiDef.sp) me.usedSpOshiSkillThisGame = true; else me.usedOshiSkillThisTurn = true;
          value = oshiDef.apply(eng, this.playerIdx, { ...info, value });
        }
      }
    }
    return value;
  }

  /**
   * アーツの解決中にダメージ修正を積む（「サイコロを振れる：偶数の時、このアーツ+20」等）。
   * エンジンがアーツのダメージ計算時に artBonus を加算する。
   */
  addArtBonus(n, reason = '') {
    this.artBonus = (this.artBonus || 0) + n;
    if (n !== 0) this.log(`アーツ${n > 0 ? '+' : ''}${n}${reason ? `（${reason}）` : ''}`);
  }

  /** sourceHolomem のステージ位置 {zone,index} を返す（ステージ外なら null）。起動型能力の位置限定判定に使う */
  sourceHolomemPos() {
    if (!this.sourceHolomem) return null;
    for (const pos of this.engine._stagePositions(this.player)) {
      if (this.engine._holomemAt(this.player, pos) === this.sourceHolomem) return pos;
    }
    return null;
  }

  /**
   * 相手に、相手のステージのホロメンを選ばせる決定ポイント（「相手は自身のバックホロメン1人を選ぶ」等）。
   * 決定ポイントの所有者は相手プレイヤーになる（request.player = 相手）。戻り値は選ばれたエントリ {pos, holomem, top}。
   * 強制選択（「選ばない」なし）。候補が無ければ null で再開される。
   */
  opponentChoosesHolomem({ filter = null, title }) {
    const oppIdx = 1 - this.playerIdx;
    const opp = this.opponent;
    const entries = [];
    for (const pos of this.engine._stagePositions(opp)) {
      const holomem = this.engine._holomemAt(opp, pos);
      const top = holomem.stack[0];
      if (!filter || filter({ pos, holomem, top })) entries.push({ pos, holomem, top });
    }
    return {
      kind: 'chooseHolomem',
      player: oppIdx,
      title,
      buildOptions: () => entries.map((e) => ({
        id: `mem_${e.pos.zone}_${e.pos.index}`,
        label: `${e.top.name}（${e.pos.zone === 'center' ? 'センター' : e.pos.zone === 'collab' ? 'コラボ' : 'バック'}）`,
        value: e, pos: e.pos, side: 'self',
      })),
    };
  }

  /**
   * ホロメンを持ち主のコラボポジションへ移動する（バックから。コラボ扱いではない＝onCollab等は誘発しない）。
   * 相手のバックをコラボに上げさせる効果（凸待ち等）に使う。
   */
  moveToCollabOwner(holomem) {
    const owner = this.state.players.find((p) => p.back.includes(holomem));
    if (!owner || owner.collab) return false;
    const i = owner.back.indexOf(holomem);
    owner.back.splice(i, 1);
    owner.collab = holomem;
    this.log(`${holomem.stack[0].name} をコラボポジションへ移動（コラボとしては扱わない）`);
    return true;
  }

  /**
   * ホロメンの実効バトンタッチコスト（基礎 batonTouch ＋ 軽減/増加アウラ・ターン修正）を色配列で返す。
   * 「相手のセンターのバトンタッチに必要な無色がN以上なら」等の条件判定に使う（hBP08-052/053 等）。
   */
  effectiveBatonCost(holomem) {
    const ownerIdx = this.engine.state.players.findIndex((p) => this.engine._stageHolomems(p).includes(holomem));
    if (ownerIdx < 0) return [];
    return this.engine._effectiveBatonCost(holomem, holomem.stack[0].batonTouch || [], ownerIdx);
  }

  /** 実効バトンタッチコストのうち指定色の個数（省略時は無色） */
  batonCostCount(holomem, color = '無色') {
    return this.effectiveBatonCost(holomem).filter((c) => c === color).length;
  }

  /** お休み状態のホロメンをアクティブにする (4.3.2) */
  setActive(holomem) {
    if (holomem.rested) {
      holomem.rested = false;
      this.log(`${holomem.stack[0].name} をアクティブにした`);
    }
  }

  /** ホロメンをバックポジションへ移動する（センター/コラボから。アクティブ状態は維持） */
  moveToBack(holomem) {
    const p = this.player;
    if (this.engine._stageCount(p) > 6) return; // 念のため
    if (p.center === holomem) p.center = null;
    else if (p.collab === holomem) p.collab = null;
    else return; // 既にバック等
    p.back.push(holomem);
    this.log(`${holomem.stack[0].name} をバックポジションへ移動`);
  }

  /**
   * 任意の持ち主のホロメンをバックへ移動し、お休みにして「次のリセットステップで非アクティブ」にする (hBP06-088)。
   * 相手のセンター/コラボを下げる効果に使う（持ち主は自動判定）。
   */
  moveToBackRestedSkipReset(holomem) {
    const owner = this.state.players.find(
      (p) => p.center === holomem || p.collab === holomem || p.back.includes(holomem));
    if (!owner) return;
    if (owner.center === holomem) owner.center = null;
    else if (owner.collab === holomem) owner.collab = null;
    if (!owner.back.includes(holomem)) owner.back.push(holomem);
    holomem.rested = true;
    holomem.skipNextReset = true;
    this.log(`${holomem.stack[0].name} をお休みさせてバックポジションへ移動（次のリセットステップで非アクティブ）`);
  }

  /** ホロメンを効果でダウンさせる (4.4.9)。HPに関係なく次のチェックタイミングでダウン処理 */
  forceDown(targetEntry, opts = {}) {
    targetEntry.holomem.forcedDown = true;
    if (opts.noLifeOnDown) targetEntry.holomem.noLifeOnDown = true;
    this.log(`${targetEntry.top.name} をダウンさせる${opts.noLifeOnDown ? '（ライフは減らない）' : ''}`);
  }

  /** HPをすべて回復 (5.23.2) */
  healAll(holomem) {
    if (holomem.damage > 0) {
      this.log(`${holomem.stack[0].name} のHPをすべて回復（${holomem.damage}）`);
      holomem.damage = 0;
    }
  }

  /** デッキをシャッフルする (5.6) */
  shuffleDeck() {
    this.engine._shuffle(this.player.deck);
    this.log(`${this.player.name}: デッキをシャッフル`);
  }

  shuffleCheerDeck() {
    this.engine._shuffle(this.player.cheerDeck);
    this.log(`${this.player.name}: エールデッキをシャッフル`);
  }

  /** デッキ内の条件一致カード一覧（非公開領域なので「見つからない」選択も保証される） */
  deckCards(filter) {
    return this.player.deck.filter(filter);
  }

  /** デッキから特定カードを取り除く（移動前処理） */
  removeFromDeck(card) {
    const i = this.player.deck.indexOf(card);
    if (i !== -1) this.player.deck.splice(i, 1);
  }

  removeFromHand(card) {
    const i = this.player.hand.indexOf(card);
    if (i !== -1) this.player.hand.splice(i, 1);
  }

  /** カードを手札に加える（公開ログ付き）。公開中(revealed)にあれば取り除く */
  addToHand(card, { reveal = true } = {}) {
    this._unreveal(card);
    this.player.hand.push(card);
    if (reveal) this.log(`${this.player.name}: ${card.name} を公開し手札に加えた`);
  }

  /**
   * デッキの上からN枚を見る。
   * 見ている間は解決領域（revealed）に置く（カードがどの領域にも属さない瞬間を作らない）。
   * 使い終わったら deckToBottom / addToHand 等で必ず移動させること。
   */
  lookTopDeck(n) {
    const cards = this.player.deck.splice(0, Math.min(n, this.player.deck.length));
    this.player.revealed.push(...cards);
    this.log(`${this.player.name}: デッキの上から${cards.length}枚を見る`);
    return cards;
  }

  /** カードをデッキの下に戻す（公開中にあれば取り除く） */
  deckToBottom(cards) {
    for (const c of cards) this._unreveal(c);
    this.player.deck.push(...cards);
  }

  /** カードをデッキの上に戻す（公開中にあれば取り除く。先頭の順は cards の順） */
  deckToTop(cards) {
    for (const c of cards) this._unreveal(c);
    this.player.deck.unshift(...cards);
  }

  _unreveal(card) {
    const i = this.player.revealed.indexOf(card);
    if (i !== -1) this.player.revealed.splice(i, 1);
  }

  /** 手札を全てデッキに戻す（シャッフルは別途） */
  returnHandToDeck() {
    const n = this.player.hand.length;
    this.player.deck.push(...this.player.hand);
    this.player.hand = [];
    this.log(`${this.player.name}: 手札${n}枚をデッキに戻した`);
  }

  /** ホロメンをバックに出す（ステージ上限チェック付き） */
  putToBack(card) {
    if (this.engine._stageCount(this.player) >= 6) return false;
    this.player.back.push(this.engine._createHolomem(card, this.state.turn));
    this.log(`${this.player.name}: ${card.name} をステージに出した`);
    return true;
  }

  /** エールをホロメンに付ける（送る 5.21） */
  attachCheer(cheer, holomem) {
    holomem.cheers.push(cheer);
    this.log(`${holomem.stack[0].name} に ${cheer.name} を送った`);
    // 「（このホロメンに）エールが付いた時」の装着カード同期トリガー（hBP03-113 等）。
    // 効果が即時・選択不要のものに限る（attachCheer はジェネレータでないため）。
    for (const att of holomem.attachments) {
      const fn = this.engine.registry.get(att.number)?.attached?.onCheerAttached;
      if (fn) fn(holomem, this.engine, att);
    }
  }

  /** サポートカード（ファン/マスコット等）をホロメンに付ける */
  attachSupport(card, holomem) {
    holomem.attachments.push(card);
    this.log(`${holomem.stack[0].name} に ${card.name} を付けた`);
  }

  /**
   * サポートを付け、付け先カードの onAttach トリガー（「付けた時」）があれば誘発する。
   * 効果テキスト内で装着する場合（例: アーカイブの〈こよりの助手くん〉を付ける）に使う。
   * 使い方: yield* ctx.attachSupportWithTrigger(card, holomem);
   */
  *attachSupportWithTrigger(card, holomem) {
    this.attachSupport(card, holomem);
    const trig = this.engine.registry.get(card.number)?.triggers?.onAttach;
    if (trig) {
      yield* trig(new EffectContext(this.engine, this.playerIdx, {
        sourceCard: card,
        sourceHolomem: holomem,
      }));
    }
  }

  /** エールデッキから特定カードを取り除く */
  removeFromCheerDeck(card) {
    const i = this.player.cheerDeck.indexOf(card);
    if (i !== -1) this.player.cheerDeck.splice(i, 1);
  }

  /** 効果でカードを公開した時、UIに大きく表示させる */
  flashReveal(card) {
    this.engine.flashReveal(card);
  }

  /**
   * エールデッキの上からN枚を見る。見ている間は解決領域(revealed)に置く。
   * 使い終わったら cheerDeckToBottom / sendRevealedCheer で必ず移すこと。
   */
  lookTopCheerDeck(n) {
    const cards = this.player.cheerDeck.splice(0, Math.min(n, this.player.cheerDeck.length));
    this.player.revealed.push(...cards);
    this.log(`${this.player.name}: エールデッキの上から${cards.length}枚を見る`);
    return cards;
  }

  /** 解決領域のエールをエールデッキの下に戻す */
  cheerDeckToBottom(cards) {
    for (const c of cards) this._unreveal(c);
    this.player.cheerDeck.push(...cards);
  }

  /** 解決領域のエールを公開してホロメンに送る（lookTopCheerDeck で見たエール用） */
  sendRevealedCheer(cheer, holomem) {
    this._unreveal(cheer);
    this.flashReveal(cheer);
    this.attachCheer(cheer, holomem);
  }

  /** エールデッキの上から1枚公開してホロメンに送る (5.21.2) */
  sendCheerFromCheerDeckTop(holomem) {
    if (this.player.cheerDeck.length === 0) return null;
    const cheer = this.player.cheerDeck.shift();
    this.log(`${this.player.name}: エールデッキから ${cheer.name} を公開`);
    this.flashReveal(cheer); // どのエールが出たかを画面に大きく見せる
    this.attachCheer(cheer, holomem);
    return cheer;
  }

  /** アーカイブからカードを取り除く */
  removeFromArchive(card) {
    const i = this.player.archive.indexOf(card);
    if (i !== -1) this.player.archive.splice(i, 1);
  }

  /**
   * ホロメンに付いているエールを1枚アーカイブする。ジェネレータ（呼び出しは `yield* ctx.archiveCheer(...)`）。
   * opts.ability!==false（＝能力によるアーカイブ）のとき、装着カードのコスト置換
   * （`def.cheerArchiveReplace`：「アーカイブするエール1枚のかわりにこのカードをアーカイブできる」hBP03-106）を提示する。
   * バトンタッチ等のシステムコストは opts.ability=false で呼び、置換を提示しない。
   */
  *archiveCheer(holomem, cheer, opts = {}) {
    // 能力によるアーカイブ時のみ、自分のホロメンに付いた置換カードを提示
    if (opts.ability !== false && this.engine._stageHolomems(this.player).includes(holomem)) {
      for (const att of [...holomem.attachments]) {
        const rep = this.engine.registry.get(att.number)?.cheerArchiveReplace;
        if (!rep) continue;
        const use = yield {
          kind: 'confirm', player: this.playerIdx,
          title: rep.title || `${cheer.name}のかわりに${att.name}をアーカイブする？`,
          buildOptions: () => [
            { id: 'yes', label: rep.yesLabel || `${att.name}をアーカイブ`, value: true },
            { id: 'no', label: `エール（${cheer.name}）をアーカイブ`, value: false },
          ],
        };
        if (use) {
          const ai = holomem.attachments.indexOf(att);
          if (ai !== -1) holomem.attachments.splice(ai, 1);
          this.player.archive.push(att);
          this.log(`${holomem.stack[0].name}: ${cheer.name}のかわりに${att.name}をアーカイブ`);
          return; // エールは場に残る
        }
      }
    }
    const i = holomem.cheers.indexOf(cheer);
    if (i !== -1) {
      holomem.cheers.splice(i, 1);
      this.player.archive.push(cheer);
      this.log(`${holomem.stack[0].name} の ${cheer.name} をアーカイブ`);
      // 「このターンに自分のステージのエールがアーカイブされた」記録（hBP07-088 のアーツ+30条件 等）
      this.player.cheerArchivedThisTurn = true;
      // 「自分のエールがアーカイブに置かれた時」の同期トリガー（即時・選択不要。hBP08-031 等）
      for (const sh of this.engine._stageHolomems(this.player)) {
        const fn = this.engine.registry.get(sh.stack[0].number)?.onSelfCheerArchived;
        if (fn) fn(sh, this.engine, this.playerIdx);
      }
    }
  }

  /** エールを別のホロメンへ付け替える (5.17.4) */
  moveCheer(cheer, fromHolomem, toHolomem) {
    const i = fromHolomem.cheers.indexOf(cheer);
    if (i !== -1) {
      fromHolomem.cheers.splice(i, 1);
      toHolomem.cheers.push(cheer);
      this.log(`${cheer.name} を ${toHolomem.stack[0].name} に付け替えた`);
    }
  }

  /** HPを回復する (5.23) */
  heal(holomem, n) {
    const before = holomem.damage;
    holomem.damage = Math.max(0, holomem.damage - n);
    if (before !== holomem.damage) {
      this.log(`${holomem.stack[0].name} のHPを${before - holomem.damage}回復`);
    }
  }

  /**
   * 特殊ダメージを与える (5.22)。ジェネレータ（呼び出しは `yield* ctx.dealSpecialDamage(...)`）。
   * opts.noLifeOnDown: 「ただし、ダウンしても相手のライフは減らない」と記載がある場合のみ true。
   * 記載がない特殊ダメージでダウンした場合、ライフは通常どおり減る。
   * 付いているファン等の特殊ダメージ修正（雪民など）は自動で加算される。
   * 相手のターン中でなくても、防御側に「受ける時」の割り込み（推しスキル/ホロメン/ファン）があれば決定ポイントを挟む。
   */
  *dealSpecialDamage(targetEntry, amount, opts = {}) {
    let total = amount;
    // 発生源ホロメンの装着カードによる特殊ダメージ修正
    if (this.sourceHolomem) {
      total += this.engine.effects.specialDamageBonus(this.sourceHolomem, targetEntry, this.playerIdx);
    }
    // 受け手の「受けるダメージ」修正（軽減/増加）。特殊ダメージにも適用される（攻撃元=発生源ホロメン）
    total = this.engine._applyDamageReceived(targetEntry.holomem, total, 'special', this.sourceHolomem || null);

    // 防御側の「ダメージを受ける時」割り込み（推しスキル/ホロメンギフト/装着ファン）。発生源の相手側のみ。
    const eng = this.engine;
    const defIdx = eng.state.players.findIndex((p) => eng._stageHolomems(p).includes(targetEntry.holomem));
    if (defIdx >= 0 && defIdx !== this.playerIdx) {
      const responders = eng._collectDamageResponders(targetEntry.holomem, 'special', defIdx);
      for (const resp of responders) {
        const r = resp.build(total);
        if (!r) continue;
        const use = yield {
          kind: 'confirm', player: defIdx, title: r.title,
          buildOptions: () => [
            { id: 'yes', label: r.yesLabel, value: true },
            { id: 'no', label: '使わない', value: false },
          ],
        };
        if (use) total = Math.max(0, r.apply(total));
      }
    }

    targetEntry.holomem.damage += total;
    if (total > 0) this.engine._dispatchDamageReceivedForced(targetEntry.holomem); // 強制被ダメージトリガー (hBP07-108)
    // 「ライフは減らない」は、この特殊ダメージでダウンが確定した場合のみ適用する。
    // （ダウンに至らなかった場合にフラグを残すと、後から別のダメージで倒された時まで
    //   ライフが減らなくなってしまう）
    if (targetEntry.holomem.damage >= this.engine.effectiveHp(targetEntry.holomem)) {
      if (opts.noLifeOnDown) targetEntry.holomem.noLifeOnDown = true;
      // 「ダウンさせた時」トリガー（雪花ラミィSP推しスキル等）
      this.engine._notifySourceDown(this.sourceHolomem, this.playerIdx);
    }
    this.log(
      `${targetEntry.top.name} に特殊ダメージ${total}` +
      `${opts.noLifeOnDown ? '（ダウンしてもライフは減らない）' : ''}` +
      `（累計${targetEntry.holomem.damage}/${this.engine.effectiveHp(targetEntry.holomem)}）`
    );
  }

  /**
   * ターン終了まで有効な修正を追加（「このターンの間～」）。
   * mod.amount は数値のほか、評価時に再計算する関数 (holomem, engine)=>number も指定できる
   * （「選んだホロメンのエール1枚につき+10」のように対象の状態で変動する修正用）。
   */
  addTurnModifier(mod) {
    this.engine.state.modifiers.push({ duration: 'turn', ...mod });
    this.log(`継続効果: ${mod.description || mod.kind}`);
  }

  /**
   * 「（効果名）はターンに1回しか使えない」判定。key はカード/効果ごとに一意な文字列。
   * 既にこのターン使用済みなら true。マークは markOncePerTurn で行う（エンドステップで自動消滅）。
   */
  oncePerTurnUsed(key) {
    return this.engine.state.modifiers.some(
      (m) => m.kind === 'oncePerTurnUsed' && m.key === key && m.ownerIdx === this.playerIdx);
  }

  /** 「ターンに1回」制限を使用済みとしてマークする（ターン終了で自動消滅） */
  markOncePerTurn(key) {
    this.engine.state.modifiers.push({
      duration: 'turn', kind: 'oncePerTurnUsed', key, ownerIdx: this.playerIdx,
    });
  }

  /**
   * 指定したブルームエフェクトを、Bloom先ホロメンを発生源として実行する (13.3)。
   * 効果テキスト内でBloomを行った場合（コラボエフェクト等）のブルームエフェクト誘発に使う。
   */
  *runBloomEffect(def, card, holomem) {
    yield* def.run(new EffectContext(this.engine, this.playerIdx, {
      sourceCard: card,
      sourceHolomem: holomem,
    }));
  }

  /**
   * アーカイブのホロメンを使ってBloomさせるフロー（オリー推しスキル等）。
   * Bloomの通常条件（同名・レベル遷移・HP>ダメージ・ターン制限 8.3）に従う。
   * 使い方: const done = yield* ctx.bloomFromArchiveFlow({ targetFilter, optional });
   */
  *bloomFromArchiveFlow({ targetFilter = null, optional = false } = {}) {
    const candidates = this.player.archive.filter((card) =>
      card.kind === 'holomen' &&
      this.holomems('self', targetFilter).some((e) => this.engine._canBloom(e.holomem, card)));
    if (candidates.length === 0) {
      this.log('アーカイブにBloomできるホロメンがいない');
      return false;
    }
    const card = yield this.chooseCard({
      cards: candidates,
      title: 'アーカイブからBloomさせるホロメンカードを選択',
      optional,
      skipLabel: 'Bloomしない',
    });
    if (!card) return false;
    const entry = yield this.chooseHolomem({
      side: 'self',
      filter: (e) => (!targetFilter || targetFilter(e)) && this.engine._canBloom(e.holomem, card),
      title: `${card.name} でBloomさせるホロメンを選択`,
    });
    if (!entry) return false;
    this.removeFromArchive(card);
    entry.holomem.stack.unshift(card);
    entry.holomem.bloomedTurn = this.state.turn;
    this.log(`${entry.holomem.stack[1].name} → ${card.name}〔${card.bloomLevel}〕にBloom（アーカイブから）`);
    // ブルームエフェクトも誘発する (13.3)
    const def = this.engine.registry.get(card.number)?.bloomEffect;
    if (def) {
      this.log(`《ブルームエフェクト》${def.name}`);
      yield* def.run(new EffectContext(this.engine, this.playerIdx, {
        sourceCard: card,
        sourceHolomem: entry.holomem,
      }));
    }
    return true;
  }
}
