/**
 * 山田ルイ54世 (hBP06-093) サポート・イベント・LIMITED
 * このカードは、自分のステージのホロメン全員が#秘密結社holoXを持つホロメンでなければ使えない。
 * 自分のデッキから、#秘密結社holoXを持つホロメン2枚を公開し、手札に加える。そしてデッキをシャッフルする。
 * その後、自分のステージのエールの枚数が相手より少ないなら、自分のエールデッキの上から1枚を自分のホロメンに送れる。
 * LIMITED：ターンに1枚しか使えない。
 */
export default {
  number: 'hBP06-093',
  support: {
    canUse(ctx) {
      const all = ctx.holomems('self');
      return all.length > 0 && all.every((e) => ctx.hasTag(e.top, '秘密結社holoX'));
    },
    *run(ctx) {
      for (let i = 0; i < 2; i++) {
        const cand = ctx.deckCards((c) => c.kind === 'holomen' && ctx.hasTag(c, '秘密結社holoX'));
        if (cand.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: cand, title: `手札に加える #秘密結社holoX のホロメンを選択（${i + 1}/2・任意）`,
          optional: true, skipLabel: 'これ以上加えない',
        });
        if (!picked) break;
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked);
      }
      ctx.shuffleDeck();
      // ステージのエールが相手より少ないなら、エールデッキ上から1枚をホロメンに
      const own = ctx.holomems('self').reduce((s, e) => s + e.holomem.cheers.length, 0);
      const opp = ctx.holomems('opp').reduce((s, e) => s + e.holomem.cheers.length, 0);
      if (own < opp) {
        const target = yield ctx.chooseHolomem({ side: 'self', title: 'エールデッキの上から1枚を送るホロメンを選択', optional: true });
        if (target) ctx.sendCheerFromCheerDeckTop(target.holomem);
      }
    },
  },
};
