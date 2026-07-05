/**
 * 水宮枢 (hBP08-051) ホロメン・1st
 *
 * ギフト「愛のエゴサ」:
 *   [センターポジション限定]自分の〈水宮枢〉がコラボした時、相手のセンターホロメンを選ぶ。
 *   次の相手のターンが終了するまで、選んだホロメンのバトンタッチに必要な無色+1。
 *   → triggers.onCollab（傍観）。ギフト保持者(=このセンター水宮枢)がセンターにいて、
 *     コラボしたホロメン(ctx.collabInfo.holomem)が〈水宮枢〉のとき、相手センターを選び
 *     batonCostReduce(無色 -1=必要+1) を untilTurn=次の相手ターン終了 まで付与する。
 *
 * アーツ「8時間35分」:
 *   自分のエールデッキの上から1枚を自分の〈水宮枢〉に送る。
 */
export default {
  number: 'hBP08-051',
  triggers: {
    *onCollab(ctx) {
      const self = ctx.sourceHolomem; // 傍観しているギフト保持者
      if (ctx.engine._zoneOf(self) !== 'center') return;            // [センターポジション限定]
      const collaber = ctx.collabInfo?.holomem;
      if (!collaber || !ctx.nameIs(collaber.stack[0], '水宮枢')) return; // コラボしたのが〈水宮枢〉
      const opp = ctx.opponent;
      if (!opp.center) return;
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'center',
        title: 'バトンタッチに必要な無色+1にする相手のセンターホロメンを選択',
      });
      if (!target) return;
      const chosen = target.holomem;
      ctx.addTurnModifier({
        kind: 'batonCostReduce',
        color: '無色',
        amount: -1, // 負値＝必要エール+1
        ownerIdx: 1 - ctx.playerIdx, // バトンタッチするのは相手プレイヤー
        untilTurn: ctx.engine.state.turn + 1, // 次の相手のターンが終了するまで
        match: (hm) => hm === chosen,
        description: `${chosen.stack[0].name} のバトンタッチに必要な無色+1（次の相手のターン終了まで）`,
      });
      ctx.log('水宮枢「愛のエゴサ」: 相手センターのバトンタッチに必要な無色+1');
    },
  },
  arts: {
    '8時間35分': {
      *run(ctx) {
        if (ctx.player.cheerDeck.length === 0) return;
        const cand = ctx.holomems('self', (e) => ctx.nameIs(e.top, '水宮枢'));
        if (cand.length === 0) return;
        const target = cand.length === 1
          ? cand[0]
          : yield ctx.chooseHolomem({ side: 'self', filter: (e) => ctx.nameIs(e.top, '水宮枢'), title: 'エールを送る〈水宮枢〉を選択' });
        if (target) ctx.sendCheerFromCheerDeckTop(target.holomem);
      },
    },
  },
};
