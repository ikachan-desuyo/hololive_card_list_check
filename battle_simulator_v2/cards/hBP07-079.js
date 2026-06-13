/**
 * 桃鈴ねね (hBP07-079) 黄・1st・HP150（#JP #5期生 #歌 #絵）
 * ブルームエフェクト「ねねちライブスタート！」:
 *   自分のアーカイブのエール1枚をこのホロメンに送れる。（「れる」=任意・このホロメン＝ソース）
 * アーツ「ご自由にお使いください！」(30):
 *   自分のデッキから〈やめなー〉1枚を公開し、自分のホロメンに付ける。そしてデッキをシャッフルする。
 *   ※〈やめなー〉(hBP04-102) はマスコット。付け先はマスコット未装着のホロメンに限る（_canAttachSupport）。
 */
export default {
  number: 'hBP07-079',
  bloomEffect: {
    name: 'ねねちライブスタート！',
    *run(ctx) {
      const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      if (cheers.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: cheers,
        title: 'このホロメンに送るエールを選択（アーカイブ・任意）',
        optional: true,
        skipLabel: '送らない',
      });
      if (!picked) return;
      ctx.removeFromArchive(picked);
      ctx.attachCheer(picked, ctx.sourceHolomem);
    },
  },
  arts: {
    'ご自由にお使いください！': {
      *run(ctx) {
        const cand = ctx.deckCards((c) => c.name === 'やめなー');
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: 'デッキから公開して付ける〈やめなー〉を選択',
          optional: true,
          skipLabel: '見つからなかったことにする',
        });
        if (picked) {
          ctx.flashReveal(picked);
          // 付け先は〈やめなー〉(マスコット) を付けられる自分のホロメンのみ
          const target = yield ctx.chooseHolomem({
            side: 'self',
            filter: (e) => ctx.engine._canAttachSupport(e.holomem, picked),
            title: '〈やめなー〉を付ける自分のホロメンを選択',
            optional: true,
          });
          if (target) {
            ctx.removeFromDeck(picked);
            yield* ctx.attachSupportWithTrigger(picked, target.holomem);
          }
        }
        ctx.shuffleDeck();
      },
    },
  },
};
