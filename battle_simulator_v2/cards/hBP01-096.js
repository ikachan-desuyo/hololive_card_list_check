/**
 * 兎田ぺこら (hBP01-096) 無色・Spot・HP80（#JP #3期生 #ケモミミ）
 * コラボエフェクト「それは「冒険」」:
 *   サイコロを１回振れる：偶数の時、自分のデッキから、Buzzホロメン１枚を公開し、
 *   手札に加える。そしてデッキをシャッフルする。
 * アーツ「ぺこら～扉の向こう側へ～」(10): テキスト効果なし。
 */
export default {
  number: 'hBP01-096',
  collabEffect: {
    name: 'それは「冒険」',
    *run(ctx) {
      // 「サイコロを振れる」= 任意
      const ok = yield ctx.confirm('サイコロを1回振りますか？（偶数でBuzzホロメンをサーチ）');
      if (!ok) return;
      const value = ctx.rollDice();
      if (value % 2 !== 0) return; // 奇数なら効果なし
      const buzz = ctx.deckCards((c) => c.kind === 'holomen' && c.buzz);
      if (buzz.length === 0) {
        // Buzzホロメンが居なくてもシャッフルは行う（テキスト通り）
        ctx.shuffleDeck();
        return;
      }
      const picked = yield ctx.chooseCard({
        cards: buzz,
        title: '手札に加えるBuzzホロメンを選択',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();
    },
  },
};
