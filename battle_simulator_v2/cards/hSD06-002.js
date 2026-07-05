/**
 * 風真いろは (hSD06-002) 緑・Debut・HP80（#JP #秘密結社holoX）
 * コラボエフェクト「のっと！ﾆﾝﾆﾝ！！」:
 *   自分のホロメン1人のHP10回復。
 * アーツ「いえす！ｼﾞｬｷﾝｼﾞｬｷﾝ！！」(20): テキスト効果なし。
 */
export default {
  number: 'hSD06-002',
  collabEffect: {
    name: 'のっと！ﾆﾝﾆﾝ！！',
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'self',
        title: 'HP10回復する自分のホロメン1人を選択',
      });
      if (target) ctx.heal(target.holomem, 10);
    },
  },
};
