/**
 * 轟はじめ (hSD05-009) 白・2nd・HP180（#DEV_IS #ReGLOSS #ベイビー）
 * ブルームエフェクト「ダンスでこの世界に彩を！」:
 *   自分のデッキから、#ReGLOSSを持つ[Debutホロメンか1stホロメン]1枚を公開し、手札に加える。
 *   そしてデッキをシャッフルする。
 * アーツ「滅紫の雷」(80+, 特攻: 紫+50):
 *   自分のステージに〈轟はじめ〉以外の#ReGLOSSを持つホロメンがいる時、このアーツ+30。
 *   ※「〈轟はじめ〉以外」=このアーツを使っているホロメン自身を除く別のホロメンで判定。
 */
export default {
  number: 'hSD05-009',
  bloomEffect: {
    name: 'ダンスでこの世界に彩を！',
    *run(ctx) {
      const cand = ctx.deckCards((c) =>
        c.kind === 'holomen' && (c.bloomLevel === 'Debut' || c.bloomLevel === '1st') && ctx.hasTag(c, 'ReGLOSS'));
      const picked = yield ctx.chooseCard({
        cards: cand, title: '手札に加える #ReGLOSS の[Debut/1st]ホロメンを選択（任意）',
        optional: true, skipLabel: '見つからなかったことにする',
      });
      if (picked) { ctx.removeFromDeck(picked); ctx.addToHand(picked); }
      ctx.shuffleDeck();
    },
  },
  arts: {
    '滅紫の雷': {
      dmgBonus(ctx) {
        // 自分のステージに、このホロメン自身以外で #ReGLOSS を持つホロメンがいるか
        const hasOther = ctx.holomems('self',
          (e) => e.holomem !== ctx.sourceHolomem && ctx.hasTag(e.top, 'ReGLOSS')).length > 0;
        return hasOther ? 30 : 0;
      },
    },
  },
};
