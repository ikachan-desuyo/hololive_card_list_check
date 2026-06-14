/**
 * BAZO (hBP07-105) サポート・マスコット
 *
 * [サポート効果] このマスコットが付いているホロメンのアーツ+10。
 *   → attached.artsPlus で常時 +10。
 *
 * ◆〈ベスティア・ゼータ〉に付いていたら能力追加:
 *   このホロメンがアーツを使った時、自分のアーカイブのファン1枚を手札に戻す。
 *   → triggers.onArtsUse で実装。付け先が〈ベスティア・ゼータ〉の時、アーカイブのファン1枚を手札に戻す（任意）。
 *
 * マスコットは、自分のホロメン1人につき1枚だけ付けられる（マスコットの既定ルール。
 * _canAttachSupport がマスコット=1枚を既定で適用するため attachRule 不要）。
 */
export default {
  number: 'hBP07-105',
  attached: {
    artsPlus() { return 10; },
  },
  triggers: {
    // ◆〈ベスティア・ゼータ〉に付いていたら: ホストがアーツを使った時、アーカイブのファン1枚を手札に戻す
    * onArtsUse(ctx) {
      if (ctx.sourceHolomem?.stack[0].name !== 'ベスティア・ゼータ') return;
      const fans = ctx.player.archive.filter((c) => c.kind === 'support' && c.supportType === 'ファン');
      if (fans.length === 0) return;
      const picked = yield ctx.chooseCard({ cards: fans, title: 'アーカイブから手札に戻すファンを選択', optional: true });
      if (picked) { ctx.removeFromArchive(picked); ctx.addToHand(picked); }
    },
  },
};
