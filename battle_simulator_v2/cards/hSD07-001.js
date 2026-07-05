/**
 * 不知火フレア (hSD07-001) 推しホロメン・黄
 *
 * 推しスキル「イエローマイク」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の黄センターホロメンのアーツ+20。
 *   → oshiSkill（能動）。センターホロメンが黄である間アーツ+20するターン修正を付与。
 *     match はセンターであり、かつ現在のトップカードの色が黄である場合に一致させる
 *     （ブルームで色が変わる/センターが入れ替わる可能性に動的対応）。
 *     ※コスト[ホロパワー：-2]はエンジン側が処理するため run には書かない。
 *
 * SP推しスキル「後は引き受けた！」[ホロパワー：-1][ゲームに1回]:
 *   自分のセンターホロメンとお休みしていないバックホロメン1人を交代させる。
 *   さらに、バックポジションに移動したホロメン（=交代前のセンター）のHP30回復。
 *   → spOshiSkill（能動）。お休みしていないバックを選んでセンターと入れ替え、
 *     入れ替わってバックへ移動した元センターのHPを30回復。
 *     ※コスト[ホロパワー：-1]はエンジン側が処理するため run には書かない。
 */
export default {
  number: 'hSD07-001',

  oshiSkill: {
    name: 'イエローマイク',
    canUse(engine, ownerIdx) {
      // 黄センターホロメンがいる時のみ意味がある
      const p = engine.state.players[ownerIdx];
      const center = p.center;
      if (!center) return false;
      const top = center.stack[0];
      return !!top && top.color === '黄';
    },
    *run(ctx) {
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 20,
        ownerIdx: ctx.playerIdx,
        // 「自分の黄センターホロメン」: その時点でセンターであり、トップカードの色が黄であるもの
        match: (h) => h === ctx.player.center && h.stack[0] && h.stack[0].color === '黄',
        description: 'このターンの間、自分の黄センターホロメンのアーツ+20',
      });
    },
  },

  spOshiSkill: {
    name: '後は引き受けた！',
    canUse(engine, ownerIdx) {
      // センターがいて、お休みしていないバックホロメンが1人以上いる時のみ使える
      const p = engine.state.players[ownerIdx];
      if (!p.center) return false;
      return p.back.some((h) => h && !h.rested);
    },
    *run(ctx) {
      const p = ctx.player;
      if (!p.center) return;
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.pos.zone === 'back' && !e.holomem.rested,
        title: 'センターと交代するお休みしていないバックホロメンを選択',
      });
      if (!entry) return;
      const i = entry.pos.index;
      // センターと選んだバックを入れ替える
      const formerCenter = p.center;
      p.center = p.back[i];
      p.back[i] = formerCenter;
      ctx.log(`${p.center.stack[0].name} がセンターに移動（交代）`);
      // バックポジションに移動したホロメン（=交代前のセンター）のHP30回復
      ctx.heal(formerCenter, 30);
    },
  },
};
