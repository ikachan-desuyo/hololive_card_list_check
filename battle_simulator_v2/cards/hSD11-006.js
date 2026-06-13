/**
 * 虎金妃笑虎 (hSD11-006) 黄・2nd・HP210（#DEV_IS #FLOW #GLOW）
 *
 * アーツ「虎嘯風生」(40+, メイン[黄] / 特攻 赤+50):
 *   このホロメンのエールを好きな枚数アーカイブできる：
 *   アーカイブしたエール1枚につき、このアーツ+40。
 *   → arts.虎嘯風生.run でエールを任意枚数（0枚可）アーカイブし、枚数×40を addArtBonus。
 *
 * ［未実装］キーワード/ギフト「戯笑の使者」:
 *   自分のパフォーマンスステップが開始する時、自分の手札の#FLOW GLOWを持つホロメン1枚を
 *   アーカイブできる：自分のアーカイブの黄エール1枚を自分の〈虎金妃笑虎〉に送る。
 *   → 「パフォーマンスステップが開始する時」に発火するトリガーフックがエンジンに無いため保留。
 *      （performance-step-start トリガーが追加されれば実装可能。コスト=手札の#FLOW GLOWホロメン1枚を
 *        アーカイブ、効果=アーカイブの黄エール1枚をこのホロメンへ送る attachCheer）
 */
export default {
  number: 'hSD11-006',
  arts: {
    '虎嘯風生': {
      *run(ctx) {
        let archived = 0;
        // 「好きな枚数」=0枚も可。1枚ずつ選んでアーカイブし、やめるまで繰り返す。
        while (ctx.sourceHolomem.cheers.length > 0) {
          const cheer = yield ctx.chooseCard({
            cards: [...ctx.sourceHolomem.cheers],
            title: `このアーツ+40するためアーカイブするエールを選択（任意・現在${archived * 40}）`,
            optional: true,
            skipLabel: 'これ以上アーカイブしない',
          });
          if (!cheer) break;
          ctx.archiveCheer(ctx.sourceHolomem, cheer);
          archived++;
        }
        if (archived > 0) {
          ctx.addArtBonus(archived * 40, `エール${archived}枚をアーカイブ`);
        }
      },
    },
  },
};
