/**
 * 白銀ノエル (hBP05-011) 白・1st・HP150（#3期生）
 * ブルームエフェクト「みんなが居てくれて」:
 *   このターンの間、自分の#3期生を持つ[センターホロメンとコラボホロメン]のアーツ+10。
 * アーツ「団長幸せだよ」(40+):
 *   自分のステージの異なるカード名の#3期生を持つホロメン1人につき、このアーツ+10。
 */
export default {
  number: 'hBP05-011',
  bloomEffect: {
    name: 'みんなが居てくれて',
    *run(ctx) {
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 10, ownerIdx: ctx.playerIdx,
        // #3期生 かつ センター/コラボ にいるホロメン（解決時に動的判定）
        match: (h) => (h.stack[0].tags || []).includes('3期生') &&
          ['center', 'collab'].includes(ctx.engine._zoneOf(h)),
        description: 'このターン、#3期生のセンター/コラボのアーツ+10',
      });
    },
  },
  arts: {
    '団長幸せだよ': {
      dmgBonus(ctx) {
        const names = new Set();
        for (const e of ctx.holomems('self', (x) => ctx.hasTag(x.top, '3期生'))) names.add(e.top.name);
        return names.size * 10;
      },
    },
  },
};
