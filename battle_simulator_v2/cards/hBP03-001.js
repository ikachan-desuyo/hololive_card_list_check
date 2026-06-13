/**
 * 姫森ルーナ (hBP03-001) 推しホロメン・白
 *
 * 推しスキル「パソコンならわかるのら」[ホロパワー：-2][ターンに1回]:
 *   自分のデッキから、カード名に「パソコン」を含むアイテム1枚を公開し、手札に加える。
 *   そしてデッキをシャッフルする。
 *   → oshiSkill（能動）。デッキ内のサポート・アイテムで name に「パソコン」を含むもの。
 *
 * SP推しスキル「ルーナイト集合」[ホロパワー：-2][ゲームに1回]:
 *   自分のセンターホロメンが〈姫森ルーナ〉の時に使える：
 *   自分のデッキから、〈ルーナイト〉1～4枚を公開し、自分のホロメンに割り振って付ける。
 *   そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）。〈ルーナイト〉(hBP03-105) は「自分の〈姫森ルーナ〉だけに付けられる」
 *     ファンのため、付け先は〈姫森ルーナ〉のホロメンに限定する（カードの装着制限を厳密適用）。
 *     「1～4枚」=最大4枚まで（デッキにある分・付け先がある分だけ）、各エールならぬファンを
 *     1枚ずつ任意のホロメンへ割り振る。
 */
export default {
  number: 'hBP03-001',
  oshiSkill: {
    name: 'パソコンならわかるのら',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      return p.deck.some((c) =>
        c.kind === 'support' && c.supportType === 'アイテム' && (c.name || '').includes('パソコン'));
    },
    *run(ctx) {
      const cand = ctx.deckCards((c) =>
        c.kind === 'support' && c.supportType === 'アイテム' && (c.name || '').includes('パソコン'));
      const picked = yield ctx.chooseCard({
        cards: cand,
        title: 'デッキからカード名に「パソコン」を含むアイテム1枚を公開し手札に加える',
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
    name: 'ルーナイト集合',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // センターホロメンが〈姫森ルーナ〉であること
      if (!p.center || p.center.stack[0].name !== '姫森ルーナ') return false;
      // デッキに〈ルーナイト〉があること
      return p.deck.some((c) => c.name === 'ルーナイト');
    },
    *run(ctx) {
      // 〈ルーナイト〉は〈姫森ルーナ〉だけに付けられる。付け先候補がなければ何もしない。
      const targets = ctx.holomems('self', (e) => e.top.name === '姫森ルーナ');
      if (targets.length === 0) {
        ctx.shuffleDeck();
        return;
      }
      // 1～4枚を1枚ずつ公開して割り振る
      for (let i = 0; i < 4; i++) {
        const cand = ctx.deckCards((c) => c.name === 'ルーナイト');
        if (cand.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: `デッキから〈ルーナイト〉を公開して付ける（${i + 1}/4・任意）`,
          optional: true,
          skipLabel: 'これ以上付けない',
        });
        if (!picked) break;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.top.name === '姫森ルーナ',
          title: '〈ルーナイト〉を付ける〈姫森ルーナ〉を選択',
        });
        if (!target) break;
        ctx.removeFromDeck(picked);
        ctx.flashReveal(picked);
        ctx.attachSupport(picked, target.holomem);
      }
      ctx.shuffleDeck();
    },
  },
};
