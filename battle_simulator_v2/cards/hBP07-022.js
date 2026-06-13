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
 *   → 【未実装/保留】このカード自身ではなく「別のホロメン（センターの#3期生）がダウンした時」を
 *      監視する効果。エンジンの triggers.onDown はダウンしたホロメン自身とその装着カードにしか
 *      発火しないため、コラボにいるこのカードが他ホロメンのダウンを監視する機構（任意ホロメンのダウン監視）が
 *      必要で、現状は未対応。
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
};
