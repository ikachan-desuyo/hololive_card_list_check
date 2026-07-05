/**
 * ベスティア・ゼータ (hBP07-019) 白・1st・HP230・Buzzホロメン（#ID #ID3期生）
 *
 * ブルームエフェクト「準備万端！」:
 *   自分のデッキから、[〈BAZO〉か〈Zecretary〉]1枚を公開し、自分の〈ベスティア・ゼータ〉に付ける。
 *   そしてデッキをシャッフルする。
 *   （〈BAZO〉〈Zecretary〉はベスティア・ゼータ専用の装着サポート。名前で検索する。）
 *
 * アーツ「ホロライブID初代ダンスクイーン」(50):
 *   このホロメンにマスコットかファンが付いているなら、自分のデッキを1枚引く。
 */
const ATTACH_NAMES = ['BAZO', 'Zecretary'];

export default {
  number: 'hBP07-019',
  bloomEffect: {
    name: '準備万端！',
    *run(ctx) {
      const candidates = ctx.deckCards(
        (c) => c.kind === 'support' && ATTACH_NAMES.includes(c.name),
      );
      const picked = yield ctx.chooseCard({
        cards: candidates,
        title: '〈ベスティア・ゼータ〉に付ける[〈BAZO〉か〈Zecretary〉]を選択',
        optional: true,
        skipLabel: '見つからなかったことにする',
      });
      if (picked) {
        // 付け先の〈ベスティア・ゼータ〉を選ぶ（複数いる場合）。ブルームしたホロメン自身を既定候補に含む。
        const targets = ctx.holomems('self', (e) => e.top.name === 'ベスティア・ゼータ');
        let target = ctx.sourceHolomem;
        if (targets.length > 1) {
          const chosen = yield ctx.chooseHolomem({
            side: 'self',
            filter: (e) => e.top.name === 'ベスティア・ゼータ',
            title: `${picked.name} を付ける〈ベスティア・ゼータ〉を選択`,
          });
          if (chosen) target = chosen.holomem;
        }
        ctx.removeFromDeck(picked);
        ctx.flashReveal(picked);
        yield* ctx.attachSupportWithTrigger(picked, target);
      }
      ctx.shuffleDeck();
    },
  },
  arts: {
    'ホロライブID初代ダンスクイーン': {
      *run(ctx) {
        const hasMascotOrFan = ctx.sourceHolomem.attachments.some(
          (a) => a.supportType === 'マスコット' || a.supportType === 'ファン',
        );
        if (hasMascotOrFan) ctx.draw(1);
      },
    },
  },
};
