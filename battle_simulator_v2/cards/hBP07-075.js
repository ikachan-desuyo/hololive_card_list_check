/**
 * 古石ビジュー (hBP07-075) 紫・2nd・HP200（#EN #Advent #ベイビー）
 *
 * [キーワード/ギフト]「闇夜のハンター」:
 *   このホロメンのアーツの対象が自分のアーカイブのエールと同色の相手のホロメンなら、
 *   このホロメンのアーツダメージは軽減されない。
 *   → arts定義 damageNotReduced(ctx, target) で実装。対象（artTarget）の色が、自分のアーカイブにある
 *     エールの色のいずれかと一致するなら、このアーツダメージの軽減を無効化する。
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
      // 「闇夜のハンター」: 対象が自分のアーカイブのエールと同色の相手ホロメンなら、このアーツダメージは軽減されない
      damageNotReduced(ctx, target) {
        if (!target) return false;
        const archiveColors = new Set(
          ctx.player.archive.filter((c) => c.kind === 'cheer').map((c) => c.color),
        );
        return archiveColors.has(target.stack[0].color);
      },
    },
  },
};
