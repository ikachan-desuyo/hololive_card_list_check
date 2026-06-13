/**
 * 不知火フレア (hBP05-067) 黄・2nd・HP200（#3期生）
 * アーツ「みんなに笑っててほしいから」(120+): サイコロを1回振れる：出た目の数が自分のライフ以上なら、
 *   このアーツ+60。出た目の数が自分のライフ以下なら、自分のデッキを1枚引く。
 * ※キーワード「カラフルストリーム」(ギフト・このホロメンがアーツを使った時)は
 *   onArtsUse トリガー機構が未対応のため未実装（CARD_EFFECT_STATUS.md §8）。
 */
export default {
  number: 'hBP05-067',
  arts: {
    'みんなに笑っててほしいから': {
      *run(ctx) {
        const ok = yield ctx.confirm('サイコロを振りますか？', '振る', '振らない');
        if (!ok) return;
        const v = ctx.rollDice();
        const life = ctx.player.life.length;
        if (v >= life) ctx.addArtBonus(60, 'サイコロの目がライフ以上');
        if (v <= life) ctx.draw(1);
      },
    },
  },
};
