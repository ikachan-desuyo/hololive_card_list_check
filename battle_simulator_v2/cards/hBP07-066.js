/**
 * AZKi (hBP07-066) 紫・1st・HP170（#JP #0期生 #歌）
 * コラボエフェクト「仮想世界の伴走する歌姫」:
 *   自分のホロメン1人のHP30回復。その後、自分のステージのホロメン1人を選ぶ。
 *   このターンの間、選んだホロメンのアーツ+10。
 * アーツ「音楽と歌うことが大好き！」(40): 追加効果なし（素のダメージのみ）。
 */
export default {
  number: 'hBP07-066',
  collabEffect: {
    name: '仮想世界の伴走する歌姫',
    *run(ctx) {
      // 自分のホロメン1人のHP30回復
      const healTarget = yield ctx.chooseHolomem({
        side: 'self',
        title: 'HP30回復するホロメンを選択',
      });
      if (healTarget) {
        ctx.heal(healTarget.holomem, 30);
      }
      // その後、自分のステージのホロメン1人を選ぶ。このターンの間、そのホロメンのアーツ+10。
      const buffTarget = yield ctx.chooseHolomem({
        side: 'self',
        title: 'このターン アーツ+10するホロメンを選択',
      });
      if (!buffTarget) return;
      const chosen = buffTarget.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 10,
        ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターン、${chosen.stack[0].name} のアーツ+10`,
      });
    },
  },
};
