/**
 * 古石ビジュー (hSD12-010) 紫・1st・HP170（#EN #Advent #ベイビー）
 * アーツ「滲んでいく輝き」(30): 効果なし。
 * アーツ「Your Princess AWAKENS!」(50+):
 *   このホロメンの紫以外のエール1枚をアーカイブできる：
 *   自分のアーカイブのホロメン1枚を手札に戻す。
 *   → アーツのコスト（紫以外のエール1枚アーカイブ）を支払えれば効果を実行。
 */
export default {
  number: 'hSD12-010',
  arts: {
    'Your Princess AWAKENS!': {
      *run(ctx) {
        // コスト: このホロメンに付いている「紫以外」のエール1枚をアーカイブ
        const nonPurple = ctx.sourceHolomem.cheers.filter((c) => c.color !== '紫');
        if (nonPurple.length === 0) return; // コストを払えない
        const archiveHolomems = ctx.player.archive.filter((c) => c.kind === 'holomen');
        if (archiveHolomems.length === 0) return; // 効果対象がいない
        const ok = yield ctx.confirm('紫以外のエール1枚をアーカイブして、アーカイブのホロメン1枚を手札に戻しますか？');
        if (!ok) return;
        const cheer = yield ctx.chooseCard({
          cards: nonPurple,
          title: 'コスト: アーカイブする紫以外のエールを選択',
        });
        if (!cheer) return;
        yield* ctx.archiveCheer(ctx.sourceHolomem, cheer);
        const picked = yield ctx.chooseCard({
          cards: ctx.player.archive.filter((c) => c.kind === 'holomen'),
          title: '手札に戻すアーカイブのホロメンを選択',
        });
        if (!picked) return;
        ctx.removeFromArchive(picked);
        ctx.addToHand(picked);
      },
    },
  },
};
