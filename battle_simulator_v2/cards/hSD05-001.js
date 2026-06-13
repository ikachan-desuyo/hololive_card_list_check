/**
 * 轟はじめ (hSD05-001) 推しホロメン・白
 *
 * 推しスキル「ホワイトマイク」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の白センターホロメンのアーツ+20。
 *   → oshiSkill（能動）。センターが白ホロメンの時のみ意味があるので、その時だけ使える。
 *     addTurnModifier(artsPlus +20) を「現在の白センターホロメン」に紐づける。
 *     コスト[ホロパワー：-2]はエンジン側が処理するため run には書かない。
 *
 * SP推しスキル「クイックガード」[ホロパワー：-1][ゲームに1回]:
 *   相手のターンで、自分の白ホロメンが相手からダメージを受ける時に使える：そのホロメン1人が受けるダメージ-20。
 *   → 【未実装・保留】これは「ダメージを受ける時に使える」タイミング割り込み推しスキルであり、
 *     かつ「受けるダメージ-20」という被ダメージ割り込み（ダメージ軽減）を必要とする。
 *     被ダメージ割り込み機構およびダメージ受け時タイミングの推しスキル発動が未実装のため、
 *     spOshiSkill は定義しない（エンジン側で発動タイミングを提供できない）。
 */
export default {
  number: 'hSD05-001',
  oshiSkill: {
    name: 'ホワイトマイク',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // センターが居て、その色が白の時のみ効果がある
      return !!p.center && p.center.stack[0].color === '白';
    },
    *run(ctx) {
      const center = ctx.player.center;
      if (!center || center.stack[0].color !== '白') return;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 20, ownerIdx: ctx.playerIdx,
        match: (h) => h === center,
        description: `このターンの間、${center.stack[0].name}（白センター）のアーツ+20`,
      });
    },
  },
  // SP推しスキル「クイックガード」は被ダメージ割り込み（ダメージ-20）が必要なため未実装（上記JSDoc参照）。
};
