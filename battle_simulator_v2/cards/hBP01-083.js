/**
 * こぼ・かなえる (hBP01-083) 青・Debut・HP70（#ID #ID3期生）
 *
 * コラボエフェクト「こぼを海に連れて！」:
 *   自分のセンターホロメンが#IDを持つ時、サイコロを１回振れる：
 *   ３以上の時、自分のエールデッキの上から１枚を、自分のホロメンに送る。
 *   → 条件（センターが#ID）を満たす時、任意でサイコロを振り、3以上なら
 *     エールデッキの先頭1枚を自分のホロメン1人に送る。
 *
 * アーツ「波だ～！　泳げ～！」(10): 固定ダメージのみ（特殊効果なし）。
 */
export default {
  number: 'hBP01-083',
  collabEffect: {
    name: 'こぼを海に連れて！',
    *run(ctx) {
      // 自分のセンターホロメンが#IDを持つ時のみ発動可能
      const center = ctx.holomems('self', (e) => e.pos.zone === 'center' && ctx.hasTag(e.top, 'ID'));
      if (center.length === 0) return;
      // 「振れる」=任意
      const ok = yield ctx.confirm('サイコロを1回振りますか？（3以上でエールデッキの上から1枚をホロメンに送る）');
      if (!ok) return;
      const value = ctx.rollDice();
      if (value < 3) return;
      if (ctx.player.cheerDeck.length === 0) return;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        title: 'エールデッキの上から1枚を送るホロメンを選択',
      });
      if (!target) return;
      ctx.sendCheerFromCheerDeckTop(target.holomem);
    },
  },
};
