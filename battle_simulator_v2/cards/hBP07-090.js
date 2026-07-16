/**
 * 虎金妃笑虎 (hBP07-090) 黄・2nd・HP210（#DEV_IS #FLOW #GLOW）
 * コラボエフェクト「ここで終わっちゃう虎じゃないんだ！」:
 *   自分のアーカイブのエール2枚を #FLOW #GLOW を持つ自分のホロメン1人に送れる。
 *   ※「送れる」=効果全体の任意（送り先選択をスキップで不使用）。使うと決めたら2枚を強制で送る
 *     （アーカイブにエールが1枚しか無ければ可能な限り＝1枚）。枚数を自由に減らす裁量は無い。
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
      // 使うと決めたら2枚送る（アーカイブに1枚しか無ければ可能な限り＝1枚）。枚数を自由に減らすことはできない
      const remaining = ctx.player.archive.filter((c) => c.kind === 'cheer');
      const n = Math.min(2, remaining.length);
      const picked = yield ctx.chooseCards({
        cards: remaining,
        min: n,
        max: n,
        title: `アーカイブから送るエール${n}枚を選択`,
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
