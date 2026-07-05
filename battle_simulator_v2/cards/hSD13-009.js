/**
 * ジジ・ムリン (hSD13-009) 黄・Debut・HP120（#EN,#Justice）
 * コラボエフェクト「イタズラ増殖！」:
 *   自分が後攻で最初のターンなら、自分のデッキから、#Justiceを持つ1stホロメン1枚を公開し、
 *   ステージに出す。そしてデッキをシャッフルする。
 *   → 「出す」（必須）なので非任意の選択。候補が無ければシャッフルのみ。
 *     ステージ上限(6)は putToBack 側で担保される。
 * アーツ「YIPPEEE」(20): テキスト効果なし。
 */
export default {
  number: 'hSD13-009',
  collabEffect: {
    name: 'イタズラ増殖！',
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) return;
      const cand = ctx.deckCards((c) =>
        c.kind === 'holomen' && c.bloomLevel === '1st' && ctx.hasTag(c, 'Justice'));
      if (cand.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: cand, title: 'ステージに出す #Justice の1stホロメンを選択',
        });
        if (picked) {
          ctx.removeFromDeck(picked);
          yield* ctx.putToBackWithTrigger(picked); // 公開してステージに出し、出た時の onEnter も誘発
        }
      }
      ctx.shuffleDeck();
    },
  },
};
