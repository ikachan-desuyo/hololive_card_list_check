/**
 * 雪花ラミィ (hBP05-046) 青・1st・HP150（#5期生）
 * ブルームエフェクト「ラミィちゃんしか～？」:
 *   自分のデッキから、〈雪民〉1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 * アーツ「愛せな～い！」(40): 自分のステージに#5期生を持つ2ndホロメンがいるなら、
 *   相手のホロメン1人に特殊ダメージ20を与える。
 */
export default {
  number: 'hBP05-046',
  bloomEffect: {
    name: 'ラミィちゃんしか～？',
    *run(ctx) {
      const cand = ctx.deckCards((c) => c.name === '雪民');
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: '手札に加える〈雪民〉を選択（任意）',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked);
      }
      ctx.shuffleDeck();
    },
  },
  arts: {
    '愛せな～い！': {
      *run(ctx) {
        const ok = ctx.holomems('self', (e) => e.top.bloomLevel === '2nd' && ctx.hasTag(e.top, '5期生')).length > 0;
        if (!ok) return;
        const target = yield ctx.chooseHolomem({ side: 'opp', title: '特殊ダメージ20を与える相手ホロメンを選択' });
        if (target) ctx.dealSpecialDamage(target, 20);
      },
    },
  },
};
