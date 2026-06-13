/**
 * Cilus (hBP05-086) サポート・マスコット
 *
 * [サポート効果] このマスコットが付いているホロメンのHP+20。
 *   → attached.hpPlus で常時 +20。
 *
 * ◆〈こぼ・かなえる〉に付いていたら能力追加:
 *   [センターポジション限定][ターンに1回]相手のバックホロメンがダウンした時、自分のデッキを1枚引く。
 *   → triggers.onAnyDown（任意ホロメンのダウン監視）で実装。
 *      ・付け先ホロメン（ctx.sourceHolomem）が〈こぼ・かなえる〉
 *      ・付け先がセンターポジション（[センターポジション限定]）
 *      ・ダウンしたのが相手のホロメン（ownerIdx !== playerIdx）かつバックポジション（zone==='back'）
 *      ・ターンに1回（oncePerTurn）
 *      を満たした時に ctx.draw(1)。
 *
 * マスコットは、自分のホロメン1人につき1枚だけ付けられる
 *   （エンジン既定のマスコット制限で処理されるため attachRule 不要）。
 *
 * 保留: なし。
 */
export default {
  number: 'hBP05-086',
  attached: {
    // [サポート効果] 付いているホロメンのHP+20
    hpPlus() { return 20; },
  },
  triggers: {
    *onAnyDown(ctx) {
      // ◆〈こぼ・かなえる〉に付いていたら能力追加
      if (!ctx.sourceCard || !ctx.sourceHolomem) return;
      if (ctx.sourceHolomem.stack[0]?.name !== 'こぼ・かなえる') return;
      // [センターポジション限定]
      if (ctx.sourceHolomemPos()?.zone !== 'center') return;
      // 相手のバックホロメンがダウンした時
      if (ctx.downedInfo?.ownerIdx === ctx.playerIdx) return; // 相手のホロメン
      if (ctx.downedInfo?.zone !== 'back') return;            // バックポジション
      // [ターンに1回]
      if (ctx.oncePerTurnUsed('hBP05-086:draw')) return;
      ctx.markOncePerTurn('hBP05-086:draw');
      ctx.draw(1);
    },
  },
};
