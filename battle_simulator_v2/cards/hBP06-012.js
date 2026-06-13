/**
 * ラオーラ・パンテーラ (hBP06-012) 白・1st・HP180（#Justice,#絵）
 * アーツ「The REAL Queen is Here!」(30): テキスト効果なし。
 * アーツ「LA FINE」(70): 自分のデッキを2枚引く。
 */
export default {
  number: 'hBP06-012',
  arts: {
    'LA FINE': {
      *run(ctx) { ctx.draw(2); },
    },
  },
};
