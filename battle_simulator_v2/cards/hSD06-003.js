/**
 * 風真いろは (hSD06-003) 緑・Debut・HP80（#JP #秘密結社holoX）
 * アーツ「一刀両断叩き斬る」(30+):
 *   自分のセンターホロメンのHPが減っている時、このアーツ+10。
 */
export default {
  number: 'hSD06-003',
  arts: {
    '一刀両断叩き斬る': {
      dmgBonus(ctx) {
        const center = ctx.holomems('self', (e) => e.pos.zone === 'center')[0];
        return center && center.holomem.damage > 0 ? 10 : 0;
      },
    },
  },
};
