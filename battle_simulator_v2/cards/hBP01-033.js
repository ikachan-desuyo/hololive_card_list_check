/**
 * アキ・ローゼンタール (hBP01-033) 緑・Debut・HP50（#JP #1期生 #ハーフエルフ #お酒）
 * コラボエフェクト「ヒーリングランウェイ」:
 *   サイコロを1回振れる：奇数の時、自分の緑ホロメン1人のHP20回復。
 *   → 「振れる」=振るのは任意。奇数が出た後の回復は強制（緑ホロメンがいれば必ず1人選ぶ）。
 *     緑判定は engine._hasColor（多色・全色扱い対応）。
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
      // 奇数の時の回復は強制（「できる」記述なし）。緑判定は多色・全色扱い対応
      const greenFilter = (e) => ctx.engine._hasColor(e.holomem, '緑');
      if (ctx.holomems('self', greenFilter).length === 0) return; // 緑ホロメン不在なら不発
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: greenFilter,
        title: 'HP20回復する緑ホロメンを選択',
      });
      if (target) ctx.heal(target.holomem, 20);
    },
  },
};
