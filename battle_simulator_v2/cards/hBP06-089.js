/**
 * ドローイングストリーム (hBP06-089) サポート・イベント・LIMITED
 * 自分のエールデッキから、エール1枚を公開し、自分の#絵を持つホロメンに送る。そしてエールデッキをシャッフルする。
 * その後、自分のアーカイブの#絵を持つホロメン1枚を手札に戻す。
 * LIMITED：ターンに1枚しか使えない。
 */
export default {
  number: 'hBP06-089',
  support: {
    canUse(ctx) {
      return ctx.holomems('self', (e) => ctx.hasTag(e.top, '絵')).length > 0;
    },
    *run(ctx) {
      // エールデッキからエール1枚を選んで#絵ホロメンに送る（サーチ→シャッフル）
      const cheer = yield ctx.chooseCard({
        cards: ctx.player.cheerDeck,
        title: 'エールデッキから送るエールを選択',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (cheer) {
        const target = yield ctx.chooseHolomem({
          side: 'self', filter: (e) => ctx.hasTag(e.top, '絵'),
          title: 'エールを送る #絵 のホロメンを選択',
        });
        if (target) {
          ctx.removeFromCheerDeck(cheer);
          ctx.log(`${ctx.player.name}: エールデッキから ${cheer.name} を公開`);
          ctx.flashReveal(cheer);
          ctx.attachCheer(cheer, target.holomem);
        }
      }
      ctx.shuffleCheerDeck();
      // アーカイブの#絵ホロメン1枚を手札に戻す（強制。アーカイブは公開領域なので候補があれば必ず戻す）
      const arts = ctx.player.archive.filter((c) => c.kind === 'holomen' && (c.tags || []).includes('絵'));
      if (arts.length === 0) return;
      const back = yield ctx.chooseCard({
        cards: arts, title: '手札に戻す #絵 のホロメンを選択',
      });
      if (back) { ctx.removeFromArchive(back); ctx.addToHand(back, { reveal: false }); }
    },
  },
};
