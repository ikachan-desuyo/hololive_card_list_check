/**
 * 儒烏風亭らでん (hBP06-033) 緑・1st・HP160（#DEV_IS #ReGLOSS #お酒）
 * ブルームエフェクト「濡羽色のほころび」:
 *   このターンに自分が#きのこを持つイベントを使っていたなら、自分のデッキを2枚引く。
 *   このブルームエフェクトはターンに1回しか使えない。
 *   → countSupportThisTurn で #きのこ イベント使用判定 + markOncePerTurn でターン1回制限
 * アーツ「茸 （くさびら）」(40):
 *   自分のアーカイブのエール1枚を自分の#ReGLOSSを持つホロメンに送れる。（任意）
 *   → アーカイブのエールを #ReGLOSS ホロメンへ送る
 */
export default {
  number: 'hBP06-033',
  bloomEffect: {
    name: '濡羽色のほころび',
    *run(ctx) {
      const KEY = 'hBP06-033:濡羽色のほころび';
      if (ctx.oncePerTurnUsed(KEY)) return; // ターンに1回しか使えない
      // このターンに#きのこを持つイベントを使っていたなら
      const usedMushroomEvent = ctx.countSupportThisTurn(
        (c) => c.kind === 'support' && c.supportType === 'イベント' && ctx.hasTag(c, 'きのこ')) > 0;
      ctx.markOncePerTurn(KEY);
      if (!usedMushroomEvent) return;
      ctx.draw(2);
    },
  },
  arts: {
    '茸 （くさびら）': {
      *run(ctx) {
        // 自分のアーカイブのエール1枚を、自分の#ReGLOSSを持つホロメンに送れる（任意）
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length === 0) return;
        const targets = ctx.holomems('self', (e) => ctx.hasTag(e.top, 'ReGLOSS'));
        if (targets.length === 0) return;
        const cheer = yield ctx.chooseCard({
          cards: cheers,
          title: '#ReGLOSS ホロメンに送るアーカイブのエールを選択（任意）',
          optional: true,
          skipLabel: '送らない',
        });
        if (!cheer) return;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => ctx.hasTag(e.top, 'ReGLOSS'),
          title: 'エールを送る #ReGLOSS ホロメンを選択',
        });
        if (!target) return;
        ctx.removeFromArchive(cheer);
        ctx.attachCheer(cheer, target.holomem);
      },
    },
  },
};
