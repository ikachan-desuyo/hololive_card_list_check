/**
 * クレイジー・オリー (hBP02-053) 紫・2nd・HP190（#ID #ID2期生 #語学）
 * ブルームエフェクト「蘇りしゾンビ」:
 *   自分の手札2枚をアーカイブできる：このターンの間、このホロメンのアーツ+40。
 * アーツ「計算された戦術」(100+):
 *   自分のステージに#ID2期生を持つ2ndホロメンが2人以上いる時、このアーツ+40。
 */
export default {
  number: 'hBP02-053',
  bloomEffect: {
    name: '蘇りしゾンビ',
    *run(ctx) {
      // コスト: 手札2枚をアーカイブできる（任意）
      if (ctx.player.hand.length < 2) return;
      const ok = yield ctx.confirm('手札2枚をアーカイブして、このターンの間このホロメンのアーツ+40しますか？');
      if (!ok) return;
      const self = ctx.sourceHolomem;
      for (let i = 0; i < 2; i++) {
        const picked = yield ctx.chooseCard({
          cards: [...ctx.player.hand],
          title: `アーカイブする手札を選択（${i + 1}/2）`,
        });
        if (!picked) return; // 2枚揃わなければ支払い不成立
        ctx.removeFromHand(picked);
        ctx.player.archive.push(picked);
        ctx.log(`${ctx.player.name}: ${picked.name} をアーカイブした`);
      }
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 40, ownerIdx: ctx.playerIdx,
        match: (h) => h === self,
        description: 'このターン、クレイジー・オリーのアーツ+40',
      });
    },
  },
  arts: {
    '計算された戦術': {
      dmgBonus(ctx) {
        const count = ctx.holomems('self', (e) =>
          ctx.hasTag(e.top, 'ID2期生') && e.top.bloomLevel === '2nd').length;
        return count >= 2 ? 40 : 0;
      },
    },
  },
};
