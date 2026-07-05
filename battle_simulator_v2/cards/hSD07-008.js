/**
 * 不知火フレア (hSD07-008) 黄・Buzzホロメン・1st・HP250（#JP #3期生 #ハーフエルフ）
 * アーツ「エルフレパーティー」(50):
 *   自分のアーカイブの〈エルフレンド〉1枚をこのホロメンに付けられる。（「付けられる」=任意）
 *   〈エルフレンド〉= カード名「エルフレンド」のサポート・ファン。
 *   付け先ルール（不知火フレアのみ・1人につき何枚でも）は エルフレンド側の attachRule で処理される。
 */
export default {
  number: 'hSD07-008',
  arts: {
    'エルフレパーティー': {
      *run(ctx) {
        const elfriends = ctx.player.archive.filter(
          (c) => c.kind === 'support' && c.name === 'エルフレンド'
        );
        if (elfriends.length === 0) return;
        const ok = yield ctx.confirm('アーカイブの〈エルフレンド〉1枚をこのホロメンに付けますか？');
        if (!ok) return;
        const picked = yield ctx.chooseCard({
          cards: elfriends,
          title: 'このホロメンに付ける〈エルフレンド〉を選択',
          optional: true,
        });
        if (!picked) return;
        ctx.removeFromArchive(picked);
        yield* ctx.attachSupportWithTrigger(picked, ctx.sourceHolomem);
      },
    },
  },
};
