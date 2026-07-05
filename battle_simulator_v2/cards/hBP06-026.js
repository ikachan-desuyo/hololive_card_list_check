/**
 * 風真いろは (hBP06-026) 緑・Buzz・1st（#秘密結社holoX）
 * ギフト「元気をお届け！」: [センターポジション限定]自分のホロメンがコラボした時、自分の手札が5枚以上なら、
 *   自分のエールデッキの上から1枚を自分のコラボホロメンに送れる。
 *   → triggers.onCollab（誰かがコラボした時に発火。ctx.sourceHolomem=このいろは、ctx.player.collab=コラボしたホロメン）
 * アーツ「喜んでもらえたらいいな」(60): テキスト効果なし。
 */
export default {
  number: 'hBP06-026',
  triggers: {
    *onCollab(ctx) {
      if (ctx.sourceHolomemPos()?.zone !== 'center') return; // [センター限定]
      if (ctx.player.hand.length < 5) return;
      const collab = ctx.player.collab;
      if (!collab) return;
      const ok = yield ctx.confirm('エールデッキの上から1枚をコラボホロメンに送りますか？');
      if (ok) ctx.sendCheerFromCheerDeckTop(collab);
    },
  },
};
