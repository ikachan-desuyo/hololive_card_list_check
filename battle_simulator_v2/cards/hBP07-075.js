/**
 * 古石ビジュー (hBP07-075) 紫・2nd・HP200（#EN #Advent #ベイビー）
 *
 * [キーワード/ギフト]「闇夜のハンター」:
 *   このホロメンのアーツの対象が自分のアーカイブのエールと同色の相手のホロメンなら、
 *   このホロメンのアーツダメージは軽減されない。
 *   → 【未実装】アーツダメージの軽減無効化（被ダメージ軽減への割り込み）機構が必要なため保留。
 *      ダメージ軽減自体の割り込み機構が用意されたら、対象色判定して軽減無効を立てる形で実装する。
 *
 * アーツ「CODE:81800」(70+):
 *   このホロメンにエールが3枚以上付いているなら、お互いのアーカイブのエール1枚につき、このアーツ+10。
 *   → dmgBonus（条件付き「このアーツ+N」）として実装。
 */
export default {
  number: 'hBP07-075',
  arts: {
    'CODE:81800': {
      dmgBonus(ctx) {
        const cheerCount = ctx.sourceHolomem?.cheers.length || 0;
        if (cheerCount < 3) return 0;
        const selfArchiveCheer = ctx.player.archive.filter((c) => c.kind === 'cheer').length;
        const oppArchiveCheer = ctx.opponent.archive.filter((c) => c.kind === 'cheer').length;
        return (selfArchiveCheer + oppArchiveCheer) * 10;
      },
    },
  },
};
