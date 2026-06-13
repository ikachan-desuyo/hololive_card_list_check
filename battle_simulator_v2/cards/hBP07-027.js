/**
 * 大神ミオ (hBP07-027) 緑・1st・HP160（#JP #ゲーマーズ #ケモミミ #料理）
 * ブルームエフェクト「ハートの女王の采配」:
 *   このホロメン以外の自分のバックホロメン1人を選ぶ。
 *   このターンの間、選んだホロメンのアーツ+30。
 * アーツ「女王陛下と呼びなさい」(70):
 *   [センターポジション限定]このアーツで相手のホロメンをダウンさせた時、自分のデッキを1枚引く。
 *   → 効果はセンターから使った時のみ。onDownDealt 冒頭でソース位置を判定する。
 */
export default {
  number: 'hBP07-027',
  bloomEffect: {
    name: 'ハートの女王の采配',
    *run(ctx) {
      const self = ctx.sourceHolomem;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.pos.zone === 'back' && e.holomem !== self,
        title: 'このターン アーツ+30するバックホロメンを選択',
      });
      if (!target) return;
      const chosen = target.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 30, ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターン、${chosen.stack[0].name} のアーツ+30`,
      });
    },
  },
  arts: {
    '女王陛下と呼びなさい': {
      // [センターポジション限定]「このアーツで相手をダウンさせた時」→ エンジンが onDownDealt を発火
      *onDownDealt(ctx) {
        if (ctx.sourceHolomemPos()?.zone !== 'center') return; // [センターポジション限定]
        ctx.draw(1);
      },
    },
  },
};
