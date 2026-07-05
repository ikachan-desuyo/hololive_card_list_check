/**
 * 森カリオペ (hBP06-059) 青・1st・HP160（#EN #Myth #歌）
 * ブルームエフェクト「お泊りパーリナイ!」:
 *   自分のステージに#ENを持つホロメンが3人以上いるなら、自分のエールデッキから、
 *   [青エールか紫エール]1枚を公開し、自分のホロメンに送る。そしてエールデッキをシャッフルする。
 * アーツ「まどろみの中で」(80): 効果なし（dmgのみ）。
 */
export default {
  number: 'hBP06-059',
  bloomEffect: {
    name: 'お泊りパーリナイ!',
    *run(ctx) {
      // 条件: 自分のステージに#ENを持つホロメンが3人以上
      const enCount = ctx.holomems('self', (e) => ctx.hasTag(e.top, 'EN')).length;
      if (enCount < 3) return;

      // 送り先ホロメンを選ぶ（自分のホロメン）
      const target = yield ctx.chooseHolomem({
        side: 'self',
        title: 'エールを送るホロメンを選択',
      });
      if (!target) return;

      // エールデッキから青エールか紫エール1枚を公開
      const cand = ctx.player.cheerDeck.filter((c) => c.color === '青' || c.color === '紫');
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: '青エールか紫エールを選択（エールデッキ）',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) {
        ctx.removeFromCheerDeck(picked);
        ctx.log(`${ctx.player.name}: エールデッキから ${picked.name} を公開`);
        ctx.flashReveal(picked);
        ctx.attachCheer(picked, target.holomem);
      }
      ctx.shuffleCheerDeck();
    },
  },
};
