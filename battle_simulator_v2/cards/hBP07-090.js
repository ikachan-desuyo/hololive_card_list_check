/**
 * 虎金妃笑虎 (hBP07-090) 黄・2nd・HP210（#DEV_IS #FLOW #GLOW）
 * コラボエフェクト「ここで終わっちゃう虎じゃないんだ！」:
 *   自分のアーカイブのエール2枚を #FLOW #GLOW を持つ自分のホロメン1人に送れる。
 *   ※「送れる」=任意。送るのは別々の2枚（アーカイブにエールが1枚しか無ければ1枚だけ送れる）。
 * アーツ「ぶち上げる気合いだ！」(80+):
 *   このホロメンのエール1枚につき、このアーツ+20。
 */
export default {
  number: 'hBP07-090',
  collabEffect: {
    name: 'ここで終わっちゃう虎じゃないんだ！',
    *run(ctx) {
      const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      if (cheers.length === 0) return;
      // 送り先は #FLOW と #GLOW の両方を持つ自分のホロメン
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.hasTag(e.top, 'FLOW') && ctx.hasTag(e.top, 'GLOW'),
        title: 'エールを送る #FLOW #GLOW ホロメンを選択（任意）',
        optional: true,
      });
      if (!target) return;
      // アーカイブのエールを最大2枚（別々の枚）まとめて選んで送る
      const remaining = ctx.player.archive.filter((c) => c.kind === 'cheer');
      const picked = yield ctx.chooseCards({
        cards: remaining,
        min: 0,
        max: 2,
        title: 'アーカイブから送るエールを選択（最大2枚・任意）',
      });
      for (const cheer of picked) {
        ctx.removeFromArchive(cheer);
        ctx.attachCheer(cheer, target.holomem);
      }
    },
  },
  arts: {
    'ぶち上げる気合いだ！': {
      // このホロメンのエール1枚につき、このアーツ+20
      dmgBonus(ctx) {
        return (ctx.sourceHolomem?.cheers?.length || 0) * 20;
      },
    },
  },
};
