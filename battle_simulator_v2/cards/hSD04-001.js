/**
 * 癒月ちょこ (hSD04-001) 推しホロメン・紫
 *
 * 推しスキル「パープルマイク」[ホロパワー：2消費][ターンに1回]:
 *   このターンの間、自分の紫センターホロメンのアーツ+20。
 *   → oshiSkill（能動）。センターホロメンが紫である間アーツ+20するターン修正を付与。
 *     match はセンターであり、かつ現在のトップカードの色が紫である場合に一致させる
 *     （ブルームで色が変わる/センターが入れ替わる可能性に動的対応）。
 *     ※コスト[ホロパワー：-2]はエンジン側が処理するため run には書かない。
 *
 * SP推しスキル「カードチェンジ」[ホロパワー：1消費][ゲームに1回]:
 *   自分のデッキを2枚引いた後、手札1枚をアーカイブする。
 *   → spOshiSkill（能動）。2ドロー後、手札から1枚を選んでアーカイブ。
 *     ※コスト[ホロパワー：-1]はエンジン側が処理するため run には書かない。
 */
export default {
  number: 'hSD04-001',

  oshiSkill: {
    name: 'パープルマイク',
    canUse(engine, ownerIdx) {
      // 紫センターホロメンがいる時のみ意味がある
      const p = engine.state.players[ownerIdx];
      const center = p.center;
      if (!center) return false;
      const top = center.stack[0];
      return !!top && top.color === '紫';
    },
    *run(ctx) {
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 20,
        ownerIdx: ctx.playerIdx,
        // 「自分の紫センターホロメン」: その時点でセンターであり、トップカードの色が紫であるもの
        match: (h) => h === ctx.player.center && h.stack[0] && h.stack[0].color === '紫',
        description: 'このターンの間、自分の紫センターホロメンのアーツ+20',
      });
    },
  },

  spOshiSkill: {
    name: 'カードチェンジ',
    canUse(engine, ownerIdx) {
      // ドローできる（デッキがある）か、入れ替える手札がある時に意味がある
      const p = engine.state.players[ownerIdx];
      return p.deck.length > 0 || p.hand.length > 0;
    },
    *run(ctx) {
      ctx.draw(2);
      if (ctx.player.hand.length === 0) return;
      const card = yield ctx.chooseCard({
        cards: [...ctx.player.hand],
        title: 'アーカイブする手札1枚を選択',
      });
      if (!card) return;
      ctx.removeFromHand(card);
      ctx.player.archive.push(card);
      ctx.log(`${ctx.player.name}: ${card.name} をアーカイブした`);
    },
  },
};
