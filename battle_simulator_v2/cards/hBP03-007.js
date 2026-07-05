/**
 * 角巻わため (hBP03-007) 推しホロメン・黄
 *
 * 推しスキル「Member sheep いらっしゃい！」[ホロパワー：-2][ターンに1回]:
 *   自分のデッキから、ファン1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → デッキ検索の能動推しスキル。コストはエンジンが処理するので run では支払わない。
 *
 * SP推しスキル「わためは悪くないよねぇ？」[ホロパワー：-2][ゲームに1回]:
 *   自分のエールデッキの上から2枚を、自分の〈角巻わため〉1人に送る。
 *   → エールデッキ上から公開してホロメンに付ける能動スキル。
 *     対象は自分の〈角巻わため〉1人（カード名一致）。
 */
const FAN_FILTER = (c) => c.kind === 'support' && c.supportType === 'ファン';

export default {
  number: 'hBP03-007',
  oshiSkill: {
    name: 'Member sheep いらっしゃい！',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // デッキにファンがあること（無くても公開できないだけだが、使う意味がないので条件化）
      return p.deck.some(FAN_FILTER);
    },
    *run(ctx) {
      const cand = ctx.deckCards(FAN_FILTER);
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: 'デッキからファン1枚を公開して手札に加える',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();
    },
  },
  spOshiSkill: {
    name: 'わためは悪くないよねぇ？',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // 送り先となる自分の〈角巻わため〉がステージにいること、かつエールデッキに1枚以上あること
      if (p.cheerDeck.length === 0) return false;
      return engine._stageHolomems(p).some((h) => h.stack[0].name === '角巻わため');
    },
    *run(ctx) {
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.name === '角巻わため',
        title: 'エールデッキの上から2枚を送る〈角巻わため〉を選択',
      });
      if (!entry) return;
      // エールデッキの上から2枚を、選んだ〈角巻わため〉に送る
      for (let i = 0; i < 2; i++) {
        ctx.sendCheerFromCheerDeckTop(entry.holomem);
      }
    },
  },
};
