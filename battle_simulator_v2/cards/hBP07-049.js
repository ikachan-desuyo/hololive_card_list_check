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
 *   → triggers.onAnyDown（任意ホロメンのダウン監視）で実装。エリザベスがセンター/コラボにいて、
 *     自分のターンに相手のホロメンがダウンした時（=自分のホロメンがダウンさせた時）に、
 *     自分のホロメン1人を選び、このターンの間アーツ必要無色-2のターン修正を付与する。
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
    // ギフト「絢爛のアインザッツ」: [センター・コラボ限定]自分のホロメンが相手をダウンさせた時、自分のホロメン1人のアーツ必要無色-2
    *onAnyDown(ctx) {
      const zone = ctx.sourceHolomemPos()?.zone;
      if (zone !== 'center' && zone !== 'collab') return; // [センター・コラボポジション限定]（このエリザベス）
      if (ctx.state.turnPlayer !== ctx.playerIdx) return; // 自分のターン（=自分のホロメンが相手をダウンさせた）
      const di = ctx.downedInfo;
      if (!di || di.ownerIdx === ctx.playerIdx) return;   // ダウンしたのが相手のホロメン
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
