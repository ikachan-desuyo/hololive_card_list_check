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
      total += mod.amount;
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
      total += mod.amount;
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
      total += mod.amount;
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
