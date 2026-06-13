/**
 * ラオーラ・パンテーラ (hBP06-010) 白・Debut・HP110（#Justice,#絵）
 * コラボエフェクト「夢みたいな最高のチーム」:
 *   自分が後攻で最初のターンなら、自分のデッキから、[DebutホロメンかSpotホロメン]1枚を公開し、
 *   ステージに出す。そしてデッキをシャッフルする。
 * アーツ「みんな素晴らしい友達だよ！」(30): テキスト効果なし。
 */
export default {
  number: 'hBP06-010',
  collabEffect: {
    name: '夢みたいな最高のチーム',
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) return;
      if (ctx.engine._stageCount(ctx.player) >= 6) { ctx.shuffleDeck(); return; }
      const cand = ctx.deckCards((c) =>
        c.kind === 'holomen' && (c.bloomLevel === 'Debut' || c.bloomLevel === 'Spot'));
      const picked = yield ctx.chooseCard({
        cards: cand, title: 'ステージに出す[Debut/Spot]ホロメンを選択（任意）',
        optional: true, skipLabel: '出さない / 見つからなかったことにする',
      });
      if (picked) { ctx.removeFromDeck(picked); ctx.putToBack(picked); }
      ctx.shuffleDeck();
    },
  },
};
