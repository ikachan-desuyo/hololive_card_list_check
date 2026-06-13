/**
 * 宝鐘マリン (hBP02-033) 赤・2nd・HP200（#JP #3期生 #絵 #海）
 * ブルームエフェクト「ゴシッククィーン」:
 *   自分のアーカイブのホロメン1枚を手札に戻せる（任意）。
 *   その後、このホロメンに重なっているホロメンが3枚以上の時、
 *   相手のセンターホロメンかコラボホロメンに特殊ダメージ50を与える。
 * アーツ「キミたち～？　船長、かわいい？」(80+):
 *   このホロメンに重なっているホロメン1枚につき、このアーツ+20。
 *
 * 注: stack[0] が最上段（このカード自身）。「重なっているホロメン」= stack.length - 1。
 */
export default {
  number: 'hBP02-033',
  bloomEffect: {
    name: 'ゴシッククィーン',
    *run(ctx) {
      // アーカイブのホロメン1枚を手札に戻せる（任意）
      const archiveHolomems = ctx.player.archive.filter((c) => c.kind === 'holomen');
      if (archiveHolomems.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: archiveHolomems,
          title: '手札に戻すアーカイブのホロメンを選択',
          optional: true,
        });
        if (picked) {
          ctx.removeFromArchive(picked);
          ctx.addToHand(picked, { reveal: true });
        }
      }
      // 重なっているホロメンが3枚以上なら特殊ダメージ50
      const stacked = Math.max(0, (ctx.sourceHolomem.stack.length || 1) - 1);
      if (stacked >= 3) {
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
          title: '特殊ダメージ50を与える相手ホロメンを選択（センターかコラボ）',
        });
        if (target) ctx.dealSpecialDamage(target, 50);
      }
    },
  },
  arts: {
    'キミたち～？　船長、かわいい？': {
      dmgBonus(ctx) {
        const stacked = Math.max(0, (ctx.sourceHolomem?.stack?.length || 1) - 1);
        return stacked * 20;
      },
    },
  },
};
