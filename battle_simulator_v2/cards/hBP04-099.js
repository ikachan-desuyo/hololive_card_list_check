/**
 * 古代武器 (hBP04-099) サポート・ツール
 * ◆1st以上の〈アーニャ・メルフィッサ〉に付いていたら能力追加:
 *   自分のステージの〈古代武器〉1枚につき、このツールが付いているホロメンのアーツ+10。
 * ※「相手のターンでダウンした時、手札コストでこのツールを手札に戻す」トリガーは
 *   被ダウン時の任意トリガーで、エンジン側の対応が必要なため未実装。
 */
export default {
  number: 'hBP04-099',
  attached: {
    artsPlus(holomem, engine) {
      const top = holomem.stack[0];
      if (top.name !== 'アーニャ・メルフィッサ') return 0;
      if (top.bloomLevel === 'Debut') return 0; // 1st以上
      const ownerIdx = engine.state.players.findIndex((p) =>
        engine._stageHolomems(p).includes(holomem));
      if (ownerIdx < 0) return 0;
      const p = engine.state.players[ownerIdx];
      let count = 0;
      for (const h of engine._stageHolomems(p)) {
        count += h.attachments.filter((a) => a.name === '古代武器').length;
      }
      return count * 10;
    },
  },
};
