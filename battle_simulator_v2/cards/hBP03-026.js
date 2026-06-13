/**
 * さくらみこ (hBP03-026) 赤・Debut・HP80（#JP #0期生 #ベイビー）
 * コラボエフェクト「君と待ち合わせ」:
 *   サイコロを1回振れる:
 *     2か4か6 … 相手のセンターホロメンに特殊ダメージ10を与える。
 *     3か5    … 自分のデッキを1枚引き、相手のセンターホロメンに特殊ダメージ10を与える。
 *     （1は効果なし）
 * アーツ「さくらの季節」(30): テキスト効果なし（ダメージのみ）。
 */
export default {
  number: 'hBP03-026',
  collabEffect: {
    name: '君と待ち合わせ',
    *run(ctx) {
      const ok = yield ctx.confirm('サイコロを1回振りますか？');
      if (!ok) return;
      const v = ctx.rollDice();
      // 3か5の時はまずデッキを1枚引く
      if (v === 3 || v === 5) {
        ctx.draw(1);
      }
      // 2か4か6、または3か5の時、相手のセンターホロメンに特殊ダメージ10
      if (v === 2 || v === 3 || v === 4 || v === 5 || v === 6) {
        const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
        if (center) ctx.dealSpecialDamage(center, 10);
      }
    },
  },
};
