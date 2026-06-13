/**
 * Chattino (hBP06-100) サポート・マスコット
 * このマスコットが付いているホロメンのHP+10。
 * ◆1st以上の〈ラオーラ・パンテーラ〉に付いていたら能力追加:
 *   自分の推しホロメンが〈ラオーラ・パンテーラ〉なら、このマスコットが付いているホロメンのHP+20。
 */
export default {
  number: 'hBP06-100',
  attached: {
    hpPlus(holomem, engine) {
      let n = 10;
      const top = holomem.stack[0];
      if (top.name === 'ラオーラ・パンテーラ' && ['1st', '2nd'].includes(top.bloomLevel)) {
        const ownerIdx = engine.state.players.findIndex((p) => engine._stageHolomems(p).includes(holomem));
        if (ownerIdx >= 0 && engine.state.players[ownerIdx].oshi?.name === 'ラオーラ・パンテーラ') n += 20;
      }
      return n;
    },
  },
};
