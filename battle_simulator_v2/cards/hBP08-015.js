/**
 * ときのそら (hBP08-015) 白・Debut・HP120（#0期生,#歌）
 * ギフト「私に勝てるかな？」: このホロメンが相手のホロメンから受けるアーツダメージ-10。
 *   → 自己ギフト。auraDamageDelta で src===target（自分自身）かつ kind==='arts'（アーツダメージのみ）の時 -10。
 *     アーツダメージは攻撃元(attacker＝相手のホロメン)が確定するので、attacker 存在で「相手のホロメンから」を担保する。
 * アーツ「ナインダーツ」(20): テキスト効果なし。
 * 保留: なし
 */
export default {
  number: 'hBP08-015',
  auraDamageDelta(src, target, zone, engine, kind, attacker) {
    if (src !== target) return 0; // このホロメン自身が受けるダメージのみ
    if (kind !== 'arts') return 0; // アーツダメージのみ
    if (!attacker) return 0; // 相手のホロメンから受けるアーツ（攻撃元確定時のみ）
    return -10;
  },
};
