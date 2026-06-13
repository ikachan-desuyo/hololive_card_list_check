/**
 * ロボ子さん (hBP03-060) 紫・2nd・HP200（#JP #0期生 #シューター）
 * アーツ「自称【高性能】」(70+ / 特攻 緑+50):
 *   相手のステージにエールが7枚以上ある時、このアーツ+70。
 */
export default {
  number: 'hBP03-060',
  arts: {
    '自称【高性能】': {
      dmgBonus(ctx) {
        const totalCheer = ctx.holomems('opponent')
          .reduce((sum, e) => sum + (e.holomem.cheers?.length || 0), 0);
        return totalCheer >= 7 ? 70 : 0;
      },
    },
  },
};
