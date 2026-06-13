/**
 * 緑の試験管 (hBP04-097) サポート・ツール
 * このツールが付いているホロメンのアーツ+10。
 * ◆1st以上の〈博衣こより〉に付いていたら能力追加:
 *   自分のメインステップで、このツールが付いているホロメンのエール1枚をアーカイブできる：
 *   自分のお休みしている#秘密結社holoXを持つホロメン1人をアクティブにする。
 * ツールは、自分のホロメン1人につき1枚だけ付けられる。
 */
export default {
  number: 'hBP04-097',
  attached: {
    artsPlus() { return 10; },
  },
  // メインステップの起動型能力（コスト: 付いているホロメンのエール1枚をアーカイブ）
  activatedAbilities: [{
    name: 'holoX再起動',
    oncePerTurn: false, // テキストにターン制限の記載なし → 払える限り繰り返し使える
    canUse(ctx) {
      const host = ctx.sourceHolomem.stack[0];
      if (host.name !== '博衣こより') return false;
      if (!['1st', '2nd'].includes(host.bloomLevel)) return false; // 1st以上
      if (ctx.sourceHolomem.cheers.length < 1) return false;       // コストのエールがある
      // お休み中の #秘密結社holoX を持つホロメンがいる
      return ctx.holomems('self').some((e) =>
        e.holomem.rested && ctx.hasTag(e.top, '秘密結社holoX'));
    },
    *run(ctx) {
      // コスト: 付いているホロメンのエール1枚をアーカイブ
      const cheer = yield ctx.chooseCard({
        cards: [...ctx.sourceHolomem.cheers],
        title: 'コスト: アーカイブするエールを選択',
      });
      if (!cheer) return;
      ctx.archiveCheer(ctx.sourceHolomem, cheer);
      // 効果: お休み中の #秘密結社holoX 1人をアクティブにする
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.holomem.rested && ctx.hasTag(e.top, '秘密結社holoX'),
        title: 'アクティブにする #秘密結社holoX のホロメンを選択',
      });
      if (target) ctx.setActive(target.holomem);
    },
  }],
};
