/**
 * 桃鈴ねね（推しホロメン hBD24-035）・黄 / ライフ5
 *
 * 推しスキル「イエローエンハンス」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の黄ホロメン1人のアーツ+20。
 *   → oshiSkill（能動）。自分のステージの黄ホロメンを1人選び、そのホロメンにのみ
 *     artsPlus +20 のターン修正を付与する（match で対象を identity 一致に限定）。
 *     コスト[ホロパワー：-2]と[ターンに1回]制限はエンジンが処理するため run には書かない。
 *
 * SP推しスキル「Birthday Gift ～Yellow～」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキから、黄ホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）。デッキの黄ホロメン1枚を選んで公開→手札に加え、デッキをシャッフル。
 *     候補が無い場合でもデッキシャッフルは行う（非公開領域のため「見つからない」も許容）。
 *     コスト[ホロパワー：-2]と[ゲームに1回]制限はエンジンが処理するため run には書かない。
 *
 * 保留: なし
 */
export default {
  number: 'hBD24-035',

  oshiSkill: {
    name: 'イエローエンハンス',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // 自分のステージに黄ホロメンがいること
      return engine._stageHolomems(p).some((h) => engine._hasColor(h, '黄'));
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => (e.top.color || '').includes('黄'),
        title: 'このターン アーツ+20する黄ホロメンを選択',
      });
      if (!entry) return;
      const chosen = entry.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 20,
        ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターンの間、${chosen.stack[0].name} のアーツ+20`,
      });
    },
  },

  spOshiSkill: {
    name: 'Birthday Gift ～Yellow～',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // デッキに黄ホロメンがいること
      return p.deck.some((c) => c.kind === 'holomen' && (c.color || '').includes('黄'));
    },
    *run(ctx) {
      const cand = ctx.deckCards((c) => c.kind === 'holomen' && (c.color || '').includes('黄'));
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: 'デッキから黄ホロメン1枚を公開して手札に加える',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();
    },
  },
};
