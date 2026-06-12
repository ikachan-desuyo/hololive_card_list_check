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
 */

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
        return this._chooseCheerTarget(engine, options);
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

  /** エールの送り先: アーツのコストが「あと少しで払える」アタッカーを優先 */
  _chooseCheerTarget(engine, options) {
    const p = this._player(engine);
    let best = options[0];
    let bestScore = -Infinity;
    for (const opt of options) {
      const h = engine._holomemAt(p, opt.pos);
      if (!h) continue;
      let score = 0;
      const top = h.stack[0];
      // センター/コラボ（アタッカー）優先
      if (opt.pos.zone === 'center') score += 30;
      else if (opt.pos.zone === 'collab') score += 20;
      // 未達のアーツコストに近づくなら加点
      for (const art of top.arts || []) {
        if (!engine._canPayCheers(h.cheers, art.cost)) {
          const missing = art.cost.length - h.cheers.length;
          if (missing > 0) score += Math.max(0, 25 - missing * 5);
          score += art.dmg * 0.1;
        }
      }
      // 既に全アーツが撃てるなら過剰投資を避ける
      if ((top.arts || []).every((a) => engine._canPayCheers(h.cheers, a.cost))) score -= 15;
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
        case 'bloom':
          // Bloomは基本的に常に得（HP・火力向上）
          score = 60 + this._holomenValue(p.hand[opt.handIndex]) * 0.1;
          break;
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
          const def = engine.registry.get(card.number)?.support;
          if (!def) break; // 効果未実装のサポートは温存
          score = 20;
          // ドロー系は手札が少ないほど価値が高い
          if (p.hand.length <= 4) score += 20;
          else if (p.hand.length >= 8) score -= 10;
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
        case 'oshiSkill':
          score = 18; // 実装済みスキルのみ提示される前提
          break;
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
