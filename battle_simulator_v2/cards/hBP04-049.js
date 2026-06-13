/**
 * ムーナ・ホシノヴァ (hBP04-049) 青・HP190
 * アーツ「Shining Moon」(80+ / 青無無 / 特攻 白+50):
 *   相手のバックホロメン1人に特殊ダメージ20を与える。
 *   その後、自分のステージにこのホロメンと異なる色のホロメンがいる時、このアーツ+50。
 * ※もう片方のアーツ「月と星のステージ」はテキスト効果なし（基本値+特攻のみ＝エンジンが処理）
 */
export default {
  number: 'hBP04-049',
  arts: {
    'Shining Moon': {
      // 「このホロメンと異なる色」= ムーナ(青)以外の色のホロメンが自ステージにいれば +50
      dmgBonus(ctx) {
        const selfColor = ctx.sourceHolomem?.stack[0].color;
        const hasDiff = ctx.holomems('self', (e) => e.top.color !== selfColor).length > 0;
        return hasDiff ? 50 : 0;
      },
      *run(ctx) {
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'back',
          title: '特殊ダメージ20を与える相手のバックホロメンを選択',
        });
        if (target) yield* ctx.dealSpecialDamage(target, 20);
      },
    },
  },
};
