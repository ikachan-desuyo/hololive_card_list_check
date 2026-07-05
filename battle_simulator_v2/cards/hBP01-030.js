/**
 * IRyS (hBP01-030) 白・1st・HP110（#EN #Promise #歌）
 * ブルームエフェクト「ステージを希望で包もう！」:
 *   このターンの間、自分の#Promiseを持つ[センターホロメンとコラボホロメン]のアーツ+30。
 * アーツ「一生懸命歌うから見ててね！」(40): 効果なし（素のアーツ）。
 */
export default {
  number: 'hBP01-030',
  bloomEffect: {
    name: 'ステージを希望で包もう！',
    *run(ctx) {
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 30,
        ownerIdx: ctx.playerIdx,
        match: (h) => {
          const zone = ctx.engine._zoneOf(h);
          if (zone !== 'center' && zone !== 'collab') return false;
          return ctx.hasTag(h.stack[0], 'Promise');
        },
        description: 'このターン、自分の#Promiseセンター/コラボホロメンのアーツ+30',
      });
    },
  },
};
