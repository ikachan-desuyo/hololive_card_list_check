/**
 * 不知火フレア (hSD07-003) 黄・Debut・HP50（#JP #3期生 #ハーフエルフ）
 * コラボエフェクト「大切な仲間たちと」:
 *   自分のステージのホロメンが5人以下の時、自分のデッキから、Debutホロメンの
 *   [〈尾丸ポルカ〉か〈さくらみこ〉か〈星街すいせい〉か〈白銀ノエル〉]1枚を公開できる：
 *   公開したホロメンをステージに出す。そしてデッキをシャッフルする。
 * アーツ「キミといっしょにお出かけ」(20): テキスト効果なし（ダメージのみ）。
 */
const TARGET_NAMES = ['尾丸ポルカ', 'さくらみこ', '星街すいせい', '白銀ノエル'];

export default {
  number: 'hSD07-003',
  collabEffect: {
    name: '大切な仲間たちと',
    *run(ctx) {
      // 「5人以下の時」= ステージに出す余地（上限6人）が要るので 5 以下を条件にする
      if (ctx.engine._stageCount(ctx.player) > 5) return;
      const candidates = ctx.deckCards(
        (c) => c.bloomLevel === 'Debut' && TARGET_NAMES.includes(c.name),
      );
      if (candidates.length === 0) return;
      const ok = yield ctx.confirm(
        'デッキからDebutの〈尾丸ポルカ/さくらみこ/星街すいせい/白銀ノエル〉をステージに出しますか？',
      );
      if (!ok) return;
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: 'ステージに出すDebutホロメンを選択',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) {
        ctx.flashReveal(picked); // 公開
        ctx.removeFromDeck(picked);
        ctx.putToBack(picked);
      }
      ctx.shuffleDeck();
    },
  },
};
