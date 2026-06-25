/**
 * 常闇トワ (hBP05-062) 紫・2nd・HP200（#4期生,#歌）
 * ブルームエフェクト「友達がいっぱい増えたよ」:
 *   自分のデッキから、#歌を持つBuzz以外の1stホロメン2枚を公開し、手札に加える。そしてデッキをシャッフルする。
 * アーツ「ありがとうみんな」(70): 相手のセンターホロメンかコラボホロメンどちらかに、
 *   自分のステージの#歌を持つ1stホロメン1人につき、特殊ダメージ20を与える。
 */
export default {
  number: 'hBP05-062',
  bloomEffect: {
    name: '友達がいっぱい増えたよ',
    *run(ctx) {
      const cand = ctx.deckCards((c) =>
        c.kind === 'holomen' && c.bloomLevel === '1st' && !c.buzz && ctx.hasTag(c, '歌'));
      const picked = yield ctx.chooseCards({
        cards: cand, min: 0, max: 2,
        title: '手札に加える #歌 のBuzz以外1stホロメンを選択（最大2枚・任意）',
      });
      for (const c of picked) {
        ctx.removeFromDeck(c);
        ctx.addToHand(c);
      }
      ctx.shuffleDeck();
    },
  },
  arts: {
    'ありがとうみんな': {
      *run(ctx) {
        const count = ctx.holomems('self', (e) => e.top.bloomLevel === '1st' && ctx.hasTag(e.top, '歌')).length;
        if (count === 0) return;
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
          title: `特殊ダメージ${count * 20}を与える相手ホロメンを選択（センターかコラボ）`,
        });
        if (target) yield* ctx.dealSpecialDamage(target, count * 20);
      },
    },
  },
};
