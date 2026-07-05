/**
 * ときのそら (hSD01-001) 推しホロメン・白
 *
 * 推しスキル「リプレイスメント」[ホロパワー：-1][ターンに1回]:
 *   自分のステージのエール1枚を、自分のホロメンに付け替える。
 *   → oshiSkill（能動）。発生源ホロメン（=エールを持つ任意の自分ホロメン）から
 *     エール1枚を選び、別の（または同じ）自分のホロメンへ付け替える。
 *     コスト[ホロパワー：-1]はエンジンが処理するため run には書かない。
 *
 * SP推しスキル「じゃあ敵だね？」[ホロパワー：-2][ゲームに1回]:
 *   相手のセンターホロメンとバックホロメン1人を交代させる。
 *   その後、このターンの間、自分の白センターホロメンのアーツ+50。
 *   → spOshiSkill（能動）。相手センターと選んだ相手バックを入れ替える（強制移動）。
 *     その後、自分のセンターが白なら、このターンの間そのセンターのアーツ+50。
 *     ※白でない、またはセンター不在ならアーツ修正は付かない（テキスト「白センターホロメンの」）。
 */
export default {
  number: 'hSD01-001',

  oshiSkill: {
    name: 'リプレイスメント',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // ステージにエールが1枚以上あり、付け替え先のホロメンが存在する時のみ意味がある
      const mems = engine._stageHolomems(p);
      if (mems.length === 0) return false;
      return mems.some((h) => h.cheers.length > 0);
    },
    *run(ctx) {
      // エールを持つ自分ホロメン（付け替え元）を選ぶ
      const fromEntry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.holomem.cheers.length > 0,
        title: '付け替えるエールを持つホロメンを選択',
      });
      if (!fromEntry) return;
      const from = fromEntry.holomem;
      const cheer = yield ctx.chooseCard({
        cards: [...from.cheers],
        title: '付け替えるエールを選択',
      });
      if (!cheer) return;
      // 付け替え先の自分ホロメンを選ぶ（同じホロメンを選んでも実質変化なし）
      const toEntry = yield ctx.chooseHolomem({
        side: 'self',
        title: 'エールの付け替え先のホロメンを選択',
      });
      if (!toEntry) return;
      const to = toEntry.holomem;
      if (to === from) return;
      ctx.moveCheer(cheer, from, to);
    },
  },

  spOshiSkill: {
    name: 'じゃあ敵だね？',
    canUse(engine, ownerIdx) {
      const opp = engine.state.players[1 - ownerIdx];
      // 相手にセンターとバックが1人以上いる時のみ交代できる
      return !!opp.center && opp.back.length > 0;
    },
    *run(ctx) {
      const opp = ctx.opponent;
      if (opp.center && opp.back.length > 0) {
        const backEntry = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'back',
          title: '相手センターと交代させるバックホロメンを選択',
        });
        if (backEntry) {
          const back = backEntry.holomem;
          const bi = opp.back.indexOf(back);
          if (bi !== -1) {
            const oldCenter = opp.center;
            opp.back.splice(bi, 1);
            opp.back.push(oldCenter);
            opp.center = back;
            ctx.log(`相手のセンター（${oldCenter.stack[0].name}）とバック（${back.stack[0].name}）を交代させた`);
          }
        }
      }
      // その後、自分のセンターが白ならアーツ+50（このターン）
      const center = ctx.player.center;
      if (center && center.stack[0].color === '白') {
        ctx.addTurnModifier({
          kind: 'artsPlus', amount: 50, ownerIdx: ctx.playerIdx,
          match: (h) => h === center,
          description: `このターンの間、${center.stack[0].name}（白センター）のアーツ+50`,
        });
      }
    },
  },
};
