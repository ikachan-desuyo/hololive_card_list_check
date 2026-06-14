/**
 * ブヒー！ (hBP07-099) サポート・イベント・LIMITED
 *
 * [サポート効果]
 *   ① 自分のデッキを2枚引く。
 *   ② その後、直前の相手のターンに自分のホロメンがダウンしていたなら、
 *      自分のステージのホロメン1人を選ぶ。このターンの間、選んだホロメンのアーツ+20。
 *   ③ さらに、直前の相手のターンにダウンしていた自分のホロメンが〈ラプラス・ダークネス〉なら、
 *      自分のデッキを2枚引く。
 * LIMITED：ターンに1枚しか使えない（LIMITED制御はエンジン側）。
 *
 * 実装状況: ①②③ すべて実装。
 *   engine が「直前の相手ターンにダウンした自分のホロメンのカード一覧」を
 *   p.downedCardsLastOppTurn に保持している（相手ターン中に蓄積→自ターンで参照）。
 *   ② それが空でなければ、自分のステージのホロメン1人を選びこのターン アーツ+20。
 *   ③ その中に〈ラプラス・ダークネス〉がいれば、さらにデッキを2枚引く。
 */
export default {
  number: 'hBP07-099',
  support: {
    *run(ctx) {
      // ① 自分のデッキを2枚引く
      ctx.draw(2);
      // ② 直前の相手ターンに自分のホロメンがダウンしていたなら、ホロメン1人を選びアーツ+20
      const downed = ctx.player.downedCardsLastOppTurn || [];
      if (downed.length === 0) return;
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        title: 'このターン アーツ+20する自分のホロメンを選択',
      });
      if (entry) {
        const chosen = entry.holomem;
        ctx.addTurnModifier({
          kind: 'artsPlus', amount: 20, ownerIdx: ctx.playerIdx,
          match: (h) => h === chosen,
          description: 'ブヒー！: このターン このホロメンのアーツ+20',
        });
      }
      // ③ ダウンしていた自分のホロメンに〈ラプラス・ダークネス〉がいれば、さらに2枚引く
      if (downed.some((c) => c.name === 'ラプラス・ダークネス')) ctx.draw(2);
    },
  },
};
