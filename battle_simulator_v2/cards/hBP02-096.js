/**
 * イヌ (hBP02-096) サポート・マスコット
 *
 * [サポート効果] このマスコットが付いているホロメンのアーツ+10。
 *   → attached.artsPlus で常時 +10。
 *
 * ◆〈沙花叉クロヱ〉に付いていたら能力追加
 *   このマスコットが付いているホロメンが相手のホロメンをダウンさせた時、
 *   自分のアーカイブのエール1枚を、自分の#秘密結社holoXを持つホロメンに送れる。
 *   → triggers.onOpponentDown（装着カードのトリガー。engine がホストの相手ダウン時に装着カードの
 *      onOpponentDown も走査して発火。ctx.sourceHolomem=ホスト, ctx.sourceCard=このマスコット）。
 *
 * マスコットは、自分のホロメン1人につき1枚だけ付けられる（マスコット標準ルール。
 * エンジン側で制限されるため attachRule は不要）。
 */
export default {
  number: 'hBP02-096',
  attached: {
    // このマスコットが付いているホロメンのアーツ+10
    artsPlus() {
      return 10;
    },
  },
  triggers: {
    // ◆〈沙花叉クロヱ〉に付いていたら: ホストが相手をダウンさせた時、アーカイブのエール1枚を#秘密結社holoXへ送れる（任意）
    *onOpponentDown(ctx) {
      if (ctx.sourceHolomem?.stack[0].name !== '沙花叉クロヱ') return;
      const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      const targets = ctx.holomems('self', (e) => (e.top.tags || []).includes('秘密結社holoX'));
      if (cheers.length === 0 || targets.length === 0) return;
      const cheer = yield ctx.chooseCard({
        cards: cheers, title: '#秘密結社holoXホロメンに送るアーカイブのエールを選択', optional: true, skipLabel: '送らない',
      });
      if (!cheer) return;
      const entry = yield ctx.chooseHolomem({
        side: 'self', filter: (e) => (e.top.tags || []).includes('秘密結社holoX'),
        title: 'エールを送る#秘密結社holoXホロメンを選択',
      });
      if (!entry) return;
      ctx.removeFromArchive(cheer);
      ctx.attachCheer(cheer, entry.holomem);
    },
  },
};
