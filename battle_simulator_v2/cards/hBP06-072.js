/**
 * 夏色まつり (hBP06-072) #1期生
 * ギフト「勝てると思った？」: このホロメンが相手の1stホロメンから受けるアーツダメージ-30。
 *   → 自己ギフト。auraDamageDelta で src===target（自分自身）かつ kind==='arts' かつ
 *     攻撃元(attacker)が1stホロメンの時に -30。
 * アーツ「ざんね～ん」: テキスト効果なし。
 */
export default {
  number: 'hBP06-072',
  auraDamageDelta(src, target, zone, engine, kind, attacker) {
    if (src !== target) return 0;          // このホロメン自身が受けるダメージのみ
    if (kind !== 'arts') return 0;          // アーツダメージのみ
    if (!attacker || attacker.stack[0]?.bloomLevel !== '1st') return 0; // 相手の1stから
    return -30;
  },
};
