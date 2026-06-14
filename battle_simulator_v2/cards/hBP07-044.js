/**
 * 尾丸ポルカ (hBP07-044) 赤・2nd・HP200（#JP #5期生 #ケモミミ）
 * アーツ「スタッフファーストです！」(120 / 赤赤, 特攻 紫+50):
 *   自分のデッキの上から2枚をアーカイブする。
 *   その後、自分のアーカイブのスタッフ1枚を手札に戻せる（「戻せる」=任意/0可）。
 *
 * キーワード/ギフト「The Show Must Go On」:
 *   [センター・コラボ限定]相手のターンで、自分のファンが付いているBuzzホロメンが
 *   ダウンした時、推しが〈尾丸ポルカ〉なら自分の減るライフ-1。
 *   → triggers.onAnyDown で実装。ダウン処理はアーカイブ前に走るので、ダウンした自分の
 *     ファン付きBuzzホロメンに lifeReductionOnDown を加算 → finish() のライフ減少計算で-1される。
 *     ※onAnyDown はダウンしたホロメン自身を除外して発火するため、ポルカ自身のダウンは対象外
 *      （ポルカは2ndで Buzz でないため、watcher として他のファン付きBuzzのダウンを拾う想定）。
 */
export default {
  number: 'hBP07-044',
  triggers: {
    // ギフト「The Show Must Go On」: 相手のターンで自分のファン付きBuzzホロメンがダウンした時、推しがポルカなら減るライフ-1
    *onAnyDown(ctx) {
      if (ctx.sourceHolomem?.stack[0].name !== '尾丸ポルカ') return;
      const z = ctx.sourceHolomemPos()?.zone;
      if (z !== 'center' && z !== 'collab') return;       // [センター・コラボ限定]
      if (ctx.state.turnPlayer === ctx.playerIdx) return; // 相手のターン
      if (ctx.player.oshi?.name !== '尾丸ポルカ') return;  // 推しが〈尾丸ポルカ〉
      const di = ctx.downedInfo;
      if (!di || di.ownerIdx !== ctx.playerIdx) return;   // 自分のホロメンがダウン
      const downed = di.holomem;
      if (!downed.stack[0].buzz) return;                                   // Buzzホロメン
      if (!downed.attachments.some((a) => a.supportType === 'ファン')) return; // ファンが付いている
      downed.lifeReductionOnDown = (downed.lifeReductionOnDown || 0) + 1;  // 減るライフ-1
      ctx.log('尾丸ポルカ「The Show Must Go On」: このダウンで減るライフ-1');
    },
  },
  arts: {
    'スタッフファーストです！': {
      *run(ctx) {
        // デッキの上から2枚をアーカイブ（強制）
        const looked = ctx.lookTopDeck(2); // 解決領域(revealed)に置かれる
        for (const c of looked) {
          ctx._unreveal(c);
          ctx.player.archive.push(c);
          ctx.log(`${c.name} をアーカイブした`);
        }
        ctx.recordDeckArchive(looked.length);
        // その後、アーカイブのスタッフ1枚を手札に戻せる（任意）
        const staffs = ctx.player.archive.filter(
          (c) => c.kind === 'support' && c.supportType === 'スタッフ',
        );
        if (staffs.length === 0) return;
        const picked = yield ctx.chooseCard({
          cards: staffs,
          title: '手札に戻すスタッフを選択',
          optional: true,
          skipLabel: '戻さない',
        });
        if (!picked) return;
        ctx.removeFromArchive(picked);
        ctx.addToHand(picked);
      },
    },
  },
};
