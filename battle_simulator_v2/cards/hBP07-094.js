/**
 * ギリわるロボ (hBP07-094) サポート・イベント・LIMITED
 *
 * [サポート効果]
 *   自分の手札すべてをデッキに戻してシャッフルする。そして自分のデッキを4枚引く。
 *   自分のライフが3以下なら、かわりに、お互いの手札すべてをデッキに戻して
 *   シャッフルする。そしてそれぞれのデッキを4枚引く。
 * LIMITED：ターンに1枚しか使えない（エンジンがLIMITED制御）。
 *
 * 解釈:
 *   - 「ライフが3以下」= 自分のライフ枚数 (player.life.length) が 3 以下。
 *   - 効果は強制で選択を伴わない（「すべて」戻す・「4枚引く」）。
 *   - このサポートカード自身は使用時にプレイ済み（手札から離れている）ので、
 *     手札に含まれない（エンジンが support の run 呼び出し前に手札から除いている前提）。
 *   - 相手側の手札/デッキ操作は player 固定の ctx プリミティブでは扱えないため、
 *     engine 直接操作で行う（手札→デッキ末尾に移動→シャッフル→4枚ドロー）。
 */
function returnAllHandAndShuffle(engine, p) {
  const n = p.hand.length;
  p.deck.push(...p.hand);
  p.hand = [];
  engine._shuffle(p.deck);
  engine.log(`${p.name}: 手札${n}枚をデッキに戻してシャッフル`);
}

function drawN(engine, p, n) {
  let drawn = 0;
  for (let i = 0; i < n && p.deck.length > 0; i++) {
    p.hand.push(p.deck.shift());
    drawn++;
  }
  engine.log(`${p.name}: ${drawn}枚ドロー`);
}

export default {
  number: 'hBP07-094',
  ai: {
    // 手札を入れ替えて4枚引く。手札が4枚未満なら実質ドロー、多くても引き直しの価値はある。
    // ライフ3以下なら相手の手札も流せるので価値が上がる。
    supportValue({ player }) {
      return player.life.length <= 3 ? 22 : 14;
    },
  },
  support: {
    *run(ctx) {
      const engine = ctx.engine;
      if (ctx.player.life.length <= 3) {
        // かわりに、お互いの手札すべてをデッキに戻してシャッフルし、それぞれ4枚引く
        returnAllHandAndShuffle(engine, ctx.player);
        returnAllHandAndShuffle(engine, ctx.opponent);
        drawN(engine, ctx.player, 4);
        drawN(engine, ctx.opponent, 4);
      } else {
        // 自分の手札すべてをデッキに戻してシャッフルし、自分のデッキを4枚引く
        returnAllHandAndShuffle(engine, ctx.player);
        drawN(engine, ctx.player, 4);
      }
    },
  },
};
