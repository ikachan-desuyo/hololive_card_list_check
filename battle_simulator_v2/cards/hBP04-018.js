/**
 * ラオーラ・パンテーラ (hBP04-018) 白・1st・HP140（#EN #Justice #ケモミミ #絵）
 * ブルームエフェクト「神眼の描き手」:
 *   このターンの間、自分のステージの#絵を持つホロメン1人のアーツ+20。
 *
 * 解釈:
 *  - 「ホロメン1人」=自分のステージから #絵 を持つホロメン1人を選び、そのホロメンのみアーツ+20。
 *    （match で選んだホロメンに限定。グローバル付与ではない）
 *  - 候補がいなければ何もしない。
 *
 * アーツ「情報収集はお手の物」(50) はテキスト効果なし（エンジンが素点処理）。
 */
export default {
  number: 'hBP04-018',
  bloomEffect: {
    name: '神眼の描き手',
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.hasTag(e.top, '絵'),
        title: 'このターン アーツ+20 する #絵 を持つホロメンを選択',
      });
      if (!entry) return;
      const chosen = entry.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 20, ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターンの間、${chosen.stack[0].name} のアーツ+20`,
      });
    },
  },
};
