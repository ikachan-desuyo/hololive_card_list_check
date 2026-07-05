/**
 * フブチュン (hBP02-091) サポート・マスコット（#白上'sキャラクター）
 *
 * [サポート効果] このマスコットが付いているホロメンのHP+20。
 *   → attached.hpPlus で常時+20。
 *
 * ◆〈白上フブキ〉に付いていたら能力追加:
 *   このマスコットが付いているホロメンがコラボした時、自分のアーカイブのマスコット1枚を手札に戻せる。
 *   → triggers.onCollab で実装（任意。アーカイブのマスコット1枚を手札へ）。
 *
 * マスコットは自分のホロメン1人につき1枚だけ（エンジン既定の _canAttachSupport で担保。attachRule 不要）。
 */
export default {
  number: 'hBP02-091',
  attached: {
    hpPlus() {
      return 20;
    },
  },
  triggers: {
    // ◆〈白上フブキ〉に付いていたら: ホストがコラボした時、アーカイブのマスコット1枚を手札に戻せる（任意）
    * onCollab(ctx) {
      if (ctx.sourceHolomem?.stack[0].name !== '白上フブキ') return;
      const mascots = ctx.player.archive.filter((c) => c.kind === 'support' && c.supportType === 'マスコット');
      if (mascots.length === 0) return;
      const picked = yield ctx.chooseCard({ cards: mascots, title: 'アーカイブから手札に戻すマスコットを選択', optional: true });
      if (picked) { ctx.removeFromArchive(picked); ctx.addToHand(picked); }
    },
  },
};
