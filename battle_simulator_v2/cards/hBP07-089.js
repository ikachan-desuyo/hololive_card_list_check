/**
 * 虎金妃笑虎 (hBP07-089) 黄・1st（#FLOW GLOW）
 * ブルームエフェクト「っしゃ反撃抜刀」: 直前の相手のターンに自分の#FLOW GLOWを持つホロメンがダウンしていたなら、
 *   自分のデッキを2枚引く。ターンに1回しか使えない。
 *   → bloomEffect。player.downedCardsLastOppTurn に #FLOW(かつ#GLOW) のカードがあれば2ドロー。
 * アーツ「スッゲーワクワクするしょ！！」(50): テキスト効果なし。
 */
export default {
  number: 'hBP07-089',
  bloomEffect: {
    name: 'っしゃ反撃抜刀',
    *run(ctx) {
      if (ctx.oncePerTurnUsed('hBP07-089:反撃抜刀')) return;
      const downed = ctx.player.downedCardsLastOppTurn || [];
      const flowGlow = downed.some((c) => (c.tags || []).includes('FLOW') && (c.tags || []).includes('GLOW'));
      if (!flowGlow) return;
      ctx.markOncePerTurn('hBP07-089:反撃抜刀');
      ctx.draw(2);
    },
  },
};
