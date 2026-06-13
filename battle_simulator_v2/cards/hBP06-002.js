/**
 * 響咲リオナ (hBP06-002) 推しホロメン・白
 *
 * 推しスキル「やりたいように、私は私らしく」[ホロパワー：-2][ターンに1回]:
 *   自分のデッキの上から2枚をアーカイブする。その後、このターンの間、
 *   自分の#FLOW GLOWを持つ[センターホロメンとコラボホロメン]のアーツ+20。
 *   → メインステップの能動推しスキル。コストはエンジンが処理するので run では支払わない。
 *
 * SP推しスキル「生き抜いていくんです！」[ホロパワー：-1][ゲームに1回]:
 *   自分のデッキの枚数が5枚以下で、自分の#FLOW GLOWを持つホロメンが相手のセンターホロメンを
 *   ダウンさせた時に使える：相手のライフ-1。
 *   → 「ダウンさせた時に使える」タイミング割り込み型のSP推しスキル。
 *     ホロメンのダウン監視＋SP推しスキルのトリガー発火機構が未対応のため未実装（保留）。
 */
const isFlowGlow = (ctx, top) => ctx.hasTag(top, 'FLOW') && ctx.hasTag(top, 'GLOW');

export default {
  number: 'hBP06-002',
  oshiSkill: {
    *run(ctx) {
      // デッキの上から2枚をアーカイブ
      const cards = ctx.lookTopDeck(2);
      for (const c of cards) {
        ctx._unreveal(c);
        ctx.player.archive.push(c);
        ctx.log(`デッキの上から ${c.name} をアーカイブ`);
      }
      // このターンの間、#FLOW GLOW のセンター/コラボのアーツ+20
      const ownerIdx = ctx.playerIdx;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 20,
        ownerIdx,
        match: (h) => {
          const top = h.stack[0];
          if (!top || !isFlowGlow(ctx, top)) return false;
          const zone = ctx.engine._zoneOf(h);
          return zone === 'center' || zone === 'collab';
        },
        description: 'このターン、#FLOW GLOW のセンター/コラボホロメンのアーツ+20',
      });
    },
  },
  // SP推しスキル「生き抜いていくんです！」はダウン時トリガー型のため未実装（保留）
};
