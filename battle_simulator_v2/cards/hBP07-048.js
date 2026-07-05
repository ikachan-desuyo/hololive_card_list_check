/**
 * エリザベス・ローズ・ブラッドフレイム (hBP07-048) 赤・1st・Buzzホロメン・HP260（#EN #Justice #歌）
 *
 * [キーワード/ギフト] Queen of Impersonation:
 *   このホロメンは、自分のステージの#ENを持つホロメン全員のアーツを、すべて使える
 *   （アーツを使うためのエールは必要）。
 *   → artsBorrow フックで実装。engine のパフォーマンス選択肢生成が、このホロメンが他の
 *     #ENホロメンのアーツを借用して使える候補（[借用]表記）を追加する。コストはこのホロメンの
 *     エールで支払い、アーツの run/dmgBonus/特攻 は借用元アーツのものを使う（発生源=このホロメン）。
 *
 * [アーツ] Because I love people's voices (dmg:60):
 *   自分のアーカイブの#ENを持つホロメン1枚を手札に戻す。
 */
export default {
  number: 'hBP07-048',
  // キーワード「Queen of Impersonation」: 自分のステージの#ENホロメン全員のアーツを使える
  artsBorrow(self, other) {
    return (other.stack[0].tags || []).includes('EN'); // 借用元が#ENホロメンであること
  },
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
