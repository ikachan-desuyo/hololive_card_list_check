/**
 * 一条莉々華 (hSD05-011) 赤・Debut・HP70（#DEV_IS #ReGLOSS #料理）
 * コラボエフェクト「任せておきなさい！」:
 *   自分のセンターホロメンが#ReGLOSSを持つ時、自分の手札が5枚以下なら、自分のデッキを1枚引く。
 * アーツ「社長の推し事」(20): 追加効果なし。
 */
export default {
  number: 'hSD05-011',
  collabEffect: {
    name: '任せておきなさい！',
    *run(ctx) {
      const center = ctx.player.center;
      if (!center) return;
      const centerTop = center.stack[0];
      if (!ctx.hasTag(centerTop, 'ReGLOSS')) return;
      if (ctx.player.hand.length > 5) return;
      ctx.draw(1);
    },
  },
};
