/**
 * わためいと (hBP03-112) サポート・ファン
 *
 * [サポート効果] 相手のターンで、このファンが付いているホロメンがダウンした時、
 *   このホロメンの黄エール1～2枚を、自分の他の〈角巻わため〉1人に付け替えられる。
 *   → triggers.onDown（相手ターン限定）。ダウン処理はアーカイブ前に発火するため、
 *      ダウンしたホロメン（ctx.sourceHolomem）の黄エールはまだ付いている。
 *      テキストは「1～2枚を…1人に」＝同じ1人の〈角巻わため〉へ、黄エールを1枚または2枚付け替える。
 *      「付け替えられる」＝任意。実行する場合は最低1枚（1枚目を付け替えたら2枚目は任意）。
 *
 * 付け先制限: このファンは、自分の〈角巻わため〉だけに付けられ、1人につき何枚でも付けられる。
 */
export default {
  number: 'hBP03-112',
  attachRule: {
    canAttach(holomem) {
      return holomem.stack[0].name === '角巻わため';
    },
    unlimited: true, // 1人に何枚でも
  },
  triggers: {
    *onDown(ctx) {
      if (ctx.state.turnPlayer === ctx.playerIdx) return; // 相手のターンのみ

      const downed = ctx.sourceHolomem;
      if (!downed) return;

      // ダウンしたホロメンに付いている黄エール
      const yellowCheers = downed.cheers.filter((c) => c.color === '黄');
      if (yellowCheers.length === 0) return;

      // 付け替え先: 自分の他の〈角巻わため〉（ダウンしたホロメン自身は除外）
      const targets = ctx.holomems('self', (e) =>
        e.holomem !== downed && e.top.name === '角巻わため');
      if (targets.length === 0) return;

      const ok = yield ctx.confirm(
        'わためいと: 黄エール1～2枚を他の〈角巻わため〉に付け替えますか？');
      if (!ok) return;

      const targetEntry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.holomem !== downed && e.top.name === '角巻わため',
        title: 'エールを付け替える〈角巻わため〉を選択',
      });
      if (!targetEntry) return;

      // 1枚目（必須）
      const first = yield ctx.chooseCard({
        cards: yellowCheers,
        title: '付け替える黄エールを選択（1枚目）',
      });
      if (!first) return;
      ctx.moveCheer(first, downed, targetEntry.holomem);

      // 2枚目（任意）
      const rest = downed.cheers.filter((c) => c.color === '黄');
      if (rest.length === 0) return;
      const second = yield ctx.chooseCard({
        cards: rest,
        title: '付け替える黄エールを選択（2枚目・任意）',
        optional: true,
        skipLabel: '1枚だけにする',
      });
      if (second) ctx.moveCheer(second, downed, targetEntry.holomem);
    },
  },
};
