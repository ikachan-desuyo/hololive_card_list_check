/**
 * ベスティア・ゼータ (hBP07-002) 推しホロメン・白
 *
 * 推しスキル「Good Luck, holoh3ro!」[ホロパワー：-3][ターンに1回]:
 *   自分のステージのホロメン1人を選ぶ。このターンの間、選んだホロメンのアーツ+50。
 *   そのホロメンが#ID3期生を持つBuzzホロメンなら、かわりに、そのホロメンのアーツ+80。
 *   → メインステップの能動推しスキル。コストはエンジンが処理するので run では支払わない。
 *
 * SP推しスキル「不可能なんてないんだから！」[ホロパワー：-2][ゲームに1回]:
 *   自分のアーカイブの[マスコットとファン]を好きな枚数選び、自分の#ID3期生を持つホロメン1人に付ける。
 *   3枚以上付けたなら、このターンの間、そのホロメンのアーツ+100。
 *   → 付け先のマスコット枚数制限（1人1枚）は無視して「好きな枚数」付ける効果のため attachSupport を直接使う。
 */
export default {
  number: 'hBP07-002',

  oshiSkill: {
    name: 'Good Luck, holoh3ro!',
    canUse(engine, ownerIdx) {
      // ステージにホロメンが1人以上いること
      return engine._stageHolomems(engine.state.players[ownerIdx]).length > 0;
    },
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'self',
        title: 'アーツを上げるホロメンを選ぶ',
      });
      if (!target) return;
      const top = target.top;
      // #ID3期生 を持つ Buzzホロメンなら +80、それ以外は +50
      const isId3Buzz = top.buzz && ctx.hasTag(top, 'ID3期生');
      const amount = isId3Buzz ? 80 : 50;
      const chosen = target.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount,
        ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターン、${top.name} のアーツ+${amount}`,
      });
    },
  },

  spOshiSkill: {
    name: '不可能なんてないんだから！',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // アーカイブにマスコット/ファンがあり、#ID3期生 のホロメンがステージにいること
      const hasParts = p.archive.some((c) =>
        c.kind === 'support' && (c.supportType === 'マスコット' || c.supportType === 'ファン'));
      const hasId3 = engine._stageHolomems(p).some((h) => {
        const top = h.stack[0];
        return top && (top.tags || '').includes('ID3期生');
      });
      return hasParts && hasId3;
    },
    *run(ctx) {
      // 付け先: #ID3期生 を持つホロメン1人
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.hasTag(e.top, 'ID3期生'),
        title: 'マスコット/ファンを付ける #ID3期生 のホロメンを選ぶ',
      });
      if (!target) return;

      // アーカイブのマスコット/ファンを好きな枚数選んで付ける
      let attachedCount = 0;
      while (true) {
        const parts = ctx.player.archive.filter((c) =>
          c.kind === 'support' && (c.supportType === 'マスコット' || c.supportType === 'ファン'));
        if (parts.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: parts,
          title: `${target.top.name} に付けるマスコット/ファンを選ぶ（任意・複数可）`,
          optional: true,
          skipLabel: '付け終わる',
        });
        if (!picked) break;
        ctx.removeFromArchive(picked);
        ctx.attachSupport(picked, target.holomem);
        attachedCount++;
      }

      // 3枚以上付けたなら、このターンの間、そのホロメンのアーツ+100
      if (attachedCount >= 3) {
        const chosen = target.holomem;
        ctx.addTurnModifier({
          kind: 'artsPlus',
          amount: 100,
          ownerIdx: ctx.playerIdx,
          match: (h) => h === chosen,
          description: `このターン、${target.top.name} のアーツ+100`,
        });
      }
    },
  },
};
