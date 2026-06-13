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
 * 選択を伴わない操作（draw, rollDice 等）は普通のメソッド呼び出しでよい。
 *
 * ルール条番号は battle_simulator/docs/RULES_SPEC.md / 総合ルール ver.1.9.0 参照。
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

  /** サイコロを1個振る (5.24)。「目をNとして扱う」継続効果に対応 */
  rollDice() {
    let value = rollDie(this.engine.rng);
    const fixed = this.engine.state.modifiers.find(
      (m) => m.kind === 'diceFixed' && m.ownerIdx === this.playerIdx);
    if (fixed) {
      this.log(`🎲 サイコロ: ${value} → ${fixed.value} として扱う（${fixed.description || '効果'}）`);
      value = fixed.value;
    } else {
      this.log(`🎲 サイコロ: ${value}`);
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
  }

  /** サポートカード（ファン/マスコット等）をホロメンに付ける */
  attachSupport(card, holomem) {
    holomem.attachments.push(card);
    this.log(`${holomem.stack[0].name} に ${card.name} を付けた`);
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

  /** ホロメンに付いているエールを1枚アーカイブする */
  archiveCheer(holomem, cheer) {
    const i = holomem.cheers.indexOf(cheer);
    if (i !== -1) {
      holomem.cheers.splice(i, 1);
      this.player.archive.push(cheer);
      this.log(`${holomem.stack[0].name} の ${cheer.name} をアーカイブ`);
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
   * 特殊ダメージを与える (5.22)
   * opts.noLifeOnDown: 「ただし、ダウンしても相手のライフは減らない」と記載がある場合のみ true。
   * 記載がない特殊ダメージでダウンした場合、ライフは通常どおり減る。
   * 付いているファン等の特殊ダメージ修正（雪民など）は自動で加算される。
   */
  dealSpecialDamage(targetEntry, amount, opts = {}) {
    let total = amount;
    // 発生源ホロメンの装着カードによる特殊ダメージ修正
    if (this.sourceHolomem) {
      total += this.engine.effects.specialDamageBonus(this.sourceHolomem, targetEntry, this.playerIdx);
    }
    // 受け手の「受けるダメージ」修正（軽減/増加）。特殊ダメージにも適用される
    total = this.engine._applyDamageReceived(targetEntry.holomem, total);
    targetEntry.holomem.damage += total;
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

  /** ターン終了まで有効な修正を追加（「このターンの間～」） */
  addTurnModifier(mod) {
    this.engine.state.modifiers.push({ duration: 'turn', ...mod });
    this.log(`継続効果: ${mod.description || mod.kind}`);
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
