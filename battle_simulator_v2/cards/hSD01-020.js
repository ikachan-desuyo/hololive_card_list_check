/**
 * ホロリスの輪 (hSD01-020) サポート・イベント
 *
 * [サポート効果] サイコロを１回振る：３以上の時、自分のアーカイブのエール１枚を自分のホロメンに送る。
 *   サイコロを1回振り、出目が3以上なら、アーカイブのエール1枚を選んで自分のホロメン1人に送る。
 *   （出目が2以下なら何もしない。アーカイブにエールが無い／自分のホロメンがいない場合は送れない。）
 */
export default {
  number: 'hSD01-020',
  ai: {
    supportValue({ engine, player }) {
      // アーカイブにエールがあり、かつ送れるホロメンがいるなら価値あり。期待値で4/6成功。
      const hasCheer = player.archive.some((c) => c.kind === 'cheer');
      const hasHolomem = engine._stageHolomems(player).length > 0;
      return hasCheer && hasHolomem ? 14 : 2;
    },
  },
  support: {
    // アーカイブにエールが無い時は（サイコロも振れず）何も起きないので使用不可 (Q554)
    canUse(ctx) {
      return ctx.player.archive.some((c) => c.kind === 'cheer') && ctx.holomems('self').length > 0;
    },
    *run(ctx) {
      const value = (yield* ctx.rollDice());
      if (value < 3) return;
      const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      if (cheers.length === 0) return;
      const cheer = yield ctx.chooseCard({
        cards: cheers,
        title: 'ホロメンに送るエールをアーカイブから選択',
      });
      if (!cheer) return;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        title: 'エールを送るホロメンを選択',
      });
      if (!target) return;
      ctx.removeFromArchive(cheer);
      ctx.attachCheer(cheer, target.holomem);
    },
  },
};
