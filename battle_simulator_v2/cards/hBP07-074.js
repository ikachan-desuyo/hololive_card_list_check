/**
 * ラプラス・ダークネス 2nd (hBP07-074) 紫・2nd・HP200（#JP #秘密結社holoX #シューター #歌）
 * ブルームエフェクト「ラッシュ行きます」:
 *   自分のデッキの上から3枚を見る。その中から、ホロメンを好きな枚数公開し、
 *   公開したホロメンを手札に加える。そして残ったカードを好きな順でデッキの下に戻す。
 * アーツ「吾輩の歌を聴けえええええええ！！！！」(110+):
 *   自分のセンターホロメンの色が紫なら、このアーツ+40。
 */
export default {
  number: 'hBP07-074',
  bloomEffect: {
    name: 'ラッシュ行きます',
    *run(ctx) {
      const looked = ctx.lookTopDeck(3);
      const pool = [...looked];
      const candidates = pool.filter((c) => c.kind === 'holomen');
      const picked = yield ctx.chooseCards({
        cards: candidates,
        min: 0,
        title: '手札に加えるホロメンを選択（好きな枚数）',
        displayCards: pool, // 見た3枚は対象外のカードも表示する
      });
      for (const card of picked) {
        pool.splice(pool.indexOf(card), 1);
        ctx.addToHand(card, { reveal: true });
      }
      // 残りは好きな順でデッキの下へ
      const ordered = yield* ctx.orderCardsFlow(pool, 'デッキの下に戻す順番');
      ctx.deckToBottom(ordered);
      if (ordered.length > 0) ctx.log(`残り${ordered.length}枚をデッキの下に戻した`);
    },
  },
  arts: {
    '吾輩の歌を聴けえええええええ！！！！': {
      dmgBonus(ctx) {
        const center = ctx.holomems('self', (e) => e.pos.zone === 'center')[0];
        return center && center.top.color === '紫' ? 40 : 0;
      },
    },
  },
};
