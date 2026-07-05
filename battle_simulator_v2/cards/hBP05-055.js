/**
 * 癒月ちょこ (hBP05-055) ホロメン #JP #2期生 #料理 1stBloomLevel 紫 HP180
 * ギフト「寝坊助悪魔」: [センターポジション限定]相手のパフォーマンスステップが終了する時、
 *   このホロメンのHPが減っていないなら、自分のエールデッキの上から1枚を
 *   自分の〈癒月ちょこ〉に送れる。
 *   → triggers.onOpponentPerformanceEnd
 *     ・センターポジション限定: ctx.sourceHolomemPos().zone === 'center'
 *     ・HPが減っていない: ctx.sourceHolomem.damage === 0（厳密に「減っていない」＝0）
 *     ・任意効果（「送れる」）: yield ctx.confirm(...)
 *     ・送り先は自分のステージ上の〈癒月ちょこ〉（複数いれば選択。1人なら自動）
 *     ・エールデッキの上から1枚を公開して送る: ctx.sendCheerFromCheerDeckTop(holomem)
 * アーツ「ｱﾞｱﾞｱﾞｱﾞｱﾞ」(30): テキスト効果なし。
 *
 * 保留: なし
 */
export default {
  number: 'hBP05-055',
  triggers: {
    *onOpponentPerformanceEnd(ctx) {
      // [センターポジション限定]
      const pos = ctx.sourceHolomemPos();
      if (!pos || pos.zone !== 'center') return;
      // このホロメンのHPが減っていないなら（ダメージ0）
      if (ctx.sourceHolomem.damage > 0) return;
      // エールデッキが空なら何もしない
      if (ctx.player.cheerDeck.length === 0) return;
      // 送り先候補: 自分のステージ上の〈癒月ちょこ〉
      const targets = ctx.holomems('self', ({ top }) => ctx.nameIs(top, '癒月ちょこ'));
      if (targets.length === 0) return;
      // 任意効果（「送れる」）
      const ok = yield ctx.confirm('エールデッキの上から1枚を〈癒月ちょこ〉に送りますか？');
      if (!ok) return;
      let target = targets[0];
      if (targets.length > 1) {
        const chosen = yield ctx.chooseHolomem({
          side: 'self',
          filter: ({ top }) => ctx.nameIs(top, '癒月ちょこ'),
          title: 'エールを送る〈癒月ちょこ〉を選択',
        });
        if (!chosen) return;
        target = chosen;
      }
      ctx.sendCheerFromCheerDeckTop(target.holomem);
    },
  },
};
