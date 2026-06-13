/**
 * ロボ子さん (hBP06-061) 紫・Debut・HP120（#JP #0期生 #シューター）
 * アーツ「ボクと過ごす甘いひと時」(20):
 *   このホロメンに〈ろぼさー〉が付いているなら、相手のセンターホロメンに特殊ダメージ20を与える。
 */
export default {
  number: 'hBP06-061',
  arts: {
    'ボクと過ごす甘いひと時': {
      *run(ctx) {
        // このホロメンに〈ろぼさー〉（カード名）が付いているか
        const hasRobosa = ctx.sourceHolomem?.attachments?.some((a) => a.name === 'ろぼさー');
        if (!hasRobosa) return;
        const center = ctx.holomems('opponent', (e) => e.pos.zone === 'center')[0];
        if (!center) return;
        yield* ctx.dealSpecialDamage(center, 20);
      },
    },
  },
};
