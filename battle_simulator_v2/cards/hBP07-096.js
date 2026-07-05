/**
 * ちゃま旅 (hBP07-096) サポート・イベント
 *
 * [サポート効果]
 *   自分のバックポジションの〈赤井はあと〉1人を選ぶ。
 *   選んだホロメンを含め重なっているホロメンすべてを好きな順でデッキの下に戻す。
 *   このターンの間、自分の〈赤井はあと〉全員のアーツに必要な無色-1。
 *
 * 実装メモ:
 *   - 「重なっているホロメンすべて」= Bloomで重なったホロメンカード（stack）全部を
 *     好きな順でデッキの下に戻す（通常の「ステージ外移動は最上段のみ」(4.4.7)を上書きする明示効果）。
 *   - stack のカードはホロメンカードのみ。付いているエール / サポート（装着）は
 *     テキストに「デッキに戻す」記載が無く、ホロメンがステージを離れることで宙に浮くため
 *     アーカイブする（11.3.1.2 / 4.4.7 と同じ扱い）。これは returnHolomemToDeck が行う。
 *   - 「能力でデッキに戻った時」の誘発（推しステージスキル等）を発火させるため、
 *     直接デッキへ戻さず ctx.returnHolomemToDeck 経由で戻す（Q584）。
 *   - 無色-1 はターン修正 artCostReduce(color:'無色') を〈赤井はあと〉全員に適用（毎回評価の match）。
 *   - 使用条件: バックに〈赤井はあと〉が1人以上いること。
 */
export default {
  number: 'hBP07-096',
  support: {
    canUse(ctx) {
      return ctx.holomems('self', (e) => e.pos.zone === 'back' && e.top.name === '赤井はあと').length > 0;
    },
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.pos.zone === 'back' && e.top.name === '赤井はあと',
        title: 'デッキの下に戻す〈赤井はあと〉（バック）を選択',
      });
      if (target) {
        const h = target.holomem;
        const topName = h.stack[0].name;
        const stackLen = h.stack.length;
        // 重なっているホロメンカードすべて（stack）を好きな順でデッキの下に戻す。
        // 順番を先に決めてから stack を並べ替え、能力によるデッキ戻し（推しステージスキル等の
        // 「能力でデッキに戻った時」誘発：はあちゃまなう等）を発火させる returnHolomemToDeck 経由で戻す。Q584
        const ordered = yield* ctx.orderCardsFlow([...h.stack], 'デッキの下に戻す順番');
        h.stack = ordered; // returnHolomemToDeck は stack の順でデッキ下に積むため、宣言順を反映
        // 付いていたエール・装着カードのアーカイブもエンジン側（returnHolomemToDeck）で行われる。
        yield* ctx.returnHolomemToDeck(h, { bottom: true });
        ctx.log(`${topName}（重なり${stackLen}枚）をデッキの下に戻した`);
      }
      // このターンの間、自分の〈赤井はあと〉全員のアーツ必要無色-1
      ctx.addTurnModifier({
        kind: 'artCostReduce', color: '無色', amount: 1, ownerIdx: ctx.playerIdx,
        match: (m) => m.stack[0].name === '赤井はあと',
        description: 'このターン、〈赤井はあと〉全員のアーツ必要無色-1',
      });
    },
  },
};
