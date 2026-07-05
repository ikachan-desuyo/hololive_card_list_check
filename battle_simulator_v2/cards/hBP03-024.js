/**
 * 風真いろは 2nd (hBP03-024) 緑・HP200（#JP, #秘密結社holoX）
 * ブルームエフェクト「風真が護る」:
 *   自分のアーカイブのエール1枚ずつを、自分の〈風真いろは〉と〈星街すいせい〉1人ずつに送れる。
 *   = 〈風真いろは〉と〈星街すいせい〉それぞれに、アーカイブからエール1枚ずつ（任意・各0可）。
 * アーツ「風真が斬る」(100+):
 *   このホロメンに緑以外のエールが2枚以上付いている時、このアーツ+50。
 */
const SEND_TARGETS = ['風真いろは', '星街すいせい'];

export default {
  number: 'hBP03-024',
  bloomEffect: {
    name: '風真が護る',
    *run(ctx) {
      // 「〈風真いろは〉と〈星街すいせい〉1人ずつに」= 各名前のホロメン1人へそれぞれ1枚まで
      const used = new Set();
      for (const targetName of SEND_TARGETS) {
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length === 0) break;
        const eligible = ctx.holomems('self', (e) =>
          e.top.name === targetName && !used.has(e.holomem));
        if (eligible.length === 0) continue;
        const picked = yield ctx.chooseCard({
          cards: cheers,
          title: `〈${targetName}〉に送るエールを選択（任意）`,
          optional: true,
          skipLabel: '送らない',
        });
        if (!picked) continue;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.top.name === targetName && !used.has(e.holomem),
          title: `エールを送る〈${targetName}〉を選択`,
        });
        if (!target) continue;
        used.add(target.holomem);
        ctx.removeFromArchive(picked);
        ctx.attachCheer(picked, target.holomem);
      }
    },
  },
  arts: {
    '風真が斬る': {
      dmgBonus(ctx) {
        // 「緑以外のエール」= 色が緑でないエール（無色も含む。hBP06-048「青以外」と同じ解釈）
        const cheers = ctx.sourceHolomem?.cheers || [];
        const nonGreen = cheers.filter((c) => c.color && c.color !== '緑');
        return nonGreen.length >= 2 ? 50 : 0;
      },
    },
  },
};
