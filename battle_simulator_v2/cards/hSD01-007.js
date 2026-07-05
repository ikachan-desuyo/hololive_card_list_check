/**
 * IRyS (hSD01-007)
 * コラボエフェクト: 自分のホロパワーを見る。その中から1枚を公開し、手札に加える。
 * そして自分の手札1枚をホロパワーにする。
 */
export default {
  number: 'hSD01-007',
  collabEffect: {
    name: 'HOPE',
    *run(ctx) {
      const p = ctx.player;
      if (p.holoPower.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: p.holoPower,
        title: 'ホロパワーから手札に加えるカードを選択',
      });
      if (!picked) return;
      p.holoPower.splice(p.holoPower.indexOf(picked), 1);
      ctx.addToHand(picked);
      if (p.hand.length === 0) return;
      const back = yield ctx.chooseCard({
        cards: p.hand,
        title: 'ホロパワーにする手札を選択',
      });
      if (!back) return;
      ctx.removeFromHand(back);
      p.holoPower.push(back);
      ctx.log(`手札1枚をホロパワーにした`);
    },
  },
};
