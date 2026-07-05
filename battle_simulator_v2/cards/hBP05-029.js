/**
 * 儒烏風亭らでん (hBP05-029) 緑・Buzz・1st・HP250（#ReGLOSS）
 * アーツ「誰かの為に生きてきたけど」(50): 自分の推しホロメンが〈儒烏風亭らでん〉なら、
 *   自分のデッキから、#きのこを持つイベント1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 * アーツ「漸く自分の人生を生きてる」(80+): 自分のステージに#ReGLOSSを持つ2ndホロメンがいるなら、このアーツ+40。
 */
export default {
  number: 'hBP05-029',
  arts: {
    '誰かの為に生きてきたけど': {
      *run(ctx) {
        if (ctx.player.oshi?.name !== '儒烏風亭らでん') return;
        const cand = ctx.deckCards((c) =>
          c.kind === 'support' && c.supportType === 'イベント' && ctx.hasTag(c, 'きのこ'));
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: '手札に加える #きのこ のイベントを選択（任意）',
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
    '漸く自分の人生を生きてる': {
      dmgBonus(ctx) {
        return ctx.holomems('self', (e) => e.top.bloomLevel === '2nd' && ctx.hasTag(e.top, 'ReGLOSS')).length > 0 ? 40 : 0;
      },
    },
  },
};
