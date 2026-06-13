/**
 * 小鳥遊キアラ (hBP01-006) 推しホロメン・赤
 *
 * 推しスキル「フェニックステール」[ホロパワー：-2][ターンに1回]:
 *   自分のアーカイブのホロメン1枚を手札に戻す。
 *   → oshiSkill（能動）として実装。アーカイブ内の card_type=ホロメン を1枚選び手札へ。
 *
 * ※SP推しスキル「Rise from the ashes」[ホロパワー：-2][ゲームに1回]:
 *   「相手のターンで、自分の赤ホロメンがダウンした時に使える：自分の減るライフ-1。
 *    さらに、ダウンした1人を選び、そのホロメンを含め重なっているホロメンすべてを手札に戻す。」
 *   → ダウン時のタイミング割り込み推しスキル（減るライフの軽減＝被ダメージ/ライフ減少の置換）であり、
 *     エンジンが推しスキルのダウン割り込み・ライフ減少置換に未対応のため未実装（保留）。
 */
export default {
  number: 'hBP01-006',
  oshiSkill: {
    name: 'フェニックステール',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      return p.archive.some((c) => c.kind === 'holomem');
    },
    *run(ctx) {
      const cand = ctx.player.archive.filter((c) => c.kind === 'holomem');
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
};
