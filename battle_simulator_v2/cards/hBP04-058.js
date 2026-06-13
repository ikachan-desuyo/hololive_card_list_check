/**
 * ラプラス・ダークネス (hBP04-058) 紫・HP140
 * コラボエフェクト「貴様の運命試してみるか？」:
 *   サイコロを3回振れる：相手のセンターホロメンに、奇数が出た回数1回につき、特殊ダメージ10を与える。
 * ※アーツ「吾輩に勝つつもりか？」はテキスト効果なし（基本値のみ＝エンジンが処理）
 */
export default {
  number: 'hBP04-058',
  collabEffect: {
    name: '貴様の運命試してみるか？',
    *run(ctx) {
      const ok = yield ctx.confirm('サイコロを3回振りますか？', '振る', '振らない');
      if (!ok) return;
      let odds = 0;
      for (let i = 0; i < 3; i++) {
        if (ctx.rollDice() % 2 === 1) odds++;
      }
      if (odds === 0) {
        ctx.log('奇数が出なかったため特殊ダメージなし');
        return;
      }
      const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
      if (center) ctx.dealSpecialDamage(center, odds * 10);
    },
  },
};
