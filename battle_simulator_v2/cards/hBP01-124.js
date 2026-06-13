/**
 * 開拓者 (hBP01-124) サポート・ファン
 *
 * [サポート効果]
 *  相手のターンで、このファンが付いているホロメンがダウンした時、
 *  このファンが付いているホロメンのエール1枚を、自分の他のホロメンに付け替える。
 *    → triggers.onDown で実装。_processDown はアーカイブ前に発火するため、
 *      ダウンしたホロメン(h = ctx.sourceHolomem)のエールはまだ付いている。
 *      「相手のターンで」は ctx.state.turnPlayer を見て判定。
 *      「付け替える」は強制効果（任意の「できる」ではない）。ただし
 *      移すエールが1枚も無い／移し先（自分の他のホロメン）が居ない場合は何もできない。
 *      どのエールを・どのホロメンへ、はプレイヤー選択。
 *
 * このファンは、自分の〈AZKi〉だけに付けられ、1人につき何枚でも付けられる。
 *    → attachRule で実装。
 */
export default {
  number: 'hBP01-124',
  attachRule: {
    canAttach(holomem) {
      return holomem.stack[0].name === 'AZKi';
    },
    unlimited: true, // 1人に何枚でも
  },
  triggers: {
    *onDown(ctx) {
      if (ctx.state.turnPlayer === ctx.playerIdx) return; // 相手のターンのみ

      const host = ctx.sourceHolomem; // ダウンした（このファンが付いていた）ホロメン

      // 移すエール（ダウンしたホロメンに付いているエール）
      const cheers = [...host.cheers];
      if (cheers.length === 0) return;

      // 移し先候補: 自分の「他の」ホロメン（ダウンしたホロメン自身は除外）
      const targets = ctx.holomems('self', (e) => e.holomem !== host);
      if (targets.length === 0) return;

      // どのエールを付け替えるか（エール1枚）
      const cheer = (cheers.length === 1)
        ? cheers[0]
        : yield ctx.chooseCard({
            cards: cheers,
            title: `付け替えるエール1枚を選択（${host.stack[0].name}）`,
          });
      if (!cheer) return;

      // 付け替え先のホロメンを選択
      const dest = (targets.length === 1)
        ? targets[0]
        : yield ctx.chooseHolomem({
            side: 'self',
            filter: (e) => e.holomem !== host,
            title: 'エールの付け替え先を選択（自分の他のホロメン）',
          });
      if (!dest) return;

      ctx.moveCheer(cheer, host, dest.holomem);
    },
  },
};
