/**
 * WHAT'S UP!!!!! KEEEEEP GROWING!!!!! (hSD10-011) サポート・イベント・LIMITED
 * [サポート効果] 自分のステージのホロメン全員が #FLOW GLOW を持つホロメンでなければ使えない。
 *   自分のアーカイブのエール3枚を選び、自分のセンターホロメンとコラボホロメンに割り振って送る。
 *   ただし、ホロメン1人に送る枚数は2枚まで。
 * LIMITED：ターンに1枚しか使えない（LIMITED制限はエンジン側で処理）。
 *
 * 実装メモ:
 *  - 送り先はセンター/コラボのみ。「ホロメン1人に送る枚数は2枚まで」を上限として割り振る。
 *  - アーカイブのエールが3枚未満の場合は、ある分だけ（上限の許す範囲で）送る。
 *  - 「割り振って送る」= 1枚選ぶごとに送り先（センター or コラボ）を選択する形で実装。
 *  - 「エール3枚を選び…送る」は可能な限り強制（アーカイブ残数と1人2枚制限の許す範囲で
 *    必ず送る。任意に打ち切ることはできない）。
 */
export default {
  number: 'hSD10-011',
  support: {
    canUse(ctx) {
      const stage = ctx.engine._stageHolomems(ctx.player);
      if (stage.length === 0) return false;
      // ステージのホロメン全員が #FLOW GLOW を持つ（タグは 'FLOW' と 'GLOW' に分割格納される）
      return stage.every((h) => ctx.hasTag(h.stack[0], 'FLOW') && ctx.hasTag(h.stack[0], 'GLOW'));
    },
    *run(ctx) {
      // 送り先候補（センター・コラボのみ）。それぞれ最大2枚まで。
      const center = ctx.player.center;
      const collab = ctx.player.collab;
      const sentCount = new Map(); // holomem -> 送った枚数
      const destOf = (h) => (h ? (sentCount.get(h) || 0) : 0);

      // 最大3枚、ただしアーカイブのエール枚数まで
      for (let i = 0; i < 3; i++) {
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length === 0) break;

        // 送り先候補（まだ2枚未満のもの）が無ければ終了
        const dests = [center, collab].filter((h) => h && destOf(h) < 2);
        if (dests.length === 0) break;

        // 「3枚を選び…送る」=強制（可能な限り送る。途中で任意にやめることはできない）
        const cheer = yield ctx.chooseCard({
          cards: cheers,
          title: `アーカイブから送るエールを選択（残り${3 - i}枚）`,
        });
        if (!cheer) break;

        const dest = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => dests.includes(e.holomem),
          title: 'エールを送るホロメンを選択（センター/コラボ・1人2枚まで）',
        });
        if (!dest) break;

        ctx.removeFromArchive(cheer);
        ctx.attachCheer(cheer, dest.holomem);
        sentCount.set(dest.holomem, destOf(dest.holomem) + 1);
      }
    },
  },
};
