/**
 * AZKi (hSD01-009)
 * コラボエフェクト: サイコロを1回振れる：4以下の時、自分のエールデッキの上から1枚を、
 * 自分のバックホロメンに送る。1の時、さらに、このホロメンをバックポジションに移動できる。
 */
export default {
  number: 'hSD01-009',
  collabEffect: {
    name: '広がる地図',
    *run(ctx) {
      const ok = yield ctx.confirm('サイコロを振りますか？', '振る', '振らない');
      if (!ok) return;
      const value = (yield* ctx.rollDice());
      if (value <= 4) {
        const entry = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.pos.zone === 'back',
          title: 'エールデッキの上から送るバックホロメンを選択',
        });
        if (entry) ctx.sendCheerFromCheerDeckTop(entry.holomem);
      }
      if (value === 1) {
        const move = yield ctx.confirm('このホロメンをバックポジションに移動しますか？', '移動する', '移動しない');
        if (move && ctx.player.collab === ctx.sourceHolomem) {
          ctx.player.collab = null;
          ctx.player.back.push(ctx.sourceHolomem);
          ctx.log(`${ctx.sourceHolomem.stack[0].name} をバックポジションに移動した`);
        }
      }
    },
  },
};
