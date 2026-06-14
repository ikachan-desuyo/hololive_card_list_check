/**
 * UDIN (hBP02-097) サポート・マスコット
 * [サポート効果] このマスコットが付いているホロメンのアーツ+10。
 *
 * ◆〈クレイジー・オリー〉に付いていたら能力追加:
 *   このマスコットが付いているホロメンがBloomした時、自分のデッキを1枚引いた後、手札1枚をアーカイブする。
 *   → triggers.onBloom で実装。Bloom後の top が〈クレイジー・オリー〉なら、1枚引いた後に手札1枚をアーカイブ（強制）。
 *
 * マスコットは、自分のホロメン1人につき1枚だけ付けられる（エンジンのマスコット標準ルールで処理）。
 */
export default {
  number: 'hBP02-097',
  attached: {
    artsPlus() {
      return 10;
    },
  },
  triggers: {
    // ◆〈クレイジー・オリー〉に付いていたら: Bloomした時、デッキを1枚引いた後、手札1枚をアーカイブする
    * onBloom(ctx) {
      const h = ctx.sourceHolomem;
      if (h?.stack[0].name !== 'クレイジー・オリー') return;
      ctx.draw(1);
      if (ctx.player.hand.length === 0) return;
      const card = yield ctx.chooseCard({ cards: [...ctx.player.hand], title: 'アーカイブする手札1枚を選択' });
      if (card) { ctx.removeFromHand(card); ctx.player.archive.push(card); }
    },
  },
};
