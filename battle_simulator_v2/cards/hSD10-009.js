/**
 * 綺々羅々ヴィヴィ (hSD10-009) 紫・2nd・HP200（#DEV_IS #FLOW #GLOW）
 * コラボエフェクト「美の求道者」:
 *   自分のデッキの上から、相手の手札と同じ枚数を見る。
 *   その中からカード1枚を手札に加える。残ったカードをデッキに戻してシャッフルする。
 * アーツ「ヴィジランスヴィーナス」(80+):
 *   相手の手札1枚につき、このアーツ+10。
 */
export default {
  number: 'hSD10-009',
  collabEffect: {
    name: '美の求道者',
    *run(ctx) {
      const n = ctx.opponent.hand.length;
      if (n <= 0) return;
      const looked = ctx.lookTopDeck(n);
      if (looked.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: looked,
        title: '手札に加えるカードを選択',
      });
      if (picked) {
        ctx.addToHand(picked);
      }
      // 残ったカードをデッキに戻す（lookTopDeck で revealed に置かれた残りを回収）
      const rest = looked.filter((c) => c !== picked);
      ctx.deckToBottom(rest);
      ctx.shuffleDeck();
    },
  },
  arts: {
    'ヴィジランスヴィーナス': {
      dmgBonus(ctx) {
        return ctx.opponent.hand.length * 10;
      },
    },
  },
};
