/**
 * ラオーラ・パンテーラ (hBP08-019) ホロメン・白・Debut・HP120（#EN #Justice #ケモミミ #絵）
 * バトンタッチ: 無色
 *
 * キーワード/ギフト「ボナペティート -楽しい食事-」:
 *   ■このホロメンに〈Chattino〉が付いていないなら、このホロメンのアーツに必要な白-1。
 *   ■このホロメンに〈Chattino〉が付いているなら、このホロメンのHP+30。
 *   → 〈Chattino〉= 名前が "Chattino" のサポート・マスコット。装着判定は
 *     src.attachments に name==='Chattino' があるか で行う。
 *   → 白-1 は artsCostReduceAura（src===target のときのみ、白を1軽減）。Chattino 非装着時のみ返す。
 *   → HP+30 は auraHpPlus（src===target のときのみ）。Chattino 装着時のみ返す。
 *     ※この2効果は排他（Chattino の有無で片方のみ有効）。
 *
 * アーツ「この幸せをシェアしよう」(10/白):
 *   このホロメンに〈Chattino〉が付いていないなら、自分のデッキから〈Chattino〉1枚を
 *   このホロメンに付ける。そしてデッキをシャッフルする。
 *   → *run: 既に Chattino が付いていれば何もしない。付いていなければデッキの
 *     name==='Chattino' を1枚（複数あれば選択）取り出し、attachSupportWithTrigger で付け、
 *     デッキをシャッフルする。デッキに無ければ何もしない（強制サーチではあるが対象が無ければ不発）。
 *
 * 保留: なし（ギフト・アーツとも全文を実装）。
 */
const CHATTINO = 'Chattino';

function hasChattino(holomem) {
  return (holomem.attachments || []).some((a) => a.name === CHATTINO);
}

export default {
  number: 'hBP08-019',

  // ■〈Chattino〉非装着なら、自身のアーツに必要な白-1
  artsCostReduceAura(src, target, engine) {
    if (src !== target) return []; // 「このホロメンのアーツ」= 自分自身のみ
    if (hasChattino(src)) return []; // 装着中は HP+30 側が有効（軽減は無し）
    return [{ color: '白', amount: 1 }];
  },

  // ■〈Chattino〉装着なら、自身のHP+30
  auraHpPlus(src, target, engine) {
    if (src !== target) return 0; // 「このホロメンのHP」= 自分自身のみ
    return hasChattino(src) ? 30 : 0;
  },

  arts: {
    'この幸せをシェアしよう': {
      *run(ctx) {
        const self = ctx.sourceHolomem;
        if (!self) return;
        // 既に〈Chattino〉が付いているなら何もしない
        if (hasChattino(self)) {
          ctx.log('〈Chattino〉が既に付いているため、何もしない');
          return;
        }
        // 自分のデッキから〈Chattino〉を探す
        const candidates = ctx.deckCards((c) => c.name === CHATTINO);
        if (candidates.length === 0) {
          ctx.log('デッキに〈Chattino〉がいない');
          return;
        }
        // 複数あれば選択（同名同カードだが念のため選択フローを通す）
        const picked = candidates.length === 1
          ? candidates[0]
          : yield ctx.chooseCard({ cards: candidates, title: 'デッキから付ける〈Chattino〉を選択' });
        if (!picked) return;
        ctx.flashReveal(picked);
        ctx.removeFromDeck(picked);
        yield* ctx.attachSupportWithTrigger(picked, self);
        ctx.shuffleDeck();
      },
    },
  },
};
