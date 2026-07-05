/**
 * 水宮枢 (hSD11-008) 青・1st（#FLOW GLOW）
 * コラボエフェクト「FLOW GLOWのえらい宣伝担当」: 相手のセンターホロメン1人は、
 *   次の相手のターンが終了するまでバトンタッチに必要な無色+1。
 * アーツ「愛は時間ですよ」(30): このアーツの対象が、相手のバトンタッチに必要な無色が2つ以上のホロメンなら、
 *   自分のエールデッキの上から1枚を自分のバックホロメンに送る。
 */
function debuffOppCenter(ctx, amount) {
  const center = ctx.opponent.center;
  if (!center) return;
  ctx.addTurnModifier({
    kind: 'batonCostReduce', color: '無色', amount, // 負値＝必要無色+|amount|
    ownerIdx: 1 - ctx.playerIdx, // 相手がバトンタッチする時に参照される
    match: (h) => h === center,
    untilTurn: ctx.state.turn + 1,
    description: `${center.stack[0].name} のバトンタッチ必要無色+${-amount}（次の相手ターン終了まで）`,
  });
}

export default {
  number: 'hSD11-008',
  collabEffect: {
    name: 'FLOW GLOWのえらい宣伝担当',
    *run(ctx) { debuffOppCenter(ctx, -1); },
  },
  arts: {
    '愛は時間ですよ': {
      *run(ctx) {
        const t = ctx.artTarget;
        if (!t) return;
        const oppIdx = 1 - ctx.playerIdx;
        const num = ctx.engine._effectiveBatonCost(t, t.stack[0].batonTouch || [], oppIdx)
          .filter((c) => c === '無色').length;
        if (num < 2) return;
        const backs = ctx.holomems('self', (e) => e.pos.zone === 'back');
        if (backs.length === 0) return;
        const dest = yield ctx.chooseHolomem({ side: 'self', filter: (e) => e.pos.zone === 'back', title: 'エールを送るバックホロメンを選択' });
        if (dest) ctx.sendCheerFromCheerDeckTop(dest.holomem);
      },
    },
  },
};
