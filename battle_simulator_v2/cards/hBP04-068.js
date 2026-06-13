/**
 * 大空スバル (hBP04-068) 黄・Debut・HP100（#JP,#2期生,#トリ）
 * ギフト「大空スバル盛り合わせセット」:
 *   [センターポジション・コラボポジション限定]このホロメンが相手の1stホロメンから受けるダメージ-20。
 *   → 自己アウラ（auraDamageDelta）。自分がセンター/コラボにいる間、攻撃元が相手の1st（bloomLevel==='1st'）の
 *     ホロメンである時に受けるダメージを-20する。攻撃元はアーツ攻撃時のみ確定するため attacker 条件で判定。
 * アーツ「スバルからきみへ！」(20): テキスト効果なし。
 */
export default {
  number: 'hBP04-068',
  auraDamageDelta(src, target, zone, engine, kind, attacker) {
    if (src !== target) return 0;                         // 自分自身のみ（自己ギフト）
    if (zone !== 'center' && zone !== 'collab') return 0; // [センター・コラボ限定]
    if (!attacker) return 0;                              // 攻撃元が判明している時のみ（＝アーツ）
    if (attacker.stack?.[0]?.bloomLevel !== '1st') return 0; // 相手の1stホロメンから受けるダメージのみ
    return -20;
  },
};
