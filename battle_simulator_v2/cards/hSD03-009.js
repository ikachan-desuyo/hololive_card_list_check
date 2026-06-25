/**
 * 猫又おかゆ (hSD03-009) 青・2nd・HP190（#ゲーマーズ #ケモミミ）
 * アーツ「MOGMOG」(60): テキスト効果なし。
 * アーツ「おかゆ～」(100):
 *   このホロメンの青エール2枚をアーカイブできる：
 *   相手のセンターホロメンとバックホロメン1人に特殊ダメージ30を与える。
 *   → センターは必ず対象、バックは1人をプレイヤーが選択（バックがいなければセンターのみ）。
 */
export default {
  number: 'hSD03-009',
  arts: {
    'おかゆ～': {
      *run(ctx) {
        const blueCheers = ctx.sourceHolomem.cheers.filter((c) => c.color === '青');
        if (blueCheers.length < 2) return;
        const ok = yield ctx.confirm('青エール2枚をアーカイブして特殊ダメージ30を与えますか？');
        if (!ok) return;
        // コスト: 青エール2枚をアーカイブ
        const picked = yield ctx.chooseCards({
          cards: blueCheers.slice(),
          count: 2,
          title: 'コスト: アーカイブする青エールを選択（2枚）',
        });
        if (picked.length < 2) return; // 選択必須
        for (const cheer of picked) yield* ctx.archiveCheer(ctx.sourceHolomem, cheer);
        // 相手センターへ特殊ダメージ30
        const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
        if (center) yield* ctx.dealSpecialDamage(center, 30);
        // 相手バックホロメン1人へ特殊ダメージ30
        const backs = ctx.holomems('opp', (e) => e.pos.zone === 'back');
        if (backs.length > 0) {
          const target = yield ctx.chooseHolomem({
            side: 'opp',
            filter: (e) => e.pos.zone === 'back',
            title: '特殊ダメージ30を与える相手バックホロメンを選択',
          });
          if (target) yield* ctx.dealSpecialDamage(target, 30);
        }
      },
    },
  },
};
