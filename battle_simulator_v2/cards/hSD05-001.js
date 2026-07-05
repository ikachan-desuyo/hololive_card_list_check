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
 *   → onDamageOshiSkill(sp:true).reduce で実装。被ダメージ割り込み（相手ターンの被弾のみ engine が提示）。
 */
export default {
  number: 'hSD05-001',

  // SP推しスキル「クイックガード」: 白ホロメンが受けるダメージ-20（相手ターンの被弾時、ゲームに1回）
  onDamageOshiSkill: {
    cost: 1,
    sp: true,
    title: 'SP推しスキル「クイックガード」: 受けるダメージ-20しますか？',
    canUse(engine, defIdx, target) {
      return target.stack[0].color === '白'; // 白ホロメン（相手ターンの被弾は engine が担保）
    },
    reduce() { return 20; },
  },

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
};
