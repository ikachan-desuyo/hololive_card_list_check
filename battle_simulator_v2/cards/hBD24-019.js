/**
 * 尾丸ポルカ (hBD24-019) 推しホロメン・赤・ライフ5
 *
 * 推しスキル「レッドエンハンス」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の赤ホロメン1人のアーツ+20。
 *   → oshiSkill（能動）。自分のステージの赤ホロメンを1人選び、そのホロメンにのみ
 *     artsPlus +20 のターン修正を付与する（match で対象を identity 一致に限定）。
 *     コスト[ホロパワー：-2]と[ターンに1回]制限はエンジンが処理するため run には書かない。
 *
 * SP推しスキル「Birthday Gift ～Red～」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキから、赤ホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）。デッキの赤ホロメン1枚を選んで公開→手札に加え、デッキをシャッフル。
 *     候補が無い場合でもデッキシャッフルは行う（非公開領域のため「見つからない」も許容）。
 *     コスト[ホロパワー：-2]と[ゲームに1回]制限はエンジンが処理するため run には書かない。
 *
 * 保留: なし
 * 修正（2026-07-17 監査）: 色判定を engine._hasColor / (color||'').includes に統一（多色ホロメン対応、総合ルール 2.4.3）。
 */
export default {
  number: 'hBD24-019',

  oshiSkill: {
    name: 'レッドエンハンス',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // 自分のステージに赤ホロメンがいること
      return engine._stageHolomems(p).some((h) => engine._hasColor(h, '赤'));
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.engine._hasColor(e.holomem, '赤'),
        title: 'アーツ+20する赤ホロメンを選択',
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
    name: 'Birthday Gift ～Red～',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // デッキに赤ホロメンがいること
      return p.deck.some((c) => c.kind === 'holomen' && (c.color || '').includes('赤'));
    },
    *run(ctx) {
      const cand = ctx.deckCards((c) => c.kind === 'holomen' && (c.color || '').includes('赤'));
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: 'デッキから赤ホロメン1枚を公開して手札に加える',
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
