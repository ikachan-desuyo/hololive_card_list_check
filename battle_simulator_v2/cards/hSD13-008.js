/**
 * ジジ・ムリン (hSD13-008) 黄・Debut・HP100（#EN #Justice）
 * コラボエフェクト「For Justice! -GG-」:
 *   自分のアーカイブのエール1枚を自分の#Justiceを持つホロメンに送る。
 *   → アーカイブのエールを取り除き、#Justiceホロメンへ付ける（attachCheer）。
 * アーツ「GI MURIN!!!!」(20):
 *   追加効果なし（素のダメージのみ）のため定義不要。
 */
export default {
  number: 'hSD13-008',
  collabEffect: {
    name: 'For Justice! -GG-',
    *run(ctx) {
      const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      if (cheers.length === 0) return; // 送れるエールがない
      // 送り先候補: 自分の#Justiceを持つホロメン
      const targets = ctx.holomems('self', (e) => ctx.hasTag(e.top, 'Justice'));
      if (targets.length === 0) return; // 送り先がいない
      const picked = yield ctx.chooseCard({
        cards: cheers,
        title: '#Justiceホロメンに送るエールをアーカイブから選択',
      });
      if (!picked) return;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.hasTag(e.top, 'Justice'),
        title: `${picked.name} を送る #Justice ホロメンを選択`,
      });
      if (!target) return;
      ctx.removeFromArchive(picked);
      ctx.attachCheer(picked, target.holomem);
    },
  },
};
