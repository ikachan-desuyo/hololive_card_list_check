/**
 * アイラニ・イオフィフティーン (hBP05-023) 緑・2nd・HP200
 * ギフト「宇宙人のお姫様」: このホロメンが相手のホロメンをダウンさせた時、
 *   自分のアーカイブのエール1枚を自分の#ID1期生を持つホロメンに送れる。
 * アーツ「リレーションガーデン」(130+):
 *   [センターポジション限定]自分の推しホロメンが〈アイラニ・イオフィフティーン〉なら、
 *   自分のステージのエール3枚につき、このアーツ+20。
 */
export default {
  number: 'hBP05-023',
  triggers: {
    *onOpponentDown(ctx) {
      const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      const targets = ctx.holomems('self', (e) => ctx.hasTag(e.top, 'ID1期生'));
      if (cheers.length === 0 || targets.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: cheers,
        title: 'アーカイブから送るエールを選択（任意）',
        optional: true,
        skipLabel: '送らない',
      });
      if (!picked) return;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.hasTag(e.top, 'ID1期生'),
        title: 'エールを送る #ID1期生 ホロメンを選択',
      });
      if (target) {
        ctx.removeFromArchive(picked);
        ctx.attachCheer(picked, target.holomem);
      }
    },
  },
  arts: {
    'リレーションガーデン': {
      // [センター限定] 推しがイオフィなら、ステージのエール3枚につき +20
      dmgBonus(ctx) {
        if (ctx.engine._zoneOf(ctx.sourceHolomem) !== 'center') return 0;
        if (ctx.player.oshi?.name !== 'アイラニ・イオフィフティーン') return 0;
        let total = 0;
        for (const e of ctx.holomems('self')) total += e.holomem.cheers.length;
        return Math.floor(total / 3) * 20;
      },
    },
  },
};
