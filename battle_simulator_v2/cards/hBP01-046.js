/**
 * AZKi (hBP01-046) 緑・1st・HP100（JP / 0期生 / 歌）
 * ブルームエフェクト「開拓者のみんながいたから」:
 *   自分のステージのエール1～3枚を選び、自分のホロメンに割り振って付け替えられる。
 *   →「できる」=任意。1枚ずつ別々に選び、それぞれ好きな自分のホロメンに付け替える（0枚=何もしない可、最大3枚）。
 *      付け先のホロメンに制限はない（同じホロメンに戻すことも可）。
 * アーツ「こんな素敵な世界に来れました！」: テキスト効果なし（ダメージ30のみ）。
 */
export default {
  number: 'hBP01-046',
  bloomEffect: {
    name: '開拓者のみんながいたから',
    *run(ctx) {
      for (let i = 0; i < 3; i++) {
        // 付け替え「元」のホロメンを先に盤面で選ぶ（盤上のカードが光るので、どのホロメンの
        // エールを動かすのかが一目で分かる。カード画像だけ並べると元が分からない問題への対策）。
        const hasCheer = (e) => e.holomem.cheers.length > 0;
        if (ctx.holomems('self', hasCheer).length === 0) return;
        const fromEntry = yield ctx.chooseHolomem({
          side: 'self',
          filter: hasCheer,
          title: `付け替えるエールの「元」のホロメンを選択（${i + 1}枚目 / 最大3枚・任意）`,
          optional: true,
        });
        if (!fromEntry) return;
        const from = fromEntry.holomem;

        // その元ホロメンに付いているエールから1枚選ぶ（1枚だけなら自動）
        const cheers = [...from.cheers];
        const picked = cheers.length === 1
          ? cheers[0]
          : yield ctx.chooseCard({
              cards: cheers,
              title: `〈${from.stack[0].name}〉の付け替えるエールを選択`,
              optional: true,
              skipLabel: 'やめる',
            });
        if (!picked) return;

        const target = yield ctx.chooseHolomem({
          side: 'self',
          title: '付け替え先の自分のホロメンを選択',
          optional: true,
        });
        if (!target) return;
        ctx.moveCheer(picked, from, target.holomem);
      }
    },
  },
};
