/**
 * ときのそら (hSD01-006) 白・1st・HP240・Buzzホロメン（#JP #0期生 #歌）
 * アーツ「ドリームライブ」(50): 効果なし。
 * アーツ「SorAZ シンパシー」(60+):
 *   自分のステージにホロメンの〈AZKi〉がいる時、このアーツ+50。
 *   → dmgBonus（自分のステージに名前が AZKi のホロメンがいれば +50）
 */
export default {
  number: 'hSD01-006',
  arts: {
    'SorAZ シンパシー': {
      dmgBonus(ctx) {
        const hasAZKi = ctx.holomems('self', (e) => e.top && ctx.nameIs(e.top, 'AZKi')).length > 0;
        return hasAZKi ? 50 : 0;
      },
    },
  },
};
