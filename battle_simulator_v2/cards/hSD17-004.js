/**
 * 星街すいせい (hSD17-004) ホロメン・青・Debut・HP80（#JP,#0期生,#歌）
 *
 * コラボエフェクト「ファーストスター」:
 *   自分が後攻で最初のターンなら、相手のバックホロメン1人に特殊ダメージ20を与える。
 *   → collabEffect で実装。条件は ctx.isFirstTurnGoingSecond()。
 *     対象は相手のバックホロメン（zone==='back'）。必須効果なので chooseHolomem は非任意。
 *     相手バックが居なければ何もしない（候補なしで null 再開）。
 *     特殊ダメージはジェネレータなので yield* ctx.dealSpecialDamage(...) で呼ぶ。
 *     「ライフは減らない」記載は無いので noLifeOnDown は付けない（通常どおりライフ減少）。
 *
 * アーツ「私だけの輝き」(20ダメージ、任意エール1): テキスト効果なし（素のダメージのみ）。実装不要。
 */
export default {
  number: 'hSD17-004',
  collabEffect: {
    name: 'ファーストスター',
    *run(ctx) {
      // 条件: 自分が後攻で、自分の最初のターン
      if (!ctx.isFirstTurnGoingSecond()) return;
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'back',
        title: '特殊ダメージ20を与える相手のバックホロメンを選択',
      });
      if (!target) return; // 相手バックが居ない
      yield* ctx.dealSpecialDamage(target, 20);
    },
  },
};
