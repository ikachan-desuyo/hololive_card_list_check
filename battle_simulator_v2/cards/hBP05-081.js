/**
 * 白銀ノエルのメイス (hBP05-081) サポート・ツール
 * このツールが付いているホロメンのアーツ+10。
 * ◆1st以上の〈白銀ノエル〉に付いていたら能力追加:
 *   このツールが付いているホロメンにエールが3枚以上付いている間、このホロメンのアーツ+20。
 * ツールは、自分のホロメン1人につき1枚だけ付けられる。
 */
export default {
  number: 'hBP05-081',
  attached: {
    artsPlus(holomem) {
      const top = holomem.stack[0];
      let n = 10;
      // 1st以上の〈白銀ノエル〉に付いていて、エール3枚以上なら +20
      if (top.name === '白銀ノエル' && ['1st', '2nd'].includes(top.bloomLevel) && holomem.cheers.length >= 3) {
        n += 20;
      }
      return n;
    },
  },
};
