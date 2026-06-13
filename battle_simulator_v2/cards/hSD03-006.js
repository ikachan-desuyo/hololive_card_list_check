/**
 * 猫又おかゆ (hSD03-006) 青・1st・HP140（#JP #ゲーマーズ #ケモミミ #歌）
 * アーツ「猫かぶり」(30): 効果なし（コンパイラ不要・通常ダメージのみ）。
 * アーツ「しゃー」(40):
 *   このホロメンの青エール1枚をアーカイブできる：
 *   相手のセンターホロメンとバックホロメン1人に特殊ダメージ10を与える。
 *   → arts.run でコスト（青エール1枚アーカイブ・任意）を支払い、特殊ダメージを与える。
 */
export default {
  number: 'hSD03-006',
  arts: {
    'しゃー': {
      *run(ctx) {
        // コスト: このホロメンの青エール1枚をアーカイブできる（任意）
        const blues = ctx.sourceHolomem.cheers.filter((c) => c.color === '青');
        if (blues.length === 0) return;
        const ok = yield ctx.confirm('青エール1枚をアーカイブして特殊ダメージ10を与えますか？');
        if (!ok) return;
        const cheer = yield ctx.chooseCard({ cards: blues, title: 'アーカイブする青エールを選択' });
        if (!cheer) return;
        ctx.archiveCheer(ctx.sourceHolomem, cheer);
        // 相手のセンターホロメンに特殊ダメージ10
        const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
        if (center) ctx.dealSpecialDamage(center, 10);
        // 相手のバックホロメン1人に特殊ダメージ10
        const backs = ctx.holomems('opp', (e) => e.pos.zone === 'back');
        if (backs.length > 0) {
          const target = yield ctx.chooseHolomem({
            side: 'opp', filter: (e) => e.pos.zone === 'back',
            title: '特殊ダメージ10を与える相手のバックホロメンを選択',
          });
          if (target) ctx.dealSpecialDamage(target, 10);
        }
      },
    },
  },
};
