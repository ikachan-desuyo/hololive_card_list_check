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
        for (let i = 0; i < 2; i++) {
          const remaining = ctx.sourceHolomem.cheers.filter((c) => c.color === '青');
          if (remaining.length === 0) break;
          const cheer = yield ctx.chooseCard({
            cards: remaining,
            title: `コスト: アーカイブする青エールを選択（${i + 1}/2）`,
          });
          if (!cheer) return; // 途中キャンセル（保存則のため既に払った分は戻せないが、選択必須）
          ctx.archiveCheer(ctx.sourceHolomem, cheer);
        }
        // 相手センターへ特殊ダメージ30
        const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
        if (center) ctx.dealSpecialDamage(center, 30);
        // 相手バックホロメン1人へ特殊ダメージ30
        const backs = ctx.holomems('opp', (e) => e.pos.zone === 'back');
        if (backs.length > 0) {
          const target = yield ctx.chooseHolomem({
            side: 'opp',
            filter: (e) => e.pos.zone === 'back',
            title: '特殊ダメージ30を与える相手バックホロメンを選択',
          });
          if (target) ctx.dealSpecialDamage(target, 30);
        }
      },
    },
  },
};
