/**
 * ドッキリうさぎ (hBP06-088) サポート・アイテム LIMITED
 * 使用条件: 直前の相手のターンに自分のホロメンがダウンしていて、かつ自分のライフが相手より少ない時のみ。
 * 効果: 相手のセンターホロメンかコラボホロメンを1人選ぶ。選んだホロメンをお休みさせてバックポジションへ移動させ、
 *   次の相手のリセットステップでアクティブにならないようにする。
 *   → ctx.moveToBackRestedSkipReset（持ち主自動判定・rested＋skipNextReset）。
 * LIMITED：ターンに1枚しか使えない（engine 側で c.limited を制御）。
 */
export default {
  number: 'hBP06-088',
  support: {
    canUse(ctx) {
      const downedLastOppTurn = (ctx.player.downedCardsLastOppTurn || []).length > 0;
      const lifeBehind = ctx.player.life.length < ctx.opponent.life.length;
      // 対象（相手のセンター/コラボ）が存在すること
      const hasTarget = ctx.holomems('opp', (e) => e.pos.zone === 'center' || e.pos.zone === 'collab').length > 0;
      return downedLastOppTurn && lifeBehind && hasTarget;
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
        title: 'バックへ下げる相手のセンター/コラボホロメンを選択',
      });
      if (!entry) return;
      ctx.moveToBackRestedSkipReset(entry.holomem);
    },
  },
};
