/**
 * ベスティア・ゼータ (hBP05-018) 白・2nd・HP190（#ID3期生）
 * アーツ「海に行こう」(60): 自分のステージに#ID3期生を持つBuzzホロメンがいるなら、自分のデッキを1枚引く。
 * アーツ「Summer Vibes」(140): このアーツで相手のホロメンをダウンさせた時、
 *   自分のデッキから、#ID3期生を持つ1stホロメン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 */
export default {
  number: 'hBP05-018',
  arts: {
    '海に行こう': {
      *run(ctx) {
        const ok = ctx.holomems('self', (e) => e.top.buzz && ctx.hasTag(e.top, 'ID3期生')).length > 0;
        if (ok) ctx.draw(1);
      },
    },
    'Summer Vibes': {
      // 「このアーツで相手をダウンさせた時」→ エンジンが onDownDealt を発火
      *onDownDealt(ctx) {
        const cand = ctx.deckCards((c) =>
          c.kind === 'holomen' && c.bloomLevel === '1st' && ctx.hasTag(c, 'ID3期生'));
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: '手札に加える #ID3期生 の1stホロメンを選択（任意）',
          optional: true,
          skipLabel: '見つからなかったことにする',
        });
        if (picked) {
          ctx.removeFromDeck(picked);
          ctx.addToHand(picked);
        }
        ctx.shuffleDeck();
      },
    },
  },
};
