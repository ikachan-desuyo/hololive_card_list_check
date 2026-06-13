/**
 * AZKi (hBP07-067) 紫・1st・HP150（#JP #0期生 #歌）
 * ブルームエフェクト「ROMANTiC NiGHT」:
 *   自分のデッキの上から4枚を見る。その中から、〈AZKi〉1枚を公開し、手札に加える。
 *   そして残ったカードを好きな順でデッキの下に戻す。
 * アーツ「君と二人きりの夜」(40):
 *   自分の手札1枚をアーカイブできる：相手のセンターホロメンかコラボホロメンに特殊ダメージ20を与える。
 */
export default {
  number: 'hBP07-067',
  bloomEffect: {
    name: 'ROMANTiC NiGHT',
    *run(ctx) {
      const looked = ctx.lookTopDeck(4);
      if (looked.length === 0) return;
      // 〈AZKi〉= 名前が「AZKi」のカード（カード名で照合）
      const azkis = looked.filter((c) => c.name === 'AZKi');
      let rest = looked;
      if (azkis.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: azkis,
          title: '公開して手札に加える〈AZKi〉を選択',
          displayCards: looked,
        });
        if (picked) {
          ctx.addToHand(picked, { reveal: true });
          rest = looked.filter((c) => c !== picked);
        }
      }
      if (rest.length > 0) {
        const ordered = yield* ctx.orderCardsFlow(rest, 'デッキの下に戻す順番');
        ctx.deckToBottom(ordered);
      }
    },
  },
  arts: {
    '君と二人きりの夜': {
      *run(ctx) {
        if (ctx.player.hand.length === 0) return;
        const ok = yield ctx.confirm('手札1枚をアーカイブして特殊ダメージ20を与えますか？');
        if (!ok) return;
        const card = yield ctx.chooseCard({
          cards: ctx.player.hand,
          title: 'アーカイブする手札を選択',
        });
        if (!card) return;
        ctx.removeFromHand(card);
        ctx.player.archive.push(card);
        ctx.log(`${ctx.player.name}: ${card.name} をアーカイブした`);
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
          title: '特殊ダメージ20を与える相手ホロメンを選択（センターかコラボ）',
        });
        if (target) ctx.dealSpecialDamage(target, 20);
      },
    },
  },
};
