/**
 * 儒烏風亭らでん (hBP04-024) 緑
 * アーツ「喝采反芻」(30):
 *   自分のアーカイブのエール1枚をこのホロメンに送れる。
 * ギフト「冷静沈着」: [センターポジション限定]相手のメインステップの間、このホロメンのHPは
 *   相手の能力で減らず、変動しない。
 *   → 自己アウラ（auraDamageDelta）。相手のメインステップ中（アーツは出ない＝能力ダメージのみ）、
 *     センターにいるこのホロメンの被ダメージを0にする。
 */
export default {
  number: 'hBP04-024',
  auraDamageDelta(src, target, zone, engine) {
    if (src !== target) return 0;          // 自分自身のみ
    if (zone !== 'center') return 0;       // [センター限定]
    const s = engine.state;
    if (s.step !== 'main') return 0;       // メインステップの間
    const owner = engine.state.players.findIndex((p) => engine._stageHolomems(p).includes(target));
    if (owner < 0 || s.turnPlayer === owner) return 0; // 「相手の」メインステップ
    return -100000;                        // 相手の能力で減らない
  },
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
