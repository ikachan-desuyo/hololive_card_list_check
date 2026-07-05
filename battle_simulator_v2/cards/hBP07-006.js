/**
 * AZKi (hBP07-006) 推しホロメン・紫
 * 推しスキル「行くよ、開拓者。」[ホロパワー：-1][ターンに1回]:
 *   直前の相手のターンに自分のホロメンがダウンしていたなら、自分のデッキから、イベント1枚を公開し、
 *   手札に加える。そしてデッキをシャッフルする。
 *   → oshiSkill。条件は player.downedCardsLastOppTurn（直前の相手ターンにダウンした自ホロメン）。
 */
export default {
  number: 'hBP07-006',

  // 推しステージスキル「ETERNiTY FRONTiER」: 自分のホロパワー1枚につき、センターの〈AZKi〉のアーツ+20（常時）
  oshiStageSkill: {
    name: 'ETERNiTY FRONTiER',
    artsPlus(holomem, engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      if (p.center !== holomem || holomem.stack[0].name !== 'AZKi') return 0;
      return (p.holoPower.length || 0) * 20;
    },
  },

  oshiSkill: {
    canUse(engine, ownerIdx) {
      return (engine.state.players[ownerIdx].downedCardsLastOppTurn || []).length > 0;
    },
    *run(ctx) {
      const cand = ctx.deckCards((c) => c.kind === 'support' && c.supportType === 'イベント');
      const picked = yield ctx.chooseCard({
        cards: cand, title: '手札に加えるイベントを選択（任意）', optional: true, skipLabel: '見つからなかったことにする',
      });
      if (picked) { ctx.removeFromDeck(picked); ctx.addToHand(picked); }
      ctx.shuffleDeck();
    },
  },
};
