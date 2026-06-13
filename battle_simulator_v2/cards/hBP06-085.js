/**
 * フェイバリットパソコン (hBP06-085) サポート・アイテム・LIMITED
 * [サポート効果]
 *   自分のデッキから、同じカード名の[DebutホロメンとBuzzホロメン]1枚ずつと
 *   #Buzzグッズを持つサポートカード1枚を公開し、公開したカードを手札に加える。
 *   そしてデッキをシャッフルする。
 * LIMITED：ターンに1枚しか使えない（エンジンがLIMITED制御）。
 *
 * 解釈:
 *   - 「同じカード名のDebutホロメンとBuzzホロメン」= カード名が一致するDebutホロメンと
 *     Buzzホロメンを各1枚（ペアで同名であること）。
 *   - #BuzzグッズはサポートカードのタグなのでBuzzホロメンとは別枠。
 *   - いずれも非公開のデッキからの検索なので「見つからなかった」選択を許容（optional）。
 */
export default {
  number: 'hBP06-085',
  ai: {
    // 同名のDebut+Buzzペアがデッキにあると価値が高い（自分のデッキ構成は自分の公開情報）
    supportValue({ player }) {
      const debutNames = new Set(
        player.deck.filter((c) => c.kind === 'holomen' && c.bloomLevel === 'Debut').map((c) => c.name));
      const hasPair = player.deck.some(
        (c) => c.kind === 'holomen' && c.buzz && debutNames.has(c.name));
      const hasBuzzGoods = player.deck.some(
        (c) => c.kind === 'support' && (c.tags || []).includes('Buzzグッズ'));
      return (hasPair ? 30 : 0) + (hasBuzzGoods ? 8 : 0);
    },
  },
  support: {
    *run(ctx) {
      // 同名のDebut+Buzzペアを成立させるため、まず候補となる「同名Debut」を選ぶ。
      const debuts = ctx.deckCards((c) => c.kind === 'holomen' && c.bloomLevel === 'Debut');
      // 同名のBuzzホロメンがデッキに存在するDebutのみが意味を持つ（ペアで取得する効果のため）。
      const pairableDebuts = debuts.filter((d) =>
        ctx.deckCards((c) => c.kind === 'holomen' && c.buzz && c.name === d.name).length > 0);

      const pickedDebut = yield ctx.chooseCard({
        cards: pairableDebuts,
        title: '手札に加えるDebutホロメンを選択（同名のBuzzホロメンとペアで取得）',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (pickedDebut) {
        const buzzCands = ctx.deckCards(
          (c) => c.kind === 'holomen' && c.buzz && c.name === pickedDebut.name);
        const pickedBuzz = yield ctx.chooseCard({
          cards: buzzCands,
          title: `手札に加える〈${pickedDebut.name}〉のBuzzホロメンを選択`,
          optional: true,
          skipLabel: '見つからなかったことにする',
        });
        // 「1枚ずつ」=Debutを取ったらBuzzも同名で1枚取得する。
        ctx.removeFromDeck(pickedDebut);
        ctx.addToHand(pickedDebut);
        if (pickedBuzz) {
          ctx.removeFromDeck(pickedBuzz);
          ctx.addToHand(pickedBuzz);
        }
      }

      // #Buzzグッズを持つサポートカード1枚（独立枠）。
      const buzzGoods = ctx.deckCards(
        (c) => c.kind === 'support' && (c.tags || []).includes('Buzzグッズ'));
      const pickedGoods = yield ctx.chooseCard({
        cards: buzzGoods,
        title: '手札に加える #Buzzグッズ を持つサポートカードを選択',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (pickedGoods) {
        ctx.removeFromDeck(pickedGoods);
        ctx.addToHand(pickedGoods);
      }

      ctx.shuffleDeck();
    },
  },
};
