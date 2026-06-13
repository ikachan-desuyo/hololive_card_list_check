/**
 * 火威青 (hBP03-049) Buzzホロメン・青・1st・HP230（#DEV_IS #ReGLOSS #絵）
 *
 * ブルームエフェクト「困ったお姫様たちだね」:
 *   自分のエールデッキから、自分の#ReGLOSSを持つセンターホロメンと同色のエール1枚を公開し、
 *   自分の#ReGLOSSを持つホロメンに送る。そしてエールデッキをシャッフルする。
 *   → センターが#ReGLOSSでない場合や、同色エールが無い場合は何もしない。
 *     公開する同色エールが複数あればプレイヤーが選ぶ。送り先の#ReGLOSSホロメンもプレイヤーが選ぶ。
 *
 * アーツ「イケメンにお任せを」(50):
 *   相手のセンターホロメンかバックホロメン1人どちらかに、
 *   自分の異なるカード名の#ReGLOSSを持つバックホロメン1人につき、特殊ダメージ10を与える。
 *   → 「異なるカード名」=カード名が重複するバックは1種としてカウント。対象が0人なら特殊ダメージは発生しない。
 */
export default {
  number: 'hBP03-049',
  bloomEffect: {
    name: '困ったお姫様たちだね',
    *run(ctx) {
      // #ReGLOSS を持つセンターホロメンを取得
      const center = ctx.holomems('self', (e) => e.pos.zone === 'center' && ctx.hasTag(e.top, 'ReGLOSS'))[0];
      if (!center) return; // センターが#ReGLOSSでない
      const color = center.top.color;
      if (!color) return;

      // エールデッキから同色のエールを公開（複数あれば選択）
      const matching = ctx.player.cheerDeck.filter((c) => c.color === color);
      if (matching.length === 0) {
        ctx.shuffleCheerDeck();
        return;
      }
      const cheer = matching.length === 1
        ? matching[0]
        : yield ctx.chooseCard({ cards: matching, title: `公開する${color}エールを選択` });
      if (!cheer) { ctx.shuffleCheerDeck(); return; }

      // 送り先の#ReGLOSSホロメンを選ぶ
      const target = yield ctx.chooseHolomem({
        side: 'self', filter: (e) => ctx.hasTag(e.top, 'ReGLOSS'),
        title: 'エールを送る #ReGLOSS ホロメンを選択',
      });
      if (!target) { ctx.shuffleCheerDeck(); return; }

      ctx.flashReveal(cheer);
      ctx.removeFromCheerDeck(cheer);
      ctx.attachCheer(cheer, target.holomem);
      ctx.shuffleCheerDeck();
    },
  },
  arts: {
    'イケメンにお任せを': {
      *run(ctx) {
        // 自分の異なるカード名の#ReGLOSSバックホロメンの数
        const reglossBacks = ctx.holomems(
          'self', (e) => e.pos.zone === 'back' && ctx.hasTag(e.top, 'ReGLOSS'),
        );
        const distinctNames = new Set(reglossBacks.map((e) => e.top.name));
        const count = distinctNames.size;
        if (count === 0) return;
        const amount = count * 10;

        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'back',
          title: `特殊ダメージ${amount}を与える相手ホロメンを選択`,
        });
        if (!target) return;
        yield* ctx.dealSpecialDamage(target, amount);
      },
    },
  },
};
