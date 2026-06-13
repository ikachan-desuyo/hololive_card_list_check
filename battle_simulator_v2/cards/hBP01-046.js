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
        // 毎回ステージ上の全エールを再列挙（前回の付け替えで構成が変わるため）
        const entries = [];
        for (const e of ctx.holomems('self')) {
          for (const cheer of e.holomem.cheers) entries.push({ cheer, from: e.holomem });
        }
        if (entries.length === 0) return;
        const picked = yield ctx.chooseCard({
          cards: entries.map((e) => e.cheer),
          title: `付け替えるエールを選択（${i + 1}枚目 / 最大3枚・任意）`,
          optional: true,
          skipLabel: i === 0 ? '付け替えない' : 'ここまでにする',
        });
        if (!picked) return;
        const from = entries.find((e) => e.cheer === picked).from;
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
