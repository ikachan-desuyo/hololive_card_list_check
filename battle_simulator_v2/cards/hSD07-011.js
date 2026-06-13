/**
 * さくらみこ (hSD07-011) 赤・Debut・HP60（#JP #0期生 #ベイビー）
 * コラボエフェクト「バーニン♪ バーニン♪」:
 *   相手のセンターホロメンに特殊ダメージ10を与える。
 * アーツ「魔王軍は無くなりました」(dmg:20): 追加効果テキストなし（素のダメージのみ）。
 */
export default {
  number: 'hSD07-011',
  collabEffect: {
    name: 'バーニン♪ バーニン♪',
    *run(ctx) {
      const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
      if (!center) return;
      ctx.dealSpecialDamage(center, 10);
    },
  },
};
