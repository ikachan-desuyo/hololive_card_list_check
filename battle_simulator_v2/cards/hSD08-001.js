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
 *   → 【未実装・保留】これは「ダメージを受ける時に使える」被ダメージ割り込み型の
 *     SP推しスキル。現行エンジンには、ダメージを受ける瞬間に割り込んで推しスキルを
 *     起動し、受けるダメージを軽減する仕組みが無いため保留する。
 *     能動起動型ではないので spOshiSkill としては実装しない。
 */
export default {
  number: 'hSD08-001',

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

  // SP推しスキル「クイックガード」は被ダメージ割り込みタイミング型のため未実装（上部JSDoc参照）。
};
