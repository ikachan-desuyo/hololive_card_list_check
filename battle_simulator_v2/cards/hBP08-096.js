/**
 * 優しいモンスター (hBP08-096) サポート・イベント・LIMITED
 * [サポート効果] このカードは、自分の推しホロメンが〈一条莉々華〉でなければ使えない。
 *   自分のデッキから、[〈一条莉々華〉と〈限界飯〉]1枚ずつを公開し、手札に加える。
 *   そしてデッキをシャッフルする。その後、自分のアーカイブに〈限界飯〉が3枚以上あるなら、
 *   このターンの間、自分のステージの〈一条莉々華〉全員のアーツ+50。
 * LIMITED：ターンに1枚しか使えない。（LIMITED制限はエンジン側で処理）
 *
 * 解釈:
 *   - 「〈一条莉々華〉と〈限界飯〉1枚ずつ」=名前が「一条莉々華」のカード1枚と
 *     名前が「限界飯」のカード1枚を、それぞれデッキから探して公開し手札に加える。
 *     それぞれ独立に選択（片方しか無くても、見つかったぶんは加える）。
 *   - 手札に加えた後にデッキをシャッフルする（非公開化）。
 *   - その後の判定: 自分のアーカイブに名前「限界飯」のカードが3枚以上 → このターン、
 *     自分のステージの〈一条莉々華〉全員のアーツ+50（match で名前一致のホロメンに限定）。
 *
 * 保留: なし。
 */
const OSHI_NAME = '一条莉々華';
const FOOD_NAME = '限界飯';

export default {
  number: 'hBP08-096',
  support: {
    canUse(ctx) {
      return ctx.player.oshi?.name === OSHI_NAME;
    },
    *run(ctx) {
      // 〈一条莉々華〉1枚をデッキから探して公開し手札に加える
      const rikkaCards = ctx.deckCards((c) => c.name === OSHI_NAME);
      if (rikkaCards.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: rikkaCards,
          title: `手札に加える〈${OSHI_NAME}〉を選択`,
        });
        if (picked) {
          ctx.removeFromDeck(picked);
          ctx.flashReveal(picked);
          ctx.addToHand(picked, { reveal: true });
        }
      } else {
        ctx.log(`${ctx.player.name}: デッキに〈${OSHI_NAME}〉が無い`);
      }

      // 〈限界飯〉1枚をデッキから探して公開し手札に加える
      const foodCards = ctx.deckCards((c) => c.name === FOOD_NAME);
      if (foodCards.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: foodCards,
          title: `手札に加える〈${FOOD_NAME}〉を選択`,
        });
        if (picked) {
          ctx.removeFromDeck(picked);
          ctx.flashReveal(picked);
          ctx.addToHand(picked, { reveal: true });
        }
      } else {
        ctx.log(`${ctx.player.name}: デッキに〈${FOOD_NAME}〉が無い`);
      }

      // デッキをシャッフル
      ctx.shuffleDeck();

      // その後、アーカイブに〈限界飯〉が3枚以上あるなら、このターン〈一条莉々華〉全員のアーツ+50
      const foodInArchive = ctx.player.archive.filter((c) => c.name === FOOD_NAME).length;
      if (foodInArchive >= 3) {
        ctx.addTurnModifier({
          kind: 'artsPlus',
          amount: 50,
          ownerIdx: ctx.playerIdx,
          match: (h) => h.stack[0].name === OSHI_NAME,
          description: `このターン、自分の〈${OSHI_NAME}〉全員のアーツ+50（アーカイブの〈${FOOD_NAME}〉${foodInArchive}枚）`,
        });
      }
    },
  },
  ai: {
    supportValue({ engine, player }) {
      if (player.oshi?.name !== OSHI_NAME) return 0;
      let v = 0;
      // デッキにある分のサーチ価値（手札に加わる）
      if (player.deck.some((c) => c.name === OSHI_NAME)) v += 15;
      if (player.deck.some((c) => c.name === FOOD_NAME)) v += 15;
      // アーカイブに限界飯3枚以上ならアーツ強化のボーナス（〈一条莉々華〉がステージにいる時）
      const foodInArchive = player.archive.filter((c) => c.name === FOOD_NAME).length;
      const hasRikkaOnStage = engine._stageHolomems(player)
        .some((h) => h.stack[0].name === OSHI_NAME);
      if (foodInArchive >= 3 && hasRikkaOnStage) v += 50;
      return v;
    },
  },
};
