/**
 * 火威青 (hBP05-051) 青・1st・HP130（#ReGLOSS,#お酒）
 * ブルームエフェクト「僕の目だけ見て」:
 *   自分のデッキの上から3枚を見る。その中から、#お酒を持つホロメン1枚を公開し、手札に加える。
 *   そして残ったカードを好きな順でデッキの下に戻す。
 * アーツ「シャンパンシャンパン！」(20): 自分のステージに#お酒を持つホロメンが3人以上いるなら、
 *   自分のアーカイブのエール1枚を自分の#お酒を持つバックホロメンに送れる。
 */
export default {
  number: 'hBP05-051',
  bloomEffect: {
    name: '僕の目だけ見て',
    *run(ctx) {
      const looked = ctx.lookTopDeck(3);
      const pool = [...looked];
      const cand = pool.filter((c) => c.kind === 'holomen' && ctx.hasTag(c, 'お酒'));
      if (cand.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: cand, title: '手札に加える #お酒 のホロメンを選択（任意）',
          optional: true, skipLabel: '加えない', displayCards: pool,
        });
        if (picked) { pool.splice(pool.indexOf(picked), 1); ctx.addToHand(picked); }
      }
      const ordered = yield* ctx.orderCardsFlow(pool, 'デッキの下に戻す順番');
      ctx.deckToBottom(ordered);
    },
  },
  arts: {
    'シャンパンシャンパン！': {
      *run(ctx) {
        const n = ctx.holomems('self', (e) => ctx.hasTag(e.top, 'お酒')).length;
        if (n < 3) return;
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        const backs = ctx.holomems('self', (e) => e.pos.zone === 'back' && ctx.hasTag(e.top, 'お酒'));
        if (cheers.length === 0 || backs.length === 0) return;
        const picked = yield ctx.chooseCard({
          cards: cheers, title: '送るエールを選択（アーカイブ・任意）', optional: true, skipLabel: '送らない',
        });
        if (!picked) return;
        const target = yield ctx.chooseHolomem({
          side: 'self', filter: (e) => e.pos.zone === 'back' && ctx.hasTag(e.top, 'お酒'),
          title: 'エールを送る #お酒 のバックホロメンを選択',
        });
        if (target) { ctx.removeFromArchive(picked); ctx.attachCheer(picked, target.holomem); }
      },
    },
  },
};
