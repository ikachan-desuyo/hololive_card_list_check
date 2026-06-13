/**
 * 鷹嶺ルイ (hSD06-009) 赤・Debut・HP80（#秘密結社holoX, #トリ, #お酒）
 * アーツ「頼れる女幹部」(20):
 *   自分のアーカイブの#秘密結社holoXを持つDebutホロメン1枚を手札に戻せる。
 *   （「戻せる」＝任意。対象が無い／選ばなければ何もしない）
 */
export default {
  number: 'hSD06-009',
  arts: {
    '頼れる女幹部': {
      *run(ctx) {
        const candidates = ctx.player.archive.filter(
          (c) => c.kind === 'holomen' && c.bloomLevel === 'Debut' && ctx.hasTag(c, '秘密結社holoX'),
        );
        if (candidates.length === 0) return;
        const picked = yield ctx.chooseCard({
          cards: candidates,
          title: 'アーカイブから手札に戻す #秘密結社holoX Debutホロメンを選択',
          optional: true,
          skipLabel: '戻さない',
        });
        if (!picked) return;
        ctx.removeFromArchive(picked);
        ctx.addToHand(picked);
      },
    },
  },
};
