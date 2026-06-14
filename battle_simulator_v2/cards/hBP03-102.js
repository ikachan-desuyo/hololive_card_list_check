/**
 * フトイヌ (hBP03-102) サポート・マスコット
 * [サポート効果] このマスコットが付いているホロメンのアーツ+10。
 * ◆〈戌神ころね〉に付いていたら能力追加:
 *   このマスコットが付いているホロメンがコラボした時、自分のアーカイブの黄エール1枚をこのホロメンに送れる。
 * マスコットは、自分のホロメン1人につき1枚だけ付けられる（マスコットの既定ルール）。
 *
 * → triggers.onCollab で実装。ホストが〈戌神ころね〉のときコラボで、アーカイブの黄エール1枚を
 *   このホロメン（ホスト）に送れる（任意）。
 */
export default {
  number: 'hBP03-102',
  attached: {
    artsPlus() { return 10; },
  },
  triggers: {
    // ◆〈戌神ころね〉に付いていたら: ホストがコラボした時、アーカイブの黄エール1枚をこのホロメンに送れる（任意）
    * onCollab(ctx) {
      const host = ctx.sourceHolomem;
      if (host?.stack[0].name !== '戌神ころね') return;
      const yellows = ctx.player.archive.filter((c) => c.kind === 'cheer' && c.color === '黄');
      if (yellows.length === 0) return;
      const picked = yield ctx.chooseCard({ cards: yellows, title: 'このホロメンに送る黄エールをアーカイブから選択', optional: true });
      if (picked) { ctx.removeFromArchive(picked); ctx.attachCheer(picked, host); }
    },
  },
};
