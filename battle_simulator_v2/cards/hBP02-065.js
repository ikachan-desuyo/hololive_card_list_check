/**
 * ネリッサ・レイヴンクロフト (hBP02-065) 紫・Debut・HP90（#EN #Advent #歌 #トリ）
 * アーツ「Hiya darlings!」(30+): このホロメンに赤エールが付いている時、このアーツ+10。
 */
export default {
  number: 'hBP02-065',
  arts: {
    'Hiya darlings!': {
      dmgBonus(ctx) {
        const hasRedCheer = (ctx.sourceHolomem?.cheers || []).some((c) => c.color === '赤');
        return hasRedCheer ? 10 : 0;
      },
    },
  },
};
