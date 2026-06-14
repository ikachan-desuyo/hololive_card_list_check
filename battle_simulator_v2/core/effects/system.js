/**
 * 継続効果・修正値の計算
 *
 * 2系統で管理する:
 *  1. 装着カード（マスコット/ファン/ツール）の常時修正
 *     → カード定義の attached.* から毎回動的に計算（付け外しと常に同期、後始末不要）
 *  2. ターン中の一時修正（「このターンの間～」）
 *     → state.modifiers に積み、エンドステップで expire する (7.7.4)
 */

export class EffectSystem {
  constructor(engine, registry) {
    this.engine = engine;
    this.registry = registry;
  }

  /**
   * 継続修正の数値を解決する。amount は数値、または「評価時に再計算する関数」を許可する
   * （「このターンの間、選んだホロメンのエール1枚につき+10」のように対象の状態で変わる修正用）。
   * 関数は (holomem, engine) を受け取り数値を返す。
   */
  _resolveAmount(mod, holomem) {
    return typeof mod.amount === 'function'
      ? (mod.amount(holomem, this.engine) || 0)
      : (mod.amount || 0);
  }

  /** 装着カードの定義一覧 */
  _attachedDefs(holomem) {
    const out = [];
    for (const att of holomem.attachments) {
      const def = this.registry.get(att.number);
      if (def?.attached) out.push({ card: att, attached: def.attached });
    }
    return out;
  }

  /**
   * 常時アウラの合計。ownerIdx 側のステージ上の各ホロメンの効果定義から、fn が返す数値を合算する。
   * fn(def, sourceHolomem) => number。
   * 「自分の#0期生全員のアーツ+30」「自分のコラボが受けるダメージ-10」のように、
   * 別のホロメンを恒常的に強化/保護するギフトを表現する（def.auraArtsPlus 等で宣言）。
   */
  _auraSum(ownerIdx, fn) {
    let total = 0;
    const p = this.engine.state.players[ownerIdx];
    if (!p) return 0;
    for (const src of this.engine._stageHolomems(p)) {
      const def = this.registry.get(src.stack[0].number);
      if (def) total += fn(def, src) || 0;
    }
    return total;
  }

  /** holomem の持ち主インデックス（ステージ上に無ければ -1） */
  _ownerOf(holomem) {
    return this.engine.state.players.findIndex(
      (p) => this.engine._stageHolomems(p).includes(holomem));
  }

  /** アーツ+N の合計（装着 + ターン修正） */
  artsBonus(holomem, ownerIdx) {
    let total = 0;
    for (const { attached } of this._attachedDefs(holomem)) {
      total += attached.artsPlus?.(holomem, this.engine) || 0;
    }
    for (const mod of this.engine.state.modifiers) {
      if (mod.kind !== 'artsPlus') continue;
      if (mod.ownerIdx !== ownerIdx) continue;
      if (mod.match && !mod.match(holomem)) continue;
      total += this._resolveAmount(mod, holomem);
    }
    // 常時アウラ（味方の別ホロメンが付与するアーツ+N）
    total += this._auraSum(ownerIdx, (def, src) => def.auraArtsPlus?.(src, holomem, this.engine));
    return total;
  }

  /** HP+N の合計 */
  hpBonus(holomem, ownerIdx) {
    let total = 0;
    for (const { attached } of this._attachedDefs(holomem)) {
      total += attached.hpPlus?.(holomem, this.engine) || 0;
    }
    for (const mod of this.engine.state.modifiers) {
      if (mod.kind !== 'hpPlus') continue;
      if (mod.match && !mod.match(holomem)) continue;
      total += this._resolveAmount(mod, holomem);
    }
    total += this._auraSum(ownerIdx, (def, src) => def.auraHpPlus?.(src, holomem, this.engine));
    return total;
  }

  /**
   * 対象ホロメンが「受けるダメージ」の増減（5.22.3 軽減 / 装着カードによる増減）。
   * 負の値=軽減、正の値=増加。アーツダメージ・特殊ダメージ両方に適用する。
   * @param holomem 受け手のホロメン
   * @param zone 受け手の位置（'center'|'collab'|'back'）。ゾーン条件付き効果用
   */
  damageReceivedDelta(holomem, zone, kind = 'arts', attacker = null) {
    let total = 0;
    const ownerIdx0 = this._ownerOf(holomem);
    for (const { attached } of this._attachedDefs(holomem)) {
      total += attached.damageDelta?.(holomem, zone, this.engine, kind, attacker) || 0;
    }
    // ターン中の一時的な被ダメージ修正（「このターン自分のバック全員は特殊ダメージを受けない」hSD13-012 等）
    for (const mod of this.engine.state.modifiers) {
      if (mod.kind !== 'damageReceivedDelta') continue;
      if (mod.used) continue; // 一発消費(once)済みは無視
      if (mod.ownerIdx != null && mod.ownerIdx !== ownerIdx0) continue;
      if (mod.matchKind && mod.matchKind !== kind) continue;
      if (mod.match && !mod.match(holomem, zone, kind)) continue;
      total += this._resolveAmount(mod, holomem);
    }
    // 常時アウラ（味方の別ホロメンが付与する被ダメージ軽減/増加。「コラボが受けるダメージ-10」「特殊ダメージを受けない」
    //  「自分が相手の1stから受けるアーツ-30」＝src===holomem の自己ギフトも auraDamageDelta で表現する）
    const ownerIdx = this._ownerOf(holomem);
    if (ownerIdx >= 0) {
      total += this._auraSum(ownerIdx, (def, src) => def.auraDamageDelta?.(src, holomem, zone, this.engine, kind, attacker));
    }
    return total;
  }

  /**
   * 「最初に受けるダメージだけ」等の一発消費(once)被ダメージ修正を、適用後に使用済みにする。
   * ダメージ適用直後（_applyDamageReceived）に呼ぶ。対象・ゾーン・種別が一致する once 修正を used=true にする。
   */
  consumeOnceDamageReceivedMods(holomem, zone, kind) {
    const ownerIdx0 = this._ownerOf(holomem);
    for (const mod of this.engine.state.modifiers) {
      if (mod.kind !== 'damageReceivedDelta' || !mod.once || mod.used) continue;
      if (mod.ownerIdx != null && mod.ownerIdx !== ownerIdx0) continue;
      if (mod.matchKind && mod.matchKind !== kind) continue;
      if (mod.match && !mod.match(holomem, zone, kind)) continue;
      mod.used = true;
    }
  }

  /** 特殊ダメージ+N の合計（発生源の装着カード + ターン修正） */
  specialDamageBonus(sourceHolomem, targetEntry, ownerIdx) {
    let total = 0;
    for (const { attached } of this._attachedDefs(sourceHolomem)) {
      total += attached.specialDmgPlus?.(sourceHolomem, targetEntry, this.engine) || 0;
    }
    for (const mod of this.engine.state.modifiers) {
      if (mod.kind !== 'specialDmgPlus') continue;
      if (mod.ownerIdx !== ownerIdx) continue;
      if (mod.match && !mod.match(sourceHolomem)) continue;
      total += this._resolveAmount(mod, sourceHolomem);
    }
    // 常時アウラ（味方の別ホロメンが付与する特殊ダメージ+N。「〈おかゆ〉全員が相手センターに与える特殊+20」等）
    total += this._auraSum(ownerIdx, (def, src) => def.auraSpecialDmgPlus?.(src, sourceHolomem, targetEntry, this.engine));
    return total;
  }

  /**
   * アーツの必要エール軽減を集約する。戻り値: { 色: 軽減数 }（例 {'無色':1} / {'黄':1}）。
   * 2系統: ①ステージ上のカードの常時オーラ def.artsCostReduceAura(自分, 対象, engine)
   *         ②ターン修正 kind:'artCostReduce'（「このターン、〜のアーツ必要〜-1」）
   * @param targetHolomem コストを判定するホロメン
   * @param ownerIdx そのホロメンの持ち主
   */
  artsCostReduction(targetHolomem, ownerIdx) {
    const red = {};
    const add = (color, amount) => { red[color] = (red[color] || 0) + amount; };
    const p = this.engine.state.players[ownerIdx];
    for (const src of this.engine._stageHolomems(p)) {
      const def = this.registry.get(src.stack[0].number);
      if (def?.artsCostReduceAura) {
        for (const r of def.artsCostReduceAura(src, targetHolomem, this.engine) || []) add(r.color, r.amount);
      }
    }
    for (const mod of this.engine.state.modifiers) {
      if (mod.kind !== 'artCostReduce' || mod.ownerIdx !== ownerIdx) continue;
      if (mod.match && !mod.match(targetHolomem)) continue;
      add(mod.color, mod.amount);
    }
    // 装着カード（ツール等）による必要エール軽減（「◆Buzzに付いていたら必要無色-1」等）
    for (const att of targetHolomem.attachments) {
      const adef = this.registry.get(att.number);
      for (const r of adef?.artsCostReduceAttached?.(targetHolomem, this.engine) || []) add(r.color, r.amount);
    }
    return red;
  }

  /** バトンタッチの必要エール軽減（ターン修正 kind:'batonCostReduce' ＋ 装着カード）。{色:軽減数} を返す */
  batonCostReduction(holomem, ownerIdx) {
    const red = {};
    for (const mod of this.engine.state.modifiers) {
      if (mod.kind !== 'batonCostReduce' || mod.ownerIdx !== ownerIdx) continue;
      if (mod.match && !mod.match(holomem)) continue;
      red[mod.color] = (red[mod.color] || 0) + mod.amount;
    }
    // 装着カード（ファン等）による常時のバトンタッチ必要エール軽減（ころねすきー等）
    for (const att of holomem.attachments) {
      const adef = this.registry.get(att.number);
      for (const r of adef?.batonCostReduceAttached?.(holomem, this.engine) || []) red[r.color] = (red[r.color] || 0) + r.amount;
    }
    return red;
  }

  /**
   * このホロメンのアーツが「相手のHPが減っているバックホロメンも対象にできる」か。
   * ターン修正 kind:'artTargetDamagedBack'（match でホロメンを限定）で表現する (hBP07-086)。
   */
  artCanTargetDamagedBack(holomem, ownerIdx) {
    return this.hasArtTargetMod('artTargetDamagedBack', holomem, ownerIdx);
  }

  /** 指定 kind のアーツ対象拡張ターン修正を、このホロメンが持っているか（match でホロメン限定可） */
  hasArtTargetMod(kind, holomem, ownerIdx) {
    return this.engine.state.modifiers.some((m) =>
      m.kind === kind && m.ownerIdx === ownerIdx && (!m.match || m.match(holomem)));
  }

  /**
   * 防御側（相手のアーツの対象になる側）の常時アウラによる「相手のアーツが取れる対象ゾーン」の制限。
   * defender のステージ上のカード定義 def.oppArtsTargetRestrict(src, engine) が許可ゾーン配列
   * （例 ['collab']）を返したら、それらの積集合で制限する。無ければ null（無制限）。(hBP05-010 等)
   */
  oppArtsTargetZones(defender, defIdx) {
    let allow = null;
    for (const src of this.engine._stageHolomems(defender)) {
      const def = this.registry.get(src.stack[0].number);
      const zones = def?.oppArtsTargetRestrict?.(src, this.engine, defender);
      if (zones) allow = allow ? allow.filter((z) => zones.includes(z)) : [...zones];
    }
    return allow;
  }

  /**
   * ターン終了時: 「ターンの終わりまで」の修正を消滅させる (7.7.4)。
   * 複数ターンにまたがる修正は mod.untilTurn（このターン番号の終わりまで有効）で表現し、
   * state.turn >= untilTurn になったエンドステップで消滅させる（「次の相手のターン終了まで」等）。
   */
  expireTurnModifiers() {
    const turn = this.engine.state.turn;
    const before = this.engine.state.modifiers.length;
    this.engine.state.modifiers = this.engine.state.modifiers.filter((m) => {
      if (m.untilTurn != null) return turn < m.untilTurn; // 指定ターンの終わりまで残す
      return m.duration !== 'turn';                        // 通常の「このターンの間」
    });
    if (before !== this.engine.state.modifiers.length) {
      this.engine.log('継続効果が消滅した');
    }
  }
}
