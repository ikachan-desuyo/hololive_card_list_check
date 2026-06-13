/**
 * 姫森ルーナ (hBP06-029) 緑・1st・HP170（#JP #4期生 #ベイビー）
 * アーツ「祝祭」(30):
 *   自分のファンが付いているホロメンがいるなら、自分のエールデッキの上から1枚をこのホロメンに送れる。
 *   （「送れる」=任意。送り先は「このホロメン」=アーツを使った自分自身）
 * アーツ「ロイヤル・フラワーブーケ」(80): 効果テキストなし。
 */
export default {
  number: 'hBP06-029',
  arts: {
    '祝祭': {
      *run(ctx) {
        // 自分のステージにファンが付いているホロメンがいるか判定
        const hasFan = ctx.holomems('self', (e) =>
          e.holomem.attachments.some((a) => a.supportType === 'ファン')).length > 0;
        if (!hasFan) return;
        if (ctx.player.cheerDeck.length === 0) return;
        const ok = yield ctx.confirm('エールデッキの上から1枚をこのホロメンに送りますか？');
        if (!ok) return;
        ctx.sendCheerFromCheerDeckTop(ctx.sourceHolomem);
      },
    },
  },
};
