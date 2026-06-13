/**
 * ムーナ・ホシノヴァ (hBP06-052) 青・1st・Buzzホロメン・HP240（#ID #ID1期生 #歌）
 *
 * アーツ「下弦の月」(20+):
 *   自分の推しホロメンが〈ムーナ・ホシノヴァ〉で、このホロメンにエールが4枚以上付いているなら、このアーツ+60。
 *   → arts.下弦の月.dmgBonus で実装。
 *
 * ギフト/キーワード「新月」【未実装】:
 *   このホロメンが相手のホロメンにアーツダメージを与えた時に使える：
 *   その相手のホロメンに、そのホロメンが受けているダメージと同じ数値の特殊ダメージを与える。
 *   → 「アーツダメージを与えた時（ダウン非依存）」のトリガーフックはエンジンに存在しない
 *     （実装可能なのは onOpponentDown / onDownDealt = ダウンさせた時のみ）。
 *     ダウンに至らないアーツダメージで発火する必要があるため、保留。
 */
export default {
  number: 'hBP06-052',
  arts: {
    '下弦の月': {
      dmgBonus(ctx) {
        const oshiOk = ctx.player.oshi?.name === 'ムーナ・ホシノヴァ';
        const cheerOk = (ctx.sourceHolomem?.cheers.length || 0) >= 4;
        return oshiOk && cheerOk ? 60 : 0;
      },
    },
  },
};
