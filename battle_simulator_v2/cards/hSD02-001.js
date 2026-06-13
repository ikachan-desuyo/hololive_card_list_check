/**
 * 百鬼あやめ (hSD02-001) 推しホロメン・赤
 *
 * 推しスキル「レッドマイク」[ホロパワー：2消費][ターンに1回]:
 *   このターンの間、自分の赤センターホロメンのアーツ+20。
 *   → oshiSkill（能動）。センターが赤ホロメンの時のみ意味があるので、その時だけ使える。
 *     addTurnModifier(artsPlus +20) を「現在の赤センターホロメン」に紐づける。
 *     コスト[ホロパワー：-2]はエンジン側が処理するため run には書かない。
 *
 * SP推しスキル「さあ！もう一度！」[ホロパワー：1消費][ゲームに1回]:
 *   自分のアーカイブの赤ホロメン1枚を手札に戻す。
 *   → spOshiSkill（能動）。アーカイブに赤ホロメンがある時のみ使える。
 *     コスト[ホロパワー：-1]はエンジン側が処理する。
 */
export default {
  number: 'hSD02-001',
  oshiSkill: {
    name: 'レッドマイク',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // センターが居て、その色が赤の時のみ効果がある
      return !!p.center && p.center.stack[0].color === '赤';
    },
    *run(ctx) {
      const center = ctx.player.center;
      if (!center || center.stack[0].color !== '赤') return;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 20, ownerIdx: ctx.playerIdx,
        match: (h) => h === center,
        description: `このターンの間、${center.stack[0].name}（赤センター）のアーツ+20`,
      });
    },
  },
  spOshiSkill: {
    name: 'さあ！もう一度！',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // アーカイブに赤ホロメンが居ること
      return p.archive.some((c) => c.kind === 'holomen' && c.color === '赤');
    },
    *run(ctx) {
      const reds = ctx.player.archive.filter((c) => c.kind === 'holomen' && c.color === '赤');
      if (reds.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: reds,
        title: 'アーカイブから手札に戻す赤ホロメンを選択',
      });
      if (!picked) return;
      ctx.removeFromArchive(picked);
      ctx.addToHand(picked);
    },
  },
};
