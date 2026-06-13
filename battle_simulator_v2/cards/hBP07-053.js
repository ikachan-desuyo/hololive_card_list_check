/**
 * オーロ・クロニー (hBP07-053) 青・1st・HP150（#EN #Promise）
 * ブルームエフェクト「時を超えた約束」:
 *   自分のステージの#Promiseを持つホロメン1人を選ぶ。
 *   このターンの間、選んだホロメンのアーツ+20。
 * アーツ「Everlasting Flower」(50):
 *   自分のエールデッキの上から1枚を自分の#Promiseを持つホロメンに送る。
 */
export default {
  number: 'hBP07-053',
  bloomEffect: {
    name: '時を超えた約束',
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.hasTag(e.top, 'Promise'),
        title: 'このターン アーツ+20する #Promise ホロメンを選択',
      });
      if (!target) return;
      const chosen = target.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 20, ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターン、${chosen.stack[0].name} のアーツ+20`,
      });
    },
  },
  arts: {
    'Everlasting Flower': {
      *run(ctx) {
        if (ctx.player.cheerDeck.length === 0) return;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => ctx.hasTag(e.top, 'Promise'),
          title: 'エールデッキの上から1枚を送る #Promise ホロメンを選択',
        });
        if (!target) return;
        ctx.sendCheerFromCheerDeckTop(target.holomem);
      },
    },
  },
};
