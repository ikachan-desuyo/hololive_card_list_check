/**
 * アキ・ローゼンタール (hBP01-033) 緑・Debut・HP50（#JP #1期生 #ハーフエルフ #お酒）
 * コラボエフェクト「ヒーリングランウェイ」:
 *   サイコロを1回振れる：奇数の時、自分の緑ホロメン1人のHP20回復。
 * アーツ「アフターパーティー」(20): テキスト効果なし（素点のみ）。
 */
export default {
  number: 'hBP01-033',
  collabEffect: {
    name: 'ヒーリングランウェイ',
    *run(ctx) {
      // 「振れる」=任意。振らない選択も可。
      const ok = yield ctx.confirm('サイコロを1回振りますか？（奇数で緑ホロメン1人をHP20回復）');
      if (!ok) return;
      const value = (yield* ctx.rollDice());
      if (value % 2 === 0) return; // 偶数なら何もしない
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.color === '緑',
        title: 'HP20回復する緑ホロメンを選択',
        optional: true,
      });
      if (target) ctx.heal(target.holomem, 20);
    },
  },
};
