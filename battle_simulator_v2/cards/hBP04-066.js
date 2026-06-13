/**
 * 古石ビジュー (hBP04-066) 紫
 * ブルームエフェクト「『感情結晶体』」:
 *   自分の手札を数えて、自分の手札すべてをアーカイブできる：
 *   アーカイブしたカード1枚につき、自分のデッキを1枚引く。（ターンに1回）
 * アーツ「この輝きが、伝わればいいな」(80+):
 *   相手のアーカイブのエール1枚につき、このアーツ+10。
 */
export default {
  number: 'hBP04-066',
  bloomEffect: {
    name: '『感情結晶体』',
    *run(ctx) {
      const n = ctx.player.hand.length;
      if (n === 0) return;
      const ok = yield ctx.confirm(`手札${n}枚をすべてアーカイブして${n}枚引きますか？`);
      if (!ok) return;
      for (const card of ctx.player.hand.slice()) {
        ctx.removeFromHand(card);
        ctx.player.archive.push(card);
      }
      ctx.log(`手札${n}枚をアーカイブした`);
      ctx.draw(n);
    },
  },
  arts: {
    'この輝きが、伝わればいいな': {
      dmgBonus(ctx) {
        return ctx.opponent.archive.filter((c) => c.kind === 'cheer').length * 10;
      },
    },
  },
};
