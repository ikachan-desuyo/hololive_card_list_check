/**
 * 大空スバル (hBP06-080) 黄・1st・HP130（JP/2期生/トリ）
 * ブルームエフェクト「手を繋ごう」:
 *   自分のデッキから、〈スバルドダック〉か〈スバ友〉1枚を公開し、手札に加える。
 *   そしてデッキをシャッフルする。
 *   → 候補が無ければ何もせず（その場合もシャッフルしない方が安全だが、デッキを見る効果なので
 *      候補ありの時のみシャッフルする実装にする）。
 * アーツ「どこへだって行ける」(60+):
 *   このホロメンに付いている〈スバ友〉1枚につき、このアーツ+20。
 */
export default {
  number: 'hBP06-080',
  bloomEffect: {
    name: '手を繋ごう',
    *run(ctx) {
      const cand = ctx.deckCards((c) => c.name === 'スバルドダック' || c.name === 'スバ友');
      if (cand.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: '手札に加える〈スバルドダック〉か〈スバ友〉を選択',
      });
      if (!picked) return;
      ctx.removeFromDeck(picked);
      ctx.addToHand(picked, { reveal: true });
      ctx.shuffleDeck();
    },
  },
  arts: {
    'どこへだって行ける': {
      dmgBonus(ctx) {
        const subatomo = (ctx.sourceHolomem?.attachments || []).filter((a) => a.name === 'スバ友').length;
        return subatomo * 20;
      },
    },
  },
};
