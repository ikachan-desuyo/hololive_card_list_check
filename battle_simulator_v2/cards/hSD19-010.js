/**
 * ごきげんカレー (hSD19-010) サポート・イベント（#食べ物）
 *
 * [サポート効果] 自分のホロメンのHP30回復。
 *   → 自分のステージのホロメン1人を選び、ctx.heal(holomem, 30)。
 *     ※テキストは単数「ホロメンの」なので対象は1人。回復量はダメージ上限までクランプ（heal 側で処理）。
 *
 * 保留: なし（すべて実装済み）。
 */
export default {
  number: 'hSD19-010',
  support: {
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'self',
        title: 'HPを30回復するホロメンを選択',
      });
      if (target) ctx.heal(target.holomem, 30);
    },
  },
  ai: {
    // ダメージを負っている自分のホロメンがいる時だけ価値あり（回復量に応じてスコア）
    supportValue({ engine, player }) {
      const mems = engine._stageHolomems(player);
      const maxDmg = mems.reduce((m, h) => Math.max(m, h.damage || 0), 0);
      if (maxDmg <= 0) return 0;
      return Math.min(maxDmg, 30);
    },
  },
};
