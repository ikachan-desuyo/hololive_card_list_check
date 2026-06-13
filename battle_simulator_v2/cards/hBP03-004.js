/**
 * FUWAMOCO (hBP03-004) 推しホロメン・青
 *
 * 推しスキル「モコちゃん！」[ホロパワー：-3][ターンに1回]:
 *   自分のエールデッキの上から1枚を、自分の1stホロメンの〈モココ・アビスガード〉に送る。
 *   → oshiSkill として実装。送り先は 1stブルーム の〈モココ・アビスガード〉のみ。
 *     複数いる場合はプレイヤーが選ぶ。
 *
 * ※SP推しスキル「BAU BAU!」[ホロパワー：-2][ゲームに1回]:
 *   「自分の#Adventを持つホロメン1人を選ぶ。このターンの間、選んだホロメンのアーツは、
 *    相手のバックホロメンも対象にできる」は、相手のアーツ対象範囲の変更（対象制限の変更）であり、
 *   エンジン側が未対応のため未実装。
 */
function isMococo1st(e) {
  return e.top.name === 'モココ・アビスガード' && e.top.bloomLevel === '1st';
}

export default {
  number: 'hBP03-004',
  oshiSkill: {
    name: 'モコちゃん！',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      if (!p.cheerDeck || p.cheerDeck.length === 0) return false;
      return engine._stagePositions(p)
        .map((pos) => {
          const h = engine._holomemAt(p, pos);
          return { top: h.stack[0] };
        })
        .some(isMococo1st);
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: isMococo1st,
        title: 'エールデッキの上から1枚を送る〈モココ・アビスガード〉(1st)を選択',
      });
      if (!entry) return;
      ctx.sendCheerFromCheerDeckTop(entry.holomem);
    },
  },
};
