/**
 * エリザベス・ローズ・ブラッドフレイム 1st (hSD13-006) 赤・HP150（#EN #Justice #歌）
 * ブルームエフェクト「Bring It On!」:
 *   自分のステージの#Justiceを持つホロメン1人を選ぶ。
 *   このターンの間、選んだホロメンのアーツ+20。
 * アーツ「守護るべきもの」(30): テキスト効果なし（素点のみ）。
 */
export default {
  number: 'hSD13-006',
  bloomEffect: {
    name: 'Bring It On!',
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.hasTag(e.top, 'Justice'),
        title: 'このターン アーツ+20する #Justice ホロメンを選択',
      });
      if (!target) return;
      const chosen = target.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 20,
        ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターン、${chosen.stack[0].name} のアーツ+20`,
      });
    },
  },
};
