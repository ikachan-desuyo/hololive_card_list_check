/**
 * アキ・ローゼンタール (hBP01-003) 推しホロメン・緑
 *
 * 推しスキル「サバイバルパワー」[ホロパワー：-2][ターンに1回]:
 *   自分のデッキから、〈石の斧〉1枚を公開し、自分の緑ホロメンに付ける。
 *   そしてデッキをシャッフルする。
 *   → oshiSkill（能動）。〈石の斧〉(hBP01-114) はツールのサポートカード。
 *     付け先は「自分の緑ホロメン」に限定する（テキストどおり）。
 *     デッキに〈石の斧〉が無い、または緑ホロメンが居ない場合は付けずにシャッフルのみ。
 *
 * SP推しスキル「大地の唄」[ホロパワー：-2][ゲームに1回]:
 *   自分の緑センターホロメンのHPすべて回復。
 *   → spOshiSkill（能動）。センターが緑ホロメンの時のみ使える。
 */
export default {
  number: 'hBP01-003',
  oshiSkill: {
    name: 'サバイバルパワー',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // デッキに〈石の斧〉があること
      return p.deck.some((c) => c.name === '石の斧');
    },
    *run(ctx) {
      // 付け先候補（自分の緑ホロメン）が無ければ付けずにシャッフルのみ
      const greenTargets = ctx.holomems('self', (e) => e.top.color === '緑');
      const cand = ctx.deckCards((c) => c.name === '石の斧');
      if (cand.length === 0 || greenTargets.length === 0) {
        ctx.shuffleDeck();
        return;
      }
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: 'デッキから〈石の斧〉1枚を公開して自分の緑ホロメンに付ける',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) {
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.top.color === '緑',
          title: '〈石の斧〉を付ける緑ホロメンを選択',
        });
        if (target) {
          ctx.removeFromDeck(picked);
          ctx.flashReveal(picked);
          ctx.attachSupport(picked, target.holomem);
        }
      }
      ctx.shuffleDeck();
    },
  },
  spOshiSkill: {
    name: '大地の唄',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // センターホロメンが居て、その色が緑であること
      return !!p.center && p.center.stack[0].color === '緑';
    },
    *run(ctx) {
      const center = ctx.player.center;
      if (center && center.stack[0].color === '緑') {
        ctx.healAll(center);
      }
    },
  },
};
