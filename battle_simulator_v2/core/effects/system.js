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
    return total;
  }

  /**
   * 対象ホロメンが「受けるダメージ」の増減（5.22.3 軽減 / 装着カードによる増減）。
   * 負の値=軽減、正の値=増加。アーツダメージ・特殊ダメージ両方に適用する。
   * @param holomem 受け手のホロメン
   * @param zone 受け手の位置（'center'|'collab'|'back'）。ゾーン条件付き効果用
   */
  damageReceivedDelta(holomem, zone) {
    let total = 0;
    for (const { attached } of this._attachedDefs(holomem)) {
      total += attached.damageDelta?.(holomem, zone, this.engine) || 0;
    }
    return total;
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
    return total;
  }

  /** ターン終了時: 「ターンの終わりまで」の修正を消滅させる (7.7.4) */
  expireTurnModifiers() {
    const before = this.engine.state.modifiers.length;
    this.engine.state.modifiers = this.engine.state.modifiers.filter((m) => m.duration !== 'turn');
    if (before !== this.engine.state.modifiers.length) {
      this.engine.log('ターン中の継続効果が消滅した');
    }
  }
}
