/**
 * 鍛冶ハンマー (hBP04-098) サポート・ツール
 * このツールが付いているホロメンのアーツ+10。
 * ◆#ID3期生を持つ1st以上のホロメンに付いていたら能力追加: このツールが付いているホロメンのアーツ+10。
 * ツールは、自分のホロメン1人につき1枚だけ付けられる。
 */
export default {
  number: 'hBP04-098',
  attached: {
    artsPlus(holomem) {
      const top = holomem.stack[0];
      let n = 10;
      // #ID3期生を持つ1st以上のホロメンなら追加で+10
      if ((top.tags || []).includes('ID3期生') && ['1st', '2nd'].includes(top.bloomLevel)) {
        n += 10;
      }
      return n;
    },
  },
};
