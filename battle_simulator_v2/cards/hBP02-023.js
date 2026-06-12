/**
 * パヴォリア・レイネ 2nd (hBP02-023)
 * ブルームエフェクト「Kanjeng」:
 *   自分のエールデッキから、エール1枚を公開し、自分のホロメンに送る。
 *   そしてエールデッキをシャッフルする。
 * アーツ「孔雀の舞」:
 *   自分のステージのエール1色につき、このアーツ+20。
 */
export default {
  number: 'hBP02-023',
  bloomEffect: {
    name: 'Kanjeng',
    *run(ctx) {
      const picked = yield ctx.chooseCard({
        cards: ctx.player.cheerDeck,
        title: 'エールデッキから送るエールを選択',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) {
        const target = yield ctx.chooseHolomem({
          side: 'self',
          title: 'エールを送るホロメンを選択',
        });
        if (target) {
          ctx.removeFromCheerDeck(picked);
          ctx.log(`${ctx.player.name}: エールデッキから ${picked.name} を公開`);
          ctx.attachCheer(picked, target.holomem);
        }
      }
      ctx.shuffleCheerDeck();
    },
  },
  arts: {
    '孔雀の舞': {
      dmgBonus(ctx) {
        return ctx.ownStageCheerColors().length * 20;
      },
    },
  },
};
