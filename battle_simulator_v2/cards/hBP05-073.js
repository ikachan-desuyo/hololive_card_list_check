/**
 * アユンダ・リス (hBP05-073) 黄・2nd・HP200（#ID1期生,#歌）
 * アーツ「IT's Time to RE4GE !!!!!」(50+): 自分の推しホロメンが〈アユンダ・リス〉なら、
 *   自分の#ID1期生を持つホロメン全員のエール1枚につき、このアーツ+10。ただし、数える枚数は10枚まで。
 * コラボエフェクト「BRRRR」: 自分のエールデッキの上から3枚を見る。その中から、エール1枚を公開し、
 *   自分の〈アユンダ・リス〉に送る。そして残ったエールを好きな順でエールデッキの下に戻す。その後、自分のデッキを1枚引く。
 */
export default {
  number: 'hBP05-073',
  collabEffect: {
    name: 'BRRRR',
    *run(ctx) {
      const looked = ctx.lookTopCheerDeck(3);
      const pool = [...looked];
      const risu = ctx.holomems('self', (e) => e.top.name === 'アユンダ・リス');
      if (looked.length > 0 && risu.length > 0) {
        const picked = yield ctx.chooseCard({ cards: pool, title: '〈アユンダ・リス〉に送るエールを選択', displayCards: [] });
        if (picked) {
          const target = yield ctx.chooseHolomem({ side: 'self', filter: (e) => e.top.name === 'アユンダ・リス', title: 'エールを送る〈アユンダ・リス〉を選択' });
          if (target) {
            pool.splice(pool.indexOf(picked), 1);
            ctx.sendRevealedCheer(picked, target.holomem);
          }
        }
      }
      const ordered = yield* ctx.orderCardsFlow(pool, 'エールデッキの下に戻す順番');
      ctx.cheerDeckToBottom(ordered);
      ctx.draw(1);
    },
  },
  arts: {
    "IT's Time to RE4GE !!!!!": {
      dmgBonus(ctx) {
        if (ctx.player.oshi?.name !== 'アユンダ・リス') return 0;
        let n = 0;
        for (const e of ctx.holomems('self', (x) => ctx.hasTag(x.top, 'ID1期生'))) n += e.holomem.cheers.length;
        return Math.min(n, 10) * 10;
      },
    },
  },
};
