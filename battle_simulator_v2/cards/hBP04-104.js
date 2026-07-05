/**
 * スバルドダック (hBP04-104) サポート・マスコット
 * このマスコットが付いているホロメンのHP+20。
 * ◆〈大空スバル〉に付いていたら能力追加:
 *   お互いのステージのエールが合計10枚以上ある間、このマスコットが付いているホロメンのアーツ+20。
 */
export default {
  number: 'hBP04-104',
  attached: {
    hpPlus() {
      return 20;
    },
    artsPlus(holomem, engine) {
      if (holomem.stack[0].name !== '大空スバル') return 0;
      let total = 0;
      for (const p of engine.state.players) {
        for (const h of engine._stageHolomems(p)) total += h.cheers.length;
      }
      return total >= 10 ? 20 : 0;
    },
  },
};
