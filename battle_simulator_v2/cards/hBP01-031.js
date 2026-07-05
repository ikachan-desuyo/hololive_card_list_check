/**
 * IRyS (hBP01-031)
 * コラボエフェクト: 自分のホロパワーを見る。その中から1枚を公開し、手札に加える。
 *   そして自分のデッキの上から1枚をホロパワーにする。
 * アーツ: 自分の#Promiseを持つホロメン1人につき、このアーツ+20。
 */
export default {
  number: 'hBP01-031',
  collabEffect: {
    name: '希望の庭園',
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
      if (p.deck.length > 0) {
        p.holoPower.push(p.deck.shift());
        ctx.log('デッキの上から1枚をホロパワーにした');
      }
    },
  },
  arts: {
    '約束の力': {
      dmgBonus(ctx) {
        return ctx.holomems('self', (e) => (e.top.tags || []).includes('Promise')).length * 20;
      },
    },
  },
};
