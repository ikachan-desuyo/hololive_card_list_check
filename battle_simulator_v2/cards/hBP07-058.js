/**
 * こぼ・かなえる (hBP07-058) 青・1st・HP160（#ID #ID3期生）
 * ブルームエフェクト「Happy For You」:
 *   自分のエールデッキから、自分のステージの#ID3期生を持つホロメン1人と同色のエール1枚を公開し、
 *   自分のホロメンに送る。そしてエールデッキをシャッフルする。
 *   → 色決定用に #ID3期生 ホロメンを選択し、その色のエールをエールデッキから公開、
 *     送り先（自分のホロメン）を選んで送り、最後にエールデッキをシャッフル。
 * アーツ「MANTAP LEE!!」(60):
 *   相手のHPが減っているバックホロメンが3人以上いるなら、自分のデッキを2枚引く。
 *   → 相手のバックで damage > 0（HPが減っている）が3人以上なら2ドロー。
 */
export default {
  number: 'hBP07-058',
  bloomEffect: {
    name: 'Happy For You',
    *run(ctx) {
      // 色を決める #ID3期生 ホロメンを選ぶ
      const colorHolomem = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.hasTag(e.top, 'ID3期生'),
        title: '同色のエールを公開する基準となる #ID3期生 ホロメンを選択',
      });
      if (!colorHolomem) return;
      const color = colorHolomem.top.color;
      const cand = ctx.player.cheerDeck.filter((c) => c.color === color);
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: `${color}エールを選択（エールデッキ）`,
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) {
        // 送り先（自分のホロメン）を選ぶ
        const target = yield ctx.chooseHolomem({
          side: 'self',
          title: `${picked.name} を送る自分のホロメンを選択`,
        });
        if (target) {
          ctx.removeFromCheerDeck(picked);
          ctx.log(`${ctx.player.name}: エールデッキから ${picked.name} を公開`);
          ctx.flashReveal(picked);
          ctx.attachCheer(picked, target.holomem);
        }
      }
      ctx.shuffleCheerDeck();
    },
  },
  arts: {
    'MANTAP LEE!!': {
      *run(ctx) {
        // 相手のHPが減っている（damage>0）バックホロメンが3人以上いるなら2ドロー
        const hurtBacks = ctx.holomems('opp', (e) =>
          e.pos.zone === 'back' && e.holomem.damage > 0).length;
        if (hurtBacks >= 3) ctx.draw(2);
      },
    },
  },
};
