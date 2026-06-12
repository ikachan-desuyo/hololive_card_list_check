/**
 * 雪花ラミィ 2nd (hBP04-048)
 * ブルームエフェクト「ユニーリアの令嬢」:
 *   自分のエールデッキの上から1枚を、自分の〈雪民〉が付いている〈雪花ラミィ〉に送る。
 * アーツ「今日も祝福がありますように」:
 *   このホロメンのエール1枚をアーカイブできる：
 *   相手のセンターホロメンかバックホロメン1人に特殊ダメージ30を与える。
 */
export default {
  number: 'hBP04-048',
  bloomEffect: {
    name: 'ユニーリアの令嬢',
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.name === '雪花ラミィ' && e.holomem.attachments.some((a) => a.name === '雪民'),
        title: 'エールを送る〈雪民〉付きの〈雪花ラミィ〉を選択',
      });
      if (target) ctx.sendCheerFromCheerDeckTop(target.holomem);
    },
  },
  arts: {
    '今日も祝福がありますように': {
      *run(ctx) {
        if (ctx.sourceHolomem.cheers.length === 0) return;
        const ok = yield ctx.confirm('エール1枚をアーカイブして特殊ダメージ30を与えますか？');
        if (!ok) return;
        const cheer = yield ctx.chooseCard({
          cards: ctx.sourceHolomem.cheers,
          title: 'アーカイブするエールを選択',
        });
        if (!cheer) return;
        ctx.archiveCheer(ctx.sourceHolomem, cheer);
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'back',
          title: '特殊ダメージ30を与える相手ホロメンを選択（センターかバック）',
        });
        if (target) ctx.dealSpecialDamage(target, 30);
      },
    },
  },
};
