/**
 * ゲームエンジン（DOM非依存）
 *
 * 設計: 「決定ポイント」方式のステートマシン。
 *   - エンジンはプレイヤーの入力が必要になるまで自動で進行し、state.pending に
 *     「誰が・何を・どの選択肢から選ぶか」を置いて停止する
 *   - UI/テスト/CPU は engine.actions() で選択肢を取得し、engine.apply(actionId) で適用する
 *   - 乱数はシード可能（テストの再現性）。Math.random は使わない
 *
 * ルールの根拠は battle_simulator/docs/RULES_SPEC.md（条番号は総合ルール ver.1.9.0）。
 * カード個別効果（キーワード能力・サポート効果・推しスキル効果）は未実装で、
 * 発動タイミングで TODO ログを出す（効果システムは次フェーズ）。
 */

import { COLORLESS, STAGE_LIMIT, MULLIGAN_LIMIT, INITIAL_HAND, STEP_NAMES, LOSS_REASONS } from './constants.js';
import { CardKind } from './cards.js';
import { createRng, shuffle } from './rng.js';
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
    usedLimitedThisTurn: false,
    usedCollabThisTurn: false,
    usedBatonTouchThisTurn: false,
    usedOshiSkillThisTurn: false,
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
      firstPlayer: opts.firstPlayer ?? (this.rng() < 0.5 ? 0 : 1),
      turnPlayer: 0,
      turn: 0,                 // 全体のターン番号（1始まり）
      step: null,
      pending: null,           // 決定ポイント { type, player, options[], auto }
      winner: null,            // 0 | 1 | 'draw'
      lossReason: null,
      logs: [],
      modifiers: [],           // ターン中などの継続修正（EffectSystem が管理）
      perfUsed: { center: false, collab: false }, // このパフォーマンスステップでアーツ使用済みか (9.2.1.3-5)
    };
    this._setupQueue = [];
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
    const first = s.firstPlayer;
    this.log(`先攻: ${s.players[first].name}`);
    for (const p of s.players) {
      shuffle(p.deck, this.rng);
      shuffle(p.cheerDeck, this.rng);
      this._drawCards(p, INITIAL_HAND);
    }
    // セットアップの決定キュー: 引き直き(先攻→後攻) → マリガン(自動) → 配置(先攻→後攻)
    this._setupQueue = [
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
    this._advanceSetup();
    this.onChange();
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

  // ============ 効果の実行（ジェネレータランナー） ============

  /**
   * 効果（ジェネレータ）を実行する。yield された選択要求は決定ポイントに変換し、
   * 選択後に再開する。完了したら after() を呼ぶ。
   */
  _runEffect(effectDef, ctxOpts, after) {
    if (!effectDef?.run) {
      after();
      return;
    }
    const ctx = new EffectContext(this, ctxOpts.playerIdx, ctxOpts);
    let gen;
    try {
      gen = effectDef.run(ctx);
    } catch (e) {
      this.log(`⚠️ 効果の開始に失敗: ${e.message}`);
      after();
      return;
    }
    this._stepEffect(gen, undefined, after);
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
    const options = request.buildOptions();
    if (options.length === 0 || (options.length === 1 && options[0].id === 'skip')) {
      // 選択肢なし（または「選ばない」のみ）→ null で再開
      this._stepEffect(gen, null, after);
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
    p.usedLimitedThisTurn = false;
    p.usedCollabThisTurn = false;
    p.usedBatonTouchThisTurn = false;
    p.usedOshiSkillThisTurn = false;
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
      // 7.2.2: 全てアクティブに
      for (const h of this._stageHolomems(p)) h.rested = false;
      // 7.2.3: コラボ → バックへ移動してお休み
      if (p.collab) {
        p.collab.rested = true;
        p.back.push(p.collab);
        p.collab = null;
        this.log(`${p.name}: コラボのホロメンをバックに移動（お休み）`);
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
      if (skill.sp ? p.usedSpOshiSkillThisGame : p.usedOshiSkillThisTurn) return;
      if (skill.cost === 'X') return; // X コストは未対応（TODO: 効果システムと同時に対応）
      // 「～時に使える」系はメインステップでは使えない (12.1.5)
      if (/[すし]た?時に使える/.test(skill.text)) return;
      if (p.holoPower.length < skill.cost) return;
      if (!(skill.sp ? oshiDef?.spOshiSkill : oshiDef?.oshiSkill)) return;
      actions.push({
        id: `oshi_${i}`,
        label: `${skill.sp ? 'SP' : ''}推しスキル発動（ホロパワー-${skill.cost}）`,
        kind: 'oshiSkill', skillIndex: i,
      });
    });

    // 8.6 サポートカードのプレイ
    p.hand.forEach((c, i) => {
      if (c.kind !== CardKind.SUPPORT) return;
      // LIMITED: ターン1枚、先攻の1ターン目は不可 (8.6.2)
      if (c.limited && (p.usedLimitedThisTurn || (s.turn === 1 && idx === s.firstPlayer))) return;
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

    // 8.7 バトンタッチ（ターン1回、センター&バック両方アクティブ、エールコスト）
    if (!p.usedBatonTouchThisTurn && p.center && !p.center.rested) {
      const cost = topCard(p.center).batonTouch || [];
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
    this.log(`【${STEP_NAMES.performance}】`);
    this._queuePerformancePending();
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
    const targets = [];
    if (opp.center) targets.push({ zone: 'center', index: 0 });
    if (opp.collab) targets.push({ zone: 'collab', index: 0 });

    for (const zone of ['center', 'collab']) {
      const h = p[zone];
      if (!h || s.perfUsed[zone] || h.rested) continue; // 9.2.1.2-5
      const card = topCard(h);
      card.arts.forEach((art, ai) => {
        if (!this._canPayCheers(h.cheers, art.cost)) return;
        for (const t of targets) {
          const tName = topCard(opp[t.zone]).name;
          actions.push({
            id: `art_${zone}_${ai}_${t.zone}`,
            label: `${card.name}「${art.name}」(${art.dmg}${art.dmgPlus ? '+' : ''}) → 相手${t.zone === 'center' ? 'センター' : 'コラボ'} ${tName}`,
            kind: 'art', zone, artIndex: ai, target: t,
          });
        }
      });
    }

    actions.push({ id: 'pass', label: 'エンドステップへ', kind: 'pass' });
    return actions;
  }

  _endStep() {
    const s = this.state;
    const p = s.players[s.turnPlayer];
    s.step = 'end';
    this.log(`【${STEP_NAMES.end}】`);
    // 7.7.4: 「ターンの終わりまで」効果の消滅
    this.effects.expireTurnModifiers();
    // TODO(効果システム): 「ターンの終わりに」誘発 (7.7.3)
    // 7.7.5: センター補充（バックが空ならコラボがいても空のまま）
    this._queueCenterRefill(p, () => {
      this._startTurn(1 - s.turnPlayer);
    });
  }

  // ============ アクションの実行 ============

  _execute(pending, action) {
    const s = this.state;
    switch (pending.type) {
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
        p.back.push(createHolomem(card, s.turn));
        this.log(`${p.name}: ${card.name} をバックに出した`);
        break;
      }
      case 'bloom': {
        const card = p.hand.splice(action.handIndex, 1)[0];
        const h = this._holomemAt(p, action.pos);
        h.stack.unshift(card); // 上に重ねる (5.14)
        h.bloomedTurn = s.turn;
        this.log(`${p.name}: ${h.stack[1].name} → ${card.name}〔${card.bloomLevel}〕にBloom`);
        // ブルームエフェクト (13.3)
        const def = this.registry.get(card.number);
        if (def?.bloomEffect) {
          this.log(`《ブルームエフェクト》${def.bloomEffect.name}`);
          this._runEffect(def.bloomEffect, { playerIdx: s.turnPlayer, sourceCard: card, sourceHolomem: h }, finish);
          return;
        }
        const kw = card.keywords.find((k) => k.subtype === 'ブルームエフェクト');
        if (kw) this.log(`TODO(効果未実装) ブルームエフェクト「${kw.name}」: ${kw.text}`);
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
        // コラボエフェクト (13.2)
        const def = this.registry.get(topCard(h).number);
        if (def?.collabEffect) {
          this.log(`《コラボエフェクト》${def.collabEffect.name}`);
          this._runEffect(def.collabEffect, { playerIdx: s.turnPlayer, sourceCard: topCard(h), sourceHolomem: h }, finish);
          return;
        }
        const kw = topCard(h).keywords.find((k) => k.subtype === 'コラボエフェクト');
        if (kw) this.log(`TODO(効果未実装) コラボエフェクト「${kw.name}」: ${kw.text}`);
        break;
      }
      case 'oshiSkill': {
        const skill = p.oshi.oshiSkills[action.skillIndex];
        p.archive.push(...p.holoPower.splice(0, skill.cost));
        if (skill.sp) p.usedSpOshiSkillThisGame = true;
        else p.usedOshiSkillThisTurn = true;
        this.log(`${p.name}: ${skill.sp ? 'SP' : ''}推しスキル発動（ホロパワー-${skill.cost}）`);
        const def = this.registry.get(p.oshi.number);
        const skillDef = skill.sp ? def?.spOshiSkill : def?.oshiSkill;
        if (skillDef) {
          this._runEffect(skillDef, { playerIdx: s.turnPlayer, sourceCard: p.oshi }, finish);
          return;
        }
        this.log(`TODO(効果未実装) 推しスキル: ${skill.text}`);
        break;
      }
      case 'support': {
        const card = p.hand.splice(action.handIndex, 1)[0];
        if (card.limited) p.usedLimitedThisTurn = true;
        this.log(`${p.name}: サポート ${card.name} を使用`);
        const def = this.registry.get(card.number);
        if (def?.support) {
          // 解決中は解決領域(4.16)に置き、解決後にアーカイブ (10.7.2.5.1.1)
          p.revealed.push(card);
          this._runEffect(def.support, { playerIdx: s.turnPlayer, sourceCard: card }, () => {
            p.revealed.splice(p.revealed.indexOf(card), 1);
            p.archive.push(card);
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
        if (card.limited) p.usedLimitedThisTurn = true;
        const h = this._holomemAt(p, action.pos);
        h.attachments.push(card);
        this.log(`${p.name}: ${card.name}〔${card.supportType}〕を ${topCard(h).name} に付けた`);
        break;
      }
      case 'baton': {
        const cost = topCard(p.center).batonTouch || [];
        this._payCheers(p, p.center, cost);
        const back = p.back.splice(action.backIndex, 1)[0];
        p.back.push(p.center);
        p.center = back;
        p.usedBatonTouchThisTurn = true;
        this.log(`${p.name}: バトンタッチ（${topCard(back).name} がセンターへ）`);
        break;
      }
    }
    finish();
  }

  _executePerformanceAction(action) {
    const s = this.state;
    if (action.kind === 'pass') {
      this._endStep();
      return;
    }
    const p = s.players[s.turnPlayer];
    const opp = s.players[1 - s.turnPlayer];
    const h = p[action.zone];
    const card = topCard(h);
    const art = card.arts[action.artIndex];

    s.perfUsed[action.zone] = true;
    this.log(`${card.name} のアーツ「${art.name}」！`);

    const artDef = this.registry.getArt(card.number, art.name);
    const ctxOpts = { playerIdx: s.turnPlayer, sourceCard: card, sourceHolomem: h };

    // アーツ解決パイプライン（RULES_SPEC §12 / 12.3.4）
    // 段階4: テキスト効果 → 段階5: 特攻 → 段階6: 数値決定 → 段階7: ダメージ適用
    const resolveDamage = () => {
      const target = opp[action.target.zone];
      if (!target) {
        // テキスト効果で対象が場を離れた場合、ダメージは適用されない
        this.log('対象がいなくなったため、アーツダメージは発生しなかった');
        this._checkTiming(() => this._queuePerformancePending());
        return;
      }
      const targetCard = topCard(target);
      let dmg = art.dmg;
      // 条件付き「このアーツ+N」（カード定義の dmgBonus）
      if (artDef?.dmgBonus) {
        const ctx = new EffectContext(this, s.turnPlayer, ctxOpts);
        const bonus = artDef.dmgBonus(ctx) || 0;
        if (bonus > 0) {
          dmg += bonus;
          this.log(`アーツ効果: +${bonus}`);
        }
      }
      // 特攻: 対象の色が一致するなら加算 (12.3.4.3)
      for (const tk of art.tokkou || []) {
        if (targetCard.color === tk.color) {
          dmg += tk.value;
          this.log(`特攻発動！ ${tk.color}+${tk.value}`);
        }
      }
      // その他の修正: 装着カード（マスコット等）・ターン中の継続効果 (12.3.4.4)
      const mod = this.effects.artsBonus(h, s.turnPlayer);
      if (mod !== 0) {
        dmg += mod;
        this.log(`継続効果・装着カードの修正: ${mod > 0 ? '+' : ''}${mod}`);
      }
      target.damage += dmg;
      this.log(
        `「${art.name}」→ ${targetCard.name} に ${dmg}ダメージ` +
        `（累計${target.damage}/${this.effectiveHp(target)}）`
      );
      // 9.1.2: アーツ1回ごとにチェックタイミング
      this._checkTiming(() => this._queuePerformancePending());
    };

    if (artDef?.run) {
      this._runEffect(artDef, ctxOpts, resolveDamage);
    } else {
      if (art.text) this.log(`TODO(効果未実装) アーツ効果: ${art.text}`);
      resolveDamage();
    }
  }

  // ============ チェックタイミング (10.6 / 11章) ============

  /**
   * ルール処理ループ: ダウン処理 → 敗北判定 → ライフダメージ処理。
   * ライフダメージ処理はプレイヤーの選択（送り先）を要するため、
   * 決定ポイントを挟んで resume で再入する。
   * TODO(効果システム): 自動能力の待機・プレイをこのループに統合する (10.6.3)
   */
  _checkTiming(resume) {
    const s = this.state;
    if (s.phase === 'ended') return;

    // 1) ダウン処理 (11.3): ターンプレイヤー側から。HPは装着・継続効果込みの実効値
    let downsProcessed = true;
    while (downsProcessed) {
      downsProcessed = false;
      for (const idx of [s.turnPlayer, 1 - s.turnPlayer]) {
        const p = s.players[idx];
        const downed = this._stagePositions(p).find((pos) => {
          const h = this._holomemAt(p, pos);
          return h.damage >= this.effectiveHp(h);
        });
        if (downed) {
          this._processDown(p, downed);
          downsProcessed = true;
          break;
        }
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
  }

  /** ダウン処理 (11.3) */
  _processDown(p, pos) {
    const h = this._holomemAt(p, pos);
    const card = topCard(h);
    this.log(`${card.name} がダウン！`);
    // TODO(効果システム): 「ダウンした時/ダウンさせた時」能力 (11.3.1.1)
    // ホロメンの全カードと付いているカードをアーカイブ (11.3.1.2 / 4.4.7)
    p.archive.push(...h.stack, ...h.cheers, ...h.attachments);
    this._removeHolomem(p, pos);
    // ライフダメージ: 通常1、Buzzは2 (2.11.2.2)。
    // 「ダウンしてもライフは減らない」特殊ダメージでダウンした場合は0
    if (h.noLifeOnDown) {
      this.log(`${p.name} のライフは減らない（効果による）`);
      return;
    }
    const lifeDmg = card.buzz ? 2 : 1;
    p.lifeDamage += lifeDmg;
    this.log(`${p.name} はライフダメージ${lifeDmg}を受けた`);
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
    const s = this.state;
    const top = topCard(h);
    if (h.faceDown) return false;
    if (top.bloomLevel === 'Spot') return false;
    if (h.placedTurn === s.turn) return false;       // このターンに出たホロメンは不可
    if (h.bloomedTurn === s.turn) return false;      // このターンにBloom済みは不可
    if (top.name !== card.name) return false;        // 同名であること
    if (card.hp <= h.damage) return false;           // 新HPがダメージを超えていること（「より大きい」）
    if (card.bloomLevel === '1st') {
      return top.bloomLevel === 'Debut' || top.bloomLevel === '1st';
    }
    if (card.bloomLevel === '2nd') {
      return top.bloomLevel === '1st' || top.bloomLevel === '2nd';
    }
    return false;
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
      return !h.attachments.some((a) => a.supportType === 'マスコット');
    }
    return true; // ファンはカードテキストによる
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

  /** コスト分のエールをアーカイブ（バトンタッチ 8.7.2 等）。指定色優先で自動選択 */
  _payCheers(p, h, cost) {
    for (const color of cost) {
      let i = color === COLORLESS ? 0 : h.cheers.findIndex((c) => c.color === color);
      if (i === -1) i = 0;
      const cheer = h.cheers.splice(i, 1)[0];
      if (cheer) p.archive.push(cheer);
    }
  }
}
