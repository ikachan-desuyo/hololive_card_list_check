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
    supportsPlayedThisTurn: [], // このターンに使ったサポートのカード名一覧
    downedCardsLastOppTurn: [], // 直前の相手ターンにダウンした自分のホロメンのカード一覧
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

  /**
   * アーツの対象指定 { zone, index } から実際のホロメンを取り出す。
   * center/collab は単体、back は配列なので index で引く（対象拡張カード hBP07-086 等で back を対象にできる）。
   */
  _targetHolomem(playerObj, target) {
    if (!target) return null;
    if (target.zone === 'back') return playerObj.back[target.index] || null;
    return playerObj[target.zone] || null;
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
   * 受け手の「受けるダメージ」修正を適用した最終ダメージ（0未満にはしない）。
   * @param attacker 攻撃元ホロメン（「相手の1stから受けるアーツ-30」のような攻撃元条件用。無ければnull）
   */
  _applyDamageReceived(targetHolomem, dmg, kind = 'arts', attacker = null) {
    const delta = this.effects.damageReceivedDelta(targetHolomem, this._zoneOf(targetHolomem), kind, attacker);
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
    if (!effectDef?.run) {
      after();
      return;
    }
    // ctxOpts.ctx で外から ctx を渡せる（アーツのボーナス蓄積を受け取るため等）
    const ctx = ctxOpts.ctx || new EffectContext(this, ctxOpts.playerIdx, ctxOpts);
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
    // 強制のカード選択で候補が1枚だけなら自動で確定（確定クリックの手間を省く）
    if (request.kind === 'chooseCard' && options.length === 1 && options[0].card) {
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
    p.usedSupportThisTurn = false;
    p.usedCollabThisTurn = false;
    p.usedBatonTouchThisTurn = false;
    p.cheerArchivedThisTurn = false; // このターンに自分のステージのエールをアーカイブしたか（hBP07-088 等）
    p.supportsPlayedThisTurn = []; // このターンに使ったサポートのカード名一覧（「〈限界飯〉を使っていたなら」等）
    // 「直前の相手のターンに自分のホロメンがダウンしていたなら」用。
    // このターン(idx)の間に相手(1-idx)のホロメンがダウンしたら蓄積し、相手の次の自ターンで参照される。
    // idxのターン開始時に相手側のリストをクリアして、このターン中の相手ホロメンのダウンを新規に貯める。
    s.players[1 - playerIdx].downedCardsLastOppTurn = [];
    // 推しスキルの[ターンに1回]は両プレイヤーともリセットする
    // （「相手のターンでダウンした時に使える」等、相手ターン中に使うスキルがあるため）
    for (const pl of s.players) pl.usedOshiSkillThisTurn = false;
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
      for (const h of this._stageHolomems(p)) {
        if (h.skipNextReset) { h.skipNextReset = false; continue; } // お休みのまま、次回からは通常通り
        h.rested = false;
      }
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
      const skillDef = skill.sp ? oshiDef?.spOshiSkill : oshiDef?.oshiSkill;
      if (!skillDef) return;
      if (skillDef.canUse && !skillDef.canUse(this, idx)) return;
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
    // 「相手のパフォーマンスステップに自分のライフが減っていたら」判定用に開始時ライフを記録
    s.lifeAtPerfStart = [s.players[0].life.length, s.players[1].life.length];
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

    // 指定ホロメンの指定アーツについて、対象ごとのアーツアクションを actions に積む（通常／再アーツ共通）
    const pushArtActions = (h, zone, art, ai, isReArts) => {
      const card = topCard(h);
      const cost = this._effectiveArtCost(h, art.cost, s.turnPlayer);
      // アーツ使用時のみ、装着カードの「擬似エール供給」（◆〈ときのそら〉に付いていたら白エール扱い 等）を支払いプールに加味
      if (!this._canPayCheers(this._artCheerPool(h), cost)) return;
      const artDef = this.registry.getArt(card.number, art.name);
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
      // カード定義による対象制限（「このアーツは相手のセンターホロメンしか対象にできない」等）
      const allowedTargets = artDef?.targetZones
        ? usableTargets.filter((t) => artDef.targetZones.includes(t.zone))
        : usableTargets;
      for (const t of allowedTargets) {
        const tName = topCard(this._targetHolomem(opp, t)).name;
        const zoneLabel = t.zone === 'center' ? 'センター' : t.zone === 'collab' ? 'コラボ' : 'バック';
        actions.push({
          id: `art${isReArts ? 're' : ''}_${zone}_${ai}_${t.zone}_${t.index}`,
          label: `${card.name}「${art.name}」(${art.dmg}${art.dmgPlus ? '+' : ''})${isReArts ? '【再アーツ】' : ''} → 相手${zoneLabel} ${tName}`,
          kind: 'art', zone, artIndex: ai, target: t, reArts: isReArts || undefined,
        });
      }
    };

    for (const zone of ['center', 'collab']) {
      const h = p[zone];
      if (!h || h.rested) continue;
      if (!s.perfUsed[zone]) {
        // 通常のアーツ使用 (9.2.1.2-5)
        topCard(h).arts.forEach((art, ai) => pushArtActions(h, zone, art, ai, false));
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
          const runNext = (i) => {
            if (i >= runners.length) { finish(); return; }
            this._runEffect(
              { run: runners[i].run },
              { playerIdx: s.turnPlayer, sourceCard: runners[i].src, sourceHolomem: h },
              () => runNext(i + 1),
            );
          };
          runNext(0);
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
        const def = this.registry.get(topCard(h).number);
        if (def?.collabEffect) {
          this.log(`《コラボエフェクト》${def.collabEffect.name}`);
          runners.push({ run: def.collabEffect.run, srcCard: topCard(h), srcH: h });
        } else {
          const kw = topCard(h).keywords.find((k) => k.subtype === 'コラボエフェクト');
          if (kw) this.log(`TODO(効果未実装) コラボエフェクト「${kw.name}」: ${kw.text}`);
        }
        for (const pos of this._stagePositions(p)) {
          const wh = this._holomemAt(p, pos);
          if (wh === h) continue;
          const wtrig = this.registry.get(topCard(wh).number)?.triggers?.onCollab;
          if (wtrig) runners.push({ run: wtrig, srcCard: topCard(wh), srcH: wh });
        }
        if (runners.length > 0) {
          const runNext = (i) => {
            if (i >= runners.length) { finish(); return; }
            this._runEffect(
              { run: runners[i].run },
              { playerIdx: s.turnPlayer, sourceCard: runners[i].srcCard, sourceHolomem: runners[i].srcH },
              () => runNext(i + 1),
            );
          };
          runNext(0);
          return;
        }
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
        // 推しスキル解決後に「推しスキルを使った時」の味方ホロメンギフトを誘発（hBP05-038/050 等）
        const afterSkill = () => this._dispatchOshiSkillUsed(s.turnPlayer, skill, finish);
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
        if (card.limited) p.usedLimitedThisTurn = true;
        p.usedSupportThisTurn = true;
        p.supportsPlayedThisTurn.push(card);
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
        p.usedSupportThisTurn = true;
        p.supportsPlayedThisTurn.push(card);
        const h = this._holomemAt(p, action.pos);
        h.attachments.push(card);
        this.log(`${p.name}: ${card.name}〔${card.supportType}〕を ${topCard(h).name} に付けた`);
        // 装着時トリガー（「（手札/アーカイブから）付けた時」）。こよりの助手くん等
        const trig = this.registry.get(card.number)?.triggers?.onAttach;
        if (trig) {
          this._runEffect({ run: trig }, { playerIdx: s.turnPlayer, sourceCard: card, sourceHolomem: h }, finish);
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
    const art = card.arts[action.artIndex];

    s.perfUsed[action.zone] = true;
    h.lastArtUsedIndex = action.artIndex; // 再アーツ（同じアーツをもう1回）判定用に記録
    // 再アーツでの使用なら、対応する「もう1回」修正を消費する (hBP07-008)
    if (action.reArts) {
      const reMod = s.modifiers.find(
        (m) => m.kind === 'reArts' && !m.used && m.ownerIdx === s.turnPlayer && m.match?.(h));
      if (reMod) reMod.used = true;
    }
    this.log(`${card.name} のアーツ「${art.name}」！${action.reArts ? '（再アーツ）' : ''}`);

    const artDef = this.registry.getArt(card.number, art.name);
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
        const tZone = this._zoneOf(t);
        let dmg = baseDmg;
        // 特攻: 対象の色が一致するなら加算 (12.3.4.3)
        for (const tk of art.tokkou || []) {
          if (tCard.color === tk.color) {
            dmg += tk.value;
            this.log(`特攻発動！ ${tk.color}+${tk.value}`);
          }
        }
        // 受け手の「受けるダメージ」修正（軽減/増加）(5.22.3)。常時アウラ/装着分まで反映
        dmg = this._applyDamageReceived(t, dmg, 'arts', h);
        // 防御側の被ダメージ推しスキル割り込み（対象ごと）
        this._offerDamageOshiSkill(t, dmg, (finalDmg) => {
          // (kind='arts')
          t.damage += finalDmg;
          totalDealt += finalDmg;
          if (finalDmg > 0) dealtList.push({ target: t, zone: tZone, dealt: finalDmg });
          this.log(
            `「${art.name}」→ ${tCard.name} に ${finalDmg}ダメージ（累計${t.damage}/${this.effectiveHp(t)}）`
          );
          if (t.damage >= this.effectiveHp(t)) downed.push(t);
          after2();
        });
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
          this._notifySourceDown(h, s.turnPlayer); // 継続効果(ターン修正)の同期通知（ラミィSP等）
          const cardTrig = this.registry.get(selfCard.number)?.triggers?.onOpponentDown;
          for (let d = 0; d < downed.length; d++) { // ダウン体数ぶん（通常は1体）
            if (cardTrig) runners.push({ run: cardTrig, srcCard: selfCard });
            if (artDef?.onDownDealt) runners.push({ run: artDef.onDownDealt, srcCard: selfCard });
          }
          // 装着カードの「ホストが相手をダウンさせた時」トリガー（hBP02-096 等）
          for (const att of h.attachments) {
            const at = this.registry.get(att.number)?.triggers?.onOpponentDown;
            if (at) runners.push({ run: at, srcCard: att });
          }
        }
        const onArts = this.registry.get(selfCard.number)?.triggers?.onArtsUse;
        if (onArts) runners.push({ run: onArts, srcCard: selfCard });
        // 装着カードの「ホストがアーツを使った時」トリガー（hBP01-119 等。ctx.sourceHolomem=ホスト, sourceCard=装着）
        for (const att of h.attachments) {
          const at = this.registry.get(att.number)?.triggers?.onArtsUse;
          if (at) runners.push({ run: at, srcCard: att });
        }
        // 「このアーツで（相手に）ダメージを与えた時」（実際に与えた合計ダメージ量を渡す。ライフスティール等）
        if (artDef?.onDamageDealt && totalDealt > 0) {
          const dealt = totalDealt;
          runners.push({ run: function* onDamageDealtWrap(c) { yield* artDef.onDamageDealt(c, dealt); }, srcCard: selfCard });
        }
        if (runners.length > 0) {
          const runNext = (i) => {
            if (i >= runners.length) { cont(); return; }
            this._runEffect(
              { run: runners[i].run },
              { playerIdx: s.turnPlayer, sourceCard: runners[i].srcCard, sourceHolomem: h },
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
      // ホロメンの全カードと付いているカードをアーカイブ (11.3.1.2 / 4.4.7)
      p.archive.push(...h.stack, ...h.cheers, ...h.attachments);
      this._removeHolomem(p, pos);
      // ライフダメージ: 通常1、Buzzは2 (2.11.2.2)。
      // 「ダウンしてもライフは減らない」特殊ダメージでダウンした場合は0
      if (h.noLifeOnDown) {
        this.log(`${p.name} のライフは減らない（効果による）`);
      } else {
        // 「減るライフ-N」（onDown効果で h.lifeReductionOnDown を立てる）を反映
        const lifeDmg = Math.max(0, (card.buzz ? 2 : 1) - (h.lifeReductionOnDown || 0));
        p.lifeDamage += lifeDmg;
        this.log(`${p.name} はライフダメージ${lifeDmg}を受けた`);
      }
      next();
    };

    // ダウンしたホロメン自身の「ダウンした時」トリガー (13.4 ギフト等)。
    // アーカイブ前に実行する（エールやスタックの付け替え・回収が間に合うように）。
    // 「相手のターンで～」等の条件は各カードの run() 内で ctx.state.turnPlayer を見て判定する。
    const runDownTrigger = () => {
      const downedInfo = { holomem: h, card, ownerIdx, zone: pos.zone };
      const runners = [];
      // 1) ダウンしたホロメン自身＋付いている装着カード（ファン等）の onDown。sourceHolomem はダウンしたホロメン。
      for (const c of [card, ...h.attachments]) {
        const trig = this.registry.get(c.number)?.triggers?.onDown;
        if (trig) runners.push({ run: trig, opts: { playerIdx: ownerIdx, sourceCard: c, sourceHolomem: h } });
      }
      // 2) 場の全ホロメン（両者）＋装着の onAnyDown（ダウンしたホロメン自身は除く）。downedInfo を渡す。
      for (let pi = 0; pi < 2; pi++) {
        const pl = this.state.players[pi];
        for (const wpos of this._stagePositions(pl)) {
          const wh = this._holomemAt(pl, wpos);
          if (wh === h) continue;
          for (const c of [topCard(wh), ...wh.attachments]) {
            const atrig = this.registry.get(c.number)?.triggers?.onAnyDown;
            if (atrig) runners.push({ run: atrig, opts: { playerIdx: pi, sourceCard: c, sourceHolomem: wh, downedInfo } });
          }
        }
      }
      const runNext = (i) => {
        if (i >= runners.length) { finish(); return; }
        this._runEffect({ run: runners[i].run }, runners[i].opts, () => runNext(i + 1));
      };
      runNext(0);
    };

    // 「（ホロメンが）ダウンした時に使える」推しスキル (11.3.1.1 / 12.1.5.2)
    // 例: 雪花ラミィ「愛してる」— ダウンしたホロメンのファンを手札に戻す
    const skillDef = this.registry.get(p.oshi.number)?.onDownOshiSkill;
    if (skillDef?.canUse?.(this, ownerIdx, h)) {
      this.state.pending = {
        type: 'effectChoice',
        player: ownerIdx,
        request: { kind: 'confirm', title: skillDef.title || '推しスキルを使いますか？' },
        options: [
          { id: 'yes', label: `推しスキルを使う（ホロパワー-${skillDef.cost}）`, value: true },
          { id: 'no', label: '使わない', value: false },
        ],
        resume: (use) => {
          if (use) skillDef.apply(this, ownerIdx, h);
          runDownTrigger();
        },
      };
      return;
    }

    runDownTrigger();
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
      const used = skill.sp ? p.usedSpOshiSkillThisGame : p.usedOshiSkillThisTurn;
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
          else p.usedOshiSkillThisTurn = true;
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

    // ① 推しスキル（「受ける時に使える推しスキル：ダメージ-N」）
    const skill = this.registry.get(defender.oshi.number)?.onDamageOshiSkill;
    if (skill) {
      out.push({ build: (curDmg) => {
        const used = skill.sp ? defender.usedSpOshiSkillThisGame : defender.usedOshiSkillThisTurn;
        if (used || defender.holoPower.length < skill.cost) return null;
        if (skill.canUse && !skill.canUse(this, defIdx, target, curDmg)) return null;
        return {
          title: skill.title || '推しスキルを使いますか？（受けるダメージ軽減）',
          yesLabel: `${skill.sp ? 'SP' : ''}推しスキルを使う（ホロパワー-${skill.cost}）`,
          apply: (d) => {
            defender.archive.push(...defender.holoPower.splice(0, skill.cost));
            if (skill.sp) defender.usedSpOshiSkillThisGame = true;
            else defender.usedOshiSkillThisTurn = true;
            const red = skill.reduce ? (skill.reduce(this, defIdx, target, d) || 0) : 0;
            const fin = Math.max(0, d - red);
            this.log(`${defender.name}: 推しスキルで受けるダメージ ${d} → ${fin}（-${red}）`);
            return fin;
          },
        };
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
  _offerDamageOshiSkill(targetHolomem, dmg, after, kind = 'arts') {
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
      this.state.pending = {
        type: 'effectChoice',
        player: defIdx,
        request: { kind: 'confirm', title: r.title },
        options: [
          { id: 'yes', label: r.yesLabel, value: true },
          { id: 'no', label: '使わない', value: false },
        ],
        resume: (use) => run(i + 1, use ? r.apply(curDmg) : curDmg),
      };
      this.onChange();
    };
    run(0, dmg);
  }

  /**
   * 「（指定ホロメンが）相手のホロメンをダウンさせた時」のトリガー通知。
   * ダメージ適用時に閾値を超えたら呼ばれる（雪花ラミィSP推しスキル等）。
   */
  _notifySourceDown(sourceHolomem, ownerIdx) {
    if (!sourceHolomem) return;
    for (const mod of this.state.modifiers) {
      if (mod.kind !== 'onSourceDown') continue;
      if (mod.ownerIdx !== ownerIdx) continue;
      if (mod.match && !mod.match(sourceHolomem)) continue;
      mod.onDown?.(this);
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
   * アーツの必要エールに軽減（「無色-1」「黄-1」等）を適用した実効コストを返す。
   * アーツはエールを消費しない（満たしているかの判定のみ）ため、判定直前に使う。
   */
  _effectiveArtCost(holomem, cost, ownerIdx) {
    return this._applyCostReduction([...cost], this.effects.artsCostReduction(holomem, ownerIdx));
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

}
