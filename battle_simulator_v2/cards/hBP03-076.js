/**
 * アユンダ・リス (hBP03-076) 黄・1st・HP150（#ID #ID1期生 #ケモミミ #歌）
 * ブルームエフェクト「いやっほー！ みんな元気？」:
 *   自分のエールデッキから、[緑エールか黄エール]1枚を公開し、自分のホロメンに送る。
 *   そしてエールデッキをシャッフルする。
 * アーツ「ぷるぷる、おつリス！！！」(20): テキスト効果なし（素点のみ）。
 */
export default {
  number: 'hBP03-076',
  bloomEffect: {
    name: 'いやっほー！ みんな元気？',
    *run(ctx) {
      // 緑エールか黄エールが1枚以上あれば、送り先のホロメンを選び、エールを公開して送る。
      const cand = ctx.player.cheerDeck.filter((c) => c.color === '緑' || c.color === '黄');
      if (cand.length > 0) {
        const target = yield ctx.chooseHolomem({
          side: 'self',
          title: 'エールを送る自分のホロメンを選択',
          optional: true,
        });
        if (target) {
          const picked = yield ctx.chooseCard({
            cards: cand,
            title: '送る[緑エールか黄エール]を選択（エールデッキ）',
            optional: true,
            skipLabel: '見つからなかったことにする',
          });
          if (picked) {
            ctx.removeFromCheerDeck(picked);
            ctx.log(`${ctx.player.name}: エールデッキから ${picked.name} を公開`);
            ctx.flashReveal(picked);
            ctx.attachCheer(picked, target.holomem);
          }
        }
      }
      // 公開の有無にかかわらずエールデッキをシャッフルする。
      ctx.shuffleCheerDeck();
    },
  },
};
