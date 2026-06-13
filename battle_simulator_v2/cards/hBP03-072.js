/**
 * 角巻わため (hBP03-072) 黄・2nd・HP200（#JP #4期生 #ケモミミ #歌）
 *
 * ギフト「まだまだいくよー！」:
 *   このホロメンがダウンした時、このホロメンのエール1枚を、
 *   自分の他の〈角巻わため〉に付け替えられる。
 *   ※ターン制限の記載が無いため、自分/相手どちらのターンでも発火する。
 *
 * アーツ「わためぇ Night Fever!!」(80+):
 *   [センターポジション限定]このホロメンにエールが6枚以上付いている時、
 *   このターンの間、このホロメンと自分のコラボホロメンのアーツ+100。
 */
export default {
  number: 'hBP03-072',

  triggers: {
    // ギフト: ダウン時、付いているエール1枚を他の〈角巻わため〉へ付け替えられる
    *onDown(ctx) {
      const src = ctx.sourceHolomem;
      if (!src || src.cheers.length === 0) return;
      // 自分の「他の」〈角巻わため〉を列挙
      const targets = ctx.holomems('self', (e) => e.holomem !== src && e.top.name === '角巻わため');
      if (targets.length === 0) return;
      const cheer = yield ctx.chooseCard({
        cards: src.cheers.slice(),
        title: '他の〈角巻わため〉に付け替えるエールを選択',
        optional: true,
        skipLabel: '付け替えない',
      });
      if (!cheer) return;
      const dest = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.holomem !== src && e.top.name === '角巻わため',
        title: 'エールの付け替え先〈角巻わため〉を選択',
      });
      if (!dest) return;
      ctx.moveCheer(cheer, src, dest.holomem);
    },
  },

  arts: {
    'わためぇ Night Fever!!': {
      *run(ctx) {
        const src = ctx.sourceHolomem;
        if (!src) return;
        // センターポジション限定
        if (ctx.engine._zoneOf(src) !== 'center') return;
        // このホロメンにエールが6枚以上付いている時
        if (src.cheers.length < 6) return;
        // このホロメンと自分のコラボホロメンのアーツ+100（このターン）
        const collab = ctx.player.collab;
        ctx.addTurnModifier({
          kind: 'artsPlus',
          amount: 100,
          ownerIdx: ctx.playerIdx,
          match: (h) => h === src || (collab && h === collab),
          description: 'このターン、角巻わため(センター)と自分のコラボホロメンのアーツ+100',
        });
      },
    },
  },
};
