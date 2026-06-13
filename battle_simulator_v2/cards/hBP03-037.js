/**
 * モココ・アビスガード (hBP03-037) 赤・Debut・HP80（#EN #Advent #ケモミミ）
 * アーツ「フワワじゃないよ、モココだよ」(20, 必要エール: 無色1):
 *   このアーツは、自分のセンターホロメンが〈フワワ・アビスガード〉の時、
 *   エール1枚を必要とせずに使える。
 *   → このホロメンのアーツはこの1種のみのため、自身対象の artsCostReduceAura（無色-1）で表現。
 *     条件: 持ち主のセンターホロメンの名前が「フワワ・アビスガード」であること。
 *     （〈〉表記＝カード名指定なので名前一致で判定）
 */
export default {
  number: 'hBP03-037',
  arts: {
    'フワワじゃないよ、モココだよ': {
      // dmgは固定20（増減なし）。コスト軽減のみ。
    },
  },
  // 自分のセンターホロメンが〈フワワ・アビスガード〉なら、このホロメンのアーツ必要無色-1。
  artsCostReduceAura(src, target, engine) {
    if (src !== target) return [];
    const owner = engine.state.players.find((p) => engine._stageHolomems(p).includes(src));
    const center = owner?.center;
    if (center && center.stack?.[0]?.name === 'フワワ・アビスガード') {
      return [{ color: '無色', amount: 1 }];
    }
    return [];
  },
};
