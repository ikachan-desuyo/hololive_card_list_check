/**
 * 戌神ころね (hBP03-065) 黄・1st・HP150（#JP #ゲーマーズ #ケモミミ）
 * アーツ「ほらよ～」(30):
 *   自分のエールデッキの上から1枚を、自分の#ゲーマーズを持つホロメンに送る。
 *
 * [未実装] キーワード/ギフト「ボクシングスタイル」:
 *   [コラボポジション限定]相手のメインステップの間、自分のセンターホロメンの
 *   〈戌神ころね〉のHPは相手の能力で減らず、変動しない。
 *   → 被ダメージ割り込み（HPが減らない・変動しない）系の機構は未実装のため保留。
 */
export default {
  number: 'hBP03-065',
  arts: {
    'ほらよ～': {
      *run(ctx) {
        if (ctx.player.cheerDeck.length === 0) return;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => ctx.hasTag(e.top, 'ゲーマーズ'),
          title: 'エールデッキの上から1枚を送る #ゲーマーズ ホロメンを選択',
        });
        if (!target) return;
        ctx.sendCheerFromCheerDeckTop(target.holomem);
      },
    },
  },
};
