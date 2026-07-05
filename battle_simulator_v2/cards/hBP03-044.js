/**
 * 星街すいせい (hBP03-044) 青・1st・HP150（#JP #0期生 #歌）
 * ブルームエフェクト「プラネットステージ」:
 *   自分のデッキの上から4枚を見る。その中から〈星街すいせい〉1枚を公開して手札に加える。
 *   そして残ったカードを好きな順でデッキの下に戻す。
 * アーツ「バーチャルゴースト」(40):
 *   自分の推しホロメンが〈星街すいせい〉の時、このホロメンの青エール1枚を、
 *   自分のバックホロメンの〈星街すいせい〉に付け替えられる。
 */
export default {
  number: 'hBP03-044',
  bloomEffect: {
    name: 'プラネットステージ',
    *run(ctx) {
      const looked = ctx.lookTopDeck(4);
      if (looked.length === 0) return;
      // 〈星街すいせい〉（カード名一致）を1枚まで公開して手札に加える
      const suiseis = looked.filter((c) => c.name === '星街すいせい');
      let toHand = null;
      if (suiseis.length > 0) {
        toHand = yield ctx.chooseCard({
          cards: suiseis,
          displayCards: looked.filter((c) => !suiseis.includes(c)),
          title: '手札に加える〈星街すいせい〉を選択（任意）',
          optional: true,
          skipLabel: '加えない',
        });
        if (toHand) ctx.addToHand(toHand);
      }
      // 残りを好きな順でデッキの下に戻す
      const rest = looked.filter((c) => c !== toHand);
      if (rest.length > 0) {
        const ordered = yield* ctx.orderCardsFlow(rest, 'デッキの下に戻す順番');
        ctx.deckToBottom(ordered);
      }
    },
  },
  arts: {
    'バーチャルゴースト': {
      *run(ctx) {
        // 自分の推しホロメンが〈星街すいせい〉の時のみ
        if (ctx.player.oshi?.name !== '星街すいせい') return;
        // このホロメンの青エール
        const blueCheers = ctx.sourceHolomem.cheers.filter((c) => c.color === '青');
        if (blueCheers.length === 0) return;
        // 付け替え先: 自分のバックの〈星街すいせい〉
        const targets = ctx.holomems('self',
          (e) => e.pos.zone === 'back' && e.top.name === '星街すいせい');
        if (targets.length === 0) return;
        const ok = yield ctx.confirm('青エール1枚をバックの〈星街すいせい〉に付け替えますか？');
        if (!ok) return;
        const cheer = yield ctx.chooseCard({
          cards: blueCheers,
          title: '付け替える青エールを選択',
        });
        if (!cheer) return;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.pos.zone === 'back' && e.top.name === '星街すいせい',
          title: '付け替え先のバック〈星街すいせい〉を選択',
        });
        if (target) ctx.moveCheer(cheer, ctx.sourceHolomem, target.holomem);
      },
    },
  },
};
