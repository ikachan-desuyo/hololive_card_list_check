/**
 * ネジマキツネ (hBP02-090) サポート・マスコット
 *
 * [サポート効果] このマスコットが付いているホロメンのHP+20。
 *   → attached.hpPlus で常時 +20。
 *
 * ◆〈白上フブキ〉に付いていたら能力追加:
 *   このマスコットが付いているホロメンがダウンした時、このホロメンのエール1枚を、
 *   自分の他のホロメンに付け替える。
 *   → triggers.onDown（_processDown でアーカイブ前に発火。sourceHolomem=ダウンしたホロメン）。
 *     付いているホロメンが〈白上フブキ〉のときのみ追加能力が有効。
 *     「付け替える」=任意(できる)ではないが、エール0枚／他のホロメン不在なら付け替え不能。
 *
 * マスコットは、自分のホロメン1人につき1枚だけ付けられる（エンジンの既定ルール）。
 */
export default {
  number: 'hBP02-090',
  attached: {
    // [サポート効果] 付いているホロメンのHP+20
    hpPlus() {
      return 20;
    },
  },
  triggers: {
    *onDown(ctx) {
      // 付いているホロメン（=ダウンしたホロメン）が〈白上フブキ〉のときのみ追加能力
      const downed = ctx.sourceHolomem;
      if (!downed || downed.stack[0]?.name !== '白上フブキ') return;

      // ダウンしたホロメンのエール（アーカイブ前なのでまだ付いている）
      if (!downed.cheers || downed.cheers.length === 0) return;

      // 付け替え先＝自分の「他の」ホロメン（ダウンしたホロメン自身を除く）
      const others = ctx.holomems('self', (e) => e.holomem !== downed);
      if (others.length === 0) return;

      // 付け替えるエール1枚を選ぶ
      const cheer = yield ctx.chooseCard({
        cards: [...downed.cheers],
        title: '付け替えるエール1枚を選択',
      });
      if (!cheer) return;

      // 付け替え先のホロメンを選ぶ
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.holomem !== downed,
        title: 'エールの付け替え先（自分の他のホロメン）を選択',
      });
      if (!target) return;

      ctx.moveCheer(cheer, downed, target.holomem);
    },
  },
};
