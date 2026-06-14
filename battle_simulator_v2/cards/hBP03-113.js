/**
 * Risuners (hBP03-113) サポート・ファン
 *
 * [サポート効果] [ターンに1回]このファンが付いているホロメンにエールが付いた時、
 *   このターンの間、このホロメンのアーツ+10。
 *   → 「（このホロメンに）エールが付いた時」に誘発する効果。
 *      エンジンに「エールが付いた時」(onCheerAttached) のトリガーディスパッチが
 *      存在しないため【保留】。実装するには context.js の attachCheer / engine の
 *      attachCheer 解決時に、付け先ホロメンの装着カードの onCheerAttached を走査して
 *      誘発する仕組みが必要（誘発時に ctx.addTurnModifier({kind:'artsPlus', amount:10, ...}) を
 *      ターンに1回だけ積む）。
 *
 * 付け先制限のみ実装:
 *   このファンは、自分の〈アユンダ・リス〉だけに付けられ、1人につき何枚でも付けられる。
 */
export default {
  number: 'hBP03-113',
  attached: {
    // [ターンに1回] このファンが付いているホロメンにエールが付いた時、このターンの間このホロメンのアーツ+10。
    // attachCheer から同期で呼ばれる（即時・選択不要）。ターン1回はホロメン単位で制御。
    onCheerAttached(holomem, engine) {
      if (holomem._risunersBonusTurn === engine.state.turn) return; // ターンに1回
      holomem._risunersBonusTurn = engine.state.turn;
      const ownerIdx = engine.state.players.findIndex((p) => engine._stageHolomems(p).includes(holomem));
      if (ownerIdx < 0) return;
      engine.state.modifiers.push({
        duration: 'turn', kind: 'artsPlus', ownerIdx, amount: 10,
        match: (h) => h === holomem,
        description: 'Risuners: エールが付いたのでこのターン アーツ+10',
      });
    },
  },
  attachRule: {
    canAttach(holomem) {
      return holomem.stack[0].name === 'アユンダ・リス';
    },
    unlimited: true, // 1人に何枚でも
  },
};
