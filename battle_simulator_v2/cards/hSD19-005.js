/**
 * 大空スバル (hSD19-005) 黄・Debut・HP100（#JP,#2期生,#トリ）
 * ギフト「ダンスレッスンなんですｹｰﾄﾞ」:
 *   このホロメンが相手のセンターホロメンから受けるダメージ-10。
 *   → 自己アウラ（auraDamageDelta）。自分(スバル)が受けるダメージで、
 *     攻撃元が相手のセンターポジションのホロメンである時に-10。位置制限なし（どこにいても有効）。
 *     攻撃元はアーツ攻撃時のみ確定するため attacker 条件で判定（attacker が相手センターか _zoneOf で確認）。
 * アーツ「いっちにー、ホワッ、ホワッ！」(20): テキスト効果なし。
 */
export default {
  number: 'hSD19-005',
  auraDamageDelta(src, target, zone, engine, kind, attacker) {
    if (src !== target) return 0;                          // 自分自身のみ（自己ギフト）
    if (!attacker) return 0;                               // 攻撃元が判明している時のみ（＝アーツ）
    if (engine._zoneOf(attacker) !== 'center') return 0;   // 相手のセンターホロメンから受けるダメージのみ
    return -10;
  },
};
