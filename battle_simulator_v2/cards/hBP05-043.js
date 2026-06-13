/**
 * 猫又おかゆ (hBP05-043) 青・1st・HP140（#ゲーマーズ）
 * アーツ「まだまだ遊べるよね～？」(30): このホロメンの青エール1枚をアーカイブできる：
 *   相手のセンターホロメンとバックホロメン1人に特殊ダメージ10を与える。
 * ※キーワード「僕でよくな～い？」(ギフト・相手のアーツの対象制限)は対象制限機構が未対応のため未実装
 *   （CARD_EFFECT_STATUS.md §8）。
 */
export default {
  number: 'hBP05-043',
  arts: {
    'まだまだ遊べるよね～？': {
      *run(ctx) {
        const blues = ctx.sourceHolomem.cheers.filter((c) => c.color === '青');
        if (blues.length === 0) return;
        const ok = yield ctx.confirm('青エール1枚をアーカイブして特殊ダメージを与えますか？');
        if (!ok) return;
        const cheer = yield ctx.chooseCard({ cards: blues, title: 'アーカイブする青エールを選択' });
        if (!cheer) return;
        ctx.archiveCheer(ctx.sourceHolomem, cheer);
        const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
        if (center) yield* ctx.dealSpecialDamage(center, 10);
        const backs = ctx.holomems('opp', (e) => e.pos.zone === 'back');
        if (backs.length > 0) {
          const target = yield ctx.chooseHolomem({
            side: 'opp', filter: (e) => e.pos.zone === 'back',
            title: '特殊ダメージ10を与える相手のバックホロメンを選択',
          });
          if (target) yield* ctx.dealSpecialDamage(target, 10);
        }
      },
    },
  },
};
