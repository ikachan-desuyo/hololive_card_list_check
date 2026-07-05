/**
 * セシリア・イマーグリーン (hBP08-002) 推しホロメン・緑 ライフ5
 *
 * 推しスキル「SPIN TO WIN!」[ホロパワー：-2][ターンに1回]:
 *   自分のエールデッキの上から2枚を自分のお休みしている〈セシリア・イマーグリーン〉に
 *   割り振って送る。その後、この能力でエールを送られたホロメン全員をアクティブにする。
 *   → oshiSkill として実装。
 *     ・送り先候補は「お休みしている（rested）」かつカード名が〈セシリア・イマーグリーン〉のホロメンのみ。
 *     ・「割り振って」= エールデッキの上から1枚ずつ公開し、その都度プレイヤーが送り先の
 *       お休みセシリアを選ぶ（同じセシリアに2枚でも別々でも可）。最大2枚（エールデッキが
 *       尽きたらそこまで）。
 *     ・最後に、この能力でエールを送ったセシリア全員を setActive でアクティブにする。
 *
 * 保留: なし（全文 context.js のプリミティブで実装）。
 */
function isRestingCecilia(e) {
  return e.holomem.rested && e.top.name === 'セシリア・イマーグリーン';
}

export default {
  number: 'hBP08-002',

  // 推しステージスキル「Justiceの古代自動人形」:
  //   自分の〈セシリア・イマーグリーン〉全員は、リセットステップでアクティブにならない（常時）。
  oshiStageSkill: {
    name: 'Justiceの古代自動人形',
    blocksReset(holomem) {
      return holomem.stack[0].name === 'セシリア・イマーグリーン';
    },
  },

  oshiSkill: {
    name: 'SPIN TO WIN!',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      if (!p.cheerDeck || p.cheerDeck.length === 0) return false;
      // お休みしている〈セシリア・イマーグリーン〉がいること
      return engine._stagePositions(p).some((pos) => {
        const h = engine._holomemAt(p, pos);
        return h.rested && h.stack[0].name === 'セシリア・イマーグリーン';
      });
    },
    *run(ctx) {
      const targeted = new Set(); // この能力でエールを送ったホロメン
      for (let i = 0; i < 2; i++) {
        if (ctx.player.cheerDeck.length === 0) break;
        // 送り先のお休みセシリアがいなければ終了
        if (ctx.holomems('self', isRestingCecilia).length === 0) break;
        const entry = yield ctx.chooseHolomem({
          side: 'self',
          filter: isRestingCecilia,
          title: `エールデッキの上から${i + 1}枚目を送るお休み中の〈セシリア・イマーグリーン〉を選択`,
        });
        if (!entry) break;
        ctx.sendCheerFromCheerDeckTop(entry.holomem);
        targeted.add(entry.holomem);
      }
      // その後、この能力でエールを送られたホロメン全員をアクティブにする
      for (const holomem of targeted) {
        ctx.setActive(holomem);
      }
    },
  },
};
