/**
 * 兎田ぺこら (hBP05-015) 白・1st・HP150（#3期生）
 * アーツ「にんじん…」(30): 自分のステージに#3期生を持つホロメンが3人以上いるなら、
 *   自分のエールデッキの上から1枚をこのホロメンに送る。
 * アーツ「いらないぺこ？」(30): 自分の推しホロメンの色が白なら、自分のデッキを1枚引く。
 */
export default {
  number: 'hBP05-015',
  arts: {
    'にんじん…': {
      *run(ctx) {
        const n = ctx.holomems('self', (e) => ctx.hasTag(e.top, '3期生')).length;
        if (n >= 3 && ctx.sourceHolomem) ctx.sendCheerFromCheerDeckTop(ctx.sourceHolomem);
      },
    },
    'いらないぺこ？': {
      *run(ctx) {
        if (ctx.player.oshi?.color === '白') ctx.draw(1);
      },
    },
  },
};
