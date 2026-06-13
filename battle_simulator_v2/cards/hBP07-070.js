/**
 * 癒月ちょこ (hBP07-070) 紫・1st・HP150（JP・2期生・料理）
 * ブルームエフェクト「今日のご飯、何がいーい？」:
 *   自分のデッキの上から3枚を見る。その中から #料理 を持つホロメン1枚を公開し手札に加える。
 *   残ったカードを好きな順でデッキの下に戻す。
 * アーツ「がんばって美味しいの作るね♡」(30):
 *   自分の #料理 を持つホロメンを1人選ぶ。このターンに自分が使っていた #食べ物 を持つイベント
 *   1枚につき、このターンの間、選んだホロメンのアーツに必要な無色-1。
 */
export default {
  number: 'hBP07-070',
  bloomEffect: {
    name: '今日のご飯、何がいーい？',
    *run(ctx) {
      const looked = ctx.lookTopDeck(3);
      if (looked.length === 0) return;
      const candidates = looked.filter((c) => c.kind === 'holomen' && ctx.hasTag(c, '料理'));
      if (candidates.length > 0) {
        // 「#料理を持つホロメン1枚を公開し、手札に加える」（必須）
        const picked = yield ctx.chooseCard({
          cards: candidates,
          title: '手札に加える #料理 のホロメンを選択',
          displayCards: looked,
        });
        const chosen = picked || candidates[0];
        ctx.addToHand(chosen, { reveal: true });
      }
      // 残ったカードを好きな順でデッキの下に戻す
      const rest = looked.filter((c) => ctx.player.revealed.includes(c));
      if (rest.length > 0) {
        const ordered = rest.length > 1
          ? yield* ctx.orderCardsFlow(rest, 'デッキの下に戻す順番')
          : rest;
        ctx.deckToBottom(ordered);
      }
    },
  },
  arts: {
    'がんばって美味しいの作るね♡': {
      *run(ctx) {
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => ctx.hasTag(e.top, '料理'),
          title: 'アーツ必要無色を減らす #料理 ホロメンを選択',
          optional: true,
        });
        if (!target) return;
        // このターンに使った #食べ物 を持つイベントの枚数
        const count = ctx.countSupportThisTurn(
          (c) => c.supportType === 'イベント' && ctx.hasTag(c, '食べ物'),
        );
        if (count <= 0) return;
        const chosen = target.holomem;
        ctx.addTurnModifier({
          kind: 'artCostReduce',
          color: '無色',
          amount: count,
          ownerIdx: ctx.playerIdx,
          match: (h) => h === chosen,
          description: `このターン、${chosen.stack[0].name} のアーツ必要無色-${count}`,
        });
      },
    },
  },
};
