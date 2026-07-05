/**
 * 一伊那尓栖 (hBD24-046) 推しホロメン・紫・ライフ5
 *
 * 推しスキル「パープルエンハンス」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の紫ホロメン1人のアーツ+20。
 *   → oshiSkill（能動）。自分のステージの紫ホロメン（トップカードの色が紫）を1人選び、
 *     そのホロメンにのみ artsPlus +20 のターン修正を付与する（match で identity 一致に限定）。
 *     コスト[ホロパワー：-2]と[ターンに1回]制限はエンジンが処理するため run には書かない。
 *
 * SP推しスキル「Birthday Gift ～Purple～」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキから、紫ホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）。デッキ（非公開領域）内の紫ホロメンを1枚選んで公開し手札へ。
 *     その後デッキをシャッフル。非公開領域のため「加えない」も選べる(optional)。
 *     候補が無くてもシャッフルは行う。
 *     コスト[ホロパワー：-2]と[ゲームに1回]制限はエンジンが処理するため run には書かない。
 *
 * 保留: なし（全効果実装済み）。
 */
export default {
  number: 'hBD24-046',

  oshiSkill: {
    name: 'パープルエンハンス',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // 自分のステージに紫ホロメンがいること
      return engine._stageHolomems(p).some((h) => h.stack[0]?.color === '紫');
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.color === '紫',
        title: 'アーツ+20する紫ホロメンを選択',
      });
      if (!entry) return;
      const chosen = entry.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 20,
        ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターンの間、${chosen.stack[0].name}（紫）のアーツ+20`,
      });
    },
  },

  spOshiSkill: {
    name: 'Birthday Gift ～Purple～',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // デッキに紫ホロメンが1枚以上あること
      return p.deck.some((c) => c.kind === 'holomen' && c.color === '紫');
    },
    *run(ctx) {
      const cand = ctx.deckCards((c) => c.kind === 'holomen' && c.color === '紫');
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: 'デッキから紫ホロメン1枚を公開して手札に加える',
        optional: true,
        skipLabel: '加えない',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      // そしてデッキをシャッフルする
      ctx.shuffleDeck();
    },
  },
};
