/**
 * 天音かなた (hSD08-001) 推しホロメン・白
 *
 * 推しスキル「ホワイトマイク」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の白センターホロメンのアーツ+20。
 *   → oshiSkill（能動）。「白センターホロメン」を動的に判定する artsPlus 修正を付与。
 *     対象は「自分のセンター かつ トップカードの色が白」のホロメン。
 *     センター入れ替え/ブルームで色が変わっても match で毎回判定して追従する。
 *     ※コスト[ホロパワー：-2]はエンジン側が処理するため run には書かない。
 *
 * SP推しスキル「クイックガード」[ホロパワー：-1][ゲームに1回]:
 *   相手のターンで、自分の白ホロメンが相手からダメージを受ける時に使える：
 *   そのホロメン1人が受けるダメージ-20。
 *   → onDamageOshiSkill(sp:true).reduce で実装。被ダメージ割り込み（相手ターンの被弾のみ engine が提示）。
 */
export default {
  number: 'hSD08-001',

  // SP推しスキル「クイックガード」: 白ホロメンが受けるダメージ-20（相手ターンの被弾時、ゲームに1回）
  onDamageOshiSkill: {
    cost: 1,
    sp: true,
    title: 'SP推しスキル「クイックガード」: 受けるダメージ-20しますか？',
    canUse(engine, defIdx, target) {
      return target.stack[0].color === '白';
    },
    reduce() { return 20; },
  },

  oshiSkill: {
    name: 'ホワイトマイク',
    canUse(engine, ownerIdx) {
      // 白のセンターホロメンがいる時のみ意味がある
      const p = engine.state.players[ownerIdx];
      const center = p.center;
      if (!center) return false;
      const top = center.stack[0];
      return !!top && top.color === '白';
    },
    *run(ctx) {
      const engine = ctx.engine;
      const ownerIdx = ctx.playerIdx;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 20,
        ownerIdx,
        // 「自分の白センターホロメン」を動的に判定（センター入れ替えに追従）
        match: (h) => {
          const p = engine.state.players[ownerIdx];
          return p.center === h && h.stack[0] && h.stack[0].color === '白';
        },
        description: 'このターンの間、自分の白センターホロメンのアーツ+20',
      });
    },
  },
};
