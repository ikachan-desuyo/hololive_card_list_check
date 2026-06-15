/**
 * エリザベス・ローズ・ブラッドフレイム (hSD13-005) 赤・1st（#Justice）
 * ギフト「For Justice! -ERB-」: 相手のターンで、自分の#Justiceを持つホロメンがダウンした時、
 *   自分のエールデッキの上から1枚をこのホロメンに送る。ターンに1回しか使えない。
 *   → 「自分の#Justiceを持つホロメン」には ERB 自身も含む（自他両方で発揮。Q570）。
 *     エンジンのダウン誘発は「他者のダウン＝onAnyDown／自身のダウン＝onDown」に分かれるため、
 *     両方に同じ効果を実装する。oncePerTurn キーは共有し、同一ターンに重複発火しないようにする。
 *     送り先「このホロメン」はギフト所持者（=ERB自身、ctx.sourceHolomem）。
 * アーツ「Lovely to See You, to See You, Lovely～♡」(50): テキスト効果なし。
 */
const tryGift = (ctx) => {
  if (ctx.state.turnPlayer === ctx.playerIdx) return;            // 相手のターン
  if (ctx.oncePerTurnUsed('hSD13-005:ERB')) return;
  ctx.markOncePerTurn('hSD13-005:ERB');
  // 「このホロメンに送る」= ギフト所持者（ERB自身）。
  if (ctx.sourceHolomem) ctx.sendCheerFromCheerDeckTop(ctx.sourceHolomem);
};

export default {
  number: 'hSD13-005',
  triggers: {
    // 他の#Justiceホロメンがダウンした時（ダウンした本人は除外されるため ERB へは onAnyDown で届く）
    *onAnyDown(ctx) {
      if (ctx.downedInfo?.ownerIdx !== ctx.playerIdx) return;        // 自分のホロメン
      if (!(ctx.downedInfo.card.tags || []).includes('Justice')) return; // #Justice
      tryGift(ctx);
    },
    // ERB自身（#Justice）がダウンした時（onAnyDown はダウンした本人を除くため onDown で拾う。Q570）
    *onDown(ctx) {
      // ERB自身は #Justice なので追加のタグ判定は不要。送り先は自身（アーカイブ前なので付与可）。
      tryGift(ctx);
    },
  },
};
