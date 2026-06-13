/**
 * 沙花叉クロヱ (hBP06-056) 青・2nd・HP200（#JP #秘密結社holoX #海）
 *
 * ギフト「ギャル叉と登校」:
 *   このゲーム中に、自分のSP推しスキル「人生リセットボタン」を使っていたなら、
 *   このホロメンのアーツ「沙花叉と青春しよ？」に必要な無色-1。
 *   → アーツ必要エール軽減オーラ（engine が _effectiveArtCost で参照）。
 *     SP推しスキルは各推しに1つなので、エンジンが追跡する usedSpOshiSkillThisGame を条件にする
 *     （hBP06-044 と同じ運用）。このホロメンはアーツが1つだけなので、
 *     軽減はそのまま「沙花叉と青春しよ？」への軽減と一致する。
 *
 * アーツ「沙花叉と青春しよ？」(120+):
 *   自分のデッキの上から6枚を公開する。公開したホロメン1枚につき、このアーツ+20。
 *   そして公開したカードをアーカイブする。
 */
export default {
  number: 'hBP06-056',

  // 自分(src=target=このホロメン)がステージにいる間、SP推しスキル使用済みなら自身のアーツ必要無色-1
  artsCostReduceAura(src, target, engine) {
    if (src !== target) return []; // このホロメン自身のアーツのみ対象
    const ownerIdx = engine.state.players.findIndex((p) =>
      engine._stageHolomems(p).includes(src));
    if (ownerIdx === -1) return [];
    if (!engine.state.players[ownerIdx].usedSpOshiSkillThisGame) return [];
    return [{ color: '無色', amount: 1 }];
  },

  arts: {
    '沙花叉と青春しよ？': {
      *run(ctx) {
        const revealed = ctx.lookTopDeck(6); // 解決領域(revealed)に置く
        const holomemCount = revealed.filter((c) => c.kind === 'holomen').length;
        if (holomemCount > 0) {
          ctx.addArtBonus(holomemCount * 20, `公開したホロメン${holomemCount}枚 ×20`);
        }
        // 公開したカードを全てアーカイブする
        for (const c of revealed) {
          ctx._unreveal(c);
          ctx.player.archive.push(c);
        }
        ctx.log(`${ctx.player.name}: 公開した${revealed.length}枚をアーカイブした`);
      },
    },
  },
};
