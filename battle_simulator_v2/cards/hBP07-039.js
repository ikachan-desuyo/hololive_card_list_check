/**
 * 赤井はあと (hBP07-039) 赤・1st・HP160（#JP #1期生 #料理）
 *
 * アーツ「俺の名は〝ちゃまお〟漢の中の漢だ！」(50):
 *   相手のセンターホロメンに特殊ダメージ20を与える。
 *   → arts.run で実装。
 *
 * [キーワード/ギフト]「血ゃ舞ってる奴いる！？」:
 *   [ターンに1回]自分のターンで、自分の〈赤井はあと〉がステージからデッキに戻った時、
 *   自分のアーカイブのエール1枚をこのホロメンに送れる。
 *   → 未実装（保留）。「ホロメンがステージからデッキに戻った時」を検知するトリガーが
 *     エンジンに存在しないため（onDown/onAttach/onOpponentDown のいずれにも該当しない）。
 *     この監視フックが追加されたら、archive のエール1枚を chooseCard で選んで
 *     attachCheer する処理を triggers に追加する。
 */
export default {
  number: 'hBP07-039',
  arts: {
    '俺の名は〝ちゃまお〟漢の中の漢だ！': {
      *run(ctx) {
        const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
        if (center) yield* ctx.dealSpecialDamage(center, 20);
      },
    },
  },
};
