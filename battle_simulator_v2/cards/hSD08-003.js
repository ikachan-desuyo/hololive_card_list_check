/**
 * 天音かなた (hSD08-003) 白・2nd・HP200（#JP #4期生 #歌）
 * ブルームエフェクト「相談のるよ」:
 *   自分のデッキから、#4期生を持つDebutホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 * アーツ「みんなのスパダリ」(100+ / 特攻: 緑+50):
 *   自分のステージの#サマーを持つホロメン1人につき、このアーツ+10。
 */
export default {
  number: 'hSD08-003',
  bloomEffect: {
    name: '相談のるよ',
    *run(ctx) {
      const cand = ctx.deckCards((c) =>
        c.kind === 'holomen' && c.bloomLevel === 'Debut' && ctx.hasTag(c, '4期生'));
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: '手札に加える #4期生 Debutホロメンを選択（任意）',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) { ctx.removeFromDeck(picked); ctx.addToHand(picked); }
      ctx.shuffleDeck();
    },
  },
  arts: {
    'みんなのスパダリ': {
      // 自分のステージの#サマーを持つホロメン1人につき+10
      dmgBonus(ctx) {
        const n = ctx.holomems('self', (e) => ctx.hasTag(e.top, 'サマー')).length;
        return n * 10;
      },
    },
  },
};
