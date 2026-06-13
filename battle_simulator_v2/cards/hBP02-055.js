/**
 * 森カリオペ (hBP02-055) 紫・Debut・HP80（#EN #Myth #歌）
 * コラボエフェクト「ショータイム」:
 *   自分の手札のホロメン1枚をアーカイブできる：
 *   このターンの間、自分のステージの#Mythを持つホロメン1人のアーツ+20。
 * アーツ「マイステージ」(20): テキスト効果なし。
 */
export default {
  number: 'hBP02-055',
  collabEffect: {
    name: 'ショータイム',
    *run(ctx) {
      // コスト: 手札のホロメン1枚をアーカイブ（任意=「できる」）
      const handHolomems = ctx.player.hand.filter((c) => c.kind === 'holomen');
      if (handHolomems.length === 0) return;
      // 強化対象となる#Mythホロメンがいなければ意味がない
      const hasMyth = ctx.holomems('self', (e) => ctx.hasTag(e.top, 'Myth')).length > 0;
      if (!hasMyth) return;

      const ok = yield ctx.confirm('手札のホロメン1枚をアーカイブして #Myth ホロメン1人のアーツ+20しますか？');
      if (!ok) return;

      const cost = yield ctx.chooseCard({
        cards: handHolomems,
        title: 'コスト: アーカイブする手札のホロメンを選択',
      });
      if (!cost) return;
      ctx.removeFromHand(cost);
      ctx.player.archive.push(cost);
      ctx.log(`${cost.name} をアーカイブした`);

      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.hasTag(e.top, 'Myth'),
        title: 'このターン アーツ+20する #Myth ホロメンを選択',
      });
      if (!target) return;
      const chosen = target.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 20,
        ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターン、${chosen.stack[0].name} のアーツ+20`,
      });
    },
  },
};
