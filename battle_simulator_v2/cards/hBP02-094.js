/**
 * Tatang（サポート・マスコット）
 * このマスコットが付いているホロメンのアーツ+10。
 * ◆〈パヴォリア・レイネ〉に付いていたら能力追加: このマスコットが付いているホロメンのHP+30。
 */
export default {
  number: 'hBP02-094',
  attached: {
    artsPlus() {
      return 10;
    },
    hpPlus(holomem) {
      return holomem.stack[0].name === 'パヴォリア・レイネ' ? 30 : 0;
    },
  },
};
