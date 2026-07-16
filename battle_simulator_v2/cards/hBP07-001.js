/**
 * 角巻わため (hBP07-001) 推しホロメン・白
 *
 * 推しスキル「角ドリルしたろか？」[ホロパワー：-6][ターンに1回]:
 *   このターンの間、自分のステージの〈角巻わため〉全員のアーツ+100。
 *   → oshiSkill として実装（能動スキル）。
 *      addTurnModifier(kind:'artsPlus') で、〈角巻わため〉のホロメン（ラムダック等の別名含む）にのみ +100。
 *      コスト[ホロパワー：-6]はエンジン側が処理するため run 内では書かない。
 */
export default {
  number: 'hBP07-001',

  // 推しステージスキル「ドドドライブ」:
  //   自分の〈角巻わため〉がアーツを使った時、自分のデッキの上から1枚をホロパワーにする（常時）。
  oshiStageSkill: {
    name: 'ドドドライブ',
    * onArtsUse(ctx) {
      // ctx.sourceHolomem = アーツ使用者（ラムダック等「〈角巻わため〉としても扱う」別名にも一致させる）
      const top = ctx.sourceHolomem?.stack[0];
      if (!top || !ctx.nameIs(top, '角巻わため')) return;
      if (ctx.player.deck.length === 0) return;
      ctx.player.holoPower.push(ctx.player.deck.shift());
      ctx.log(`ドドドライブ: デッキの上から1枚をホロパワーに（ホロパワー${ctx.player.holoPower.length}枚）`);
    },
  },

  oshiSkill: {
    name: '角ドリルしたろか？',
    *run(ctx) {
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 100,
        ownerIdx: ctx.playerIdx,
        // 自分のステージの〈角巻わため〉全員（ラムダック等の別名も含めて名前一致）
        match: (h) => !!h.stack[0] && ctx.nameIs(h.stack[0], '角巻わため'),
        description: 'このターンの間、自分のステージの〈角巻わため〉全員のアーツ+100',
      });
    },
  },
};
