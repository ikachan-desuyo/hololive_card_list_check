/**
 * ネリッサ・レイヴンクロフト (hSD12-012) 紫・Debut・HP140（#EN #Advent #歌 #トリ）
 * アーツ「綾なす想いは、儚きブルー」(80) [必要エール: 紫+無色×3]:
 *   自分のライフが3以下なら、このアーツに必要な無色-2。
 *
 * 実装メモ:
 *   このカードのアーツは1種のみなので、「このアーツに必要な無色-2」は
 *   artsCostReduceAura（このホロメン自身のアーツ必要エール軽減オーラ）で表現する。
 *   src === target（＝このホロメン自身のアーツ）かつ 持ち主のライフ3以下のときだけ
 *   無色-2 を返す。ライフが回復して4以上に戻れば自動的に軽減も消える（常時計算）。
 */
export default {
  number: 'hSD12-012',
  artsCostReduceAura(src, target, engine) {
    if (src !== target) return []; // このホロメン自身のアーツのみが対象
    const ownerIdx = engine.state.players.findIndex(
      (p) => engine._stageHolomems(p).includes(src),
    );
    if (ownerIdx < 0) return [];
    const life = engine.state.players[ownerIdx].life.length;
    if (life > 3) return []; // 「3以下」=3を含む
    return [{ color: '無色', amount: 2 }];
  },
};
