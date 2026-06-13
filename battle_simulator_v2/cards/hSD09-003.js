/**
 * 宝鐘マリン (hSD09-003) 赤・1st・Buzzホロメン・HP240（#JP #3期生 #絵 #海）
 * コラボエフェクト「みんな優勝するぞ」:
 *   相手のセンターホロメンに、自分のステージの異なるカード名の#3期生を持つホロメン1人につき、
 *   特殊ダメージ10を与える。
 *   → 自分のステージ上の#3期生ホロメンの「異なるカード名」の数 × 10 の特殊ダメージを
 *     相手センターへ。
 * アーツ「マリンに任せろってマジで」(50): 追加テキストなし（基本アーツ）。
 */
export default {
  number: 'hSD09-003',
  collabEffect: {
    name: 'みんな優勝するぞ',
    *run(ctx) {
      // 自分のステージ上の #3期生 ホロメンの「異なるカード名」の数を数える
      const names = new Set();
      for (const { top } of ctx.holomems('self', (e) => ctx.hasTag(e.top, '3期生'))) {
        names.add(top.name);
      }
      const count = names.size;
      if (count === 0) return;
      const amount = count * 10;
      // 相手のセンターホロメン
      const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
      if (!center) return;
      ctx.dealSpecialDamage(center, amount);
    },
  },
  // アーツ「マリンに任せろってマジで」は追加効果テキストが無いため定義不要。
};
