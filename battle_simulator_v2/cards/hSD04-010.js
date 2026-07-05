/**
 * 大空スバル Spot (hSD04-010) 無色・HP60（#JP #2期生）
 * コラボエフェクト「ちよこーーッ！！」:
 *   自分のセンターホロメンが〈癒月ちょこ〉の時、
 *   自分のアーカイブのエール1枚を自分のホロメンに送れる。
 *   → 条件: 自分のセンターが〈癒月ちょこ〉であること。「送れる」=任意。
 * アーツ「地獄くじ引き、引かせるぞっ」(20): 追加効果なし（エンジンの基本処理に任せる）。
 */
export default {
  number: 'hSD04-010',
  collabEffect: {
    name: 'ちよこーーッ！！',
    *run(ctx) {
      // 自分のセンターホロメンが〈癒月ちょこ〉であることが条件
      const center = ctx.holomems('self', (e) => e.pos.zone === 'center')[0];
      if (!center || center.top.name !== '癒月ちょこ') return;

      const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      if (cheers.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: cheers,
        title: 'アーカイブから送るエールを選択（任意）',
        optional: true,
        skipLabel: '送らない',
      });
      if (!picked) return;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        title: 'エールを送るホロメンを選択',
      });
      if (target) {
        ctx.removeFromArchive(picked);
        ctx.attachCheer(picked, target.holomem);
      }
    },
  },
};
