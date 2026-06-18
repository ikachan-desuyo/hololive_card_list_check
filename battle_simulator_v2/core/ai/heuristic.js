/**
 * ヒューリスティックAI（Phase 1）
 *
 * エンジンの決定ポイントに対して、人間と同じ選択肢APIから手を選ぶ。
 *
 * 公平性の設計原則: AIは「そのプレイヤーから見える情報」だけを使う。
 *   見てよい: 自分の手札・両者のステージ/アーカイブ/ライフ枚数/山札枚数・公開中カード
 *   見てはいけない: 相手の手札の中身・山札の中身と順序・エールデッキの順序
 * （エンジンの state には全情報があるため、このファイル内で自制する）
 *
 * TODO(Phase 2): 相手の公開カードからのデッキタイプ推測、1手先読み
 *
 * 評価の物差しは core/ai/evaluate.js（盤面評価・脅威/リーサル見積り）に集約。
 * 各決定ロジックは段階的にこの共通評価へ寄せていく。
 */

import { evaluateState, maxArtDmg } from './evaluate.js';

export class HeuristicAI {
  constructor(playerIdx) {
    this.playerIdx = playerIdx;
    this.mainActionsThisTurn = 0;
    this.lastTurnSeen = 0;
  }

  /** 現在の決定ポイントに対する選択肢IDを返す */
  choose(engine) {
    const s = engine.state;
    const pending = s.pending;
    if (!pending) return null;
    const options = pending.options;

    // ターンが変わったらメインステップの行動カウンタをリセット
    if (s.turn !== this.lastTurnSeen) {
      this.lastTurnSeen = s.turn;
      this.mainActionsThisTurn = 0;
    }

    switch (pending.type) {
      case 'stepPause':
        return 'ok';
      case 'redraw':
        return this._chooseRedraw(engine);
      case 'placementCenter':
        return this._bestByCard(engine, options, (c) => this._holomenValue(c));
      case 'placementPenalty':
        return this._bestByCard(engine, options, (c) => -this._cardKeepValue(c));
      case 'placementBack':
        return this._choosePlacementBack(engine, options);
      case 'chooseCenter':
        return this._chooseCenter(engine, options);
      case 'attachCheer':
      case 'attachLifeCheer':
        return this._chooseCheerTarget(engine, pending);
      case 'main':
        return this._chooseMainAction(engine, options);
      case 'performance':
        return this._choosePerformance(engine, options);
      case 'effectChoice':
        return this._chooseEffect(engine, pending);
      default:
        return options[0].id;
    }
  }

  // ============ 個別の判断 ============

  _player(engine) { return engine.state.players[this.playerIdx]; }
  _opp(engine) { return engine.state.players[1 - this.playerIdx]; }

  _chooseRedraw(engine) {
    const hand = this._player(engine).hand;
    const debuts = hand.filter((c) => c.kind === 'holomen' && c.bloomLevel === 'Debut');
    // Debutが1枚以下なら引き直す（盤面が作れないリスクが高い）
    return debuts.length <= 1 ? 'yes' : 'no';
  }

  /** ホロメンの基礎評価: HPとアーツ火力 */
  _holomenValue(card) {
    if (!card || card.kind !== 'holomen') return 0;
    const maxDmg = Math.max(0, ...(card.arts || []).map((a) => a.dmg));
    return (card.hp || 0) + maxDmg * 0.5;
  }

  /** 手札に残す価値（ペナルティで戻す時は低い順に捨てる） */
  _cardKeepValue(card) {
    if (card.kind === 'holomen') {
      return card.bloomLevel === 'Debut' ? 50 : 35; // Bloom素材も大事
    }
    if (card.kind === 'support') return 25;
    return 10;
  }

  _bestByCard(engine, options, scoreFn) {
    const p = this._player(engine);
    let best = options[0];
    let bestScore = -Infinity;
    for (const opt of options) {
      if (opt.handIndex == null) continue;
      const score = scoreFn(p.hand[opt.handIndex]);
      if (score > bestScore) {
        bestScore = score;
        best = opt;
      }
    }
    return best.id;
  }

  _choosePlacementBack(engine, options) {
    // Debut/Spotは基本すべて出す（ステージ全滅負けの回避が最優先）
    const placeable = options.filter((o) => o.id !== 'done');
    if (placeable.length === 0) return 'done';
    return this._bestByCard(engine, placeable, (c) => this._holomenValue(c));
  }

  _chooseCenter(engine, options) {
    const p = this._player(engine);
    let best = options[0];
    let bestScore = -Infinity;
    for (const opt of options) {
      const h = p.back[opt.backIndex];
      if (!h) continue;
      const score = this._holomenValue(h.stack[0]) + engine.effectiveHp(h) - h.damage;
      if (score > bestScore) {
        bestScore = score;
        best = opt;
      }
    }
    return best.id;
  }

  /**
   * エールの送り先。
   * このエールを付けることで「実際に前進する」相手を選ぶ:
   *   - 新たにアーツが撃てるようになる > 最大コストにまだ届いていない > その他
   *   - 既に最大コストのアーツが撃てるホロメンへの過剰投資は強く減点
   */
  _chooseCheerTarget(engine, pending) {
    const p = this._player(engine);
    const cheer = pending.cheer;
    const options = pending.options;
    let best = options[0];
    let bestScore = -Infinity;
    for (const opt of options) {
      const h = engine._holomemAt(p, opt.pos);
      if (!h) continue;
      const top = h.stack[0];
      const arts = top.arts || [];
      let score = 0;
      // 配置場所の基礎点（アタッカー優先）
      if (opt.pos.zone === 'center') score += 12;
      else if (opt.pos.zone === 'collab') score += 8;

      if (arts.length > 0 && cheer) {
        const payableBefore = arts.filter((a) => engine._canPayCheers(h.cheers, a.cost));
        const afterCheers = [...h.cheers, cheer];
        const payableAfter = arts.filter((a) => engine._canPayCheers(afterCheers, a.cost));
        const maxCost = Math.max(...arts.map((a) => a.cost.length));
        if (payableAfter.length > payableBefore.length) {
          // このエールで新たにアーツが解放される
          const unlocked = payableAfter.filter((a) => !payableBefore.includes(a));
          score += 40 + Math.max(...unlocked.map((a) => a.dmg)) * 0.2;
        } else if (h.cheers.length < maxCost) {
          // まだ最大コストに枚数が足りない → 前進
          score += 18;
        } else {
          // 最大コスト分すでに持っている → 過剰投資
          score -= 30;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        best = opt;
      }
    }
    return best.id;
  }

  /** メインステップ: 各行動をスコアリングして最良を選ぶ。十分な手が無ければパス */
  _chooseMainAction(engine, options) {
    // 無限ループ防止（1ターンの行動上限）
    if (this.mainActionsThisTurn >= 25) {
      this.mainActionsThisTurn = 0;
      return 'pass';
    }
    const p = this._player(engine);
    let best = null;
    let bestScore = 0; // パスのスコア=0。正のスコアの行動だけ実行
    for (const opt of options) {
      let score = 0;
      switch (opt.kind) {
        case 'bloom': {
          // Bloomは「実際に得るもの」で評価する。
          // 同等カードへのBloom（HP・火力・効果すべて変化なし）はスコア0でスキップされる
          const newCard = p.hand[opt.handIndex];
          const h = engine._holomemAt(p, opt.pos);
          if (!newCard || !h) break;
          const top = h.stack[0];
          const hpGain = (newCard.hp || 0) - (top.hp || 0);
          const dmgGain = this._maxArtDmg(newCard) - this._maxArtDmg(top);
          score = hpGain * 0.4 + dmgGain * 0.5;
          if (engine.registry.get(newCard.number)?.bloomEffect) score += 40;
          // ダメージを負っているホロメンのHP上限を上げて延命する価値
          if (h.damage > 0 && hpGain > 0) score += 10;
          break;
        }
        case 'place': {
          const stageCount = engine._stageCount(p);
          score = stageCount < 3 ? 50 : stageCount < 5 ? 25 : 8;
          break;
        }
        case 'collab': {
          const h = p.back[opt.backIndex];
          if (!h) break;
          score = 22; // ホロパワーが増えるだけでも価値あり
          const top = h.stack[0];
          // コラボエフェクト持ちは加点
          if (engine.registry.get(top.number)?.collabEffect) score += 18;
          // アーツが撃てる状態なら加点（コラボはアタッカーになれる）
          if ((top.arts || []).some((a) => engine._canPayCheers(h.cheers, a.cost))) score += 15;
          break;
        }
        case 'support': {
          const card = p.hand[opt.handIndex];
          if (!engine.registry.get(card.number)?.support) break; // 効果未実装のサポートは温存
          score = this._supportValue(engine, p, card);
          break;
        }
        case 'supportAttach': {
          const card = p.hand[opt.handIndex];
          const h = engine._holomemAt(p, opt.pos);
          if (!h) break;
          const def = engine.registry.get(card.number);
          score = 12;
          // 装着で実際に修正が乗る相手なら加点（だいふく→ラミィ等）
          if (def?.attached?.hpPlus?.(h, engine) > 0) score += 15;
          if (def?.attached?.artsPlus?.(h, engine) > 0) score += 10;
          if (def?.attached?.specialDmgPlus) score += 12;
          // アタッカー（センター/コラボ）優先
          if (opt.pos.zone === 'center' || opt.pos.zone === 'collab') score += 6;
          break;
        }
        case 'baton': {
          // センターが瀕死で、バックの方が強ければ交代
          if (!p.center) break;
          const centerRemain = engine.effectiveHp(p.center) - p.center.damage;
          const back = p.back[opt.backIndex];
          if (!back) break;
          const backRemain = engine.effectiveHp(back) - back.damage;
          if (centerRemain <= 40 && backRemain > centerRemain + 30) score = 35;
          break;
        }
        case 'oshiSkill': {
          // ルール上は対象不在でも推しスキルを宣言できる（コスト空振り）。
          // 効果が無い（skillDef.aiSkip が true）スキルはAIは選ばない＝無駄なコスト消費を避ける。
          const skill = p.oshi.oshiSkills?.[opt.skillIndex];
          const odef = engine.registry.get(p.oshi.number);
          const skillDef = skill?.sp ? odef?.spOshiSkill : odef?.oshiSkill;
          if (skillDef?.aiSkip && skillDef.aiSkip(engine, engine.state.players.indexOf(p))) break;
          score = 18; // 実装済みスキルのみ提示される前提
          break;
        }
        default:
          break;
      }
      if (score > bestScore) {
        bestScore = score;
        best = opt;
      }
    }
    if (best) {
      this.mainActionsThisTurn++;
      return best.id;
    }
    this.mainActionsThisTurn = 0;
    return 'pass';
  }

  _maxArtDmg(card) {
    return maxArtDmg(card); // 共通評価（evaluate.js）の定義に集約
  }

  /** 現在の盤面評価（idx 視点）。Phase 2 以降で各決定の物差しに使う */
  _stateValue(engine) {
    return evaluateState(engine, this.playerIdx).total;
  }

  /**
   * サポートカードの価値評価。
   * 重要: カード固有の知識をこのファイルに書かないこと（実装対象は874種ある）。
   *   1. カード定義（cards/<番号>.js）の ai.supportValue があればそれを使う
   *   2. なければカードテキストのパターンから汎用評価
   */
  _supportValue(engine, p, card) {
    const def = engine.registry.get(card.number);
    if (def?.ai?.supportValue) {
      return def.ai.supportValue({ engine, player: p, card });
    }
    return this._genericSupportValue(engine, p, card);
  }

  /** テキストパターンによる汎用評価（ai定義の無いカード向けフォールバック） */
  _genericSupportValue(engine, p, card) {
    const text = card.supportText || '';
    let score = 12;
    if (/[\d１２３４５６７８９]枚引/.test(text)) {
      score = 24 + Math.max(0, 6 - p.hand.length) * 3; // ドロー系: 手札が少ないほど価値増
    }
    if (/デッキから/.test(text) && /(手札に加える|公開し)/.test(text)) {
      score = Math.max(score, 26); // サーチ系
    }
    if (/ステージに出す/.test(text)) {
      score = Math.max(score, engine._stageCount(p) < 4 ? 30 : 8); // 展開系
    }
    if (/交代/.test(text)) {
      score = Math.max(score, 16); // 妨害・配置換え系
    }
    return score;
  }

  /** パフォーマンス: 倒せる相手を最優先、次に最大ダメージ */
  _choosePerformance(engine, options) {
    const p = this._player(engine);
    const opp = this._opp(engine);
    let best = null;
    let bestScore = 0;
    for (const opt of options) {
      if (opt.kind !== 'art') continue;
      const h = p[opt.zone];
      const target = opp[opt.target.zone];
      if (!h || !target) continue;
      const card = h.stack[0];
      const art = card.arts[opt.artIndex];
      // 期待ダメージ = 基本値 + 特攻 + 装着/継続修正（カード固有の条件ボーナスは概算で無視）
      let dmg = art.dmg;
      const targetTop = target.stack[0];
      for (const tk of art.tokkou || []) {
        if (targetTop.color === tk.color) dmg += tk.value;
      }
      dmg += engine.effects.artsBonus(h, this.playerIdx);
      const remain = engine.effectiveHp(target) - target.damage;
      let score = dmg * 0.2;
      if (dmg >= remain) {
        score += 100; // 倒せる
        if (opt.target.zone === 'center') score += 10;
        // 相手ライフが少ないほど価値増（勝ちに近づく）
        score += (6 - opp.life.length) * 5;
      } else {
        if (opt.target.zone === 'center') score += 5;
      }
      if (score > bestScore) {
        bestScore = score;
        best = opt;
      }
    }
    return best ? best.id : 'pass';
  }

  /** カード効果内の選択: 種類ごとの汎用ヒューリスティック */
  _chooseEffect(engine, pending) {
    const options = pending.options;
    const request = pending.request;
    const kind = request?.kind;

    if (kind === 'confirm') {
      return 'yes'; // 任意効果は基本発動（コスト考慮はPhase 2）
    }

    if (kind === 'chooseHolomem') {
      let best = options[0];
      let bestScore = -Infinity;
      for (const opt of options) {
        if (!opt.value) { // 「選ばない」
          if (bestScore > 0) continue;
          continue;
        }
        const { holomem, pos } = opt.value;
        let score = 0;
        if (opt.side === 'opp') {
          // 相手対象（ダメージ等）: 残りHPが少ない順 → 倒しきりやすい
          const remain = engine.effectiveHp(holomem) - holomem.damage;
          score = 100 - remain * 0.3;
          if (pos.zone === 'center') score += 8;
        } else {
          // 自分対象（エール送り・回復等）: アタッカー優先、ダメージが多いものを回復
          if (pos.zone === 'center') score += 25;
          else if (pos.zone === 'collab') score += 18;
          score += holomem.damage * 0.1;
        }
        if (score > bestScore) {
          bestScore = score;
          best = opt;
        }
      }
      return best.id;
    }

    if (kind === 'chooseCard') {
      // ホロメンなら評価値、それ以外は最初の候補。skipはカードが無い時のみ
      let best = null;
      let bestScore = -Infinity;
      for (const opt of options) {
        if (!opt.card) continue;
        const score = opt.card.kind === 'holomen' ? this._holomenValue(opt.card) : 20;
        if (score > bestScore) {
          bestScore = score;
          best = opt;
        }
      }
      return (best || options[0]).id;
    }

    return options[0].id;
  }
}
