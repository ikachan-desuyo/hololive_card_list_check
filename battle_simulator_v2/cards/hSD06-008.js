/**
 * 博衣こより (hSD06-008) 白・Debut・HP70（#JP / #秘密結社holoX / #ケモミミ）
 * コラボエフェクト「ずのー！」:
 *   自分のセンターホロメンが#秘密結社holoXを持つ時、自分の手札が5枚以下なら、自分のデッキを1枚引く。
 * アーツ「どやぁ」(10): テキスト効果なし（ダメージのみ）。
 */
export default {
  number: 'hSD06-008',
  collabEffect: {
    name: 'ずのー！',
    *run(ctx) {
      const center = ctx.player.center;
      if (!center || !ctx.hasTag(center.stack[0], '秘密結社holoX')) return;
      if (ctx.player.hand.length > 5) return;
      ctx.draw(1);
    },
  },
};
