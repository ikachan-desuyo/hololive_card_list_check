/**
 * 白上フブキ (hSD14-001) 推しホロメン・白 / ライフ4
 *
 * 推しスキル「みんな一緒にいくぞぉおっ」[ホロパワー：-2][ターンに1回]:
 *   自分のマスコットが付いている〈白上フブキ〉1人を選ぶ。
 *   このターンの間、選んだホロメンのアーツ+20。
 *   → oshiSkill（能動）。名前が〈白上フブキ〉で、かつマスコット（supportType==='マスコット'）が
 *     付いている自分のホロメン1人を選び、このターンの間そのホロメンのアーツ+20。
 *     コスト[ホロパワー：-2]と[ターンに1回]制限はエンジンが処理するため run には書かない。
 *
 * SP推しスキル「マスコッツ、アッセンブル!!」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキから、マスコット1～2枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）。デッキ内のマスコットを1枚（必須）～2枚（任意）選び公開して手札に加え、
 *     最後にデッキをシャッフルする。「1～2枚」=最低1枚・最大2枚（デッキにマスコットが
 *     1枚しか無ければ1枚）。コスト[ホロパワー：-2]と[ゲームに1回]制限はエンジンが処理する。
 */
export default {
  number: 'hSD14-001',

  oshiSkill: {
    name: 'みんな一緒にいくぞぉおっ',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // 〈白上フブキ〉で、マスコットが付いている自分ホロメンがいる時のみ
      return engine._stageHolomems(p).some(
        (h) => h.stack[0].name === '白上フブキ' &&
          h.attachments.some((a) => a.supportType === 'マスコット'));
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.name === '白上フブキ' &&
          e.holomem.attachments.some((a) => a.supportType === 'マスコット'),
        title: 'アーツ+20する〈白上フブキ〉（マスコット付き）を選択',
      });
      if (!entry) return;
      const target = entry.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 20, ownerIdx: ctx.playerIdx,
        match: (h) => h === target,
        description: `このターンの間、${target.stack[0].name}のアーツ+20`,
      });
    },
  },

  spOshiSkill: {
    name: 'マスコッツ、アッセンブル!!',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // デッキにマスコットが1枚以上ある時のみ
      return p.deck.some((c) => c.kind === 'support' && c.supportType === 'マスコット');
    },
    *run(ctx) {
      // デッキ内のマスコットを1～2枚、手札に加える（1枚目は必須、2枚目は任意）
      for (let i = 0; i < 2; i++) {
        const cand = ctx.deckCards((c) => c.kind === 'support' && c.supportType === 'マスコット');
        if (cand.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: `手札に加えるマスコットを選択 (${i + 1}/2枚目)`,
          optional: i > 0, // 1枚目は必須、2枚目は任意（「1～2枚」）
          skipLabel: 'ここまでにする',
        });
        if (!picked) break;
        ctx.removeFromDeck(picked);
        ctx.flashReveal(picked); // 公開
        ctx.addToHand(picked);
      }
      // そしてデッキをシャッフルする
      ctx.shuffleDeck();
    },
  },
};
