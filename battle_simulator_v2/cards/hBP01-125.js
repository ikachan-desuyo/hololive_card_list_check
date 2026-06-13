/**
 * KFP (hBP01-125) サポート・ファン
 *
 * [サポート効果] このファンをホロメンに手札から付けた時、自分の手札1枚をアーカイブできる：
 *   自分のデッキを1枚引く。
 *   → triggers.onAttach。コストは任意（「できる」）。手札1枚をアーカイブできたら1ドロー。
 *
 * このファンは、自分の〈小鳥遊キアラ〉だけに付けられ、1人につき何枚でも付けられる。
 *   → attachRule.canAttach + unlimited。
 *
 * 備考: ファンサポートは手札からのみプレイされるため「手札から付けた時」は通常プレイそのもの。
 */
export default {
  number: 'hBP01-125',
  attachRule: {
    canAttach(holomem) {
      return holomem.stack[0].name === '小鳥遊キアラ';
    },
    unlimited: true, // 1人に何枚でも
  },
  triggers: {
    // 「付けた時、手札1枚をアーカイブできる：デッキを1枚引く」
    *onAttach(ctx) {
      if (ctx.player.hand.length === 0) return; // コスト（手札1枚）を払えない
      const ok = yield ctx.confirm('手札1枚をアーカイブしてデッキを1枚引きますか？');
      if (!ok) return;
      const card = yield ctx.chooseCard({
        cards: [...ctx.player.hand],
        title: 'コスト: アーカイブする手札を選択',
      });
      if (!card) return;
      ctx.removeFromHand(card);
      ctx.player.archive.push(card);
      ctx.log('手札1枚をアーカイブした');
      ctx.draw(1);
    },
  },
};
