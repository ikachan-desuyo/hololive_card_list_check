/**
 * AZKi (hBP01-047) 緑・2nd・HP220（#JP #0期生 #歌）
 * ブルームエフェクト「いのちの軌跡」:
 *   このホロメンのHP40回復。その後、サイコロを１回振れる：
 *   奇数の時、自分のアーカイブの緑エール１～３枚をこのホロメンに送れる。
 *   → HP回復40は無条件。その後のサイコロは「振れる」=任意。
 *     奇数（1,3,5）の時のみ、アーカイブの緑エールを1～3枚（任意・各このホロメンへ）送れる。
 *     「まで」表現はないが「１～３枚を…送れる」=任意なので0枚も可。
 * アーツ「新たな地図」(120): 特効のみ（白+50）。追加効果なしのため未定義。
 */
export default {
  number: 'hBP01-047',
  bloomEffect: {
    name: 'いのちの軌跡',
    *run(ctx) {
      // このホロメンのHP40回復
      ctx.heal(ctx.sourceHolomem, 40);

      // その後、サイコロを1回振れる（任意）
      const wantRoll = yield ctx.confirm('サイコロを1回振りますか？（奇数なら緑エールをこのホロメンに送れる）');
      if (!wantRoll) return;
      const dice = ctx.rollDice();
      if (dice % 2 === 0) return; // 偶数なら何も起きない

      // 奇数: アーカイブの緑エール1～3枚をこのホロメンに送れる（任意）
      for (let i = 0; i < 3; i++) {
        const greenCheers = ctx.player.archive.filter((c) => c.kind === 'cheer' && c.color === '緑');
        if (greenCheers.length === 0) break;
        const cheer = yield ctx.chooseCard({
          cards: greenCheers,
          title: `このホロメンに送る緑エールを選択（${i + 1}/3・任意）`,
          optional: true,
          skipLabel: i === 0 ? '送らない' : '終了',
        });
        if (!cheer) break;
        ctx.removeFromArchive(cheer);
        ctx.attachCheer(cheer, ctx.sourceHolomem);
      }
    },
  },
};
