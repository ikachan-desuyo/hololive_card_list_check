/**
 * 角巻わため (hBP07-013) 白・2nd・HP210（#JP #4期生 #ケモミミ #歌）
 * コラボエフェクト「はばないすでーい！！！」:
 *   このターンの間、自分のステージの〈角巻わため〉全員のアーツ+20。
 *   その後、自分のセンターホロメンにエールが6枚以上付いているなら、自分のデッキを2枚引く。
 * アーツ「センキューオーバーシープ！」(90+, 特攻 紫+50):
 *   このホロメンに付いている〈わためいと〉1枚につき、このアーツ+50。
 */
export default {
  number: 'hBP07-013',
  collabEffect: {
    name: 'はばないすでーい！！！',
    *run(ctx) {
      // このターンの間、自分のステージの〈角巻わため〉全員のアーツ+20
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 20,
        ownerIdx: ctx.playerIdx,
        match: (h) => h.stack[0].name === '角巻わため',
        description: 'このターン、〈角巻わため〉全員のアーツ+20',
      });
      // その後、自分のセンターホロメンにエールが6枚以上付いているなら、デッキを2枚引く
      const center = ctx.player.center;
      if (center && center.cheers.length >= 6) {
        ctx.draw(2);
      }
    },
  },
  arts: {
    'センキューオーバーシープ！': {
      // このホロメンに付いている〈わためいと〉1枚につき、このアーツ+50
      dmgBonus(ctx) {
        const h = ctx.sourceHolomem;
        if (!h) return 0;
        const count = h.attachments.filter((a) => a.name === 'わためいと').length;
        return count * 50;
      },
    },
  },
};
