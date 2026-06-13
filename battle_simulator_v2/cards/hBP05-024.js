/**
 * AZKi (hBP05-024) 緑・Buzz・1st・HP250（#0期生）
 * アーツ「あずきんちでゆっくりしよ」(50): 自分のステージに〈開拓者〉があるなら、
 *   自分のエールデッキの上から1枚を自分の〈AZKi〉に送る。
 * アーツ「帰っちゃうの？」(80+): 自分の推しホロメンが〈AZKi〉なら、
 *   このホロメンのエール1枚につき、このアーツ+20。
 */
export default {
  number: 'hBP05-024',
  arts: {
    'あずきんちでゆっくりしよ': {
      *run(ctx) {
        const hasPioneer = ctx.holomems('self', (e) =>
          e.holomem.attachments.some((a) => a.name === '開拓者')).length > 0;
        if (hasPioneer && ctx.sourceHolomem) ctx.sendCheerFromCheerDeckTop(ctx.sourceHolomem);
      },
    },
    '帰っちゃうの？': {
      dmgBonus(ctx) {
        if (ctx.player.oshi?.name !== 'AZKi') return 0;
        return (ctx.sourceHolomem?.cheers.length || 0) * 20;
      },
    },
  },
};
