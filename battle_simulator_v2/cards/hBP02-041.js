/**
 * 猫又おかゆ (hBP02-041) 青・1st・HP230・Buzzホロメン（#JP #ゲーマーズ #ケモミミ #歌）
 * アーツ「ぽいずん猫」(50):
 *   このホロメンの青エール1枚をアーカイブできる：
 *   相手のセンターホロメンとバックホロメン1人に特殊ダメージ20を与える。
 *   → arts.run でコスト（青エール1枚アーカイブ）を支払い、特殊ダメージを与える。
 *
 * ※キーワード/ギフト「毒の愛」(ギフト・特殊ダメージ+20の常時アウラ)は未実装。
 *   [センターポジション限定]自分のステージの〈猫又おかゆ〉全員が相手のセンターホロメンに
 *   与える特殊ダメージ+20、という「他ホロメンを恒常強化する常時アウラ」機構が未対応のため
 *   （hBP05-045 と同様。CARD_EFFECT_STATUS.md §8）。
 */
export default {
  number: 'hBP02-041',
  arts: {
    'ぽいずん猫': {
      *run(ctx) {
        // コスト: このホロメンの青エール1枚をアーカイブできる（任意）
        const blues = ctx.sourceHolomem.cheers.filter((c) => c.color === '青');
        if (blues.length === 0) return;
        const ok = yield ctx.confirm('青エール1枚をアーカイブして特殊ダメージを与えますか？');
        if (!ok) return;
        const cheer = yield ctx.chooseCard({ cards: blues, title: 'アーカイブする青エールを選択' });
        if (!cheer) return;
        ctx.archiveCheer(ctx.sourceHolomem, cheer);
        // 相手のセンターホロメンに特殊ダメージ20
        const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
        if (center) yield* ctx.dealSpecialDamage(center, 20);
        // 相手のバックホロメン1人に特殊ダメージ20
        const backs = ctx.holomems('opp', (e) => e.pos.zone === 'back');
        if (backs.length > 0) {
          const target = yield ctx.chooseHolomem({
            side: 'opp', filter: (e) => e.pos.zone === 'back',
            title: '特殊ダメージ20を与える相手のバックホロメンを選択',
          });
          if (target) yield* ctx.dealSpecialDamage(target, 20);
        }
      },
    },
  },
};
