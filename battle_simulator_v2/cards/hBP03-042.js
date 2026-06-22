/**
 * フワワ・アビスガード (hBP03-042) 青・1st・HP140（#EN #Advent #ケモミミ）
 * ブルームエフェクト「フワ花流水」:
 *   自分のステージに〈モココ・アビスガード〉がいる時、相手のセンターホロメンか
 *   バックホロメン1人に特殊ダメージ20を与える。
 *   ただし、ダウンしても相手のライフは減らない。
 *   → 条件を満たす時のみ発動（モココがいなければ何もしない）
 * アーツ「フワワと森のお散歩」(50): 追加効果なし（コンパイラ対象外なので定義省略）。
 */
export default {
  number: 'hBP03-042',
  bloomEffect: {
    name: 'フワ花流水',
    *run(ctx) {
      // 自分のステージに〈モココ・アビスガード〉がいるか判定
      const hasMococo = ctx.holomems('self', (e) => ctx.nameIs(e.top, 'モココ・アビスガード')).length > 0;
      if (!hasMococo) return;
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'back',
        title: '特殊ダメージ20を与える相手ホロメンを選択（センターかバック）',
      });
      if (!target) return;
      yield* ctx.dealSpecialDamage(target, 20, { noLifeOnDown: true });
    },
  },
};
