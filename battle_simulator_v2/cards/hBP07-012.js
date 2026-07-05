/**
 * 角巻わため (hBP07-012) 白・1st・HP190（#JP #4期生 #ケモミミ #歌）
 * ブルームエフェクト「わたビーーーーーーーム！！！！！！」:
 *   相手のセンターホロメンかコラボホロメンに特殊ダメージ30を与える。
 *   その後、相手は、自身のデッキを1枚引く。
 * アーツ「わたキャノンもだ！」(20):
 *   自分のデッキを1枚引く。
 */
export default {
  number: 'hBP07-012',
  bloomEffect: {
    name: 'わたビーーーーーーーム！！！！！！',
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
        title: '特殊ダメージ30を与える相手ホロメンを選択（センターかコラボ）',
        optional: true,
      });
      if (target) yield* ctx.dealSpecialDamage(target, 30);
      // その後、相手は自身のデッキを1枚引く（条件なし）
      const opp = ctx.opponent;
      if (opp.deck.length > 0) {
        const c = opp.deck.shift();
        opp.hand.push(c);
        ctx.log(`${opp.name}: 1枚ドロー（わたビーーーーーーーム！！！！！！）`);
      }
    },
  },
  arts: {
    'わたキャノンもだ！': {
      *run(ctx) {
        ctx.draw(1);
      },
    },
  },
};
