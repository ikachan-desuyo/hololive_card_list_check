/**
 * ムーナ・ホシノヴァ (hBP06-050) 青・1st・HP150（#ID #ID1期生 #歌）
 * アーツ「2 Sides of The Moon」(20):
 *   相手のバックホロメン1人に特殊ダメージ10を与える。
 *   →「できる」記述なし＝強制。バックホロメンがいる限り対象選択は必須（optional なし）。
 *     バックが0人なら選択肢なし → null で自動スキップ。
 * アーツ「Lunar Duality」(80):
 *   追加効果テキストなし（80ダメージのみ）。
 */
export default {
  number: 'hBP06-050',
  arts: {
    '2 Sides of The Moon': {
      *run(ctx) {
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'back',
          title: '特殊ダメージ10を与える相手のバックホロメンを選択',
        });
        if (target) yield* ctx.dealSpecialDamage(target, 10);
      },
    },
    // 'Lunar Duality' は追加効果テキストなし（ダメージのみ）のため定義不要
  },
};
