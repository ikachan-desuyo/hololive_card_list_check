/**
 * シオリ・ノヴェラ (hSD12-005) 青・1st・HP160（#EN #Advent）
 * コラボエフェクト「異世界への旅立ちと幸せ」:
 *   自分のアーカイブのエール1枚を自分の#Adventを持つホロメンに送る。
 * アーツ「車窓から見える星がとてもきれいよ」(40): テキスト効果なし。
 */
export default {
  number: 'hSD12-005',
  collabEffect: {
    name: '異世界への旅立ちと幸せ',
    *run(ctx) {
      const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      const targets = ctx.holomems('self', (e) => ctx.hasTag(e.top, 'Advent'));
      if (cheers.length === 0 || targets.length === 0) return;
      // 「送る」（任意の文言なし）。送るエールと送り先#Adventホロメンを選ぶ。
      const picked = yield ctx.chooseCard({
        cards: cheers,
        title: '#Adventホロメンに送るエールを選択（アーカイブ）',
      });
      if (!picked) return;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.hasTag(e.top, 'Advent'),
        title: 'エールを送る #Advent ホロメンを選択',
      });
      if (!target) return;
      ctx.removeFromArchive(picked);
      ctx.attachCheer(picked, target.holomem);
    },
  },
};
