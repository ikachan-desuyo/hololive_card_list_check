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
      // 別のホロメンへ付け替えられること＝ホロメンが2人以上いて、いずれかにエールが付いている
      // （ホロメン1人だけでは付け替え先が無く何も起きないので使用不可。Q344＝一般ルールQ348）
      const mem = ctx.holomems('self');
      return mem.length >= 2 && mem.some((e) => e.holomem.cheers.length > 0);
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
        filter: (e) => e.holomem !== from, // 「付け替え」＝元とは別のホロメンへ
        title: '付け替え先のホロメンを選択（元とは別のホロメン）',
      });
      if (target) ctx.moveCheer(picked, from, target.holomem);
    },
  },
};
