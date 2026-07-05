/**
 * 角巻わため (hSD08-007) 黄・Debut・HP100（#JP #4期生 #ケモミミ #歌 #サマー）
 * コラボエフェクト「みんなと夏祭り」:
 *   自分のアーカイブのエール1枚を自分の#4期生を持つ2ndホロメンに送れる。
 *   → 「送れる」=任意。送り先は #4期生 を持つ 2nd ホロメンに限定。
 *     アーカイブにエールが無い／対象の2ndホロメンがいない場合は何もしない。
 * アーツ「わたあめおいしいねぇ」(10): 効果なし（dmgのみ）。
 */
export default {
  number: 'hSD08-007',
  collabEffect: {
    name: 'みんなと夏祭り',
    *run(ctx) {
      const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      if (cheers.length === 0) return;
      // 送り先候補: #4期生 を持つ 2nd ホロメン
      const hasTarget = ctx.holomems(
        'self',
        (e) => e.top.bloomLevel === '2nd' && ctx.hasTag(e.top, '4期生'),
      ).length > 0;
      if (!hasTarget) return;
      const cheer = yield ctx.chooseCard({
        cards: cheers,
        title: '#4期生の2ndホロメンに送るエールをアーカイブから選択',
        optional: true,
        skipLabel: '送らない',
      });
      if (!cheer) return;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.bloomLevel === '2nd' && ctx.hasTag(e.top, '4期生'),
        title: 'エールを送る#4期生の2ndホロメンを選択',
      });
      if (!target) return;
      ctx.removeFromArchive(cheer);
      ctx.attachCheer(cheer, target.holomem);
    },
  },
};
