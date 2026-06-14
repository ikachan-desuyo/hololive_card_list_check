/**
 * 宝鐘マリン (hSD09-001) 推しホロメン・赤
 *
 * 推しスキル「レッドマイク」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の赤センターホロメンのアーツ+20。
 *   → oshiSkill（能動）。センターホロメンが赤である間アーツ+20するターン修正を付与。
 *     match はその時点でセンターであり、かつトップカードの色が赤である場合に一致させる
 *     （ブルームで色が変わる/センターが入れ替わる可能性に動的対応）。
 *     ※コスト[ホロパワー：-2]はエンジン側が処理するため run には書かない。
 *
 * SP推しスキル「さあ！もう一度！」[ホロパワー：-1][ゲームに1回]:
 *   自分のアーカイブの赤ホロメン1枚を手札に戻す。
 *   → spOshiSkill（能動）。アーカイブの赤いホロメンカードを選んで手札へ戻す。
 *     ※コスト[ホロパワー：-1]はエンジン側が処理するため run には書かない。
 */
export default {
  number: 'hSD09-001',

  oshiSkill: {
    name: 'レッドマイク',
    canUse(engine, ownerIdx) {
      // 赤センターホロメンがいる時のみ意味がある
      const p = engine.state.players[ownerIdx];
      const center = p.center;
      if (!center) return false;
      const top = center.stack[0];
      return !!top && top.color === '赤';
    },
    *run(ctx) {
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 20,
        ownerIdx: ctx.playerIdx,
        // 「自分の赤センターホロメン」: その時点でセンターであり、トップカードの色が赤であるもの
        match: (h) => h === ctx.player.center && h.stack[0] && h.stack[0].color === '赤',
        description: 'このターンの間、自分の赤センターホロメンのアーツ+20',
      });
    },
  },

  spOshiSkill: {
    name: 'さあ！もう一度！',
    canUse(engine, ownerIdx) {
      // アーカイブに赤いホロメンカードが1枚以上ある時のみ使える
      const p = engine.state.players[ownerIdx];
      return p.archive.some((c) => c && c.kind === 'holomen' && c.color === '赤');
    },
    *run(ctx) {
      const reds = ctx.player.archive.filter((c) => c && c.kind === 'holomen' && c.color === '赤');
      if (reds.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: reds,
        title: '手札に戻すアーカイブの赤ホロメンを選択',
      });
      if (!picked) return;
      ctx.removeFromArchive(picked);
      ctx.addToHand(picked);
    },
  },
};
