/**
 * 儒烏風亭らでん (hBP04-024) 緑
 * アーツ「喝采反芻」(30):
 *   自分のアーカイブのエール1枚をこのホロメンに送れる。
 * ※ギフト「冷静沈着」（[センター限定]相手メインステップ中HPが減らない/変動しない）は、
 *   相手ターンの被ダメージ無効化で、エンジンの被ダメージ割り込みが必要なため未実装。
 */
export default {
  number: 'hBP04-024',
  arts: {
    '喝采反芻': {
      *run(ctx) {
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length === 0 || !ctx.sourceHolomem) return;
        const picked = yield ctx.chooseCard({
          cards: cheers,
          title: 'このホロメンに送るエールを選択（アーカイブ・任意）',
          optional: true,
          skipLabel: '送らない',
        });
        if (picked) {
          ctx.removeFromArchive(picked);
          ctx.attachCheer(picked, ctx.sourceHolomem);
        }
      },
    },
  },
};
