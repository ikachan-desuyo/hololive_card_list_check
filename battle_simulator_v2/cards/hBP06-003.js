/**
 * 風真いろは (hBP06-003) 推しホロメン・緑
 *
 * 推しスキル「迷ったらまず実行！」[ホロパワー：-2][ターンに1回]:
 *   自分のエールデッキの上から1枚を、自分の
 *   [BuzzホロメンかBuzzホロメンからBloomしている〈風真いろは〉]に送る。
 *   → 対象は「topの名前が風真いろは」かつ「stack内のいずれかがBuzz」のホロメン
 *     （＝Buzzの風真いろは本体、またはBuzzの風真いろはからBloomした風真いろは）。
 *
 * SP推しスキル「アルティメットつよつよござる」[ホロパワー：-2][ゲームに1回]:
 *   このターンの間、自分のステージのエール1枚につき、自分のステージの〈風真いろは〉全員のアーツ+10。
 *   その後、自分のステージにBuzzホロメンがいるなら、自分のデッキを3枚引く。
 *   → 発動時点のステージ上の総エール枚数 ×10 を、ステージの全〈風真いろは〉にこのターンの間付与。
 */

// Buzzの風真いろは本体、またはBuzzからBloomした風真いろは（stack内にBuzzカードを含む）
function isBuzzIroha(e) {
  return e.top.name === '風真いろは' && e.holomem.stack.some((c) => c.buzz);
}

export default {
  number: 'hBP06-003',

  oshiSkill: {
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      if (p.cheerDeck.length === 0) return false; // 送るエールが無い
      return engine._stagePositions(p)
        .map((pos) => {
          const h = engine._holomemAt(p, pos);
          return { holomem: h, top: h.stack[0] };
        })
        .some(isBuzzIroha);
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: isBuzzIroha,
        title: 'エールデッキの上から1枚を送る対象（Buzzの〈風真いろは〉）を選択',
      });
      if (!entry) return;
      ctx.sendCheerFromCheerDeckTop(entry.holomem);
    },
  },

  spOshiSkill: {
    *run(ctx) {
      // 発動時点のステージ上の総エール枚数を数える
      let cheerCount = 0;
      for (const { holomem } of ctx.holomems('self')) {
        cheerCount += holomem.cheers.length;
      }
      const amount = cheerCount * 10;
      if (amount > 0) {
        ctx.addTurnModifier({
          kind: 'artsPlus',
          amount,
          ownerIdx: ctx.playerIdx,
          match: (h) => h.stack[0].name === '風真いろは',
          description: `このターン、ステージの〈風真いろは〉全員のアーツ+${amount}（エール${cheerCount}枚）`,
        });
      }
      // その後、ステージにBuzzホロメンがいるなら3ドロー
      const hasBuzz = ctx.holomems('self', (e) => e.top.buzz).length > 0;
      if (hasBuzz) ctx.draw(3);
    },
  },
};
