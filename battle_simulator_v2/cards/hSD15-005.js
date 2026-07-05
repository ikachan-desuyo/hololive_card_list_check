/**
 * 儒烏風亭らでん (hSD15-005) ホロメン Debut
 * ギフト「体力作り頑張るぞー！！！！！」:
 *   相手のターンで、このホロメンがダウンした時、
 *   このホロメンのエール1枚を、自分の他のホロメンに付け替えられる。（任意・0可）
 * アーツ「そろそろ始めちゃいますか」(無20) はテキスト効果なし（コンパイラ/エンジン側のダメージ処理のみ）。
 * 保留: なし
 */
export default {
  number: 'hSD15-005',
  triggers: {
    *onDown(ctx) {
      if (ctx.state.turnPlayer === ctx.playerIdx) return; // 「相手のターンで」＝自分のターンでは発動しない
      const h = ctx.sourceHolomem;
      if (!h || h.cheers.length === 0) return;
      const others = ctx.holomems('self', (e) => e.holomem !== h);
      if (others.length === 0) return;
      const cheer = yield ctx.chooseCard({
        cards: h.cheers,
        title: '付け替えるエールを選択（任意）',
        optional: true,
        skipLabel: '付け替えない',
      });
      if (!cheer) return;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.holomem !== h,
        title: '付け替え先のホロメンを選択',
      });
      if (target) ctx.moveCheer(cheer, h, target.holomem);
    },
  },
};
