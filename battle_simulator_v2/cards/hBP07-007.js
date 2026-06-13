/**
 * 桃鈴ねね (hBP07-007) 推しホロメン・黄
 *
 * 推しスキル「スーパーねぽらぼエナジー」[ホロパワー：-2][ターンに1回]:
 *   自分のアーカイブのエールを自分の#5期生を持つ2ndホロメン全員に1枚ずつ送る。
 *   → メインステップの能動推しスキル。コストはエンジンが処理するので run では支払わない。
 *     対象は #5期生 を持つ 2nd レベルのホロメン全員。各ホロメンへアーカイブのエールを1枚ずつ送る。
 *
 * SP推しスキル「ねねちの大・暴・走！」[ホロパワー：-1][ゲームに1回]:
 *   自分のデッキから、Debutホロメンの〈桃鈴ねね〉1～4枚を公開し、ステージに出す。
 *   そしてデッキをシャッフルする。
 *   → デッキから Debut〈桃鈴ねね〉を1～4枚（ステージ上限の範囲で）公開しステージ（バック）に出す。
 *     「1～4枚」のため最低1枚（出せる候補・ステージ空きがある限り）。
 */
function isTarget2nd(ctx, e) {
  return e.top.bloomLevel === '2nd' && ctx.hasTag(e.top, '5期生');
}

export default {
  number: 'hBP07-007',

  oshiSkill: {
    name: 'スーパーねぽらぼエナジー',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // アーカイブにエールがあり、対象（#5期生の2ndホロメン）が1人以上いること
      const hasCheer = p.archive.some((c) => c.kind === 'cheer');
      const hasTarget = engine._stagePositions(p).some((pos) => {
        const top = engine._holomemAt(p, pos).stack[0];
        return top.bloomLevel === '2nd' && (top.tags || []).includes('5期生');
      });
      return hasCheer && hasTarget;
    },
    *run(ctx) {
      // #5期生 を持つ 2nd ホロメン全員に、アーカイブのエールを1枚ずつ送る
      const targets = ctx.holomems('self', (e) => isTarget2nd(ctx, e));
      for (const t of targets) {
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: cheers,
          title: `${t.top.name} に送るエールを選択（アーカイブから）`,
          optional: true,
          skipLabel: 'このホロメンには送らない',
        });
        if (picked) {
          ctx.removeFromArchive(picked);
          ctx.attachCheer(picked, t.holomem);
        }
      }
    },
  },

  spOshiSkill: {
    name: 'ねねちの大・暴・走！',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      if (engine._stageCount(p) >= 6) return false; // ステージに空きが無い
      return p.deck.some((c) =>
        c.kind === 'holomen' && c.bloomLevel === 'Debut' && c.name === '桃鈴ねね');
    },
    *run(ctx) {
      // デッキから Debut〈桃鈴ねね〉を1～4枚、ステージ（バック）に出す
      for (let i = 0; i < 4; i++) {
        if (ctx.engine._stageCount(ctx.player) >= 6) break;
        const cand = ctx.deckCards((c) =>
          c.kind === 'holomen' && c.bloomLevel === 'Debut' && c.name === '桃鈴ねね');
        if (cand.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: `デッキから Debut〈桃鈴ねね〉をステージに出す（${i + 1}枚目・最大4枚）`,
          // 1枚目は必須（最低1枚）、2枚目以降は任意
          optional: i > 0,
          skipLabel: 'これ以上出さない',
        });
        if (!picked) break;
        ctx.removeFromDeck(picked);
        ctx.flashReveal(picked);
        ctx.putToBack(picked);
      }
      ctx.shuffleDeck();
    },
  },
};
