/**
 * 一伊那尓栖 (hBP02-064) 紫・1st・Buzzホロメン・HP250（#EN #Myth #絵 #海）
 * アーツ「アルカイックスマイル」(60+):
 *   自分のアーカイブに#Mythを持つホロメンが5枚以上ある時、
 *     このホロメンのエール1枚を、自分の他のホロメンに付け替えられる（任意）。
 *   10枚以上ある時、さらに、このアーツ+50。
 */
const countMythInArchive = (ctx) =>
  ctx.player.archive.filter((c) => c.kind === 'holomen' && ctx.hasTag(c, 'Myth')).length;

export default {
  number: 'hBP02-064',
  arts: {
    'アルカイックスマイル': {
      dmgBonus(ctx) {
        // アーカイブの#Mythホロメンが10枚以上ならこのアーツ+50
        return countMythInArchive(ctx) >= 10 ? 50 : 0;
      },
      *run(ctx) {
        // 5枚以上の時のみエール付け替えが可能
        if (countMythInArchive(ctx) < 5) return;
        const cheers = ctx.sourceHolomem.cheers || [];
        if (cheers.length === 0) return;
        // 「自分の他のホロメン」= このホロメン以外の自分のホロメン
        const targets = ctx.holomems('self', (e) => e.holomem !== ctx.sourceHolomem);
        if (targets.length === 0) return;
        const cheer = yield ctx.chooseCard({
          cards: cheers,
          title: '他のホロメンに付け替えるエールを選択（任意）',
          optional: true,
          skipLabel: '付け替えない',
        });
        if (!cheer) return;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.holomem !== ctx.sourceHolomem,
          title: '付け替え先のホロメンを選択',
        });
        if (!target) return;
        ctx.moveCheer(cheer, ctx.sourceHolomem, target.holomem);
      },
    },
  },
};
