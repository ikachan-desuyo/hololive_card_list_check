/**
 * 不知火フレア (hBP05-064) 黄・Debut・HP80（#3期生）
 * コラボエフェクト「Canvas」:
 *   自分が後攻で最初のターンなら、自分のデッキから、異なるカード名のDebutホロメン2枚を公開し、
 *   手札に加える。そしてデッキをシャッフルする。
 * アーツ「幸せの場所」(10): テキスト効果なし。
 */
export default {
  number: 'hBP05-064',
  collabEffect: {
    name: 'Canvas',
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) {
        ctx.log('後攻で最初のターンではないため発動しない');
        return;
      }
      const chosenNames = new Set();
      for (let i = 0; i < 2; i++) {
        const cand = ctx.deckCards((c) =>
          c.kind === 'holomen' && c.bloomLevel === 'Debut' && !chosenNames.has(c.name));
        if (cand.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: `手札に加えるDebutホロメンを選択（${i + 1}/2・異なる名前・任意）`,
          optional: true,
          skipLabel: 'これ以上加えない',
        });
        if (!picked) break;
        chosenNames.add(picked.name);
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked);
      }
      ctx.shuffleDeck();
    },
  },
};
