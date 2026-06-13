/**
 * アイラニ・イオフィフティーン 2nd (hBP01-055)
 * コラボエフェクト「AREA 15」:
 *   自分のアーカイブのエール1枚ずつを、自分の#IDを持つホロメン1～3人に送れる。
 * アーツ「リレーションスカイ」:
 *   自分のステージに〈アイラニ・イオフィフティーン〉以外の#IDを持つホロメンがいる時、
 *   このアーツ+50。
 */
export default {
  number: 'hBP01-055',
  collabEffect: {
    name: 'AREA 15',
    *run(ctx) {
      // 「エール1枚ずつを、…ホロメン1～3人に送れる」
      // = 別々のホロメン1～3人に、それぞれ1枚ずつ。同じホロメンに複数枚は送れない
      const used = new Set();
      for (let i = 0; i < 3; i++) {
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length === 0) break;
        const eligible = ctx.holomems('self', (e) => ctx.hasTag(e.top, 'ID') && !used.has(e.holomem));
        if (eligible.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: cheers,
          title: `アーカイブから送るエールを選択（${i + 1}/3・任意）`,
          optional: true,
          skipLabel: '終了する',
        });
        if (!picked) break;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => ctx.hasTag(e.top, 'ID') && !used.has(e.holomem),
          title: 'エールを送る #ID ホロメンを選択（まだ送っていないホロメン）',
        });
        if (!target) break;
        used.add(target.holomem);
        ctx.removeFromArchive(picked);
        ctx.attachCheer(picked, target.holomem);
      }
    },
  },
  arts: {
    'リレーションスカイ': {
      dmgBonus(ctx) {
        const others = ctx.holomems('self', (e) =>
          ctx.hasTag(e.top, 'ID') && e.top.name !== 'アイラニ・イオフィフティーン');
        return others.length > 0 ? 50 : 0;
      },
    },
  },
};
