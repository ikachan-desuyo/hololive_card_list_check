/**
 * GuyRyS (hBP08-106) サポート・ファン
 *
 * [サポート効果]
 *   相手のターンで、このファンが付いているホロメンがダウンした時、
 *   このファンが付いているホロメンのエール1枚を、自分の他のホロメンに付け替える。
 *     → triggers.onDown で実装（開拓者 hBP01-124 と同型。付け先が〈IRyS〉な点だけ異なる）。
 *        _processDown はアーカイブ前に発火するため、ダウンしたホロメン(=ctx.sourceHolomem)の
 *        エールはまだ付いている。「付け替える」は強制（任意の「できる」ではない）。
 *        移すエールが無い／移し先（自分の他のホロメン）が居ない場合は何もできない。
 *
 * 付け先制限:
 *   このファンは、自分の〈IRyS〉だけに付けられ、1人につき何枚でも付けられる。
 */
export default {
  number: 'hBP08-106',
  attachRule: {
    canAttach: (h) => h.stack[0].name === 'IRyS',
    unlimited: true, // 1人に何枚でも
  },
  triggers: {
    *onDown(ctx) {
      if (ctx.state.turnPlayer === ctx.playerIdx) return; // 相手のターンのみ
      const host = ctx.sourceHolomem; // ダウンした（このファンが付いていた）ホロメン
      const cheers = [...host.cheers];
      if (cheers.length === 0) return;
      const targets = ctx.holomems('self', (e) => e.holomem !== host); // 自分の他のホロメン
      if (targets.length === 0) return;
      const cheer = (cheers.length === 1)
        ? cheers[0]
        : yield ctx.chooseCard({ cards: cheers, title: `付け替えるエール1枚を選択（${host.stack[0].name}）` });
      if (!cheer) return;
      const dest = (targets.length === 1)
        ? targets[0]
        : yield ctx.chooseHolomem({ side: 'self', filter: (e) => e.holomem !== host, title: 'エールの付け替え先を選択（自分の他のホロメン）' });
      if (!dest) return;
      ctx.moveCheer(cheer, host, dest.holomem);
    },
  },
};
