/**
 * エリザベス・ローズ・ブラッドフレイム (hBP07-049) 赤・2nd・HP210（#EN #Justice #歌）
 *
 * [アーツ]「不撓のコンチェルタート」(130+ / 特攻 黄+50):
 *   自分のライフが4以下なら、このアーツ+30。自分のライフが2以下なら、かわりに、このアーツ+60。
 *   → arts.dmgBonus で実装。ライフ2以下は「かわりに」なので +60（+30と加算しない）。【実装済み】
 *
 * [キーワード/ギフト]「絢爛のアインザッツ」:
 *   [センター・コラボポジション限定]自分のホロメンが相手のホロメンをダウンさせた時、自分のホロメン1人を選ぶ。
 *   このターンの間、選んだホロメン1人のアーツに必要な無色-2。
 *   → 【部分実装】
 *     本来は「自分のホロメン（誰でも）が相手をダウンさせた時」に発火するが、エンジンの onOpponentDown は
 *     ダウンさせたホロメン自身にしか発火しない（他ホロメンのダウンを監視する「任意ホロメンのダウン監視」機構が
 *     エンジンに存在しない）。そのため、ここでは「このカード自身（センター/コラボ位置）が相手をダウンさせた時」のみ
 *     発火する形で実装する。別のホロメンがダウンさせた場合は未対応（保留）。
 *     position 限定 [センター・コラボ] は sourceHolememPos().zone で確認する。
 */
export default {
  number: 'hBP07-049',
  arts: {
    '不撓のコンチェルタート': {
      dmgBonus(ctx) {
        const life = ctx.player.life.length;
        if (life <= 2) return 60; // 「かわりに」+60（+30とは加算しない）
        if (life <= 4) return 30;
        return 0;
      },
    },
  },
  triggers: {
    // ※「自分のホロメンが相手をダウンさせた時」のうち、このカード自身がダウンさせた場合のみ発火（部分実装）
    *onOpponentDown(ctx) {
      const zone = ctx.sourceHolomemPos()?.zone;
      if (zone !== 'center' && zone !== 'collab') return; // [センター・コラボポジション限定]
      const target = yield ctx.chooseHolomem({
        side: 'self',
        title: 'このターン アーツ必要無色-2 する自分のホロメンを選択',
      });
      if (!target) return;
      const chosen = target.holomem;
      ctx.addTurnModifier({
        kind: 'artCostReduce', color: '無色', amount: 2, ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターン、${chosen.stack[0].name} のアーツ必要無色-2`,
      });
    },
  },
};
