/**
 * 猫又おかゆ (hSD03-007) 青・1st・HP110（#JP #ゲーマーズ #ケモミミ）
 * ブルームエフェクト「また、たくさん笑ってよね！」:
 *   自分のアーカイブのエール1枚を自分の#ゲーマーズを持つホロメンに送れる。（任意）
 * アーツ「全力で僕なりの歌、お届けします！」(dmg:20):
 *   追加テキストなし（素のダメージのみ）。個別実装不要。
 */
export default {
  number: 'hSD03-007',
  bloomEffect: {
    name: 'また、たくさん笑ってよね！',
    *run(ctx) {
      const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      if (cheers.length === 0) return;
      // 送り先となる #ゲーマーズ ホロメンがいなければ何もしない
      const hasTarget = ctx.holomems('self', (e) => ctx.hasTag(e.top, 'ゲーマーズ')).length > 0;
      if (!hasTarget) return;
      const picked = yield ctx.chooseCard({
        cards: cheers,
        title: 'アーカイブから送るエールを選択（任意）',
        optional: true,
        skipLabel: '送らない',
      });
      if (!picked) return;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.hasTag(e.top, 'ゲーマーズ'),
        title: 'エールを送る #ゲーマーズ ホロメンを選択',
      });
      if (!target) return;
      ctx.removeFromArchive(picked);
      ctx.attachCheer(picked, target.holomem);
    },
  },
};
