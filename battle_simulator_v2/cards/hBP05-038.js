/**
 * モココ・アビスガード (hBP05-038) 赤・1st・HP160（#EN #Advent #ケモミミ）
 *
 * ギフト「モココェ」:
 *   [コラボポジション限定]自分のSP推しスキル「BAU BAU!」を使った時、このターンの間、
 *   このホロメンのアーツ+70。自分のステージに2ndホロメンがいるなら、さらに、
 *   このターンの間、このホロメンのアーツ+50。
 *   → 保留: 「自分の特定名のSP推しスキルを使った時」に味方ホロメンのギフトを誘発する
 *     フックがエンジンに存在しないため未実装。SP推しスキル「BAU BAU!」(別の推しカード)
 *     使用時に、コラボ位置のこのホロメンへ artsPlus +70（＋2ndホロメンがいれば+50）の
 *     ターン修正を付与する処理は、その推しスキル側もしくは専用フック追加が必要。
 *
 * アーツ「ノーーーーーーエ！」(30):
 *   このアーツは、自分のセンターホロメンが〈フワワ・アビスガード〉なら、
 *   エール1枚を必要とせずに使える。
 *   → このアーツの必要エールは[any]1個＝無色1。センターが〈フワワ・アビスガード〉のとき、
 *     自身対象の artsCostReduceAura で無色-1（実質コスト0）にして再現する。
 *     （このカードのアーツはこの1種のみのため self 限定オーラで厳密。
 *      ダメージは固定30で増減なし。）
 */
export default {
  number: 'hBP05-038',

  arts: {
    'ノーーーーーーエ！': {
      // dmg は固定30（増減なし）。コスト軽減のみ（artsCostReduceAura で表現）。
    },
  },

  // このカードのアーツ「ノーーーーーーエ！」(必要エール 無色1) は、
  // 自分のセンターホロメンが〈フワワ・アビスガード〉なら必要エール 無色-1（=0）。
  artsCostReduceAura(src, target, engine) {
    if (src !== target) return [];
    const owner = engine.state.players.find((p) => engine._stageHolomems(p).includes(src));
    if (!owner) return [];
    const center = owner.center;
    if (center && center.stack[0]?.name === 'フワワ・アビスガード') {
      return [{ color: '無色', amount: 1 }];
    }
    return [];
  },
};
