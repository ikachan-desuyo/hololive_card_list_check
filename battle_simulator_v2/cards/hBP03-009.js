/**
 * 姫森ルーナ (hBP03-009) 白・Debut・HP90（#JP #4期生 #ベイビー）
 * アーツ「みんな～、おりゅ～？」(10):
 *   自分の〈ルーナイト〉が付いているホロメンがいない時、
 *   自分のデッキから〈ルーナイト〉1枚を公開し、自分のホロメンに付ける。そしてデッキをシャッフルする。
 *   → arts.run。〈ルーナイト〉はカード名で照合。付け先は付け先ルール（_canAttachSupport）を満たすホロメンのみ。
 *     付ける時のトリガー（onAttach）があれば誘発させる。
 */
export default {
  number: 'hBP03-009',
  arts: {
    'みんな～、おりゅ～？': {
      *run(ctx) {
        // 条件: 自分のステージに〈ルーナイト〉が付いているホロメンが1人もいない時
        const hasRunaite = ctx.holomems('self', (e) =>
          e.holomem.attachments.some((a) => a.name === 'ルーナイト')).length > 0;
        if (hasRunaite) return;

        // デッキから〈ルーナイト〉を1枚（任意）選んで公開
        const cand = ctx.deckCards((c) => c.name === 'ルーナイト');
        if (cand.length === 0) {
          ctx.shuffleDeck();
          return;
        }
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: '公開して付ける〈ルーナイト〉を選択（任意）',
          optional: true,
          skipLabel: '見つからなかったことにする',
        });
        if (!picked) {
          ctx.shuffleDeck();
          return;
        }

        // 付け先（付け先ルールを満たす自分のホロメン）を選択
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => ctx.engine._canAttachSupport(e.holomem, picked),
          title: '〈ルーナイト〉を付ける自分のホロメンを選択',
        });
        if (!target) {
          // 付けられないなら公開だけして山に残し、シャッフル
          ctx.shuffleDeck();
          return;
        }

        ctx.removeFromDeck(picked);
        ctx.flashReveal(picked);
        yield* ctx.attachSupportWithTrigger(picked, target.holomem);
        ctx.shuffleDeck();
      },
    },
  },
};
