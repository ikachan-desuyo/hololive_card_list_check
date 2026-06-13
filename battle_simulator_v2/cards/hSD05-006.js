/**
 * 轟はじめ (hSD05-006) 白・1st・HP100（#DEV_IS #ReGLOSS #ベイビー）
 * アーツ「足取り軽め、轟はじめ」(30): 効果なし。
 * アーツ「ありあとりゃあすっ」(50+):
 *   自分のステージに異なるカード名の#ReGLOSSを持つホロメンが3人以上いる時、このアーツ+20。
 */
export default {
  number: 'hSD05-006',
  arts: {
    'ありあとりゃあすっ': {
      dmgBonus(ctx) {
        const names = new Set();
        for (const { top } of ctx.holomems('self', (e) => ctx.hasTag(e.top, 'ReGLOSS'))) {
          names.add(top.name);
        }
        return names.size >= 3 ? 20 : 0;
      },
    },
  },
};
