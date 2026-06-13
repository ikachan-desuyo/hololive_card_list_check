/**
 * ラオーラ・パンテーラ (hBP06-001) 推しホロメン・白
 *
 * 推しスキル「BIG CAT means…」[ホロパワー：-2][ターンに1回]:
 *   自分のセンターホロメンが〈ラオーラ・パンテーラ〉なら、自分のデッキから、
 *   自分のコラボホロメンと同じカード名のホロメン1枚を公開し、手札に加える。
 *   そしてデッキをシャッフルする。
 *   → oshiSkill として実装（能動スキル）。
 *
 * ※SP推しスキル「BIG TROUBLE!!」[ホロパワー：-1][ゲームに1回]:
 *   「このゲームの間、自分の〈ラオーラ・パンテーラ〉全員はリセットステップでお休みしない」は
 *   リセットステップの置換効果（お休みしない）であり、エンジン側が未対応のため未実装。
 */
export default {
  number: 'hBP06-001',
  oshiSkill: {
    name: 'BIG CAT means…',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // センターが〈ラオーラ・パンテーラ〉で、かつコラボホロメンがいること
      if (!p.center || p.center.stack[0].name !== 'ラオーラ・パンテーラ') return false;
      if (!p.collab) return false;
      const collabName = p.collab.stack[0].name;
      // 同名のホロメンがデッキにあること
      return p.deck.some((c) => c.kind === 'holomem' && c.name === collabName);
    },
    *run(ctx) {
      const collabEntry = ctx.holomems('self', (e) => e.pos.zone === 'collab')[0];
      if (!collabEntry) return;
      const collabName = collabEntry.top.name;
      const cand = ctx.deckCards((c) => c.kind === 'holomem' && c.name === collabName);
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: `デッキから〈${collabName}〉1枚を公開して手札に加える`,
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();
    },
  },
};
