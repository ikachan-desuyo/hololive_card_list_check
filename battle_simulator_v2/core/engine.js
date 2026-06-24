/**
 * ゲームエンジン（DOM非依存）
 *
 * 設計: 「決定ポイント」方式のステートマシン。
 *   - エンジンはプレイヤーの入力が必要になるまで自動で進行し、state.pending に
 *     「誰が・何を・どの選択肢から選ぶか」を置いて停止する
 *   - UI/テスト/CPU は engine.actions() で選択肢を取得し、engine.apply(actionId) で適用する
 *   - 乱数はシード可能（テストの再現性）。Math.random は使わない
 *
 * ルールの根拠は battle_simulator_v2/docs/RULES_SPEC.md（条番号は総合ルール ver.1.9.0）。
 * カード個別効果は効果システムで実装済み（手書き定義 cards/<番号>.js ＞ テキストコンパイラ自動実装）。
 * いずれにも該当しない枠だけ発動タイミングで TODO(効果未実装) ログを出す。実装状況は docs/CARD_EFFECT_STATUS.md 参照。
 */

import { COLORLESS, STAGE_LIMIT, MULLIGAN_LIMIT, INITIAL_HAND, STEP_NAMES, LOSS_REASONS } from './constants.js';
import { CardKind } from './cards.js';
import { createRng, shuffle, rollDie } from './rng.js';
import { EffectContext } from './effects/context.js';
import { EffectSystem } from './effects/system.js';
import { EffectRegistry } from './effects/registry.js';

/** ステージのホロメン1人分（カードのスタック + 付帯情報）(4.4) */
function createHolomem(card, turn) {
  return {
    stack: [card],        // [0] が一番上（情報参照の基準 4.4.2.1）
    cheers: [],           // 付いているエール
    attachments: [],      // 付いているサポート（ツール/マスコット/ファン）
    damage: 0,            // 負っているダメージ (4.4.5)
    rested: false,        // お休み状態 (4.3.2)
    faceDown: false,
    placedTurn: turn,     // ステージに出たターン（Bloom条件 8.3.2）
    bloomedTurn: null,    // 最後にBloomしたターン
  };
}

function topCard(holomem) {
  return holomem.stack[0];
}

function createPlayerState(name, gameDeck) {
  return {
    name,
    oshi: gameDeck.oshi,
    deck: [...gameDeck.deck],
    cheerDeck: [...gameDeck.cheerDeck],
    hand: [],
    archive: [],
    holoPower: [],
    life: [],
    revealed: [],           // 解決領域 (4.16): 公開して移動先を選択中のカード
    center: null,
    collab: null,
    back: [],
    lifeDamage: 0,          // 未処理のライフダメージ (3.2)
    mulliganCount: 0,
    limitedPlayedThisTurn: 0,
    deckArchivedThisTurn: 0, // このターンに自分のデッキからアーカイブした枚数（hBP08-020）
    usedCollabThisTurn: false,
    usedBatonTouchThisTurn: false,
    supportsPlayedThisTurn: [], // このターンに使ったサポートのカード名一覧
    downedCardsLastOppTurn: [], // 直前の相手ターンにダウンした自分のホロメンのカード一覧
    usedOshiSkillThisTurn: 0, // このターンに使った（通常）推しスキルの回数。上限は _oshiSkillCap（通常1）
    usedSpOshiSkillThisGame: false,
    turnCount: 0,           // このプレイヤーの何ターン目か
  };
}

export class Engine {
  /**
   * @param {object} opts { decks: [gameDeck0, gameDeck1], seed, names, firstPlayer }
   *   gameDeck は CardLibrary.buildGameDeck() の戻り値
   */
  constructor(opts) {
    this.rng = createRng(opts.seed ?? 1);
    this.onChange = opts.onChange || (() => {});
    // ステップ境界に「間」を入れる（UIが自動で進めることでドロー等の瞬間を見せる）
    this.stepPauses = opts.stepPauses !== false;
    // 任意効果の発動確認（true=確認を出す/false=自動発動）。設定で切替。既定は確認する。
    this.confirmOptionalEffects = opts.confirmOptionalEffects !== false;
    // カード効果システム（registry は事前に preload しておくこと）
    this.registry = opts.registry || new EffectRegistry();
    this.effects = new EffectSystem(this, this.registry);
    const names = opts.names || ['プレイヤー1', 'プレイヤー2'];
    this.state = {
      phase: 'setup',          // 'setup' | 'playing' | 'ended'
      players: [
        createPlayerState(names[0], opts.decks[0]),
        createPlayerState(names[1], opts.decks[1]),
      ],
      firstPlayer: opts.firstPlayer ?? null, // null = start() で決定（ランダム/手動選択の決定ポイントを出す）
      turnPlayer: 0,
      turn: 0,                 // 全体のターン番号（1始まり）
      step: null,
      pending: null,           // 決定ポイント { type, player, options[], auto }
      winner: null,            // 0 | 1 | 'draw'
      lossReason: null,
      logs: [],
      modifiers: [],           // ターン中などの継続修正（EffectSystem が管理）
      lastReveal: null,        // 効果による公開カードの演出用 { card, seq }（UIが監視）
      perfUsed: { center: false, collab: false }, // このパフォーマンスステップでアーツ使用済みか (9.2.1.3-5)
    };
    this._setupQueue = [];
    this._revealSeq = 0;
  }

  /** 効果でカードを公開した時の演出通知（UIが lastReveal を監視して大きく表示する） */
  flashReveal(card) {
    this.state.lastReveal = { card, seq: ++this._revealSeq };
  }

  // ============ 公開API ============

  log(msg) {
    this.state.logs.push(msg);
  }

  /** 現在の決定ポイントの選択肢一覧 */
  actions() {
    return this.state.pending ? this.state.pending.options : [];
  }

  /** ゲーム開始（最初の決定ポイントまで進む） */
  start() {
    const s = this.state;
    for (const p of s.players) {
      shuffle(p.deck, this.rng);
      shuffle(p.cheerDeck, this.rng);
      this._drawCards(p, INITIAL_HAND);
    }
    if (s.firstPlayer == null) {
      // 先攻・後攻が未指定なら、最初の決定ポイントで決める（ランダム/手動）。
      // 決定後に _buildSetupQueue で残りのセットアップ手順を積む。
      this._setupQueue = [{ kind: 'chooseFirstPlayer' }];
    } else {
      this.log(`先攻: ${s.players[s.firstPlayer].name}`);
      this._setupQueue = this._buildSetupQueue(s.firstPlayer);
    }
    this._advanceSetup();
    this.onChange();
  }

  /** 先攻決定後のセットアップ手順: 引き直し(先攻→後攻) → マリガン(自動) → 配置(先攻→後攻) */
  _buildSetupQueue(first) {
    return [
      { kind: 'redraw', player: first },
      { kind: 'redraw', player: 1 - first },
      { kind: 'mulligan' },
      { kind: 'placementCenter', player: first },
      { kind: 'placementPenalty', player: first },
      { kind: 'placementBack', player: first },
      { kind: 'placementCenter', player: 1 - first },
      { kind: 'placementPenalty', player: 1 - first },
      { kind: 'placementBack', player: 1 - first },
      { kind: 'finishSetup' },
    ];
  }

  /** 選択肢を適用して次の決定ポイントまで進む */
  apply(actionId) {
    const s = this.state;
    if (!s.pending) throw new Error('決定ポイントがありません');
    const action = s.pending.options.find((o) => o.id === actionId);
    if (!action) throw new Error(`不正なアクション: ${actionId}`);
    const pending = s.pending;
    s.pending = null;
    this._execute(pending, action);
    this._autoResolve();
    this.onChange();
  }

  concede(player) {
    this._setWinner(1 - player, LOSS_REASONS.CONCEDE, player);
    this.onChange();
  }

  /** ホロメンの実効HP（カードのHP + 装着・継続効果のHP修正） */
  effectiveHp(holomem) {
    const ownerIdx = this.state.players.findIndex((p) =>
      this._stageHolomems(p).includes(holomem));
    return (holomem.stack[0].hp ?? 0) + this.effects.hpBonus(holomem, ownerIdx);
  }

  /**
   * アーツの対象指定 { zone, index } から実際のホロメンを取り出す。
   * center/collab は単体、back は配列なので index で引く（対象拡張カード hBP07-086 等で back を対象にできる）。
   */
  _targetHolomem(playerObj, target) {
    if (!target) return null;
    if (target.zone === 'back') return playerObj.back[target.index] || null;
    return playerObj[target.zone] || null;
  }

  /**
   * AI用: ホロメン h の指定アーツの実効火力の概算（基本値＋条件dmgBonus＋ターン修正＋相手センターへの特攻）。
   * h の現在の状態（cheers/zone 等）で評価する。AIが仮のエールで試す時は h.cheers を一時的に差し替えて呼ぶ。
   * dmgBonus は見積り用途で1回だけ呼ぶ（純粋な実装を想定。失敗・対象未確定時は基本値にフォールバック）。
   * これにより「エールを足すと火力が伸びるか（枚数依存アーツ等）」をカード番号を見ずに一般的に判定できる。
   */
  _artEffectiveDamage(h, art, ownerIdx) {
    const card = topCard(h);
    let dmg = art.dmg || 0;
    const artDef = this.registry.getArt(card.number, art.name);
    if (artDef?.dmgBonus) {
      try {
        const ctx = new EffectContext(this, ownerIdx, { sourceCard: card, sourceHolomem: h });
        dmg += artDef.dmgBonus(ctx) || 0;
      } catch { /* 見積り失敗は基本値のまま */ }
    } else if (art.text) {
      // dmgBonus を持たない（run内で加算する等）アーツは、テキストから「枚数依存/閾値」ボーナスを推定。
      // 赤→青等のエール色エイリアス（推しステージスキル）も反映して色を数える。二重計上を避けるため dmgBonus が無い時だけ。
      const oshiStage = this._oshiStage(ownerIdx);
      const countColor = (color) => (h.cheers || []).filter((c) =>
        c.color === color || ((oshiStage?.cheerColorAlias?.(h, c, this, ownerIdx)) || []).includes(color)).length;
      const per = art.text.match(/([赤青黄緑紫白])エール1枚につき[^。]*?\+\s*(\d+)/);
      if (per) dmg += countColor(per[1]) * Number(per[2]);
      const thr = art.text.match(/([赤青黄緑紫白])エールが\s*([0-9０-９]+)\s*枚以上[^。]*?\+\s*(\d+)/);
      if (thr) {
        const need = Number(thr[2].replace(/[０-９]/g, (d) => String('０１２３４５６７８９'.indexOf(d))));
        if (countColor(thr[1]) >= need) dmg += Number(thr[3]);
      }
    }
    dmg += Math.max(0, this.effects.artsBonus(h, ownerIdx));
    const oppCenter = this.state.players[1 - ownerIdx]?.center;
    if (oppCenter) {
      const oc = oppCenter.stack[0].color;
      for (const tk of art.tokkou || []) if (oc === tk.color) dmg += tk.value;
    }
    return dmg;
  }

  /** ホロメンの現在の配置ゾーンを返す（'center'|'collab'|'back'|null） */
  _zoneOf(holomem) {
    for (const p of this.state.players) {
      if (p.center === holomem) return 'center';
      if (p.collab === holomem) return 'collab';
      if (p.back.includes(holomem)) return 'back';
    }
    return null;
  }

  /**
   * 「このターンの間、すべての色を持つホロメンとして扱う」継続効果が乗っているか (5.x / 個別効果)。
   * ターン修正 kind:'treatedAllColors' / 'colorOverrideAll'（match でホロメン限定）で表現する。
   * 主に特攻判定（_performanceActions のダメージ計算）で色一致の判定に使う。
   * 対象ホロメン自身に乗る効果なので ownerIdx は問わない（誰の攻撃でも全色として扱う）。
   * (hBP08-006/068/073/074)
   */
  _isTreatedAllColors(holomem) {
    if (this.state.modifiers.some(
      (m) =>
        (m.kind === 'treatedAllColors' || m.kind === 'colorOverrideAll') &&
        (!m.match || m.match(holomem)))) return true;
    // 継続アウラ（装着ファン等が相手ホロメンを全色扱いにする。Takodachi hBP08-110）。
    // どのカードも auraTreatedAllColors を持たない間はこのループは false を返すだけ（既存挙動不変）。
    for (const pl of this.state.players) {
      for (const src of this._stageHolomems(pl)) {
        for (const c of [src.stack[0], ...src.attachments]) {
          const fn = this.registry.get(c.number)?.auraTreatedAllColors;
          if (fn && fn(src, holomem, this)) return true;
        }
      }
    }
    return false;
  }

  /**
   * 名前一致（〈名称〉参照）。エクストラ「〈X〉〈Y〉としても扱う」(nameAliases) の別名にも一致する。
   * canUse(engine,...) など ctx を持たない経路から使う（ctx.nameIs と同義）。
   */
  _nameIs(card, name) {
    return !!card && (card.name === name || (card.nameAliases || []).includes(name));
  }

  /**
   * サイコロを1個振る（出目を返す）。「目をNとして扱う」継続効果 (diceFixed) を ownerIdx に対して適用する。
   * 「左手に地図」等で宣言された出目は、ctx.rollDice 以外の経路（V.7 等のリアクティブ割り込み）でも反映される (Q221)。
   * ※ファンの振り直し割り込み(onDiceRollReact)や diceDouble は含まない（それらは ctx.rollDice 側で扱う）。
   */
  _rollDieFor(ownerIdx, batchSize = undefined) {
    let value = rollDie(this.rng);
    const fixed = this.state.modifiers.find(
      (m) => m.kind === 'diceFixed' && m.ownerIdx === ownerIdx && !m.used
        && (m.batchOf == null || m.batchOf === batchSize));
    if (fixed) {
      value = fixed.value;
      if (fixed.once) fixed.used = true;
    }
    return value;
  }

  /**
   * ホロメンが指定色を「持つ」か。多色カード（'白緑'等の合成色文字列）は構成色すべてを持つ (2.4.3)。
   * 「すべての色を持つホロメンとして扱う」継続効果 (_isTreatedAllColors) も一致する。
   * ただし無色は「色」として数えない (2.4.2.2 / Q685) ため、all-colors では無色要求に一致させない。
   */
  _hasColor(holomem, color) {
    const c = topCard(holomem).color || '';
    if (color === '無色') return c.includes('無色');
    return this._isTreatedAllColors(holomem) || c.includes(color);
  }

  /**
   * 推しホロメンの「推しステージスキル」定義（常時能力）。
   * カード定義の oshiStageSkill フック（artsPlus / artsCostReduce / blocksReset /
   * cheerColorAlias / onTurnEnd / onArtsUse 等）をエンジン各所が参照する。
   * その推しが場（推し領域）にいる間つねに有効。
   */
  _oshiStage(ownerIdx) {
    const oshi = this.state.players[ownerIdx]?.oshi;
    return oshi ? this.registry.get(oshi.number)?.oshiStageSkill || null : null;
  }

  /**
   * 推しスキルの実効ホロパワーコスト（消費枚数）。
   * 自ステージのホロメン/装着カードのギフト等がコストを書き換える場合に反映する
   * （カード定義 `oshiSkillCostMod(skill, holomem, zone, engine, ownerIdx)` が必要枚数のデルタを返す。
   *  例: hBP08-060 のギフトはコラボにいる時「モコちゃん！」の必要ホロパワーを-1）。
   * X コストはここでは扱わない（呼び出し側で別処理）。
   */
  _effectiveOshiCost(skill, ownerIdx) {
    if (skill.cost === 'X') return skill.cost;
    let cost = skill.cost;
    const p = this.state.players[ownerIdx];
    for (const h of this._stageHolomems(p)) {
      const zone = this._zoneOf(h);
      const fn = this.registry.get(topCard(h).number)?.oshiSkillCostMod;
      if (fn) cost += fn(skill, h, zone, this, ownerIdx) || 0;
    }
    return Math.max(0, cost);
  }

  /**
   * 「相手のターンで、このホロメンがダメージを受けた時」に必ず発火する強制トリガー（選択なし・同期）。
   * 対象の装着カード定義 attached.onDamageReceivedForced(holomem, engine, self, ownerIdx) を呼ぶ。
   * 自分のターンに自分が受けた場合は発火しない（相手から受けた時のみ）。(hBP07-108 等)
   */
  _dispatchDamageReceivedForced(target) {
    const ownerIdx = this.state.players.findIndex((p) => this._stageHolomems(p).includes(target));
    if (ownerIdx < 0 || ownerIdx === this.state.turnPlayer) return;
    for (const att of [...target.attachments]) {
      const fn = this.registry.get(att.number)?.attached?.onDamageReceivedForced;
      if (fn) fn(target, this, att, ownerIdx);
    }
    // ダウンしたホロメン自身のカード定義の被ダメージ後トリガー（同期・選択なし。例: 大神ミオ「緑の地母神」HP回復。hBP07-029）
    const selfFn = this.registry.get(target.stack[0].number)?.onDamageReceivedForced;
    if (selfFn) selfFn(target, this, ownerIdx);
  }

  /**
   * 受け手の「受けるダメージ」修正を適用した最終ダメージ（0未満にはしない）。
   * @param attacker 攻撃元ホロメン（「相手の1stから受けるアーツ-30」のような攻撃元条件用。無ければnull）
   */
  _applyDamageReceived(targetHolomem, dmg, kind = 'arts', attacker = null, opts = {}) {
    const zone = this._zoneOf(targetHolomem);
    let delta = this.effects.damageReceivedDelta(targetHolomem, zone, kind, attacker);
    // 「最初に受けるダメージだけ」等の一発消費(once)修正を使用済みにする（このダメージ機会で消費）
    this.effects.consumeOnceDamageReceivedMods(targetHolomem, zone, kind);
    // 「このアーツダメージは軽減されない」: 軽減（負のdelta）を無効化する（増加は残す）。hBP06-027/hBP07-075/hBP07-103
    if (opts.ignoreReduction && delta < 0) delta = 0;
    if (delta === 0) return dmg;
    const adjusted = Math.max(0, dmg + delta);
    if (adjusted !== dmg) {
      this.log(`受けるダメージ修正: ${dmg} → ${adjusted}（${delta > 0 ? '+' : ''}${delta}）`);
    }
    return adjusted;
  }

  // ============ 効果の実行（ジェネレータランナー） ============

  /**
   * 効果（ジェネレータ）を実行する。yield された選択要求は決定ポイントに変換し、
   * 選択後に再開する。完了したら after() を呼ぶ。
   */
  _runEffect(effectDef, ctxOpts, after) {
    let runCtx = ctxOpts.ctx || null; // この効果実行の ctx（done から参照。枚数集計SP用）
    // 効果完了時に「デッキサーチで確認したのに未シャッフル」のデッキを必ずシャッフルする（確認後シャッフル保証）。
    // ctx.shuffleDeck() を明示的に呼んだ場合は _deckViewedNeedsShuffle が false になっているため二重シャッフルしない。
    const done = () => {
      for (const p of this.state.players) {
        if (p._deckViewedNeedsShuffle) {
          p._deckViewedNeedsShuffle = false;
          this._shuffle(p.deck);
          this.log(`${p.name}: デッキをシャッフル（サーチ確認後）`);
        }
      }
      // 「自分の○○ホロメンの能力でエールをアーカイブした時」枚数ぶんのSP推しスキル（hSD11-001）。
      // この効果実行(runCtx)で archiveCheer により捨てた枚数を集計し、効果完了時に1回だけ提示する。
      if (runCtx && runCtx._flowGlowArchiveCount > 0 &&
          this.registry.get(this.state.players[runCtx.playerIdx]?.oshi.number)?.onCheerArchivedBatchOshiSkill) {
        this._stepEffect(this._cheerArchiveBatchGen(runCtx), undefined, after);
        return;
      }
      after();
    };
    if (!effectDef?.run) {
      done();
      return;
    }
    // ctxOpts.ctx で外から ctx を渡せる（アーツのボーナス蓄積を受け取るため等）
    const ctx = ctxOpts.ctx || new EffectContext(this, ctxOpts.playerIdx, ctxOpts);
    runCtx = ctx;
    let gen;
    try {
      gen = effectDef.run(ctx);
    } catch (e) {
      this.log(`⚠️ 効果の開始に失敗: ${e.message}`);
      done();
      return;
    }
    this._stepEffect(gen, undefined, done);
  }

  _stepEffect(gen, input, after) {
    let r;
    try {
      r = gen.next(input);
    } catch (e) {
      this.log(`⚠️ 効果の実行中にエラー: ${e.message}`);
      console.error(e);
      after();
      return;
    }
    if (r.done) {
      after();
      return;
    }
    const request = r.value; // EffectContext.chooseXxx() が返す選択要求
    // 任意効果の発動確認（設定OFF時）: 「発動するか」ゲートは確認を出さず自動で発動(true)する。
    // 公式ルール上 自動能力は強制（任意コスト付きを除く）なので、ゲート対象は任意効果のみ。
    if (request.kind === 'confirm' && request.activation && this.confirmOptionalEffects === false) {
      this._stepEffect(gen, true, after);
      return;
    }
    const options = request.buildOptions();
    // デッキサーチで確認枠がある場合は、対象が無くても（skipのみ）デッキを見せるためモーダルを表示する
    const showDeckView = request.deckSearch && (request.displayCards || []).length > 0;
    const onlySkip = options.length === 1 && options[0].id === 'skip';
    if (options.length === 0 || (onlySkip && !showDeckView)) {
      // 選択肢なし（または「選ばない」のみ）→ null で再開
      this._stepEffect(gen, null, after);
      return;
    }
    // 強制のカード選択で候補が1枚だけなら自動で確定（確定クリックの手間を省く）。
    // ただしデッキサーチ（確認枠あり）は、デッキ全体を確認させるため自動確定しない。
    if (request.kind === 'chooseCard' && options.length === 1 && options[0].card && !showDeckView) {
      this._stepEffect(gen, options[0].value, after);
      return;
    }
    this.state.pending = {
      type: 'effectChoice',
      player: request.player,
      request,
      options,
      resume: (value) => this._stepEffect(gen, value, after),
    };
    this.onChange();
  }

  // ============ セットアップ (6.2) ============

  _advanceSetup() {
    const s = this.state;
    while (!s.pending && s.phase === 'setup') {
      const item = this._setupQueue.shift();
      if (!item) return;
      switch (item.kind) {
        case 'chooseFirstPlayer': {
          s.pending = {
            type: 'chooseFirstPlayer', player: null,
            options: [
              { id: 'random', label: '🎲 ランダムで決める' },
              { id: 'first_0', label: `${s.players[0].name} が先攻`, value: 0 },
              { id: 'first_1', label: `${s.players[1].name} が先攻`, value: 1 },
            ],
          };
          break;
        }
        case 'redraw': {
          const p = s.players[item.player];
          s.pending = {
            type: 'redraw', player: item.player,
            options: [
              { id: 'yes', label: '手札を全て引き直す' },
              { id: 'no', label: 'このままにする' },
            ],
          };
          break;
        }
        case 'mulligan':
          this._runMulligan();
          break;
        case 'placementCenter': {
          const p = s.players[item.player];
          const debuts = p.hand
            .map((c, i) => ({ c, i }))
            .filter(({ c }) => c.kind === CardKind.HOLOMEN && c.bloomLevel === 'Debut');
          if (debuts.length === 0) break; // マリガン済みなので通常は来ない
          s.pending = {
            type: 'placementCenter', player: item.player,
            options: debuts.map(({ c, i }) => ({
              id: `center_${i}`, label: `${c.name} をセンターに置く`, handIndex: i,
            })),
            // 6.2.1.10.1 はルール上は任意だが、置かないと即敗北なのでUI簡略化のため必須にする
          };
          break;
        }
        case 'placementPenalty': {
          // 6.2.1.10.2: 引き直し回数と同数の手札をデッキの下へ
          const p = s.players[item.player];
          let remaining = p.mulliganCount;
          if (remaining > 0 && p.hand.length > 0) {
            s.pending = this._makePenaltyPending(item.player, remaining);
          }
          break;
        }
        case 'placementBack': {
          s.pending = this._makePlacementBackPending(item.player);
          break;
        }
        case 'finishSetup':
          this._finishSetup();
          break;
      }
    }
  }

  _makePenaltyPending(playerIdx, remaining) {
    const p = this.state.players[playerIdx];
    return {
      type: 'placementPenalty', player: playerIdx, remaining,
      options: p.hand.map((c, i) => ({
        id: `bottom_${i}`, label: `${c.name} をデッキの下に戻す（残り${remaining}枚）`, handIndex: i,
      })),
    };
  }

  _makePlacementBackPending(playerIdx) {
    const p = this.state.players[playerIdx];
    const placeable = p.hand
      .map((c, i) => ({ c, i }))
      .filter(({ c }) =>
        c.kind === CardKind.HOLOMEN &&
        (c.bloomLevel === 'Debut' || c.bloomLevel === 'Spot') &&
        this._stageCount(p) < STAGE_LIMIT
      );
    return {
      type: 'placementBack', player: playerIdx,
      options: [
        ...placeable.map(({ c, i }) => ({
          id: `back_${i}`, label: `${c.name} をバックに置く`, handIndex: i,
        })),
        { id: 'done', label: '配置を終える' },
      ],
    };
  }

  /** 強制マリガン (6.2.1.9): 手札にDebutが無い間、引き直し。6回で敗北 */
  _runMulligan() {
    const s = this.state;
    const order = [s.firstPlayer, 1 - s.firstPlayer];
    let changed = true;
    while (changed) {
      changed = false;
      for (const idx of order) {
        const p = s.players[idx];
        const hasDebut = p.hand.some((c) => c.kind === CardKind.HOLOMEN && c.bloomLevel === 'Debut');
        if (!hasDebut) {
          if (p.mulliganCount >= MULLIGAN_LIMIT) {
            this._setWinner(1 - idx, LOSS_REASONS.MULLIGAN_OUT, idx);
            return;
          }
          this.log(`${p.name}: 手札にDebutホロメンが無いため引き直し（${p.mulliganCount + 1}回目）`);
          p.deck.push(...p.hand);
          p.hand = [];
          shuffle(p.deck, this.rng);
          this._drawCards(p, INITIAL_HAND);
          p.mulliganCount++;
          changed = true;
        }
      }
    }
  }

  _finishSetup() {
    const s = this.state;
    // ライフ設定 (6.2.1.11): エールデッキの上から推しのライフ枚数
    for (const p of s.players) {
      const lifeCount = p.oshi.life || 0;
      p.life = p.cheerDeck.splice(0, lifeCount);
      this.log(`${p.name}: ライフ${p.life.length}枚をセット（推し: ${p.oshi.name}）`);
    }
    // 裏向きカードを表に (6.2.1.12) — 内部状態のみ
    for (const p of s.players) {
      if (p.center) p.center.faceDown = false;
      for (const h of p.back) h.faceDown = false;
    }
    s.phase = 'playing';
    this._startTurn(s.firstPlayer);
  }

  // ============ ターン進行 (7) ============

  _startTurn(playerIdx) {
    const s = this.state;
    s.turn++;
    s.turnPlayer = playerIdx;
    const p = s.players[playerIdx];
    p.turnCount++;
    p.limitedPlayedThisTurn = 0; // このターンにプレイしたLIMITEDサポートの枚数（cap は _limitedCap）
    p.holomemReturnedToDeckThisTurn = false; // このターンに自分のホロメンがステージからデッキに戻ったか（hBP07-042）
    p.usedSupportThisTurn = false;
    p.usedCollabThisTurn = false;
    p.usedBatonTouchThisTurn = false;
    p.cheerArchivedThisTurn = false; // このターンに自分のステージのエールをアーカイブしたか（hBP07-088 等）
    p.deckArchivedThisTurn = 0;      // このターンに自分のデッキからアーカイブしたカード枚数（ctx.recordDeckArchive で加算。hBP08-020）
    p.artsUsedNamesThisTurn = [];    // このターンにアーツを使った自分のホロメン名（hBP05-050 等）
    p.centerArtsUsedNamesThisTurn = []; // このターンにセンターでアーツを使った自分のホロメン名（hBP08-007 等）
    p.supportsPlayedThisTurn = []; // このターンに使ったサポートのカード名一覧（「〈限界飯〉を使っていたなら」等）
    // 「直前の相手のターンに自分のホロメンがダウンしていたなら」用。
    // このターン(idx)の間に相手(1-idx)のホロメンがダウンしたら蓄積し、相手の次の自ターンで参照される。
    // idxのターン開始時に相手側のリストをクリアして、このターン中の相手ホロメンのダウンを新規に貯める。
    s.players[1 - playerIdx].downedCardsLastOppTurn = [];
    // 推しスキルの[ターンに1回]は両プレイヤーともリセットする
    // （「相手のターンでダウンした時に使える」等、相手ターン中に使うスキルがあるため）
    for (const pl of s.players) pl.usedOshiSkillThisTurn = 0;
    this.log(`―― ターン${s.turn}: ${p.name} のターン ――`);
    this._resetStep();
  }

  /** ステップ境界の「間」。UI側がタイマーで自動進行する（クリックでも進められる） */
  _pause(next) {
    if (!this.stepPauses) {
      next();
      return;
    }
    this.state.pending = {
      type: 'stepPause',
      player: this.state.turnPlayer,
      options: [{ id: 'ok', label: '▶ 次へ' }],
      next,
    };
  }

  _resetStep() {
    const s = this.state;
    const p = s.players[s.turnPlayer];
    // 7.2.1: そのプレイヤーの最初のターンはリセットステップ自体を行わない
    if (p.turnCount === 1) {
      this._drawStep();
      return;
    }
    s.step = 'reset';
    this.log(`【${STEP_NAMES.reset}】`);
    this._pause(() => {
      // 7.2.2: 全てアクティブに（ただし「次のリセットでアクティブにならない」フラグ付きは据え置き、フラグを消費）
      const oshiStage = this._oshiStage(s.turnPlayer);
      for (const h of this._stageHolomems(p)) {
        if (h.skipNextReset) { h.skipNextReset = false; continue; } // お休みのまま、次回からは通常通り
        // 推しステージスキルでリセット非アクティブ指定（例 セシリア: 全〈セシリア〉はアクティブにならない）
        if (oshiStage?.blocksReset?.(h, this, s.turnPlayer)) continue;
        h.rested = false;
      }
      // 7.2.3: コラボ → バックへ移動してお休み（「お休みしない」効果があればアクティブのまま移動）
      if (p.collab) {
        const noRest = this._holomemSkipsRestOnReset(p.collab, s.turnPlayer);
        if (!noRest) p.collab.rested = true;
        p.back.push(p.collab);
        p.collab = null;
        this.log(`${p.name}: コラボのホロメンをバックに移動${noRest ? '（お休みしない）' : '（お休み）'}`);
      }
      // 7.2.6: センターが空ならバックから補充（アクティブ優先）
      this._queueCenterRefill(p, () => this._drawStep());
    });
  }

  /** センター補充の選択（7.2.6 / 7.7.5）。補充不要・不能なら即 next() */
  _queueCenterRefill(p, next) {
    if (p.center || p.back.length === 0) {
      next();
      return;
    }
    const active = p.back.map((h, i) => ({ h, i })).filter(({ h }) => !h.rested);
    const candidates = active.length > 0 ? active : p.back.map((h, i) => ({ h, i }));
    this.state.pending = {
      type: 'chooseCenter', player: this.state.players.indexOf(p), auto: true,
      options: candidates.map(({ h, i }) => ({
        id: `center_${i}`, label: `${topCard(h).name} をセンターへ`, backIndex: i,
      })),
      next,
    };
  }

  _drawStep() {
    const s = this.state;
    const p = s.players[s.turnPlayer];
    s.step = 'draw';
    this.log(`【${STEP_NAMES.draw}】`);
    this._pause(() => {
      // 7.3.2.1: 引けなければ敗北
      if (p.deck.length === 0) {
        this._setWinner(1 - s.turnPlayer, LOSS_REASONS.DECK_OUT, s.turnPlayer);
        return;
      }
      this._drawCards(p, 1);
      // TODO(CPU対戦実装時): 相手のドロー内容は隠す（現状はホットシートなので公開でよい）
      const drawn = p.hand[p.hand.length - 1];
      this.log(`${p.name}: 1枚ドロー（${drawn.name}）`);
      this._cheerStep();
    });
  }

  _cheerStep() {
    const s = this.state;
    const p = s.players[s.turnPlayer];
    s.step = 'cheer';
    this.log(`【${STEP_NAMES.cheer}】`);
    this._pause(() => {
      if (p.cheerDeck.length === 0) {
        this.log(`${p.name}: エールデッキが空のためスキップ`);
        this._mainStep();
        return;
      }
      const cheer = p.cheerDeck.shift();
      this.log(`${p.name}: エール公開 → ${cheer.name}`);
      const targets = this._stagePositions(p);
      if (targets.length === 0) {
        // ステージにホロメンがいない（通常は敗北処理で先に終わる）
        p.archive.push(cheer);
        this._mainStep();
        return;
      }
      p.revealed.push(cheer);
      s.pending = {
        type: 'attachCheer', player: s.turnPlayer, auto: true, cheer,
        options: targets.map((pos) => ({
          id: `attach_${pos.zone}_${pos.index}`,
          label: `${topCard(this._holomemAt(p, pos)).name} に ${cheer.name} を送る`,
          pos,
        })),
      };
    });
  }

  _mainStep() {
    const s = this.state;
    s.step = 'main';
    this.log(`【${STEP_NAMES.main}】`);
    this._queueMainPending();
  }

  _queueMainPending() {
    const s = this.state;
    s.pending = {
      type: 'main', player: s.turnPlayer,
      options: this._mainActions(),
    };
  }

  /** メインステップのアクション一覧 (8章) */
  _mainActions() {
    const s = this.state;
    const idx = s.turnPlayer;
    const p = s.players[idx];
    const opp = s.players[1 - idx];
    const actions = [];

    // 8.2 手札のDebut/Spotホロメンをバックに出す
    if (this._stageCount(p) < STAGE_LIMIT) {
      p.hand.forEach((c, i) => {
        if (c.kind === CardKind.HOLOMEN && (c.bloomLevel === 'Debut' || c.bloomLevel === 'Spot')) {
          actions.push({ id: `place_${i}`, label: `${c.name} をバックに出す`, kind: 'place', handIndex: i });
        }
      });
    }

    // 8.3 Bloom（自分の最初のターンは不可）
    if (p.turnCount > 1) {
      p.hand.forEach((c, i) => {
        if (c.kind !== CardKind.HOLOMEN) return;
        if (c.bloomLevel !== '1st' && c.bloomLevel !== '2nd') return;
        for (const pos of this._stagePositions(p)) {
          const h = this._holomemAt(p, pos);
          if (this._canBloom(h, c)) {
            actions.push({
              id: `bloom_${i}_${pos.zone}_${pos.index}`,
              label: `${topCard(h).name}（${pos.zone}）を ${c.name}〔${c.bloomLevel}〕にBloom`,
              kind: 'bloom', handIndex: i, pos,
            });
          }
        }
      });

      // 特殊Bloom（カード固有の def.specialBloom。Bloomレベルの遷移条件を無視する等。hBP01-045 AZKi「Overwrite」）
      p.hand.forEach((c, i) => {
        if (c.kind !== CardKind.HOLOMEN) return;
        for (const pos of this._stagePositions(p)) {
          const h = this._holomemAt(p, pos);
          if (this._canBloom(h, c)) continue; // 通常Bloomで既に提示済み
          const sdef = this.registry.get(topCard(h).number);
          if (sdef?.specialBloom?.(h, c, this, idx)) {
            actions.push({
              id: `bloom_${i}_${pos.zone}_${pos.index}`,
              label: `${topCard(h).name}（${pos.zone}）を ${c.name}〔${c.bloomLevel}〕に特殊Bloom`,
              kind: 'bloom', handIndex: i, pos,
            });
          }
        }
      });

      // 別名カードへのBloom（手札カード側の def.bloomOnto。合体ユニット等。hBP06-083 ラムダック → 〈角巻わため〉/〈大空スバル〉）
      p.hand.forEach((c, i) => {
        if (c.kind !== CardKind.HOLOMEN) return;
        const cdef = this.registry.get(c.number);
        if (!cdef?.bloomOnto) return;
        for (const pos of this._stagePositions(p)) {
          const h = this._holomemAt(p, pos);
          if (this._canBloom(h, c)) continue; // 通常Bloomで既に提示済み（同名）
          if (cdef.bloomOnto(h, c, this, idx)) {
            actions.push({
              id: `bloom_${i}_${pos.zone}_${pos.index}`,
              label: `${topCard(h).name}（${pos.zone}）を ${c.name}〔${c.bloomLevel}〕にBloom`,
              kind: 'bloom', handIndex: i, pos,
            });
          }
        }
      });
    }

    // 8.4 コラボ（ターン1回、コラボが空、バックのアクティブなホロメン）
    if (!p.collab && !p.usedCollabThisTurn) {
      p.back.forEach((h, i) => {
        if (!h.rested && !h.faceDown) {
          actions.push({ id: `collab_${i}`, label: `${topCard(h).name} をコラボへ`, kind: 'collab', backIndex: i });
        }
      });
    }

    // 8.5 推しスキル（ターン1回 / SPはゲーム1回）。コストはホロパワー。
    // 効果が実装済みのスキルのみ提示する（未実装スキルでコストだけ払う事故を防ぐ）
    const oshiDef = this.registry.get(p.oshi.number);
    (p.oshi.oshiSkills || []).forEach((skill, i) => {
      if (skill.sp ? p.usedSpOshiSkillThisGame : (p.usedOshiSkillThisTurn >= this._oshiSkillCap(idx))) return;
      // 「～時に使える」系はメインステップでは使えない (12.1.5)
      if (/[すし]た?時に使える/.test(skill.text)) return;
      const isX = skill.cost === 'X';
      // X コストは最低1枚のホロパワーを支払う（実際の枚数は使用時に選択）。固定コストは効果コストぶん必要。
      const effCost = isX ? 1 : this._effectiveOshiCost(skill, idx);
      if (p.holoPower.length < effCost) return;
      const skillDef = skill.sp ? oshiDef?.spOshiSkill : oshiDef?.oshiSkill;
      if (!skillDef) return;
      if (skillDef.canUse && !skillDef.canUse(this, idx)) return;
      actions.push({
        id: `oshi_${i}`,
        label: `${skill.sp ? 'SP' : ''}推しスキル発動（ホロパワー-${isX ? 'X' : effCost}）`,
        kind: 'oshiSkill', skillIndex: i,
      });
    });

    // 8.6 サポートカードのプレイ
    p.hand.forEach((c, i) => {
      if (c.kind !== CardKind.SUPPORT) return;
      // LIMITED: ターン1枚（cap は通常1。hBP06-008 SPで2に増やせる）、先攻の1ターン目は不可 (8.6.2)
      if (c.limited && ((p.limitedPlayedThisTurn || 0) >= this._limitedCap(idx) || (s.turn === 1 && idx === s.firstPlayer))) return;
      // カード固有の使用条件（手札枚数条件など）
      const supportDef = this.registry.get(c.number)?.support;
      if (supportDef?.canUse) {
        const ctx = new EffectContext(this, idx, { sourceCard: c });
        if (!supportDef.canUse(ctx)) return;
      }
      const attachType = ['ツール', 'マスコット', 'ファン'].includes(c.supportType);
      if (attachType) {
        for (const pos of this._stagePositions(p)) {
          const h = this._holomemAt(p, pos);
          if (!this._canAttachSupport(h, c)) continue;
          actions.push({
            id: `support_${i}_${pos.zone}_${pos.index}`,
            label: `${c.name}〔${c.supportType}〕を ${topCard(h).name} に付ける`,
            kind: 'supportAttach', handIndex: i, pos,
          });
        }
      } else {
        actions.push({ id: `support_${i}`, label: `${c.name}〔${c.supportType || 'サポート'}〕を使う`, kind: 'support', handIndex: i });
      }
    });

    // 起動型能力（メインステップで使える「[コスト]：[効果]」型の能力）。
    // ソースはホロメンのトップカード自身、または付いている装着カード（ツール/マスコット/ファン）。
    // 定義: カード def の activatedAbilities[] （registry.js 参照）
    for (const pos of this._stagePositions(p)) {
      const h = this._holomemAt(p, pos);
      const sources = [
        { card: topCard(h), attachIndex: -1 },
        ...h.attachments.map((a, ai) => ({ card: a, attachIndex: ai })),
      ];
      for (const src of sources) {
        const abilities = this.registry.get(src.card.number)?.activatedAbilities;
        if (!abilities) continue;
        abilities.forEach((ability, abIdx) => {
          // [ターンに1回] 済みは除外
          if (ability.oncePerTurn && src.card._abilityUsedTurn?.[abIdx] === s.turn) return;
          const ctx = new EffectContext(this, idx, { sourceCard: src.card, sourceHolomem: h });
          if (ability.canUse && !ability.canUse(ctx)) return;
          actions.push({
            id: `ability_${pos.zone}_${pos.index}_${src.attachIndex}_${abIdx}`,
            label: `起動効果: ${ability.name}（${topCard(h).name}）`,
            kind: 'activatedAbility', pos, attachIndex: src.attachIndex, abilityIndex: abIdx,
          });
        });
      }
    }

    // アーカイブにある間だけ使える起動型能力（archiveActivatedAbilities）。
    // 「アーカイブにある時のみ使える」ギフト等（hBP08-044「光、再び灯りて」）。
    // ※アーカイブ枚数はこの決定ポイント内で変化しないため、archiveIndex で同定して問題ない。
    p.archive.forEach((card, ai) => {
      const abilities = this.registry.get(card.number)?.archiveActivatedAbilities;
      if (!abilities) return;
      abilities.forEach((ability, abIdx) => {
        if (ability.oncePerTurn && card._abilityUsedTurn?.[abIdx] === s.turn) return;
        const ctx = new EffectContext(this, idx, { sourceCard: card });
        if (ability.canUse && !ability.canUse(ctx)) return;
        actions.push({
          id: `archiveAbility_${ai}_${abIdx}`,
          label: `起動効果: ${ability.name}（アーカイブ: ${card.name}）`,
          kind: 'archiveActivatedAbility', archiveIndex: ai, abilityIndex: abIdx,
        });
      });
    });

    // 8.7 バトンタッチ（ターン1回、センター&バック両方アクティブ、エールコスト）
    // 「次の相手のターンの間、相手のセンター/コラボはバトンタッチ・移動・交代できない」(hBP01-005 SP) の制限を受けていないこと
    const frontlineLocked = s.modifiers.some((m) => m.kind === 'cannotMoveFrontline' && m.ownerIdx === idx);
    if (!frontlineLocked && !p.usedBatonTouchThisTurn && p.center && !p.center.rested) {
      const cost = this._effectiveBatonCost(p.center, topCard(p.center).batonTouch || [], idx);
      if (this._canPayCheers(p.center.cheers, cost)) {
        p.back.forEach((h, i) => {
          if (!h.rested) {
            actions.push({ id: `baton_${i}`, label: `バトンタッチ: ${topCard(h).name} とセンターを交代`, kind: 'baton', backIndex: i });
          }
        });
      }
    }

    actions.push({ id: 'pass', label: 'パフォーマンスステップへ', kind: 'pass' });
    return actions;
  }

  _performanceStep() {
    const s = this.state;
    // 7.6.1: 先攻の第1ターンはスキップ
    if (s.turn === 1 && s.turnPlayer === s.firstPlayer) {
      this.log(`【${STEP_NAMES.performance}】先攻1ターン目のためスキップ`);
      this._endStep();
      return;
    }
    s.step = 'performance';
    s.perfUsed = { center: false, collab: false };
    s.reArtsPending = null; // 再アーツ「もう1回」の保留状態（Q590: 1回目直後は他アーツを挟ませない）
    // 「相手のパフォーマンスステップに自分のライフが減っていたら」判定用に開始時ライフを記録
    s.lifeAtPerfStart = [s.players[0].life.length, s.players[1].life.length];
    this.log(`【${STEP_NAMES.performance}】`);
    // パフォーマンスステップ開始時トリガー（hSD11-006「自分の」/ hBP03-022「相手の」。各カードが turnPlayer で判定）
    this._dispatchStepStart('onPerformanceStepStart', () => this._queuePerformancePending());
  }

  /**
   * ステップ開始時トリガーを両プレイヤーのステージホロメン（＋装着カード）の triggers[key] で順に発火する。
   * ctx.playerIdx = そのトリガー保持ホロメンの持ち主。「自分の/相手の」ステップ判定は各カードが
   * ctx.state.turnPlayer と ctx.playerIdx を比較して行う。完了後 after()。
   */
  _dispatchStepStart(key, after) {
    const runners = [];
    for (let pi = 0; pi < 2; pi++) {
      const pl = this.state.players[pi];
      for (const wh of this._stageHolomems(pl)) {
        const t = this.registry.get(topCard(wh).number)?.triggers?.[key];
        if (t) runners.push({ run: t, srcCard: topCard(wh), srcH: wh, pi });
        for (const att of wh.attachments) {
          const at = this.registry.get(att.number)?.triggers?.[key];
          if (at) runners.push({ run: at, srcCard: att, srcH: wh, pi });
        }
      }
    }
    if (runners.length === 0) { after(); return; }
    const runNext = (i) => {
      if (i >= runners.length) { after(); return; }
      this._runEffect(
        { run: runners[i].run },
        { playerIdx: runners[i].pi, sourceCard: runners[i].srcCard, sourceHolomem: runners[i].srcH },
        () => runNext(i + 1),
      );
    };
    runNext(0);
  }

  _queuePerformancePending() {
    const s = this.state;
    s.pending = {
      type: 'performance', player: s.turnPlayer,
      options: this._performanceActions(),
    };
  }

  /** パフォーマンスステップのアクション一覧 (9章 + RULES_SPEC §12) */
  _performanceActions() {
    const s = this.state;
    const p = s.players[s.turnPlayer];
    const opp = s.players[1 - s.turnPlayer];
    const actions = [];

    // 対象: 相手のセンター/コラボ (12.3.3.2)
    let targets = [];
    if (opp.center) targets.push({ zone: 'center', index: 0 });
    if (opp.collab) targets.push({ zone: 'collab', index: 0 });
    // 防御側（opp）の常時アウラによるアーツ対象制限（「相手のアーツは自分のコラボしか対象にできない」hBP05-010 等）
    const allowZones = this.effects.oppArtsTargetZones(opp, 1 - s.turnPlayer);
    if (allowZones) targets = targets.filter((t) => allowZones.includes(t.zone));

    // 指定ホロメンの指定アーツについて、対象ごとのアーツアクションを actions に積む（通常／再アーツ共通）
    const pushArtActions = (h, zone, art, ai, isReArts, srcCard) => {
      const card = topCard(h);
      const fromCard = srcCard || card;        // アーツの出どころ（借用時は別カード。hBP07-048）
      const borrowed = fromCard !== card;
      const cost = this._effectiveArtCost(h, art.cost, s.turnPlayer);
      // アーツ使用時のみ、装着カードの「擬似エール供給」＋推しステージのエール色エイリアスを支払いプールに加味
      if (!this._canPayArtCost(h, cost, s.turnPlayer)) return;
      const artDef = this.registry.getArt(fromCard.number, art.name);
      // カード定義によるアーツ使用条件（「アーカイブにサポート4枚以上なければ使えない」等）
      if (artDef?.canUse) {
        const cctx = new EffectContext(this, s.turnPlayer, { sourceCard: card, sourceHolomem: h });
        if (!artDef.canUse(cctx)) return;
      }
      // 対象拡張: このターン「アーツがHPの減ったバックも対象にできる」修正を持つホロメンは相手のバックも狙える (hBP07-086)
      let usableTargets = targets;
      if (this.effects.artCanTargetDamagedBack(h, s.turnPlayer)) {
        usableTargets = [...targets];
        opp.back.forEach((b, bi) => {
          if (b && b.damage > 0) usableTargets.push({ zone: 'back', index: bi });
        });
      }
      // 対象拡張: ターン修正 kind:'artTargetSecondBack' を持つホロメンは相手の2ndバックも狙える (hBP08-018)
      if (this.effects.hasArtTargetMod('artTargetSecondBack', h, s.turnPlayer)) {
        if (usableTargets === targets) usableTargets = [...targets];
        opp.back.forEach((b, bi) => {
          if (b && b.stack[0].bloomLevel === '2nd' && !usableTargets.some((t) => t.zone === 'back' && t.index === bi)) {
            usableTargets.push({ zone: 'back', index: bi });
          }
        });
      }
      // 対象拡張: アーツ定義の extraTargetZones（「このアーツは相手のバックホロメンも対象にできる」等。アーツ単位。hSD12-004）
      if (artDef?.extraTargetZones && artDef.extraTargetZones.length) {
        if (usableTargets === targets) usableTargets = [...targets];
        for (const ez of artDef.extraTargetZones) {
          if (ez === 'back') {
            opp.back.forEach((b, bi) => {
              if (b && !usableTargets.some((t) => t.zone === 'back' && t.index === bi)) {
                usableTargets.push({ zone: 'back', index: bi });
              }
            });
          } else if (opp[ez] && !usableTargets.some((t) => t.zone === ez)) {
            usableTargets.push({ zone: ez, index: 0 });
          }
        }
      }
      // 対象拡張: ターン修正 kind:'artTargetAnyBack' を持つホロメンは相手の全バックを狙える
      //   （「このターン、選んだホロメンのアーツは相手のバックも対象にできる」hBP03-004 BAU BAU! 等）
      if (this.effects.hasArtTargetMod('artTargetAnyBack', h, s.turnPlayer)) {
        if (usableTargets === targets) usableTargets = [...targets];
        opp.back.forEach((b, bi) => {
          if (b && !usableTargets.some((t) => t.zone === 'back' && t.index === bi)) {
            usableTargets.push({ zone: 'back', index: bi });
          }
        });
      }
      // 対象拡張: カード定義の受動アウラ artTargetExtraTargets（条件付きで相手バック等を常時対象化。hBP08-059）
      const extraTargets = this.registry.get(card.number)?.artTargetExtraTargets?.(h, this, opp);
      if (extraTargets && extraTargets.length) {
        if (usableTargets === targets) usableTargets = [...targets];
        for (const t of extraTargets) {
          if (!usableTargets.some((u) => u.zone === t.zone && u.index === t.index)) usableTargets.push(t);
        }
      }
      // カード定義による対象制限（「このアーツは相手のセンターホロメンしか対象にできない」等）
      const allowedTargets = artDef?.targetZones
        ? usableTargets.filter((t) => artDef.targetZones.includes(t.zone))
        : usableTargets;
      for (const t of allowedTargets) {
        const tName = topCard(this._targetHolomem(opp, t)).name;
        const zoneLabel = t.zone === 'center' ? 'センター' : t.zone === 'collab' ? 'コラボ' : 'バック';
        actions.push({
          id: `art${isReArts ? 're' : ''}${borrowed ? `b${fromCard.number}` : ''}_${zone}_${ai}_${t.zone}_${t.index}`,
          label: `${borrowed ? `[借用]${fromCard.name}` : card.name}「${art.name}」(${art.dmg}${art.dmgPlus ? '+' : ''})${isReArts ? '【再アーツ】' : ''} → 相手${zoneLabel} ${tName}`,
          kind: 'art', zone, artIndex: ai, target: t, reArts: isReArts || undefined,
          // 借用アーツ（hBP07-048）: 解決時にこのアーツオブジェクト/出どころカードを使う
          artObj: borrowed ? art : undefined, artFrom: borrowed ? fromCard.number : undefined,
        });
      }
    };

    for (const zone of ['center', 'collab']) {
      const h = p[zone];
      if (!h || h.rested) continue;
      if (!s.perfUsed[zone]) {
        // 通常のアーツ使用 (9.2.1.2-5)
        topCard(h).arts.forEach((art, ai) => pushArtActions(h, zone, art, ai, false));
        // アーツ枠借用（hBP07-048）: このホロメンが他ホロメンのアーツを使えるなら、その候補も追加
        const borrowDef = this.registry.get(topCard(h).number)?.artsBorrow;
        if (borrowDef) {
          for (const other of this._stageHolomems(p)) {
            if (other === h || !borrowDef(topCard(h), other, this)) continue;
            topCard(other).arts.forEach((art, ai) => pushArtActions(h, zone, art, ai, false, topCard(other)));
          }
        }
      } else if (h.lastArtUsedIndex != null) {
        // 再アーツ: このターン「同じアーツをもう1回使える」修正を持つホロメンは直前のアーツを再使用できる (hBP07-008)
        const reMod = s.modifiers.find(
          (m) => m.kind === 'reArts' && !m.used && m.ownerIdx === s.turnPlayer && m.match?.(h));
        if (reMod) {
          const art = topCard(h).arts[h.lastArtUsedIndex];
          if (art) pushArtActions(h, zone, art, h.lastArtUsedIndex, true);
        }
      }
    }

    // Q590: 再アーツ「もう1回」の保留中は、再アーツを使う/使わないを決めるまで他のアーツを挟めない。
    //   該当ホロメンの再アーツ（reArts:true）のみ提示し、「もう1回使わない」で放棄できる。
    if (s.reArtsPending) {
      const reActions = actions.filter((a) => a.kind === 'art' && a.reArts && a.zone === s.reArtsPending.zone);
      reActions.push({ id: 'declineReArts', label: '同じアーツをもう1回使わない', kind: 'declineReArts' });
      return reActions;
    }

    actions.push({ id: 'pass', label: 'エンドステップへ', kind: 'pass' });
    return actions;
  }

  _endStep() {
    const s = this.state;
    const p = s.players[s.turnPlayer];
    s.step = 'end';
    this.log(`【${STEP_NAMES.end}】`);
    // エンドステップ開始時トリガー（hSD10-013「自分のエンドステップが開始する時」等）。
    // ターン終了処理（推しステージ常時→遅延→ターン終了推しスキル→修正消滅→センター補充）の前に発火する。
    this._dispatchStepStart('onEndStepStart', () => this._endStepAfterStart(p));
  }

  _endStepAfterStart(p) {
    const s = this.state;
    // 7.7.3: 「ターンの終わりに」誘発（推しステージスキルの常時ターン終了効果 → 遅延効果 →
    //   ターン終了時の起動型推しスキル）→ 7.7.4: 効果の消滅 → 7.7.5: センター補充
    this._runOshiStageTurnEnd(() => {
      this._runEndOfTurnEffects(() => {
        this._offerEndOfTurnOshiSkill(() => {
          this.effects.expireTurnModifiers();
          this._queueCenterRefill(p, () => {
            // 追加ターン（hBP07-005「時間の典獄」）: 保留中なら同じプレイヤーがもう1回ターンを行う（ゲーム1回なので無限化しない）
            if (p._extraTurnPending) {
              p._extraTurnPending = false;
              this.log(`${p.name}: 追加ターンを得た`);
              this._startTurn(s.turnPlayer);
            } else {
              this._startTurn(1 - s.turnPlayer);
            }
          });
        });
      });
    });
  }

  /**
   * 推しステージスキルの「自分のターンが終了する時」常時効果（強制）を実行する。
   * 例: hBP08-005 鷹嶺ルイ「もう金曜だねルイ姉」（条件成立なら手札4枚までドロー）。
   */
  _runOshiStageTurnEnd(done) {
    const idx = this.state.turnPlayer;
    const def = this._oshiStage(idx);
    if (!def?.onTurnEnd) { done(); return; }
    this._runEffect({ run: def.onTurnEnd }, { playerIdx: idx, sourceCard: this.state.players[idx].oshi }, done);
  }

  /**
   * ターン終了時に遅延発火する強制効果を順に実行する (7.7.3)。
   * ctx.scheduleEndOfTurn(run, label) で積まれた、ターンプレイヤー所有の効果を実行・除去する。
   * 例: hBP08-007 SP「このターンが終了する時、自分のステージのエール3枚をアーカイブする」。
   */
  _runEndOfTurnEffects(done) {
    const s = this.state;
    const all = s.endOfTurnEffects || [];
    const queue = all.filter((e) => e.ownerIdx === s.turnPlayer);
    s.endOfTurnEffects = all.filter((e) => e.ownerIdx !== s.turnPlayer);
    const runNext = (i) => {
      if (i >= queue.length) { done(); return; }
      const e = queue[i];
      this.log(`《ターン終了時》${e.label || ''}`);
      this._runEffect({ run: e.run }, { playerIdx: e.ownerIdx }, () => runNext(i + 1));
    };
    runNext(0);
  }

  /**
   * ターン終了時に使える起動型推しスキル（onEndOfTurnOshiSkill）をターンプレイヤーに提示する (7.7.3)。
   * 「自分のターンが終了する時、…なら使える」型（hBP08-007 推しスキル「奏でるメロディー」）。
   * 推しスキル[ターンに1回]枠を共有し、ホロパワーコストを支払う。任意（使わない選択可）。
   */
  _offerEndOfTurnOshiSkill(done) {
    const s = this.state;
    const idx = s.turnPlayer;
    const p = s.players[idx];
    const def = this.registry.get(p.oshi?.number)?.onEndOfTurnOshiSkill;
    if (!def) { done(); return; }
    const cost = def.cost || 0;
    // [ターンに1回] 済み・ホロパワー不足・使用条件未達なら提示しない
    if (p.usedOshiSkillThisTurn >= this._oshiSkillCap(idx)) { done(); return; }
    if (p.holoPower.length < cost) { done(); return; }
    if (def.canUse && !def.canUse(this, idx)) { done(); return; }
    this.state.pending = {
      type: 'endOfTurnOshiSkill', player: idx,
      options: [
        { id: 'yes', label: `推しスキルを使う（${def.name} / ホロパワー-${cost}）`, value: true },
        { id: 'no', label: '使わない', value: false },
      ],
      next: (use) => {
        if (!use) { done(); return; }
        p.archive.push(...p.holoPower.splice(0, cost));
        p.usedOshiSkillThisTurn += 1;
        this.log(`${p.name}: 推しスキル発動（${def.name} / ホロパワー-${cost}）`);
        this._runEffect(def, { playerIdx: idx }, done);
      },
    };
  }

  // ============ アクションの実行 ============

  _execute(pending, action) {
    const s = this.state;
    switch (pending.type) {
      case 'chooseFirstPlayer': {
        const first = action.id === 'random' ? (this.rng() < 0.5 ? 0 : 1) : action.value;
        s.firstPlayer = first;
        this.log(`先攻: ${s.players[first].name}${action.id === 'random' ? '（ランダム）' : '（指定）'}`);
        this._setupQueue = this._buildSetupQueue(first);
        this._advanceSetup();
        break;
      }
      case 'redraw': {
        const p = s.players[pending.player];
        if (action.id === 'yes') {
          p.deck.push(...p.hand);
          p.hand = [];
          shuffle(p.deck, this.rng);
          this._drawCards(p, INITIAL_HAND);
          this.log(`${p.name}: 手札を引き直した`);
        }
        this._advanceSetup();
        break;
      }
      case 'placementCenter': {
        const p = s.players[pending.player];
        const card = p.hand.splice(action.handIndex, 1)[0];
        p.center = createHolomem(card, 0);
        p.center.faceDown = true;
        this.log(`${p.name}: センターにホロメンを配置（裏向き）`);
        this._advanceSetup();
        break;
      }
      case 'placementPenalty': {
        const p = s.players[pending.player];
        const card = p.hand.splice(action.handIndex, 1)[0];
        p.deck.push(card); // デッキの下へ
        const remaining = pending.remaining - 1;
        if (remaining > 0 && p.hand.length > 0) {
          s.pending = this._makePenaltyPending(pending.player, remaining);
        } else {
          this._advanceSetup();
        }
        break;
      }
      case 'placementBack': {
        const p = s.players[pending.player];
        if (action.id === 'done') {
          this._advanceSetup();
        } else {
          const card = p.hand.splice(action.handIndex, 1)[0];
          const h = createHolomem(card, 0);
          h.faceDown = true;
          p.back.push(h);
          this.log(`${p.name}: バックにホロメンを配置（裏向き）`);
          s.pending = this._makePlacementBackPending(pending.player);
        }
        break;
      }
      case 'chooseCenter': {
        const p = s.players[pending.player];
        const h = p.back.splice(action.backIndex, 1)[0];
        p.center = h;
        this.log(`${p.name}: ${topCard(h).name} をセンターへ移動`);
        pending.next();
        break;
      }
      case 'attachCheer': {
        const p = s.players[pending.player];
        const h = this._holomemAt(p, action.pos);
        p.revealed.splice(p.revealed.indexOf(pending.cheer), 1);
        h.cheers.push(pending.cheer);
        this.log(`${p.name}: ${topCard(h).name} に ${pending.cheer.name} を付けた`);
        this._mainStep();
        break;
      }
      case 'attachLifeCheer': {
        const p = s.players[pending.player];
        const h = this._holomemAt(p, action.pos);
        p.revealed.splice(p.revealed.indexOf(pending.cheer), 1);
        h.cheers.push(pending.cheer);
        p.lifeDamage--;
        this.log(`${p.name}: ライフ ${pending.cheer.name} を ${topCard(h).name} に送った（残りライフ${p.life.length}）`);
        this._checkTiming(pending.resume);
        break;
      }
      case 'stepPause':
        pending.next();
        break;
      case 'endOfTurnOshiSkill':
        pending.next(action.value);
        break;
      case 'effectChoice':
        pending.resume(action.value);
        break;
      case 'main':
        this._executeMainAction(action);
        break;
      case 'performance':
        this._executePerformanceAction(action);
        break;
      default:
        throw new Error(`未知の決定タイプ: ${pending.type}`);
    }
  }

  /**
   * 同時に誘発した複数の自動能力（同一プレイヤー所有）を解決する。
   * 2件以上ある時は、所有プレイヤーが解決順を選ぶ (10.6.3 / Q257/Q259/Q587 等)。
   * 0・1件のときは順次実行と完全に同一の挙動（決定ポイントを出さない＝既存挙動不変）。
   * runners: [{ run, opts, label }]。run は generator、opts は _runEffect の ctxOpts。
   */
  _runOrderedTriggers(runners, ownerIdx, after) {
    if (!runners || runners.length <= 1) {
      const run = (i) => {
        if (i >= (runners ? runners.length : 0)) { after(); return; }
        this._runEffect({ run: runners[i].run }, runners[i].opts, () => run(i + 1));
      };
      run(0);
      return;
    }
    const remaining = runners.slice();
    const step = () => {
      if (remaining.length === 0) { after(); return; }
      if (remaining.length === 1) {
        const r = remaining.shift();
        this._runEffect({ run: r.run }, r.opts, step);
        return;
      }
      this.state.pending = {
        type: 'effectChoice',
        player: ownerIdx,
        request: { kind: 'chooseOption', title: '同時に誘発した能力の解決順を選択（先に解決するものを選ぶ）' },
        options: remaining.map((r, i) => ({ id: `order_${i}`, label: r.label || `能力${i + 1}`, value: i })),
        resume: (idx) => {
          const r = remaining.splice(idx, 1)[0];
          this._runEffect({ run: r.run }, r.opts, step);
        },
      };
      this.onChange();
    };
    step();
  }

  _executeMainAction(action) {
    const s = this.state;
    const p = s.players[s.turnPlayer];
    // 8.1.2: アクション1回ごとにチェックタイミング
    const finish = () => this._checkTiming(() => this._queueMainPending());

    switch (action.kind) {
      case 'pass':
        this._performanceStep();
        return;
      case 'place': {
        const card = p.hand.splice(action.handIndex, 1)[0];
        const placed = createHolomem(card, s.turn);
        p.back.push(placed);
        this.log(`${p.name}: ${card.name} をバックに出した`);
        // 登場時トリガー（「自分の〈X〉がステージに出た時」hSD13-014）。自分のステージの各ホロメンの triggers.onEnter を順に実行。
        const enterRunners = [];
        for (const wh of this._stageHolomems(p)) {
          const et = this.registry.get(topCard(wh).number)?.triggers?.onEnter;
          if (et) enterRunners.push({ run: et, srcH: wh });
        }
        if (enterRunners.length > 0) {
          const enteredInfo = { holomem: placed, card };
          // 複数ホロメンの onEnter が同時誘発なら解決順をプレイヤーが選ぶ
          const ordered = enterRunners.map((r) => ({
            run: r.run,
            label: topCard(r.srcH).name,
            opts: { playerIdx: s.turnPlayer, sourceCard: topCard(r.srcH), sourceHolomem: r.srcH, enteredInfo },
          }));
          this._runOrderedTriggers(ordered, s.turnPlayer, finish);
          return;
        }
        break;
      }
      case 'bloom': {
        const card = p.hand.splice(action.handIndex, 1)[0];
        const h = this._holomemAt(p, action.pos);
        h.stack.unshift(card); // 上に重ねる (5.14)
        h.bloomedTurn = s.turn;
        this.log(`${p.name}: ${h.stack[1].name} → ${card.name}〔${card.bloomLevel}〕にBloom`);
        // ブルームエフェクト (13.3) ＋ 装着カードの「Bloomした時」トリガー（ねっ子等）を順に実行
        const runners = [];
        const def = this.registry.get(card.number);
        if (def?.bloomEffect) {
          this.log(`《ブルームエフェクト》${def.bloomEffect.name}`);
          runners.push({ run: def.bloomEffect.run, src: card });
        } else {
          const kw = card.keywords.find((k) => k.subtype === 'ブルームエフェクト');
          if (kw) this.log(`TODO(効果未実装) ブルームエフェクト「${kw.name}」: ${kw.text}`);
        }
        for (const att of h.attachments) {
          const atrig = this.registry.get(att.number)?.triggers?.onBloom;
          if (atrig) runners.push({ run: atrig, src: att });
        }
        if (runners.length > 0) {
          // 同時誘発（ブルームエフェクト＋装着の onBloom 等）が2件以上なら解決順をプレイヤーが選ぶ (Q257/Q259)
          const ordered = runners.map((r) => ({
            run: r.run,
            label: r.src.name || 'ブルームエフェクト',
            opts: { playerIdx: s.turnPlayer, sourceCard: r.src, sourceHolomem: h },
          }));
          this._runOrderedTriggers(ordered, s.turnPlayer, finish);
          return;
        }
        break;
      }
      case 'collab': {
        const h = p.back.splice(action.backIndex, 1)[0];
        p.collab = h;
        p.usedCollabThisTurn = true;
        // 8.4.3: デッキの上をホロパワーへ（デッキにカードがある場合）
        if (p.deck.length > 0) {
          p.holoPower.push(p.deck.shift());
        }
        this.log(`${p.name}: ${topCard(h).name} がコラボ（ホロパワー+1）`);
        // コラボエフェクト (13.2) ＋ 他ホロメンの「（自分のホロメンが）コラボした時」傍観トリガー
        const runners = [];
        // 傍観/装着の onCollab 用に、カードのキーワード/ギフト名を取り出す（同名カード同士でも
        // どの能力が誘発したか分かるよう、解決順の選択ラベルに能力名を出す）。
        const abilityName = (card) => {
          const kw = (card.keywords || []).find((k) => k.name && k.subtype !== 'コラボエフェクト');
          return kw ? `「${kw.name}」` : 'コラボ時の能力';
        };
        const def = this.registry.get(topCard(h).number);
        if (def?.collabEffect) {
          this.log(`《コラボエフェクト》${def.collabEffect.name}`);
          runners.push({ run: def.collabEffect.run, srcCard: topCard(h), srcH: h,
            label: `${topCard(h).name}: コラボエフェクト「${def.collabEffect.name}」` });
        } else {
          const kw = topCard(h).keywords.find((k) => k.subtype === 'コラボエフェクト');
          if (kw) this.log(`TODO(効果未実装) コラボエフェクト「${kw.name}」: ${kw.text}`);
        }
        for (const pos of this._stagePositions(p)) {
          const wh = this._holomemAt(p, pos);
          if (wh === h) continue;
          const wtrig = this.registry.get(topCard(wh).number)?.triggers?.onCollab;
          if (wtrig) runners.push({ run: wtrig, srcCard: topCard(wh), srcH: wh,
            label: `${topCard(wh).name}: ${abilityName(topCard(wh))}（コラボ時）` });
        }
        // コラボしたホロメンに付いている装着カードの onCollab（「このカードが付いているホロメンがコラボした時」hBP02-089 等）。
        // sourceHolomem はコラボしたホロメン（=ホスト）、sourceCard は装着カード。
        for (const att of h.attachments) {
          const atrig = this.registry.get(att.number)?.triggers?.onCollab;
          if (atrig) runners.push({ run: atrig, srcCard: att, srcH: h,
            label: `${att.name}: ${abilityName(att)}（コラボ時）` });
        }
        if (runners.length > 0) {
          // コラボエフェクト＋傍観 onCollab が2件以上同時誘発なら解決順をプレイヤーが選ぶ (Q587 等)
          const collabInfo = { holomem: h, card: topCard(h) }; // コラボしたホロメン（傍観 onCollab が参照。hBP08-051）
          const ordered = runners.map((r) => ({
            run: r.run,
            label: r.label || (r.srcCard.name || 'コラボエフェクト'),
            opts: { playerIdx: s.turnPlayer, sourceCard: r.srcCard, sourceHolomem: r.srcH, collabInfo },
          }));
          this._runOrderedTriggers(ordered, s.turnPlayer, finish);
          return;
        }
        break;
      }
      case 'oshiSkill': {
        const skill = p.oshi.oshiSkills[action.skillIndex];
        if (skill.sp) p.usedSpOshiSkillThisGame = true;
        else p.usedOshiSkillThisTurn += 1;
        const def = this.registry.get(p.oshi.number);
        const skillDef = skill.sp ? def?.spOshiSkill : def?.oshiSkill;
        // 推しスキル解決後に「推しスキルを使った時」の味方ホロメンギフトを誘発（hBP05-038/050 等）
        const afterSkill = () => this._dispatchOshiSkillUsed(s.turnPlayer, skill, finish);
        if (skill.cost === 'X') {
          // X コスト: 支払うホロパワー枚数を1枚ずつ選ばせ（最低1枚）、その枚数を ctx.payX で run に渡す (hBP08-006)
          const realRun = skillDef?.run;
          const wrapper = {
            *run(ctx) {
              let n = 0;
              while (ctx.player.holoPower.length > 0) {
                if (n >= 1) {
                  const more = yield ctx.confirm(
                    `さらにホロパワーをアーカイブする？（${n}枚支払い済み）`, 'アーカイブする', 'やめる');
                  if (!more) break;
                }
                ctx.player.archive.push(ctx.player.holoPower.shift());
                n++;
              }
              ctx.payX = n;
              ctx.log(`${ctx.player.name}: ${skill.sp ? 'SP' : ''}推しスキル発動（ホロパワー-${n}）`);
              if (realRun) yield* realRun(ctx);
            },
          };
          this._runEffect(wrapper, { playerIdx: s.turnPlayer, sourceCard: p.oshi }, afterSkill);
          return;
        }
        const effCost = this._effectiveOshiCost(skill, s.turnPlayer);
        p.archive.push(...p.holoPower.splice(0, effCost));
        this.log(`${p.name}: ${skill.sp ? 'SP' : ''}推しスキル発動（ホロパワー-${effCost}）`);
        if (skillDef) {
          this._runEffect(skillDef, { playerIdx: s.turnPlayer, sourceCard: p.oshi }, afterSkill);
          return;
        }
        this.log(`TODO(効果未実装) 推しスキル: ${skill.text}`);
        afterSkill();
        return;
      }
      case 'support': {
        const card = p.hand.splice(action.handIndex, 1)[0];
        if (card.limited) p.limitedPlayedThisTurn = (p.limitedPlayedThisTurn || 0) + 1;
        p.usedSupportThisTurn = true;
        p.supportsPlayedThisTurn.push(card);
        this.log(`${p.name}: サポート ${card.name} を使用`);
        const def = this.registry.get(card.number);
        if (def?.support) {
          // 解決中は解決領域(4.16)に置き、解決後にアーカイブ (10.7.2.5.1.1)
          p.revealed.push(card);
          this._runEffect(def.support, { playerIdx: s.turnPlayer, sourceCard: card }, () => {
            p.revealed.splice(p.revealed.indexOf(card), 1);
            // ctx.markReturnSelfToDeck() が呼ばれていたら、アーカイブせずデッキに戻してシャッフル (hBP07-093)
            if (p._supportReturnToDeck) {
              p._supportReturnToDeck = false;
              p.deck.push(card);
              this._shuffle(p.deck);
              this.log(`${card.name} をデッキに戻してシャッフルした`);
            } else {
              p.archive.push(card);
            }
            finish();
          });
          return;
        }
        p.archive.push(card);
        this.log(`TODO(効果未実装) サポート効果: ${(card.supportText || '').split('\n')[0]}`);
        break;
      }
      case 'supportAttach': {
        const card = p.hand.splice(action.handIndex, 1)[0];
        if (card.limited) p.limitedPlayedThisTurn = (p.limitedPlayedThisTurn || 0) + 1;
        p.usedSupportThisTurn = true;
        p.supportsPlayedThisTurn.push(card);
        const h = this._holomemAt(p, action.pos);
        h.attachments.push(card);
        this.log(`${p.name}: ${card.name}〔${card.supportType}〕を ${topCard(h).name} に付けた`);
        // 装着時トリガー: ①付けたカード自身の onAttach（「（手札/アーカイブから）付けた時」。こよりの助手くん等）
        //   ②付け先ホロメンの onAttached（「このホロメンに〈X〉が付いた時」hBP07-024）。
        //   どちらも sourceHolomem=ホスト, sourceCard=付けたカード。
        const attachRunners = [];
        const trig = this.registry.get(card.number)?.triggers?.onAttach;
        if (trig) attachRunners.push(trig);
        const hostTrig = this.registry.get(topCard(h).number)?.triggers?.onAttached;
        if (hostTrig) attachRunners.push(hostTrig);
        if (attachRunners.length > 0) {
          // 付けたカードの onAttach と付け先の onAttached が同時誘発なら解決順をプレイヤーが選ぶ
          const ordered = attachRunners.map((trig) => ({
            run: trig,
            label: card.name,
            opts: { playerIdx: s.turnPlayer, sourceCard: card, sourceHolomem: h },
          }));
          this._runOrderedTriggers(ordered, s.turnPlayer, finish);
          return;
        }
        break;
      }
      case 'activatedAbility': {
        const h = this._holomemAt(p, action.pos);
        const source = action.attachIndex >= 0 ? h.attachments[action.attachIndex] : topCard(h);
        const ability = this.registry.get(source.number)?.activatedAbilities?.[action.abilityIndex];
        if (!ability) { finish(); return; }
        // [ターンに1回] のマーキング（使用宣言した時点で消費）
        if (ability.oncePerTurn) {
          source._abilityUsedTurn = source._abilityUsedTurn || {};
          source._abilityUsedTurn[action.abilityIndex] = s.turn;
        }
        this.log(`${p.name}: 起動効果「${ability.name}」`);
        this._runEffect(ability, { playerIdx: s.turnPlayer, sourceCard: source, sourceHolomem: h }, finish);
        return;
      }
      case 'archiveActivatedAbility': {
        const card = p.archive[action.archiveIndex];
        const ability = this.registry.get(card?.number)?.archiveActivatedAbilities?.[action.abilityIndex];
        if (!ability) { finish(); return; }
        if (ability.oncePerTurn) {
          card._abilityUsedTurn = card._abilityUsedTurn || {};
          card._abilityUsedTurn[action.abilityIndex] = s.turn;
        }
        this.log(`${p.name}: 起動効果「${ability.name}」（アーカイブから）`);
        this._runEffect(ability, { playerIdx: s.turnPlayer, sourceCard: card }, finish);
        return;
      }
      case 'baton': {
        // コストのエールはプレイヤーが選んでアーカイブする (8.7.2)
        // 指定色を先に支払い、無色（任意の色でよい）を後に回す
        const center = p.center;
        const cost = this._effectiveBatonCost(center, topCard(center).batonTouch || [], s.turnPlayer)
          .sort((a, b) => (a === COLORLESS ? 1 : 0) - (b === COLORLESS ? 1 : 0));
        const backIndex = action.backIndex;
        const payAndSwap = function* (ctx) {
          for (const color of cost) {
            const candidates = color === COLORLESS
              ? [...center.cheers]
              : center.cheers.filter((c) => c.color === color);
            const pool = candidates.length > 0 ? candidates : [...center.cheers];
            if (pool.length === 0) return; // 支払えない（canPayチェック済みなので通常来ない）
            const cheer = yield ctx.chooseCard({
              cards: pool,
              title: `バトンタッチ: アーカイブするエールを選択（コスト: ${color}）`,
            });
            if (!cheer) return;
            yield* ctx.archiveCheer(center, cheer, { ability: false }); // バトンタッチはコスト置換の対象外
          }
          const back = p.back.splice(backIndex, 1)[0];
          const moved = p.center; // バックポジションへ移動するホロメン
          p.back.push(p.center);
          p.center = back;
          p.usedBatonTouchThisTurn = true;
          ctx.log(`${p.name}: バトンタッチ（${topCard(back).name} がセンターへ）`);
          // 「バトンタッチしてバックポジションに移動した時」トリガー（AIこより等）
          const mtrig = ctx.engine.registry.get(moved.stack[0].number)?.triggers?.onBatonMove;
          if (mtrig) {
            yield* mtrig(ctx.engine._effectContext(ctx.playerIdx, { sourceCard: moved.stack[0], sourceHolomem: moved }));
          }
        };
        this._runEffect({ run: payAndSwap }, { playerIdx: s.turnPlayer }, finish);
        return;
      }
    }
    finish();
  }

  _executePerformanceAction(action) {
    const s = this.state;
    // Q590: 再アーツ「もう1回」を放棄する。対応する reArts 修正を使用済みにして通常のパフォーマンスに戻る。
    if (action.kind === 'declineReArts') {
      const h = s.reArtsPending ? s.players[s.turnPlayer][s.reArtsPending.zone] : null;
      if (h) {
        const reMod = s.modifiers.find(
          (m) => m.kind === 'reArts' && !m.used && m.ownerIdx === s.turnPlayer && m.match?.(h));
        if (reMod) reMod.used = true;
      }
      s.reArtsPending = null;
      this._queuePerformancePending();
      return;
    }
    if (action.kind === 'pass') {
      // パフォーマンスステップ終了時：防御側（非ターンプレイヤー）の onOpponentPerformanceEnd を実行
      const defIdx = 1 - s.turnPlayer;
      const def = s.players[defIdx];
      const lifeDecreased = (s.lifeAtPerfStart?.[defIdx] ?? def.life.length) > def.life.length;
      const runners = [];
      for (const pos of this._stagePositions(def)) {
        const wh = this._holomemAt(def, pos);
        const trig = this.registry.get(topCard(wh).number)?.triggers?.onOpponentPerformanceEnd;
        if (trig) runners.push({ run: trig, srcH: wh });
      }
      if (runners.length > 0) {
        const runNext = (i) => {
          if (i >= runners.length) { this._endStep(); return; }
          this._runEffect(
            { run: runners[i].run },
            { playerIdx: defIdx, sourceCard: topCard(runners[i].srcH), sourceHolomem: runners[i].srcH, lifeDecreasedThisPerf: lifeDecreased },
            () => runNext(i + 1),
          );
        };
        runNext(0);
        return;
      }
      this._endStep();
      return;
    }
    const p = s.players[s.turnPlayer];
    const opp = s.players[1 - s.turnPlayer];
    const h = p[action.zone];
    const card = topCard(h);
    const art = action.artObj || card.arts[action.artIndex]; // 借用アーツ(hBP07-048)は action.artObj を使う

    s.perfUsed[action.zone] = true;
    h.lastArtUsedIndex = action.artIndex; // 再アーツ（同じアーツをもう1回）判定用に記録
    // 「このターンに〈名前〉がアーツを使ったか」判定用に、アーツを使ったホロメン名を記録（hBP05-050 等）
    (p.artsUsedNamesThisTurn || (p.artsUsedNamesThisTurn = [])).push(topCard(h).name);
    // 「このターンに“このホロメン”がアーツを使ったか」判定用（名前でなく個体単位。hSD10-013 ふぐ太郎 等）
    h._artsUsedTurn = s.turn;
    // 「このターンにセンターでアーツを使ったか」判定用（hBP08-007 ターン終了時推しスキル）
    if (action.zone === 'center') {
      (p.centerArtsUsedNamesThisTurn || (p.centerArtsUsedNamesThisTurn = [])).push(topCard(h).name);
    }
    // 再アーツでの使用なら、対応する「もう1回」修正を消費する (hBP07-008)
    if (action.reArts) {
      const reMod = s.modifiers.find(
        (m) => m.kind === 'reArts' && !m.used && m.ownerIdx === s.turnPlayer && m.match?.(h));
      if (reMod) reMod.used = true;
      s.reArtsPending = null; // 再アーツを使い切った（Q590）
    } else {
      // 1回目のアーツ。「もう1回」修正を持つなら、再アーツの可否を決めるまで保留（他アーツを挟ませない Q590）
      const reMod = s.modifiers.find(
        (m) => m.kind === 'reArts' && !m.used && m.ownerIdx === s.turnPlayer && m.match?.(h));
      s.reArtsPending = reMod ? { zone: action.zone } : null;
    }
    this.log(`${card.name} のアーツ「${art.name}」！${action.reArts ? '（再アーツ）' : ''}`);

    const artDef = this.registry.getArt(action.artFrom || card.number, art.name); // 借用アーツは出どころカードの定義を使う
    const ctxOpts = { playerIdx: s.turnPlayer, sourceCard: card, sourceHolomem: h };
    // テキスト効果（段階4）の実行中に積まれたアーツ修正（サイコロ等）を受け取るための参照
    const runCtx = new EffectContext(this, s.turnPlayer, ctxOpts);
    // このアーツの対象（「このアーツの対象が～なら」条件で run/dmgBonus から参照する）
    runCtx.artTarget = this._targetHolomem(opp, action.target) || null;

    // アーツ解決パイプライン（RULES_SPEC §12 / 12.3.4）
    // 段階4: テキスト効果 → 段階5: 特攻 → 段階6: 数値決定 → 段階7: ダメージ適用
    const resolveDamage = () => {
      const primary = this._targetHolomem(opp, action.target);
      if (!primary) {
        // テキスト効果で対象が場を離れた場合、ダメージは適用されない
        this.log('対象がいなくなったため、アーツダメージは発生しなかった');
        this._checkTiming(() => this._queuePerformancePending());
        return;
      }
      // 対象に依存しない修正までを baseDmg に集約（特攻と被ダメージ修正は対象ごとに適用する）
      let baseDmg = art.dmg;
      // 条件付き「このアーツ+N」（カード定義の dmgBonus）
      if (artDef?.dmgBonus) {
        const bonus = artDef.dmgBonus(runCtx) || 0;
        if (bonus > 0) {
          baseDmg += bonus;
          this.log(`アーツ効果: +${bonus}`);
        }
      }
      // テキスト効果の実行中に積まれた修正（サイコロの結果など）
      if (runCtx.artBonus) baseDmg += runCtx.artBonus;
      // その他の修正: 装着カード（マスコット等）・ターン中の継続効果 (12.3.4.4)
      const mod = this.effects.artsBonus(h, s.turnPlayer);
      if (mod !== 0) {
        baseDmg += mod;
        this.log(`継続効果・装着カードの修正: ${mod > 0 ? '+' : ''}${mod}`);
      }

      // アーツダメージの対象。リダイレクト（「対象のかわりに相手のセンターとコラボに与える」hBP07-081等）があれば差し替え
      let targets = [primary];
      if (artDef?.redirectTargets) {
        const rt = (artDef.redirectTargets(runCtx) || []).filter(Boolean);
        if (rt.length > 0) {
          targets = rt;
          this.log(`アーツの対象を変更: ${rt.map((t) => topCard(t).name).join('・')}`);
        }
      }

      const downed = [];
      const dealtList = []; // [{target, zone, dealt}]（攻撃時誘発の推しスキルが参照）
      let totalDealt = 0;

      // 1体ぶんのダメージ適用（特攻→被ダメージ修正→推しスキル割り込み→加算）。完了後 after2 を呼ぶ
      const applyToTarget = (t, after2) => {
        const tCard = topCard(t);
        let dmg = baseDmg;
        // 特攻: 対象の色が一致するなら加算 (12.3.4.3)
        // 「すべての色を持つホロメンとして扱う」継続効果が乗っている対象は、どの特攻色とも一致する
        const allColors = this._isTreatedAllColors(t);
        for (const tk of art.tokkou || []) {
          if (allColors || (tCard.color || '').includes(tk.color)) { // 多色（'白緑'等）は構成色すべてに一致 (2.4.3)
            dmg += tk.value;
            this.log(`特攻発動！ ${tk.color}+${tk.value}${allColors ? '（全色扱い）' : ''}`);
          }
        }
        // ターン修正による特攻（「このターン、このホロメンは○特攻+N を得る」hBP03-071 じゃんけん勝利時 等）
        for (const m of this.state.modifiers) {
          if (m.kind !== 'tokkouPlus' || m.ownerIdx !== s.turnPlayer) continue;
          if (m.match && !m.match(h)) continue;
          if (allColors || (tCard.color || '').includes(m.color)) {
            dmg += m.amount;
            this.log(`特攻（継続効果）！ ${m.color}+${m.amount}${allColors ? '（全色扱い）' : ''}`);
          }
        }
        // 受け手の「受けるダメージ」修正（軽減/増加）(5.22.3)。常時アウラ/装着分まで反映。
        // 「このアーツダメージは軽減されない」効果があれば軽減を無効化する。
        const noReduce = this._artDamageNotReduced(h, artDef, runCtx, t);
        dmg = this._applyDamageReceived(t, dmg, 'arts', h, { ignoreReduction: noReduce });
        // 防御側の被ダメージ推しスキル割り込み（対象ごと）。
        // redirectTo があれば「そのダメージを、選んだホロメンがかわりに受ける」(hSD13-001)。
        // ＝既に算出済みのダメージ値を別ホロメンに移す（特攻/軽減は元の対象基準で確定済み）。
        this._offerDamageOshiSkill(t, dmg, (finalDmg, redirectTo) => {
          // (kind='arts')
          const recv = redirectTo || t;
          const recvCard = topCard(recv);
          if (redirectTo) {
            this.log(`ダメージの受け手を変更: ${tCard.name} → ${recvCard.name}`);
            // 差し替え先ホロメンの「受けるダメージ」修正（やめなー等の軽減/無効）を適用する (Q565)
            finalDmg = this._applyDamageReceived(recv, finalDmg, 'arts', h, { ignoreReduction: noReduce });
          }
          recv.damage += finalDmg;
          totalDealt += finalDmg;
          if (finalDmg > 0) dealtList.push({ target: recv, zone: this._zoneOf(recv), dealt: finalDmg });
          this.log(
            `「${art.name}」→ ${recvCard.name} に ${finalDmg}ダメージ（累計${recv.damage}/${this.effectiveHp(recv)}）`
          );
          // 致死判定はダメージ時点で確定する。被ダメ後の回復（緑の地母神 hBP07-029）では致死ダウンを覆せない (Q593)
          const wasLethal = recv.damage >= this.effectiveHp(recv);
          if (finalDmg > 0) this._dispatchDamageReceivedForced(recv); // 強制被ダメージトリガー (hBP07-108 / 緑の地母神の回復)
          if (wasLethal) downed.push(recv);
          after2();
        }, 'arts', { noReduce }); // 「軽減されない」アーツは被ダメ割り込みの軽減型も無効化する (Q539)
      };

      // 全対象に逐次適用（割り込みが挟まるためチェーン）→ 完了後にアーツ後トリガー群
      const afterAllDamage = () => {
        // 攻撃時誘発の推しスキル（「ダメージを与えた時」「アーツを使った時」）→ その後にダウン処理（チェックタイミング）
        const attackInfo = { sourceHolomem: h, art, artName: art.name, dealtList, downed };
        const realCont = () => this._checkTiming(() => this._queuePerformancePending());
        const cont = () => this._offerTimingOshiSkills('onDamageDealtOshiSkills', s.turnPlayer, attackInfo,
          () => this._offerTimingOshiSkills('onArtsUseOshiSkills', s.turnPlayer, attackInfo, realCont));
        // runners: { run, srcCard } の配列。srcCard は ctx.sourceCard（装着カードのトリガーは装着カードを渡す）
        const runners = [];
        const selfCard = topCard(h);
        if (downed.length > 0) {
          this._notifySourceDown(h, s.turnPlayer, downed); // 継続効果(ターン修正)の同期通知（ラミィSP/hBP06-095等）
          const cardTrig = this.registry.get(selfCard.number)?.triggers?.onOpponentDown;
          for (let d = 0; d < downed.length; d++) { // ダウン体数ぶん（通常は1体）
            if (cardTrig) runners.push({ run: cardTrig, srcCard: selfCard, attackInfo });
            if (artDef?.onDownDealt) runners.push({ run: artDef.onDownDealt, srcCard: selfCard });
          }
          // 装着カードの「ホストが相手をダウンさせた時」トリガー（hBP02-096 等）
          for (const att of h.attachments) {
            const at = this.registry.get(att.number)?.triggers?.onOpponentDown;
            if (at) runners.push({ run: at, srcCard: att, attackInfo });
          }
        }
        const onArts = this.registry.get(selfCard.number)?.triggers?.onArtsUse;
        if (onArts) runners.push({ run: onArts, srcCard: selfCard });
        // 装着カードの「ホストがアーツを使った時」トリガー（hBP01-119 等。ctx.sourceHolomem=ホスト, sourceCard=装着）
        for (const att of h.attachments) {
          const at = this.registry.get(att.number)?.triggers?.onArtsUse;
          if (at) runners.push({ run: at, srcCard: att });
        }
        // 味方ホロメンがアーツを使った時（自ステージの他のホロメンに発火。ctx.sourceHolomem=監視側, ctx.attackInfo に使用者h。hBP05-066）
        for (const ally of this._stageHolomems(p)) {
          if (ally === h) continue;
          const at = this.registry.get(ally.stack[0].number)?.triggers?.onAllyArtsUse;
          if (at) runners.push({ run: at, srcCard: ally.stack[0], srcH: ally, attackInfo });
        }
        // 推しステージスキルの「自分の〈X〉がアーツを使った時」（わため: デッキ上1枚をホロパワーに）。
        // ctx.sourceHolomem = アーツ使用者 h、ctx.attackInfo に使用情報。発火可否はフック側で名前判定する。
        const oshiStageArts = this._oshiStage(s.turnPlayer);
        if (oshiStageArts?.onArtsUse) runners.push({ run: oshiStageArts.onArtsUse, srcCard: p.oshi, srcH: h, attackInfo });
        // 「このアーツで（相手に）ダメージを与えた時」（実際に与えた合計ダメージ量を渡す。ライフスティール等）
        if (artDef?.onDamageDealt && totalDealt > 0) {
          const dealt = totalDealt;
          runners.push({ run: function* onDamageDealtWrap(c) { yield* artDef.onDamageDealt(c, dealt); }, srcCard: selfCard, attackInfo });
        }
        if (runners.length > 0) {
          const runNext = (i) => {
            if (i >= runners.length) { cont(); return; }
            this._runEffect(
              { run: runners[i].run },
              { playerIdx: s.turnPlayer, sourceCard: runners[i].srcCard, sourceHolomem: runners[i].srcH || h, attackInfo: runners[i].attackInfo },
              () => runNext(i + 1),
            );
          };
          runNext(0);
          return;
        }
        cont();
      };

      const applyNext = (i) => {
        if (i >= targets.length) { afterAllDamage(); return; }
        applyToTarget(targets[i], () => applyNext(i + 1));
      };
      applyNext(0);
    };

    if (artDef?.run) {
      this._runEffect(artDef, { ...ctxOpts, ctx: runCtx }, resolveDamage);
    } else {
      if (art.text) this.log(`TODO(効果未実装) アーツ効果: ${art.text}`);
      resolveDamage();
    }
  }

  // ============ チェックタイミング (10.6 / 11章) ============

  /**
   * ルール処理ループ: ダウン処理 → 敗北判定 → ライフダメージ処理。
   * ダウン処理（推しスキル確認）とライフダメージ処理はプレイヤーの選択を要するため、
   * 継続（step / resume）で再入する。
   * TODO(効果システム): 一般の自動能力の待機・プレイをこのループに統合する (10.6.3)
   */
  _checkTiming(resume) {
    const s = this.state;
    const step = () => {
      if (s.phase === 'ended') return;

      // 1) ダウン処理 (11.3): ターンプレイヤー側から1体ずつ。HPは実効値で判定
      for (const idx of [s.turnPlayer, 1 - s.turnPlayer]) {
        const p = s.players[idx];
        const downed = this._stagePositions(p).find((pos) => {
          const h = this._holomemAt(p, pos);
          // 実効HP以上のダメージ、または効果による強制ダウン (4.4.9)
          return h.damage >= this.effectiveHp(h) || h.forcedDown;
        });
        if (downed) {
          this._processDown(p, downed, step); // 処理後に step へ再入
          return;
        }
      }

      // 2) 敗北判定 (11.2): 同時成立は引き分け
      const losses = [];
      for (let i = 0; i < 2; i++) {
        const p = s.players[i];
        if (p.life.length === 0) {
          losses.push({ player: i, reason: LOSS_REASONS.LIFE_ZERO });
        } else if (this._stageCount(p) === 0) {
          losses.push({ player: i, reason: LOSS_REASONS.NO_STAGE });
        }
      }
      if (losses.length === 2) {
        s.phase = 'ended';
        s.winner = 'draw';
        this.log('両者同時敗北 — 引き分け');
        return;
      }
      if (losses.length === 1) {
        this._setWinner(1 - losses[0].player, losses[0].reason, losses[0].player);
        return;
      }

      // 3) ライフダメージ処理 (11.5): ターンプレイヤー優先
      // （ライフが空のケースは上の敗北判定で終了済み）
      for (const idx of [s.turnPlayer, 1 - s.turnPlayer]) {
        const p = s.players[idx];
        if (p.lifeDamage > 0) {
          const cheer = p.life.shift();
          p.revealed.push(cheer);
          const targets = this._stagePositions(p);
          this.log(`${p.name}: ライフ公開 → ${cheer.name}`);
          s.pending = {
            type: 'attachLifeCheer', player: idx, auto: true, cheer, resume,
            options: targets.map((pos) => ({
              id: `life_${pos.zone}_${pos.index}`,
              label: `${topCard(this._holomemAt(p, pos)).name} に送る`,
              pos,
            })),
          };
          return; // 選択後に _checkTiming(resume) へ再入する
        }
      }

      resume();
    };
    if (s.phase === 'ended') return;
    step();
  }

  /** ダウン処理 (11.3)。完了後に next() を呼ぶ（推しスキル確認で中断する場合がある） */
  _processDown(p, pos, next) {
    const h = this._holomemAt(p, pos);
    const card = topCard(h);
    const ownerIdx = this.state.players.indexOf(p);
    this.log(`${card.name} がダウン！`);
    // 相手のターン中の自分のホロメンのダウンを記録（「直前の相手のターンにダウンしていたなら」用）
    if (this.state.turnPlayer !== ownerIdx) {
      (p.downedCardsLastOppTurn || (p.downedCardsLastOppTurn = [])).push(card);
    }

    const finish = () => {
      // 装着カードのアーカイブ差し替え割り込み（hBP06-030「みんなへ感謝の気持ち」）。
      // 差し替えられた装着カードは h.attachments から除かれ、残りを通常どおりアーカイブする。
      this._stepEffect(this._replaceAttachArchiveGen(p, h, pos), undefined, () => {
        // ホロメンの全カードと付いているカードをアーカイブ (11.3.1.2 / 4.4.7)
        p.archive.push(...h.stack, ...h.cheers, ...h.attachments);
        this._removeHolomem(p, pos);
        // ライフダメージ: 通常1、Buzzは2 (2.11.2.2)。
        // 「ダウンしてもライフは減らない」特殊ダメージでダウンした場合は0
        if (h.noLifeOnDown) {
          this.log(`${p.name} のライフは減らない（効果による）`);
        } else {
          // ダウン時に減るライフ枚数: エクストラ「ダウンした時、自分のライフ-N」を優先（非Buzzでも-2の特殊カード対応）、
          // 無ければ Buzz=2 / 通常=1。さらに「減るライフ-N」(h.lifeReductionOnDown) を差し引く。
          const baseLifeLoss = card.extraLifeLossOnDown ?? (card.buzz ? 2 : 1);
          const lifeDmg = Math.max(0, baseLifeLoss - (h.lifeReductionOnDown || 0));
          p.lifeDamage += lifeDmg;
          this.log(`${p.name} はライフダメージ${lifeDmg}を受けた`);
        }
        next();
      });
    };

    // ダウンしたホロメン自身の「ダウンした時」トリガー (13.4 ギフト等)。
    // アーカイブ前に実行する（エールやスタックの付け替え・回収が間に合うように）。
    // 「相手のターンで～」等の条件は各カードの run() 内で ctx.state.turnPlayer を見て判定する。
    const runDownTrigger = () => {
      const downedInfo = { holomem: h, card, ownerIdx, zone: pos.zone };
      // 1) ダウンしたホロメン自身＋付いている装着カード（ファン等）の onDown。sourceHolomem はダウンしたホロメン。
      //    同一所有者の能力が複数同時誘発するので、2件以上なら所有者が解決順を選ぶ (Q474 複数装備)。
      const ownRunners = [];
      for (const c of [card, ...h.attachments]) {
        const trig = this.registry.get(c.number)?.triggers?.onDown;
        if (trig) ownRunners.push({ run: trig, label: c.name, opts: { playerIdx: ownerIdx, sourceCard: c, sourceHolomem: h } });
      }
      // 2) 場の全ホロメン（両者）＋装着の onAnyDown（ダウンしたホロメン自身は除く）。downedInfo を渡す。
      //    両プレイヤーにまたがるため順序は従来どおり逐次（cross-player の順序制御は別課題）。
      const anyRunners = [];
      for (let pi = 0; pi < 2; pi++) {
        const pl = this.state.players[pi];
        for (const wpos of this._stagePositions(pl)) {
          const wh = this._holomemAt(pl, wpos);
          if (wh === h) continue;
          for (const c of [topCard(wh), ...wh.attachments]) {
            const atrig = this.registry.get(c.number)?.triggers?.onAnyDown;
            if (atrig) anyRunners.push({ run: atrig, opts: { playerIdx: pi, sourceCard: c, sourceHolomem: wh, downedInfo } });
          }
        }
      }
      const runAny = (i) => {
        if (i >= anyRunners.length) { finish(); return; }
        this._runEffect({ run: anyRunners[i].run }, anyRunners[i].opts, () => runAny(i + 1));
      };
      // 自身の onDown 群（所有者が順序選択）→ その後 onAnyDown 群を逐次（全体の順序は従来と同じ）
      this._runOrderedTriggers(ownRunners, ownerIdx, () => runAny(0));
    };

    // 「（ホロメンが）ダウンした時に使える」推しスキル (11.3.1.1 / 12.1.5.2)
    // 例: 雪花ラミィ「愛してる」— ダウンしたホロメンのファンを手札に戻す
    // 定義は単体オブジェクトまたは配列（通常推しスキル＋SP推しスキルが共にダウン誘発の場合）を許容。
    // 各スキルは sd.sp(=SP推しスキル/ゲームに1回) と sd.run(対話的ジェネレータ) に対応:
    //   - sd.run があれば: エンジンがコスト(ホロパワー)と使用フラグを処理してから run を実行する。
    //   - sd.run が無ければ(旧方式): sd.apply 自身がコスト＋使用フラグを処理する。
    const rawDownSkill = this.registry.get(p.oshi.number)?.onDownOshiSkill;
    const downSkills = Array.isArray(rawDownSkill) ? rawDownSkill : (rawDownSkill ? [rawDownSkill] : []);
    const offerDownSkill = (si) => {
      if (si >= downSkills.length) { runDownTrigger(); return; }
      const sd = downSkills[si];
      if (!sd.canUse?.(this, ownerIdx, h)) { offerDownSkill(si + 1); return; }
      this.state.pending = {
        type: 'effectChoice',
        player: ownerIdx,
        request: { kind: 'confirm', title: sd.title || '推しスキルを使いますか？' },
        options: [
          { id: 'yes', label: `推しスキルを使う（ホロパワー-${sd.cost}）`, value: true },
          { id: 'no', label: '使わない', value: false },
        ],
        resume: (use) => {
          if (!use) { offerDownSkill(si + 1); return; }
          if (sd.run) {
            p.archive.push(...p.holoPower.splice(0, sd.cost || 0));
            if (sd.sp) p.usedSpOshiSkillThisGame = true; else p.usedOshiSkillThisTurn += 1; // ダウン時推しスキル使用
            this._runEffect({ run: sd.run }, { playerIdx: ownerIdx, downedHolomem: h }, () => offerDownSkill(si + 1));
          } else {
            sd.apply(this, ownerIdx, h);
            offerDownSkill(si + 1);
          }
        },
      };
    };
    offerDownSkill(0);
  }

  /**
   * 「（自分が）推しスキルを使った時」の味方ホロメンギフトを誘発する。
   * ownerIdx のステージ上の各ホロメンの triggers.onOshiSkillUsed を順に実行し、完了後 after()。
   * ctx.oshiSkillInfo = { text, sp }（使った推しスキルの本文・SPか）。
   */
  _dispatchOshiSkillUsed(ownerIdx, skill, after) {
    const p = this.state.players[ownerIdx];
    const runners = [];
    for (const h of this._stageHolomems(p)) {
      const trig = this.registry.get(h.stack[0].number)?.triggers?.onOshiSkillUsed;
      if (trig) runners.push({ run: trig, srcH: h });
    }
    if (runners.length === 0) { after(); return; }
    const info = { text: skill.text || '', sp: !!skill.sp };
    const runNext = (i) => {
      if (i >= runners.length) { after(); return; }
      this._runEffect(
        { run: runners[i].run },
        { playerIdx: ownerIdx, sourceCard: runners[i].srcH.stack[0], sourceHolomem: runners[i].srcH, oshiSkillInfo: info },
        () => runNext(i + 1),
      );
    };
    runNext(0);
  }

  /**
   * 攻撃側のタイミング誘発推しスキル（「アーツを使った時」「ダメージを与えた時」）を提示する。
   * skillKey は配列を指す（通常＋SPなど同タイミングで複数定義できる）。各スキルを順に確認の決定ポイントとして出し、
   * 使用時はコスト支払い＋ skill.run を実行する。skill.run(ctx) は ctx.attackInfo を参照できる。
   * 定義: oshi の onArtsUseOshiSkills / onDamageDealtOshiSkills = [{ cost, sp?, title, canUse(engine, idx, attackInfo), *run(ctx) }]
   */
  _offerTimingOshiSkills(skillKey, ownerIdx, attackInfo, after) {
    const p = this.state.players[ownerIdx];
    const skills = this.registry.get(p.oshi.number)?.[skillKey] || [];
    const list = Array.isArray(skills) ? skills : [skills];
    const run = (i) => {
      if (i >= list.length) { after(); return; }
      const skill = list[i];
      const used = skill.sp ? p.usedSpOshiSkillThisGame : (p.usedOshiSkillThisTurn >= this._oshiSkillCap(ownerIdx));
      if (used || p.holoPower.length < skill.cost || (skill.canUse && !skill.canUse(this, ownerIdx, attackInfo))) {
        run(i + 1);
        return;
      }
      this.state.pending = {
        type: 'effectChoice',
        player: ownerIdx,
        request: { kind: 'confirm', title: skill.title || '推しスキルを使いますか？' },
        options: [
          { id: 'yes', label: `${skill.sp ? 'SP' : ''}推しスキルを使う（ホロパワー-${skill.cost}）`, value: true },
          { id: 'no', label: '使わない', value: false },
        ],
        resume: (use) => {
          if (!use) { run(i + 1); return; }
          p.archive.push(...p.holoPower.splice(0, skill.cost));
          if (skill.sp) p.usedSpOshiSkillThisGame = true;
          else p.usedOshiSkillThisTurn += 1;
          this._runEffect(skill, { playerIdx: ownerIdx, sourceCard: p.oshi, attackInfo }, () => run(i + 1));
        },
      };
      this.onChange();
    };
    run(0);
  }

  /**
   * 防御側の「ダメージを受ける時に使える」割り込みを収集する。返り値は各レスポンダーの記述子配列。
   * build(curDmg) は現在のダメージで使用可能なら { title, yesLabel, apply(d)=>newDmg } を、不可なら null を返す。
   * 種別: ①推しスキル onDamageOshiSkill ②対象の装着カード onDamageReceivedReact ③防御側ステージのホロメンギフト onDamageReceivedReact
   * @param target 受け手ホロメン  @param kind 'arts'|'special'  @param defIdx 防御側
   */
  _collectDamageResponders(target, kind, defIdx) {
    const defender = this.state.players[defIdx];
    const out = [];

    // ① 推しスキル（「受ける時に使える推しスキル」）
    //   reduce: 受けるダメージ-N（同期）。run: 選択を伴う副作用（エール付け替え等。generator）。
    const skill = this.registry.get(defender.oshi.number)?.onDamageOshiSkill;
    if (skill) {
      out.push({ build: (curDmg) => {
        const used = skill.sp ? defender.usedSpOshiSkillThisGame : (defender.usedOshiSkillThisTurn >= this._oshiSkillCap(defIdx));
        if (used || defender.holoPower.length < skill.cost) return null;
        // redirect（受け手差し替え）は「アーツダメージを受ける時」限定 (hSD13-001)。特殊ダメージには出さない。
        if (skill.redirect && kind !== 'arts') return null;
        if (skill.canUse && !skill.canUse(this, defIdx, target, curDmg, kind)) return null;
        const eng = this;
        const payAndMark = () => {
          defender.archive.push(...defender.holoPower.splice(0, skill.cost));
          if (skill.sp) defender.usedSpOshiSkillThisGame = true;
          else defender.usedOshiSkillThisTurn += 1;
        };
        const desc = {
          title: skill.title || '推しスキルを使いますか？',
          yesLabel: `${skill.sp ? 'SP' : ''}推しスキルを使う（ホロパワー-${skill.cost}）`,
        };
        if (skill.redirect) {
          // 受け手差し替え型（generator・選んだホロメンを返す）。ダメージ値は変えず受け手だけ変更。
          desc.redirect = function* (ctx) {
            payAndMark();
            eng.log(`${defender.name}: ${skill.sp ? 'SP' : ''}推しスキル発動（ホロパワー-${skill.cost}）`);
            return yield* skill.redirect(ctx, { target, dmg: curDmg });
          };
        } else if (skill.run) {
          // 選択を伴う割り込み（generator）。ダメージは変更しない副作用。
          desc.run = function* (ctx) {
            payAndMark();
            eng.log(`${defender.name}: ${skill.sp ? 'SP' : ''}推しスキル発動（ホロパワー-${skill.cost}）`);
            yield* skill.run(ctx, { target, dmg: curDmg });
          };
        } else {
          // 既存: 受けるダメージ軽減（同期）
          desc.apply = (d) => {
            payAndMark();
            const red = skill.reduce ? (skill.reduce(this, defIdx, target, d) || 0) : 0;
            const fin = Math.max(0, d - red);
            this.log(`${defender.name}: 推しスキルで受けるダメージ ${d} → ${fin}（-${red}）`);
            return fin;
          };
        }
        return desc;
      } });
    }

    // ② 対象に付いている装着カード（ファン等）のリアクティブ反応（hBP03-105 ルーナイト等）
    for (const att of target.attachments) {
      const r = this.registry.get(att.number)?.onDamageReceivedReact;
      if (!r) continue;
      out.push({ build: (curDmg) => {
        const info = { defIdx, target, dmg: curDmg, kind, attachedCard: att, reactor: target };
        if (r.canUse && !r.canUse(this, info)) return null;
        return {
          title: r.title || '装着カードの効果を使いますか？',
          yesLabel: r.yesLabel || '使う',
          apply: (d) => (r.apply(this, { ...info, dmg: d }) ?? d),
        };
      } });
    }

    // ③ 防御側ステージのホロメンギフトのリアクティブ反応（hSD13-012 ジジ等。特殊ダメージ限定など）
    for (const reactor of this._stageHolomems(defender)) {
      const r = this.registry.get(reactor.stack[0].number)?.onDamageReceivedReact;
      if (!r) continue;
      out.push({ build: (curDmg) => {
        const info = { defIdx, target, dmg: curDmg, kind, reactor };
        if (r.canUse && !r.canUse(this, info)) return null;
        return {
          title: r.title || 'ギフトを使いますか？',
          yesLabel: r.yesLabel || '使う',
          apply: (d) => (r.apply(this, { ...info, dmg: d }) ?? d),
        };
      } });
    }

    return out;
  }

  /**
   * 「相手のターンで、自分のホロメンが相手からダメージを受ける時に使える」防御側の割り込み（推しスキル＋ホロメン/ファン）。
   * アーツダメージ適用の直前に呼ぶ。使える割り込みを順に防御側へ決定ポイントとして提示し、最終ダメージで after を呼ぶ。
   * 無ければそのまま after(dmg)。特殊ダメージの割り込みは _offerDamageInterruptsGen（generator版）を使う。
   */
  _offerDamageOshiSkill(targetHolomem, dmg, after, kind = 'arts', opts = {}) {
    const s = this.state;
    const defIdx = s.players.findIndex((p) => this._stageHolomems(p).includes(targetHolomem));
    // 攻撃はターンプレイヤー→相手。防御側はターンプレイヤーでない側のみ（自分のアーツの自爆等は対象外）
    if (defIdx < 0 || defIdx === s.turnPlayer) { after(dmg); return; }
    const responders = this._collectDamageResponders(targetHolomem, kind, defIdx);
    if (responders.length === 0) { after(dmg); return; }

    const run = (i, curDmg) => {
      if (i >= responders.length) { after(curDmg); return; }
      const r = responders[i].build(curDmg);
      if (!r) { run(i + 1, curDmg); return; }
      // 「このアーツダメージは軽減されない」(opts.noReduce) の時、ダメージ軽減型の割り込み（apply のみ）は無効化＝提示しない。
      // 受け手差し替え(redirect)や副作用(run)はダメージ量を変えないので提示する。
      if (opts.noReduce && r.apply && !r.run && !r.redirect) { run(i + 1, curDmg); return; }
      this.state.pending = {
        type: 'effectChoice',
        player: defIdx,
        request: { kind: 'confirm', title: r.title },
        options: [
          { id: 'yes', label: r.yesLabel, value: true },
          { id: 'no', label: '使わない', value: false },
        ],
        resume: (use) => {
          if (!use) { run(i + 1, curDmg); return; }
          if (r.redirect) {
            // 受け手差し替え（generator が選んだホロメンを返す）。リダイレクトが起きたら
            // 以降の割り込みは提示せず、選ばれたホロメンへ即適用する（割り込みの完結）。
            let chosen = null;
            const captureRun = function* (ctx) { chosen = yield* r.redirect(ctx); };
            this._runEffect({ run: captureRun }, { playerIdx: defIdx }, () => after(curDmg, chosen || null));
          } else if (r.run) {
            // 選択を伴う割り込み（generator・ダメージ非変更）はエフェクトランナーで実行してから次へ
            this._runEffect({ run: r.run }, { playerIdx: defIdx }, () => run(i + 1, curDmg));
          } else {
            run(i + 1, r.apply ? r.apply(curDmg) : curDmg);
          }
        },
      };
      this.onChange();
    };
    run(0, dmg);
  }

  /**
   * 「自分の○○ホロメンの能力でエールをアーカイブした時に使える」枚数集計型のSP推しスキル（hSD11-001）。
   * 効果実行(runCtx)が完了した時、その実行で archiveCheer により捨てた枚数(_flowGlowArchiveCount)を
   * info.count として1回だけ提示する。発生源ホロメン(runCtx.sourceHolomem)の色/タグ判定はカードの canUse で行う。
   */
  *_cheerArchiveBatchGen(runCtx) {
    const ownerIdx = runCtx.playerIdx;
    const count = runCtx._flowGlowArchiveCount || 0;
    runCtx._flowGlowArchiveCount = 0; // 二重発動防止（読み取り後にクリア）
    const p = this.state.players[ownerIdx];
    const od = this.registry.get(p.oshi.number)?.onCheerArchivedBatchOshiSkill;
    if (!od || count <= 0) return;
    const used = od.sp ? p.usedSpOshiSkillThisGame : (p.usedOshiSkillThisTurn >= this._oshiSkillCap(ownerIdx));
    const info = { count, source: runCtx.sourceHolomem };
    if (used || p.holoPower.length < (od.cost || 0)) return;
    if (od.canUse && !od.canUse(this, ownerIdx, info)) return;
    const use = yield {
      kind: 'confirm', player: ownerIdx,
      title: od.title || `${od.sp ? 'SP' : ''}推しスキルを使いますか？（アーカイブしたエール${count}枚）`,
      buildOptions: () => [
        { id: 'yes', label: `${od.sp ? 'SP' : ''}推しスキルを使う（ホロパワー-${od.cost}）`, value: true },
        { id: 'no', label: '使わない', value: false },
      ],
    };
    if (!use) return;
    p.archive.push(...p.holoPower.splice(0, od.cost || 0));
    if (od.sp) p.usedSpOshiSkillThisGame = true; else p.usedOshiSkillThisTurn += 1;
    this.log(`${p.name}: ${od.sp ? 'SP' : ''}推しスキル発動（アーカイブしたエール${count}枚ぶん）`);
    yield* od.run(this._effectContext(ownerIdx, { sourceCard: p.oshi, cheerArchivedInfo: info }));
  }

  /**
   * ダウン処理のアーカイブ直前に、装着カードを「アーカイブするかわりに別ホロメンへ付け替える」割り込み（hBP06-030）。
   * 自ステージのギフト `attachArchiveReplace` を持つホロメンが、ダウンしたホロメン h の各装着カードについて
   * 差し替えるか提示する。差し替えた装着カードは h.attachments から除かれ、宛先ホロメンに付く（アーカイブされない）。
   */
  *_replaceAttachArchiveGen(p, h, pos) {
    const ownerIdx = this.state.players.indexOf(p);
    for (const giftH of this._stageHolomems(p)) {
      const rep = this.registry.get(giftH.stack[0].number)?.attachArchiveReplace;
      if (!rep) continue;
      for (const att of [...h.attachments]) {
        if (!h.attachments.includes(att)) continue; // すでに別ギフトで移動済み
        const info = { downedHolomem: h, downedPos: pos, attachment: att, giftHolomem: giftH };
        if (rep.canUse && !rep.canUse(this, ownerIdx, info)) continue;
        const use = yield {
          kind: 'confirm', player: ownerIdx,
          title: rep.title || `${att.name}をアーカイブするかわりに付け替えますか？`,
          buildOptions: () => [
            { id: 'yes', label: rep.yesLabel || '付け替える', value: true },
            { id: 'no', label: `${att.name}をアーカイブ`, value: false },
          ],
        };
        if (!use) continue;
        // 宛先ホロメンを run が返す（選択を伴う）
        const dest = yield* rep.run(this._effectContext(ownerIdx, {}), info);
        if (!dest) continue;
        const ai = h.attachments.indexOf(att);
        if (ai !== -1) h.attachments.splice(ai, 1);
        dest.attachments.push(att);
        this.log(`${att.name} をアーカイブするかわりに ${dest.stack[0].name} に付け替えた`);
      }
    }
  }

  /**
   * 「（指定ホロメンが）相手のホロメンをダウンさせた時」のトリガー通知。
   * ダメージ適用時に閾値を超えたら呼ばれる（雪花ラミィSP推しスキル等）。
   */
  _notifySourceDown(sourceHolomem, ownerIdx, downedList = []) {
    if (!sourceHolomem) return;
    for (const mod of this.state.modifiers) {
      if (mod.kind !== 'onSourceDown') continue;
      if (mod.ownerIdx !== ownerIdx) continue;
      if (mod.match && !mod.match(sourceHolomem)) continue;
      mod.onDown?.(this, downedList); // downedList = ダウンしたホロメン配列（アーカイブ前。ゾーン判定可。hBP06-095）
    }
  }

  _setWinner(winnerIdx, reason, loserIdx) {
    const s = this.state;
    s.phase = 'ended';
    s.winner = winnerIdx;
    s.lossReason = reason;
    s.pending = null;
    this.log(`${s.players[loserIdx].name} の敗北（${reason}） — 勝者: ${s.players[winnerIdx].name}`);
  }

  // ============ ヘルパー ============

  /** EffectContext から使うヘルパー */
  _createHolomem(card, turn) {
    return createHolomem(card, turn);
  }

  /** 新しい EffectContext を生成（トリガー効果の入れ子実行用） */
  _effectContext(playerIdx, opts = {}) {
    return new EffectContext(this, playerIdx, opts);
  }

  _shuffle(arr) {
    shuffle(arr, this.rng);
  }

  _autoResolve() {
    // 選択肢が1つだけの強制選択は自動適用（UX簡略化。テストでも便利）
    while (
      this.state.pending &&
      this.state.pending.auto &&
      this.state.pending.options.length === 1
    ) {
      const pending = this.state.pending;
      this.state.pending = null;
      this._execute(pending, pending.options[0]);
    }
  }

  _drawCards(p, n) {
    for (let i = 0; i < n && p.deck.length > 0; i++) {
      p.hand.push(p.deck.shift());
    }
  }

  _stageHolomems(p) {
    return [p.center, p.collab, ...p.back].filter(Boolean);
  }

  _stageCount(p) {
    return this._stageHolomems(p).length;
  }

  _stagePositions(p) {
    const out = [];
    if (p.center) out.push({ zone: 'center', index: 0 });
    if (p.collab) out.push({ zone: 'collab', index: 0 });
    p.back.forEach((_, i) => out.push({ zone: 'back', index: i }));
    return out;
  }

  _holomemAt(p, pos) {
    if (pos.zone === 'center') return p.center;
    if (pos.zone === 'collab') return p.collab;
    return p.back[pos.index];
  }

  _removeHolomem(p, pos) {
    if (pos.zone === 'center') p.center = null;
    else if (pos.zone === 'collab') p.collab = null;
    else p.back.splice(pos.index, 1);
  }

  /** Bloom可否 (8.3.2-8.3.3) */
  _canBloom(h, card) {
    if (!this._bloomNameMatches(topCard(h), card)) return false; // 同名（または別名「としても扱う」）であること
    return this._canBloomIgnoreName(h, card);
  }

  /**
   * Bloom の「同名」判定。エクストラ「このホロメンは〈X〉〈Y〉としても扱う」(card.nameAliases) を考慮し、
   * 互いの名前/別名のいずれかが一致すれば同名扱い（合体ユニット: ラムダック/miComet/SorAZ/FUWAMOCO 等）。
   */
  _bloomNameMatches(baseTop, card) {
    const baseNames = [baseTop.name, ...(baseTop.nameAliases || [])];
    const cardNames = [card.name, ...(card.nameAliases || [])];
    return baseNames.some((n) => cardNames.includes(n));
  }

  /**
   * 同名チェックを除いた Bloom 可否（faceDown/Spot/Bloom不可/ターン制限/HP/レベル遷移）。
   */
  _canBloomIgnoreName(h, card) {
    const s = this.state;
    const top = topCard(h);
    if (h.faceDown) return false;
    if (top.bloomLevel === 'Spot') return false;
    if (top.cannotBloom) return false; // エクストラ「このホロメンはBloomできない」
    if (h.placedTurn === s.turn) return false;       // このターンに出たホロメンは不可
    if (h.bloomedTurn === s.turn) return false;      // このターンにBloom済みは不可
    if (card.hp <= h.damage) return false;           // 新HPがダメージを超えていること（「より大きい」）
    if (card.bloomLevel === '1st') {
      return top.bloomLevel === 'Debut' || top.bloomLevel === '1st';
    }
    if (card.bloomLevel === '2nd') {
      return top.bloomLevel === '1st' || top.bloomLevel === '2nd';
    }
    return false;
  }

  /**
   * リセットステップでコラボ→バック移動するホロメンが「お休みしない」か。
   *   ① ホロメン自身のカード定義 noRestOnReset(holomem, engine, ownerIdx)（hBP03-039）
   *   ② 継続修正 kind:'noRestOnReset'（match で対象判定。ゲーム継続。hBP06-001 SP）
   */
  _holomemSkipsRestOnReset(holomem, ownerIdx) {
    const def = this.registry.get(holomem.stack[0].number);
    if (def?.noRestOnReset && def.noRestOnReset(holomem, this, ownerIdx)) return true;
    for (const m of this.state.modifiers) {
      if (m.kind === 'noRestOnReset' && m.ownerIdx === ownerIdx && (!m.match || m.match(holomem))) return true;
    }
    return false;
  }

  /**
   * このターンに使える「（通常の）推しスキル」の回数上限（通常1）。装着カードの oshiSkillCapBonus で増やせる
   * （「推しスキルの[ターン1回]を[ターン2回]に変更」hBP02-087）。usedOshiSkillThisTurn は使用回数カウント。
   */
  _oshiSkillCap(ownerIdx) {
    let cap = 1;
    const p = this.state.players[ownerIdx];
    if (!p) return cap;
    for (const h of this._stageHolomems(p)) {
      for (const att of h.attachments) {
        cap += this.registry.get(att.number)?.oshiSkillCapBonus?.(h, this, ownerIdx) || 0;
      }
    }
    return cap;
  }

  /** このターンに使えるLIMITEDサポートの枚数上限（通常1。ターン修正 kind:'limitedCapBonus' で増やせる。hBP06-008） */
  _limitedCap(ownerIdx) {
    let cap = 1;
    for (const m of this.state.modifiers) {
      if (m.kind === 'limitedCapBonus' && m.ownerIdx === ownerIdx) cap += (m.amount || 0);
    }
    return cap;
  }

  /** サポート付け上限 (5.17.3): ツール1 / マスコット1（ホロメン1人につき）+ カード固有の制限 */
  _canAttachSupport(h, card) {
    // カード定義に付け先ルールがあれば優先（雪民: 雪花ラミィのみ・何枚でも 等）
    const rule = this.registry.get(card.number)?.attachRule;
    if (rule) {
      if (rule.canAttach && !rule.canAttach(h)) return false;
      if (rule.unlimited) return true;
    }
    if (card.supportType === 'ツール') {
      return !h.attachments.some((a) => a.supportType === 'ツール');
    }
    if (card.supportType === 'マスコット') {
      // 付け先ホロメン固有の受け入れルール（「異なる名前のマスコットを2枚まで」hBP02-013 等）
      const hostRule = this.registry.get(topCard(h).number)?.hostAttachRule;
      if (hostRule?.mascot) return hostRule.mascot(h, card, this);
      return !h.attachments.some((a) => a.supportType === 'マスコット');
    }
    return true; // ファンはカードテキストによる
  }

  /**
   * アーツの必要エールに軽減（「無色-1」「黄-1」等）を適用した実効コストを返す。
   * アーツはエールを消費しない（満たしているかの判定のみ）ため、判定直前に使う。
   */
  _effectiveArtCost(holomem, cost, ownerIdx) {
    let out = this._applyCostReduction([...cost], this.effects.artsCostReduction(holomem, ownerIdx));
    // 必要エールの色をすべて無色にする（装着 attached.artsCostAllColorless。hBP02-098/hBP03-100）。
    // 枚数は維持し、色指定だけ外す（=任意色のエールで支払える）。軽減（枚数減）とは別物。
    if (this._artCostAllColorless(holomem)) out = out.map(() => COLORLESS);
    return out;
  }

  /**
   * このアーツのダメージが「軽減されない」か。発生源は3種:
   *   ① アーツ定義 artDef.damageNotReduced(runCtx, target)（hBP06-027/hBP07-075）
   *   ② 攻撃ホロメンの装着カード attached.artsDamageNotReduced(holomem, engine)（hBP07-103）
   * @param h 攻撃ホロメン  @param artDef アーツ定義  @param runCtx アーツ実行ctx  @param target 対象
   */
  _artDamageNotReduced(h, artDef, runCtx, target) {
    if (artDef?.damageNotReduced && artDef.damageNotReduced(runCtx, target)) return true;
    for (const att of h.attachments) {
      const fn = this.registry.get(att.number)?.attached?.artsDamageNotReduced;
      if (fn && fn(h, this)) return true;
    }
    return false;
  }

  /** 付いている装着カードが「アーツの必要エール色をすべて無色にする」を持つか */
  _artCostAllColorless(holomem) {
    for (const att of holomem.attachments) {
      const fn = this.registry.get(att.number)?.attached?.artsCostAllColorless;
      if (fn && fn(holomem, this)) return true;
    }
    return false;
  }

  /** {色:数} の軽減を適用（正=必要エール減, 負=必要エール増）。コスト配列を返す */
  _applyCostReduction(out, red) {
    for (const [color, amount] of Object.entries(red)) {
      if (amount > 0) {
        for (let i = 0; i < amount; i++) {
          const idx = out.indexOf(color);
          if (idx !== -1) out.splice(idx, 1);
        }
      } else if (amount < 0) {
        for (let i = 0; i < -amount; i++) out.push(color); // 必要エール増加
      }
    }
    return out;
  }

  /** バトンタッチの必要エールに軽減（「無色-2」等）を適用した実効コストを返す */
  _effectiveBatonCost(holomem, cost, ownerIdx) {
    return this._applyCostReduction([...cost], this.effects.batonCostReduction(holomem, ownerIdx));
  }

  /**
   * アーツのコスト支払い判定に使うエールプール = ホロメンの実エール ＋ 装着カードの擬似エール供給。
   * 装着カード定義の attached.cheerSupply(holomem, engine) が [{color}] を返すと、その色のエールを
   * アーツの必要エール充当に「持っているものとして」加える（「この装着を◯エールとしても扱う」用）。
   * アーツはエールを消費しない（充足判定のみ）ので擬似エールは仮想オブジェクトでよく、保存則に影響しない。
   */
  _artCheerPool(h) {
    const pool = [...h.cheers];
    for (const att of h.attachments) {
      const supply = this.registry.get(att.number)?.attached?.cheerSupply;
      if (supply) {
        for (const c of supply(h, this) || []) pool.push({ color: c.color, pseudo: true });
      }
    }
    return pool;
  }

  /**
   * エールでコストを支払えるか (10.5)
   * cost: ['白', '無色', ...]。指定色を先に割り当て、無色は残りから割り当てる
   */
  _canPayCheers(cheers, cost) {
    const pool = cheers.map((c) => c.color);
    const specific = cost.filter((c) => c !== COLORLESS);
    const anyCount = cost.length - specific.length;
    for (const color of specific) {
      const i = pool.indexOf(color);
      if (i === -1) return false;
      pool.splice(i, 1);
    }
    return pool.length >= anyCount;
  }

  /**
   * アーツのコストを支払えるか。推しステージスキルのエール色エイリアス
   * （例 FUWAMOCO: 〈フワワ〉〈モココ〉の赤エールを青としても扱う）を反映する。
   * 各エールは「使える色の集合」を持ち、指定色を貪欲に割り当て→残りで無色を満たす。
   */
  _canPayArtCost(h, cost, ownerIdx) {
    const oshiStage = this._oshiStage(ownerIdx);
    const sets = this._artCheerPool(h).map((cheer) => {
      const colors = new Set([cheer.color]);
      if (oshiStage?.cheerColorAlias) {
        for (const c of oshiStage.cheerColorAlias(h, cheer, this, ownerIdx) || []) colors.add(c);
      }
      return colors;
    });
    const specific = cost.filter((c) => c !== COLORLESS);
    const anyCount = cost.length - specific.length;
    const used = new Array(sets.length).fill(false);
    for (const color of specific) {
      let ok = false;
      for (let i = 0; i < sets.length; i++) {
        if (!used[i] && sets[i].has(color)) { used[i] = true; ok = true; break; }
      }
      if (!ok) return false;
    }
    return used.filter((u) => !u).length >= anyCount;
  }

}
