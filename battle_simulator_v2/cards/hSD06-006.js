/**
 * 風真いろは (hSD06-006) 緑・1st・HP220（Buzzホロメン / #JP #秘密結社holoX）
 *
 * ブルームエフェクト「サムライ少女」:
 *   自分のデッキから、[〈ﾁｬｷ丸〉か〈ぽこべぇ〉]1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → デッキに該当カードが無くてもデッキシャッフルは行う（テキストどおり）。
 *
 * アーツ「刀の錆になるでござる！」(dmg:50): 追加効果テキスト無し（素のダメージのみ）。実装不要。
 */
const TARGET_NAMES = ['ﾁｬｷ丸', 'ぽこべぇ'];

export default {
  number: 'hSD06-006',
  bloomEffect: {
    name: 'サムライ少女',
    *run(ctx) {
      const cand = ctx.deckCards((c) => TARGET_NAMES.includes(c.name));
      if (cand.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: 'デッキから〈ﾁｬｷ丸〉か〈ぽこべぇ〉1枚を公開して手札に加える',
          optional: true,
          skipLabel: '見つからなかったことにする',
        });
        if (picked) {
          ctx.removeFromDeck(picked);
          ctx.addToHand(picked, { reveal: true });
        }
      }
      ctx.shuffleDeck();
    },
  },
};
