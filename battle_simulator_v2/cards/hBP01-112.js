/**
 * わくわくいたずらタイム（サポート・イベント）
 * [サポート効果] サイコロを1回振る：4以上の時、相手のバックホロメン1人に
 *   特殊ダメージ20を与える（ダウンしても相手のライフは減らない）。
 */
export default {
  number: 'hBP01-112',
  support: {
    canUse(ctx) {
      // 相手のバックホロメンがいる時に意味がある
      return ctx.holomems('opp', (e) => e.pos.zone === 'back').length > 0;
    },
    *run(ctx) {
      const value = ctx.rollDice();
      if (value < 4) {
        ctx.log('サイコロの目が3以下のため効果なし');
        return;
      }
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'back',
        title: '特殊ダメージ20を与える相手のバックホロメンを選択',
      });
      if (!target) return;
      ctx.dealSpecialDamage(target, 20, { noLifeOnDown: true });
    },
  },
};
