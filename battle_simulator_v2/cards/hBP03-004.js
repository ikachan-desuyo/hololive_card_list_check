/**
 * FUWAMOCO (hBP03-004) 推しホロメン・青
 *
 * 推しスキル「モコちゃん！」[ホロパワー：-3][ターンに1回]:
 *   自分のエールデッキの上から1枚を、自分の1stホロメンの〈モココ・アビスガード〉に送る。
 *   → oshiSkill として実装。送り先は 1stブルーム の〈モココ・アビスガード〉のみ。
 *     複数いる場合はプレイヤーが選ぶ。
 *
 * SP推しスキル「BAU BAU!」[ホロパワー：-2][ゲームに1回]:
 *   自分の#Adventを持つホロメン1人を選ぶ。このターンの間、選んだホロメンのアーツは、
 *   相手のバックホロメンも対象にできる。
 *   → spOshiSkill + ターン修正 kind:'artTargetAnyBack'（選んだホロメンに紐づけ）で実装。
 *     engine のアーツ対象拡張ループが artTargetAnyBack を持つホロメンに相手の全バックを対象として追加する。
 */
function isMococo1st(e) {
  // 〈モココ・アビスガード〉= 名称参照（FUWAMOCO の別名「〈フワワ〉〈モココ〉として扱う」も一致）
  const top = e.top;
  const isMococo = top.name === 'モココ・アビスガード' || (top.nameAliases || []).includes('モココ・アビスガード');
  return isMococo && top.bloomLevel === '1st';
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
  spOshiSkill: {
    name: 'BAU BAU!',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      return engine._stageHolomems(p).some((h) => (h.stack[0].tags || []).includes('Advent'));
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => (e.top.tags || []).includes('Advent'),
        title: 'このターン アーツが相手のバックも対象にできる #Adventホロメンを選択',
      });
      if (!entry) return;
      const chosen = entry.holomem;
      ctx.addTurnModifier({
        kind: 'artTargetAnyBack',
        ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターン、${chosen.stack[0].name} のアーツは相手のバックホロメンも対象にできる`,
      });
    },
  },
};
