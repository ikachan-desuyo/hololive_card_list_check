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
 *     アーカイブする（11.3.1.2 / 4.4.7 と同じ扱い）。
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
        // 重なっているホロメンカードすべて（stack）を好きな順でデッキの下に戻す
        const stackCards = [...h.stack];
        const ordered = yield* ctx.orderCardsFlow(stackCards, 'デッキの下に戻す順番');
        // 付いていたエール・装着カードはアーカイブ（テキストに戻す記載が無く宙に浮くため）
        if (h.cheers.length > 0 || h.attachments.length > 0) {
          ctx.player.archive.push(...h.cheers, ...h.attachments);
          ctx.log(`${stackCards[0].name} に付いていたエール/サポートをアーカイブ`);
        }
        // ステージから取り除いてからデッキの下へ
        ctx.engine._removeHolomem(ctx.player, target.pos);
        ctx.deckToBottom(ordered);
        ctx.log(`${stackCards[0].name}（重なり${stackCards.length}枚）をデッキの下に戻した`);
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
