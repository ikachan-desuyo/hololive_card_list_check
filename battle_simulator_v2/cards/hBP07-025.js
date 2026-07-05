/**
 * 大神ミオ (hBP07-025) 緑・1st・HP170（#JP #ゲーマーズ #ケモミミ #料理）
 * コラボエフェクト「抹茶パフェ～！きゅんです」:
 *   自分のサポートカードが付いている#ゲーマーズを持つホロメン1人を選ぶ。
 *   このターンの間、選んだホロメンのアーツ+20。
 *   → サポートカード（ファン/マスコット/ツール等）が付いている = attachments.length > 0
 * アーツ「ゲーマーズカフェへようこそ」(20):
 *   自分のアーカイブのエール1枚を自分の#ゲーマーズを持つホロメンに送る。
 */
export default {
  number: 'hBP07-025',
  collabEffect: {
    name: '抹茶パフェ～！きゅんです',
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.hasTag(e.top, 'ゲーマーズ') && e.holomem.attachments.length > 0,
        title: 'このターン アーツ+20する #ゲーマーズ ホロメンを選択（サポートカードが付いている）',
        optional: true,
      });
      if (!target) return;
      const chosen = target.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 20, ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターン、${chosen.stack[0].name} のアーツ+20`,
      });
    },
  },
  arts: {
    'ゲーマーズカフェへようこそ': {
      *run(ctx) {
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length === 0) return;
        const gamers = ctx.holomems('self', (e) => ctx.hasTag(e.top, 'ゲーマーズ'));
        if (gamers.length === 0) return;
        const picked = yield ctx.chooseCard({
          cards: cheers,
          title: 'アーカイブから送るエール1枚を選択',
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
  },
};
