/**
 * 桃鈴ねね (hBP07-080) 黄・1st・HP140（#JP #5期生 #歌 #絵）
 * キーワード/ギフト「オレンジアイドル！」:
 *   [ターンに1回] 自分の推しホロメンが〈桃鈴ねね〉なら、自分のメインステップに使える：
 *   自分のアーカイブの〈ねっ子〉1枚をこのホロメンに付ける。
 *   → メインステップの起動型能力。コストなし、ターンに1回。
 *     付け先制限（〈ねっ子〉のテキスト）は付け先がこのホロメン固定なのでここでは判定しない。
 * アーツ「さいくーにくぅわいい」(40): テキスト効果なし。
 */
export default {
  number: 'hBP07-080',
  activatedAbilities: [{
    name: 'オレンジアイドル！',
    oncePerTurn: true,
    canUse(ctx) {
      // 自分の推しホロメンが〈桃鈴ねね〉であること
      if (ctx.player.oshi?.name !== '桃鈴ねね') return false;
      // アーカイブに〈ねっ子〉があること
      return ctx.player.archive.some((c) => c.kind === 'support' && c.name === 'ねっ子');
    },
    *run(ctx) {
      const nekko = ctx.player.archive.filter((c) => c.kind === 'support' && c.name === 'ねっ子');
      if (nekko.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: nekko,
        title: 'このホロメンに付ける〈ねっ子〉をアーカイブから選択',
      });
      if (!picked) return;
      ctx.removeFromArchive(picked);
      yield* ctx.attachSupportWithTrigger(picked, ctx.sourceHolomem);
    },
  }],
};
