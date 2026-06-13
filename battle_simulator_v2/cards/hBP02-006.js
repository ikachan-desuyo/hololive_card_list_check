/**
 * クレイジー・オリー（推しホロメン hBP02-006）
 * 推しスキル「ゾンビ戦術」[ホロパワー：2消費][ターンに1回]:
 *   自分の#ID2期生を持つホロメン1人を、自分のアーカイブのホロメンを使ってBloomさせる。
 * SP推しスキル「蘇るオリー」[ホロパワー：2消費][ゲームに1回]:
 *   自分のデッキを4枚引いた後、手札2枚をアーカイブする。
 *   その後、自分のホロメン1人を、自分のアーカイブのホロメンを使ってBloomできる。
 */
export default {
  number: 'hBP02-006',

  oshiSkill: {
    // アーカイブにBloom可能なホロメンがいる時だけ使える（空振りでコストを払わない）
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      const targets = engine._stagePositions(p)
        .map((pos) => engine._holomemAt(p, pos))
        .filter((h) => (h.stack[0].tags || []).includes('ID2期生'));
      return p.archive.some((card) =>
        card.kind === 'holomen' && targets.some((h) => engine._canBloom(h, card)));
    },
    *run(ctx) {
      yield* ctx.bloomFromArchiveFlow({
        targetFilter: (e) => ctx.hasTag(e.top, 'ID2期生'),
        optional: false,
      });
    },
  },

  spOshiSkill: {
    *run(ctx) {
      ctx.draw(4);
      // 手札2枚をアーカイブ（選択）
      for (let i = 0; i < 2 && ctx.player.hand.length > 0; i++) {
        const card = yield ctx.chooseCard({
          cards: ctx.player.hand,
          title: `アーカイブする手札を選択（${i + 1}/2）`,
        });
        if (!card) break;
        ctx.removeFromHand(card);
        ctx.player.archive.push(card);
        ctx.log(`${card.name} をアーカイブした`);
      }
      // アーカイブからBloomできる（任意）
      yield* ctx.bloomFromArchiveFlow({ optional: true });
    },
  },
};
