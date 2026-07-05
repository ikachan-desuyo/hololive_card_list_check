/**
 * SorAZ (hSD01-013) 白緑・1st・HP130（#JP #0期生 #歌）
 * アーツ「越えたい未来」(50):
 *   サイコロを１回振れる：奇数の時、自分のエールデッキの上から１枚を、このホロメンに送る。
 *   偶数の時、自分のデッキを１枚引く。
 *   → 「振れる」=任意。確認後に1回だけ振り、奇偶で分岐。
 */
export default {
  number: 'hSD01-013',
  arts: {
    '越えたい未来': {
      *run(ctx) {
        const ok = yield ctx.confirm('サイコロを1回振りますか？');
        if (!ok) return;
        const v = (yield* ctx.rollDice());
        if (v % 2 === 1) {
          // 奇数: エールデッキの上から1枚をこのホロメンに送る
          ctx.sendCheerFromCheerDeckTop(ctx.sourceHolomem);
        } else {
          // 偶数: デッキを1枚引く
          ctx.draw(1);
        }
      },
    },
  },
};
