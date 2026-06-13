/**
 * 輪堂千速 (hSD10-004) 緑・1st・HP150（#DEV_IS #FLOW #GLOW）
 *
 * [ギフト]「300馬力だよ！」:
 *   自分の推しホロメンが〈輪堂千速〉で、相手のステージに1stホロメンがいるなら、
 *   このターンにBloomしたこのホロメンは、自分の手札の2ndホロメンを使ってもう1回Bloomできる。
 *   → 「もう一度Bloom（追加Bloom）」機構は未実装のため保留（このカードでは未対応）。
 *
 * [アーツ]「パワフルな運転手だよ！」(50):
 *   自分のステージに #FLOW #GLOW を持つホロメンが3人以上いるなら、
 *   自分のエールデッキの上から1枚を自分のバックホロメンに送れる。
 */
export default {
  number: 'hSD10-004',
  arts: {
    'パワフルな運転手だよ！': {
      *run(ctx) {
        // 条件: 自分のステージに #FLOW かつ #GLOW を持つホロメンが3人以上
        const count = ctx.holomems('self', (e) =>
          ctx.hasTag(e.top, 'FLOW') && ctx.hasTag(e.top, 'GLOW')).length;
        if (count < 3) return;
        if (ctx.player.cheerDeck.length === 0) return;
        const ok = yield ctx.confirm('エールデッキの上から1枚をバックホロメンに送りますか？');
        if (!ok) return;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.pos.zone === 'back',
          title: 'エールを送るバックホロメンを選択',
        });
        if (!target) return;
        ctx.sendCheerFromCheerDeckTop(target.holomem);
      },
    },
  },
};
