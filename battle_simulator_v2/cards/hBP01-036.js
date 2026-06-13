/**
 * アキ・ローゼンタール (hBP01-036) 緑・1st・HP100（#JP #1期生 #ハーフエルフ #お酒）
 * コラボエフェクト「ロゼ隊のみんな応援しててね！」:
 *   自分のホロメン1人のHP20回復。
 * アーツ「今日もがんばローゼ！」(30): 追加効果なし（単純な30ダメージ）。
 */
export default {
  number: 'hBP01-036',
  collabEffect: {
    name: 'ロゼ隊のみんな応援しててね！',
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'self',
        title: 'HPを20回復する自分のホロメンを選択',
      });
      if (target) ctx.heal(target.holomem, 20);
    },
  },
};
