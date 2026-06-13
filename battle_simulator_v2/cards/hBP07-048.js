/**
 * エリザベス・ローズ・ブラッドフレイム (hBP07-048) 赤・1st・Buzzホロメン・HP260（#EN #Justice #歌）
 *
 * [キーワード/ギフト] Queen of Impersonation:
 *   このホロメンは、自分のステージの#ENを持つホロメン全員のアーツを、すべて使える
 *   （アーツを使うためのエールは必要）。
 *   → 他ホロメンのアーツ枠を「借りて」使う機構はエンジン未対応のため未実装。
 *     （アーツの動的追加・対象/コスト解釈を伴うため保留領域）。
 *
 * [アーツ] Because I love people's voices (dmg:60):
 *   自分のアーカイブの#ENを持つホロメン1枚を手札に戻す。
 */
export default {
  number: 'hBP07-048',
  arts: {
    'Because I love people\'s voices': {
      *run(ctx) {
        const candidates = ctx.player.archive.filter(
          (c) => c.kind === 'holomen' && ctx.hasTag(c, 'EN'),
        );
        if (candidates.length === 0) return;
        const picked = yield ctx.chooseCard({
          cards: candidates,
          title: 'アーカイブから手札に戻す#ENホロメンを選択',
        });
        if (!picked) return;
        ctx.removeFromArchive(picked);
        ctx.addToHand(picked);
      },
    },
  },
};
