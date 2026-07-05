/**
 * 猫又おかゆ (hBP05-043) 青・1st・HP140（#ゲーマーズ）
 * アーツ「まだまだ遊べるよね～？」(30): このホロメンの青エール1枚をアーカイブできる：
 *   相手のセンターホロメンとバックホロメン1人に特殊ダメージ10を与える。
 * キーワード「僕でよくな～い？」:
 *   [コラボポジション限定]自分の#ゲーマーズを持つセンターホロメンがいる間、相手のホロメンのアーツは、
 *   自分のコラボホロメンしか対象にできない。ただし、特殊ダメージは除く。
 *   → oppArtsTargetRestrict で実装（hBP05-010 と同形。特殊ダメージは別経路なので対象制限の対象外）。
 */
export default {
  number: 'hBP05-043',
  // ギフト「僕でよくな～い？」: [コラボ限定]#ゲーマーズセンターがいる間、相手アーツは自分のコラボしか対象にできない
  oppArtsTargetRestrict(src, engine, defender) {
    if (engine._zoneOf(src) !== 'collab') return null;       // [コラボポジション限定]
    const center = defender.center;
    if (!center || !(center.stack[0].tags || []).includes('ゲーマーズ')) return null;
    return ['collab'];
  },
  arts: {
    'まだまだ遊べるよね～？': {
      *run(ctx) {
        const blues = ctx.sourceHolomem.cheers.filter((c) => c.color === '青');
        if (blues.length === 0) return;
        const ok = yield ctx.confirm('青エール1枚をアーカイブして特殊ダメージを与えますか？');
        if (!ok) return;
        const cheer = yield ctx.chooseCard({ cards: blues, title: 'アーカイブする青エールを選択' });
        if (!cheer) return;
        yield* ctx.archiveCheer(ctx.sourceHolomem, cheer);
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
