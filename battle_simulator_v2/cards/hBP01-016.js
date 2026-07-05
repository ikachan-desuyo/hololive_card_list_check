/**
 * 七詩ムメイ (hBP01-016) 白・Debut・HP60（#EN #Promise #トリ #絵）
 * コラボエフェクト「白いキャンバス」:
 *   自分のセンターホロメンが#Promiseを持つ時、自分のデッキを1枚引く。
 * アーツ「リラックスタイム」(10): 追加効果なし（基礎ダメージのみ）。
 */
export default {
  number: 'hBP01-016',
  collabEffect: {
    name: '白いキャンバス',
    *run(ctx) {
      const center = ctx.player.center;
      if (!center) return;
      if (!ctx.hasTag(center.stack[0], 'Promise')) return;
      ctx.draw(1);
    },
  },
};
