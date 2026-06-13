/**
 * 紫咲シオン (hBP02-043) 紫・Debut・HP50（#JP #2期生）
 * コラボエフェクト「魔法見せてあげる」:
 *   サイコロを1回振れる：4以上の時、自分のデッキから #魔法 を持つカード1枚を公開し、
 *   手札に加える。そしてデッキをシャッフルする。
 * アーツ「一緒に行こう」(30): 効果なし（ダメージのみ）。
 */
export default {
  number: 'hBP02-043',
  collabEffect: {
    name: '魔法見せてあげる',
    *run(ctx) {
      // 「振れる」=任意。振るか確認する。
      const doRoll = yield ctx.confirm('サイコロを1回振りますか？');
      if (!doRoll) return;
      const value = ctx.rollDice();
      if (value < 4) {
        ctx.log('出目が4未満のため効果なし');
        return;
      }
      const cands = ctx.deckCards((c) => ctx.hasTag(c, '魔法'));
      if (cands.length === 0) {
        ctx.log('デッキに #魔法 を持つカードがない');
        ctx.shuffleDeck();
        return;
      }
      const picked = yield ctx.chooseCard({
        cards: cands,
        title: 'デッキから手札に加える #魔法 を持つカードを選択',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();
    },
  },
};
