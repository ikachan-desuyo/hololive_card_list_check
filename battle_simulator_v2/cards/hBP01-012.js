/**
 * 天音かなた 1st (hBP01-012)
 * ブルームエフェクト「アイドルかなたそを」:
 *   サイコロを１回振れる：３以下の時、自分のデッキから、マスコット１枚を公開し、
 *   自分のホロメンに付ける。そしてデッキをシャッフルする。
 *
 * 解釈:
 *  - 「振れる」=任意（confirm）。振るとサイコロを1回振り、3以下なら効果。
 *  - 「マスコット１枚を公開し、自分のホロメンに付ける」=デッキ内のマスコットから1枚選び公開、
 *    付けられる（マスコット1人1枚制限を満たす）ホロメンに付ける。
 *  - 「そしてデッキをシャッフルする」=デッキを見た後にシャッフル。
 *    （3以下を出して効果を行った場合にデッキに触れるため、その後にシャッフルする）
 *
 * アーツ「い～っぱい応援して！」は dmg のみでテキスト効果なし（エンジンが素点処理）。
 */
export default {
  number: 'hBP01-012',
  bloomEffect: {
    name: 'アイドルかなたそを',
    *run(ctx) {
      const ok = yield ctx.confirm('ブルームエフェクト「アイドルかなたそを」: サイコロを1回振りますか？');
      if (!ok) return;
      const roll = (yield* ctx.rollDice());
      if (roll > 3) {
        ctx.log('3以下ではなかったため効果は発動しない');
        return;
      }
      // デッキ内のマスコットを公開して付ける
      const mascots = ctx.deckCards((c) => c.supportType === 'マスコット');
      if (mascots.length === 0) {
        ctx.log('デッキにマスコットがいなかった');
        ctx.shuffleDeck();
        return;
      }
      const mascot = yield ctx.chooseCard({
        cards: mascots,
        title: '公開してホロメンに付けるマスコットを選択',
        optional: true,
      });
      if (!mascot) {
        ctx.shuffleDeck();
        return;
      }
      // 付けられるホロメン（マスコット1人1枚制限を満たす相手）を選ぶ
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.engine._canAttachSupport(e.holomem, mascot),
        title: `${mascot.name} を付けるホロメンを選択`,
        optional: true,
      });
      if (target) {
        ctx.removeFromDeck(mascot);
        ctx.flashReveal(mascot);
        ctx.attachSupport(mascot, target.holomem);
      }
      ctx.shuffleDeck();
    },
  },
};
