/**
 * 常闇トワ (hSD08-006) 紫・Debut・HP90（#JP #4期生 #歌 #シューター #サマー）
 *
 * コラボエフェクト「花火見ていく？」:
 *   相手のセンターホロメンに特殊ダメージ10を与える。
 *   自分が後攻で最初のターンなら、かわりに、相手のセンターホロメンに特殊ダメージ20を与える。
 *
 * アーツ「トワに見惚れちゃった？」dmg:20:
 *   追加テキストなし（素のアーツ）。固有定義は不要。
 */
export default {
  number: 'hSD08-006',
  collabEffect: {
    name: '花火見ていく？',
    *run(ctx) {
      const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
      if (!center) return;
      const amount = ctx.isFirstTurnGoingSecond() ? 20 : 10;
      yield* ctx.dealSpecialDamage(center, amount);
    },
  },
};
