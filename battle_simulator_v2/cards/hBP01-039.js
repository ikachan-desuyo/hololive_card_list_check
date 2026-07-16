/**
 * 兎田ぺこら (hBP01-039) 緑・Debut・HP60（#JP #3期生 #ケモミミ）
 * コラボエフェクト「ギャラクシーアイドル」:
 *   自分の推しホロメンが〈兎田ぺこら〉の時、サイコロを1回振れる：
 *   偶数の時、自分のエールデッキの上から1枚を、自分のホロメンに送る。
 *   （「振れる」=任意）
 * アーツ「無重力ジャンプ！」(30): テキスト効果なし（素点のみ）。
 */
export default {
  number: 'hBP01-039',
  collabEffect: {
    name: 'ギャラクシーアイドル',
    *run(ctx) {
      // 条件: 自分の推しホロメンが〈兎田ぺこら〉
      if (ctx.player.oshi?.name !== '兎田ぺこら') return;
      // 「振れる」=任意。振らない選択も可。
      const ok = yield ctx.confirm('サイコロを1回振りますか？（偶数でエールデッキの上から1枚を自分のホロメンに送る）');
      if (!ok) return;
      const value = (yield* ctx.rollDice());
      // 〈兎田ぺこら〉の能力でサイコロを振った（hBP03-023「カードするぺこ」の判定用共有フラグ）
      ctx.markOncePerTurn('兎田ぺこら:diceRolled');
      if (value % 2 !== 0) return; // 偶数の時のみ
      if (ctx.player.cheerDeck.length === 0) return;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        title: 'エールデッキの上から1枚を送る自分のホロメンを選択',
      });
      if (!target) return;
      ctx.sendCheerFromCheerDeckTop(target.holomem);
    },
  },
};
