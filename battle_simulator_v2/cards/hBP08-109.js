/**
 * ルイ友 (hBP08-109) サポート・ファン
 *
 * [サポート効果]
 *   ■このファンが付いているホロメンのアーツ+10。
 *     → attached.artsPlus（常時+10）。
 *   ◆相手のターンで、このファンが付いているホロメンがダウンした時、
 *     このファンが付いているホロメンの[赤エールか紫エール]1枚を自分の他のホロメンに付け替える。
 *     → triggers.onDown（相手ターン限定）。開拓者 hBP01-124 と同型だが、
 *        付け替え対象のエールを「赤か紫」に限定する点が異なる。「付け替える」は強制。
 *        対象エールが無い／移し先（自分の他のホロメン）が居ない場合は何もできない。
 *
 * 付け先制限:
 *   このファンは、自分の〈鷹嶺ルイ〉だけに付けられ、1人につき何枚でも付けられる。
 *
 * ※「常時バフ＋トリガー」型はコンパイラが枠ごと不採用にするため手書きが必要。
 */
export default {
  number: 'hBP08-109',
  attachRule: {
    canAttach: (h) => h.stack[0].name === '鷹嶺ルイ',
    unlimited: true, // 1人に何枚でも
  },
  attached: {
    artsPlus() { return 10; },
  },
  triggers: {
    *onDown(ctx) {
      if (ctx.state.turnPlayer === ctx.playerIdx) return; // 相手のターンのみ
      const host = ctx.sourceHolomem;                     // ダウンした（このファンが付いていた）ホロメン
      const cheers = host.cheers.filter((c) => c.color === '赤' || c.color === '紫'); // [赤エールか紫エール]
      if (cheers.length === 0) return;
      const targets = ctx.holomems('self', (e) => e.holomem !== host); // 自分の他のホロメン
      if (targets.length === 0) return;
      const cheer = (cheers.length === 1)
        ? cheers[0]
        : yield ctx.chooseCard({ cards: cheers, title: `付け替える[赤か紫]エール1枚を選択（${host.stack[0].name}）` });
      if (!cheer) return;
      const dest = (targets.length === 1)
        ? targets[0]
        : yield ctx.chooseHolomem({ side: 'self', filter: (e) => e.holomem !== host, title: 'エールの付け替え先を選択（自分の他のホロメン）' });
      if (!dest) return;
      ctx.moveCheer(cheer, host, dest.holomem);
    },
  },
};
