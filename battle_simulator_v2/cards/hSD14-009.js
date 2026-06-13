/**
 * 白上フブキ（ホロメン hSD14-009 / 2nd / 白 / HP170）
 *
 * ギフト「私は倒れちゃいけないな」:
 *   相手のターンで、このホロメンがダウンした時、このホロメンにマスコットが付いているなら、
 *   自分のデッキを1枚引く。
 *   → ダウン時誘発の triggers.onDown で実装。_processDown が
 *     ctx.sourceHolomem=ダウンしたホロメン / ctx.playerIdx=その持ち主 で呼ぶ。
 *     条件: 相手のターン（ctx.state.turnPlayer !== ctx.playerIdx）かつ
 *     このホロメンにマスコット（supportType==='マスコット'）が付いている。満たせば1枚ドロー。
 *
 * アーツ「胸を張って歌い続けるよ」(90 / 赤+30特攻):
 *   テキスト効果は無い純粋なダメージアーツなので arts 定義は不要（エンジンが素点＋特攻で処理）。
 *
 * 保留: なし。
 */
export default {
  number: 'hSD14-009',
  triggers: {
    *onDown(ctx) {
      if (ctx.state.turnPlayer === ctx.playerIdx) return; // 相手のターンのみ
      const h = ctx.sourceHolomem;
      if (!h) return;
      // このホロメンにマスコットが付いているなら
      if (!h.attachments.some((a) => a.supportType === 'マスコット')) return;
      ctx.draw(1);
    },
  },
};
