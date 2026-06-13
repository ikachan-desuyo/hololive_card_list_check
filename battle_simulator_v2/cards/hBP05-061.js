/**
 * ネリッサ・レイヴンクロフト (hBP05-061) 紫・2nd・HP200
 * ギフト「DEO」: このホロメンが相手のホロメンをダウンさせた時、自分のデッキを2枚引く。
 * アーツ「Unleashed Charm」(120):
 *   自分の手札1～3枚をアーカイブできる：このターンの間、アーカイブしたカード1枚につき、
 *   自分のステージの#歌を持つホロメン1人のアーツ+20。
 */
export default {
  number: 'hBP05-061',
  triggers: {
    *onOpponentDown(ctx) {
      ctx.draw(2);
    },
  },
  arts: {
    'Unleashed Charm': {
      *run(ctx) {
        // 手札1～3枚をアーカイブし、1枚につき #歌ホロメン1人を+20
        for (let i = 0; i < 3; i++) {
          if (ctx.player.hand.length === 0) break;
          const card = yield ctx.chooseCard({
            cards: [...ctx.player.hand],
            title: `アーカイブする手札を選択（${i + 1}/3・任意）`,
            optional: true,
            skipLabel: 'これ以上アーカイブしない',
          });
          if (!card) break;
          ctx.removeFromHand(card);
          ctx.player.archive.push(card);
          ctx.log(`${card.name} をアーカイブした`);
          const singers = ctx.holomems('self', (e) => ctx.hasTag(e.top, '歌'));
          if (singers.length === 0) continue;
          const target = yield ctx.chooseHolomem({
            side: 'self',
            filter: (e) => ctx.hasTag(e.top, '歌'),
            title: 'このターン アーツ+20する #歌 ホロメンを選択',
          });
          if (!target) continue;
          const chosen = target.holomem;
          ctx.addTurnModifier({
            kind: 'artsPlus', amount: 20, ownerIdx: ctx.playerIdx,
            match: (h) => h === chosen,
            description: `このターン、${chosen.stack[0].name} のアーツ+20`,
          });
        }
      },
    },
  },
};
