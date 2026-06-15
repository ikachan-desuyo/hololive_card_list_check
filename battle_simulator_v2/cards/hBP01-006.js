/**
 * 小鳥遊キアラ (hBP01-006) 推しホロメン・赤
 *
 * 推しスキル「フェニックステール」[ホロパワー：-2][ターンに1回]:
 *   自分のアーカイブのホロメン1枚を手札に戻す。
 *   → oshiSkill（能動）として実装。アーカイブ内の card_type=ホロメン を1枚選び手札へ。
 *
 * SP推しスキル「Rise from the ashes」[ホロパワー：-2][ゲームに1回]:
 *   相手のターンで、自分の赤ホロメンがダウンした時に使える：自分の減るライフ-1。
 *   さらに、ダウンした1人を選び、そのホロメンを含め重なっているホロメンすべてを手札に戻す。
 *   → ダウン処理中に使えるSP推しスキル (11.3.1.1) として onDownOshiSkill(sp:true).run で実装。
 *     「減るライフ-1」は downed.lifeReductionOnDown を加算（finish() のライフ減少計算が参照）。
 *     run はアーカイブ前に走るため、スタックを手札へ戻せば finish() はアーカイブしない。
 */
export default {
  number: 'hBP01-006',
  oshiSkill: {
    name: 'フェニックステール',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      return p.archive.some((c) => c.kind === 'holomen');
    },
    *run(ctx) {
      const cand = ctx.player.archive.filter((c) => c.kind === 'holomen');
      if (cand.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: 'アーカイブのホロメン1枚を手札に戻す',
      });
      if (!picked) return;
      ctx.removeFromArchive(picked);
      ctx.addToHand(picked, { reveal: false });
    },
  },

  // SP推しスキル「Rise from the ashes」: 相手のターンで自分の赤ホロメンがダウンした時
  onDownOshiSkill: {
    sp: true,
    cost: 2,
    title: 'SP推しスキル「Rise from the ashes」: 減るライフ-1し、重なっているホロメンすべてを手札に戻しますか？',
    canUse(engine, ownerIdx, downedHolomem) {
      const p = engine.state.players[ownerIdx];
      return engine.state.turnPlayer !== ownerIdx &&        // 相手のターン
        !p.usedSpOshiSkillThisGame &&                        // ゲームに1回
        p.holoPower.length >= 2 &&                           // [ホロパワー：-2]
        engine._hasColor(downedHolomem, '赤');               // 赤ホロメン
    },
    *run(ctx) {
      const downed = ctx.downedHolomem;
      if (!downed) return;
      // 自分の減るライフ-1（finish() のライフ減少計算が lifeReductionOnDown を差し引く）
      downed.lifeReductionOnDown = (downed.lifeReductionOnDown || 0) + 1;
      ctx.log('SP推しスキル「Rise from the ashes」: このダウンで減るライフ-1');
      // 重なっているホロメンすべてを手札に戻す（アーカイブ前なので finish() はアーカイブしない）
      const cards = [...downed.stack];
      downed.stack.length = 0;
      for (const c of cards) ctx.addToHand(c);
      ctx.log(`重なっているホロメン${cards.length}枚を手札に戻した`);
    },
  },
};
