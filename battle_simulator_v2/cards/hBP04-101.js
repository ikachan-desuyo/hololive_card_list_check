/**
 * だいふく（サポート・マスコット）
 * このマスコットが付いているホロメンのアーツ+10。
 * ◆〈雪花ラミィ〉に付いていたら能力追加: このマスコットが付いているホロメンのHP+20。
 */
export default {
  number: 'hBP04-101',
  attached: {
    artsPlus() {
      return 10;
    },
    hpPlus(holomem) {
      return holomem.stack[0].name === '雪花ラミィ' ? 20 : 0;
    },
  },
};
