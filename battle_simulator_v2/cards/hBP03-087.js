/**
 * コールアンドレスポンス (hBP03-087) サポート・イベント
 *
 * [サポート効果] 自分のステージのエール1枚を、自分のホロメンに付け替える。
 *   - ステージ上の自分のエールを1枚選び、好きな自分のホロメンへ付け替える。
 *   - 「付け替える」（必須）だが、対象が無い場合（ステージにホロメンがいない/
 *     エールが1枚も付いていない）は何もしない。
 */
export default {
  number: 'hBP03-087',
  support: {
    canUse(ctx) {
      // ステージに自分のホロメンがいて、いずれかにエールが付いていること
      return ctx.holomems('self').some((e) => e.holomem.cheers.length > 0);
    },
    *run(ctx) {
      // ステージ上の全エールを列挙
      const entries = [];
      for (const e of ctx.holomems('self')) {
        for (const cheer of e.holomem.cheers) entries.push({ cheer, from: e.holomem });
      }
      if (entries.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: entries.map((e) => e.cheer),
        title: '付け替えるエールを選択',
      });
      if (!picked) return;
      const from = entries.find((e) => e.cheer === picked).from;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        title: '付け替え先のホロメンを選択',
      });
      if (target) ctx.moveCheer(picked, from, target.holomem);
    },
  },
};
