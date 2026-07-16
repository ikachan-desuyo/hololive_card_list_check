/**
 * 水宮枢 (hBP08-050) 青・1st（#DEV_IS #FLOW GLOW）
 *
 * [キーワード] 君に任せちゃおうかな？:
 *   相手のターンで、このホロメンがダウンした時、自分のエールデッキの上から1枚を
 *   自分のバックホロメンに送る。
 *   → 「このホロメン」自身のダウン時のみ（onDown）。[ターンに1回]制限は無い。
 *     送り先は自分のバックホロメン（複数なら選択／ダウンした自身は除外）。
 *     エールデッキが空、またはバックホロメンがいなければ何も起きない。
 *
 * [アーツ] 雪だるまつくろっ (20):
 *   自分のアーカイブのエール1枚を自分のホロメンに送る。
 *
 * ※2026-07-17 監査対応: 旧実装はスキル名「君に乗ってもいいかな？」「優しさます増し」・
 *   発動条件「自分のホロメンがダウンした時」(onAnyDown併用) だったが、公式カードリスト現物
 *   （C/S両レアリティ・エラッタ履歴なし）と照合してテキストごと訂正した。
 */
function* sendCheerDeckTopToBack(ctx, downed) {
  if (ctx.state.turnPlayer === ctx.playerIdx) return;   // 相手のターン限定
  if (ctx.player.cheerDeck.length === 0) return;        // エールデッキが空
  const pickable = (e) => e.pos.zone === 'back' && e.holomem !== downed;
  const backs = ctx.holomems('self', pickable);
  if (backs.length === 0) return;                       // 送り先のバックホロメンがいない
  const target = backs.length === 1
    ? backs[0]
    : yield ctx.chooseHolomem({ side: 'self', filter: pickable, title: 'エールデッキの上から1枚を送るバックホロメンを選択' });
  if (!target) return;
  ctx.sendCheerFromCheerDeckTop(target.holomem);
}

export default {
  number: 'hBP08-050',
  triggers: {
    *onDown(ctx) {
      // 「このホロメン」自身がダウンした時のみ（相手のターン限定は sendCheerDeckTopToBack 側で判定）
      yield* sendCheerDeckTopToBack(ctx, ctx.sourceHolomem);
    },
  },
  arts: {
    '雪だるまつくろっ': {
      *run(ctx) {
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length === 0) return;
        if (ctx.holomems('self').length === 0) return;
        const cheer = cheers.length === 1
          ? cheers[0]
          : yield ctx.chooseCard({ cards: cheers, title: 'アーカイブから送るエールを選択' });
        if (!cheer) return;
        const target = yield ctx.chooseHolomem({ side: 'self', title: 'エールを送る自分のホロメンを選択' });
        if (!target) return;
        ctx.removeFromArchive(cheer);
        ctx.attachCheer(cheer, target.holomem);
      },
    },
  },
};
