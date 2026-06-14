/**
 * 白銀ノエル (hBP07-022) 白・2nd・HP220（#JP #3期生 #お酒）
 *
 * アーツ「元気もりもりさんでーまっする」(50, 特攻: 紫+50):
 *   自分の#3期生を持つホロメン1人を選ぶ。このターンの間、選んだホロメンのアーツに必要な無色-1。
 *   そのホロメンが2ndホロメンの〈白銀ノエル〉なら、かわりに、そのアーツに必要な無色-2。
 *   → arts.run でターン修正 kind:'artCostReduce'（無色 -1 / -2）を付与。【実装済み】
 *
 * ギフト「筋肉は裏切らない！」:
 *   [コラボポジション限定]相手のターンで、自分の#3期生を持つセンターホロメンがダウンした時、
 *   そのホロメンを含め重なっているホロメンすべてを手札に戻す。
 *   → triggers.onAnyDown（任意ホロメンのダウン監視）で実装。コラボにいるこのノエルが、
 *      相手のターンに自分のセンター#3期生のダウンを検知し、重なっているホロメンを手札へ戻す
 *      （アーカイブ前の onAnyDown 段階で downedInfo.holomem.stack を手札へ移すため archive されない）。
 */
export default {
  number: 'hBP07-022',
  arts: {
    '元気もりもりさんでーまっする': {
      *run(ctx) {
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => ctx.hasTag(e.top, '3期生'),
          title: 'このターン アーツ必要無色を減らす #3期生 ホロメンを選択',
        });
        if (!target) return;
        const chosen = target.holomem;
        const top = chosen.stack[0];
        // 2ndホロメンの〈白銀ノエル〉なら無色-2、それ以外は無色-1
        const amount = (top.name === '白銀ノエル' && top.bloomLevel === '2nd') ? 2 : 1;
        ctx.addTurnModifier({
          kind: 'artCostReduce', color: '無色', amount, ownerIdx: ctx.playerIdx,
          match: (h) => h === chosen,
          description: `このターン、${top.name} のアーツ必要無色-${amount}`,
        });
      },
    },
  },
  triggers: {
    // ギフト「筋肉は裏切らない！」: [コラボ限定]相手のターンで自分の#3期生センターがダウンした時、重なっているホロメンすべてを手札に戻す
    *onAnyDown(ctx) {
      const self = ctx.sourceHolomem;
      if (self?.stack[0].name !== '白銀ノエル') return;
      if (ctx.sourceHolomemPos()?.zone !== 'collab') return;  // [コラボポジション限定]
      if (ctx.state.turnPlayer === ctx.playerIdx) return;     // 相手のターン
      const di = ctx.downedInfo;
      if (!di || di.ownerIdx !== ctx.playerIdx) return;       // ダウンしたのが自分のホロメン
      if (di.zone !== 'center') return;                       // センターホロメン
      const downed = di.holomem;
      if (!(downed.stack[0].tags || []).includes('3期生')) return; // #3期生
      const cards = [...downed.stack];
      downed.stack.length = 0;
      for (const c of cards) ctx.addToHand(c);
      ctx.log(`白銀ノエル「筋肉は裏切らない！」: 重なっているホロメン${cards.length}枚を手札に戻した`);
    },
  },
};
