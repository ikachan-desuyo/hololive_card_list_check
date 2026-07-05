/**
 * オーロ・クロニー (hBP01-094) 青・1st・HP120（#EN #Promise）
 *
 * ブルームエフェクト「クロにちは！」:
 *   自分のエールデッキから、自分の#Promiseを持つホロメン1人と同色のエール1枚を公開し、
 *   自分の#Promiseを持つホロメンに送る。そしてエールデッキをシャッフルする。
 *   → 色を決める#Promiseホロメン1人をプレイヤーが選ぶ（センター等の位置制限なし）。
 *     同色エールが複数あれば公開するエールを選ぶ。送り先の#Promiseホロメンも別途選ぶ。
 *     同色エールが無い場合は公開せず、シャッフルのみ行う。
 *
 * アーツ「忘れられないfesにしよう！」(40): テキスト効果なし（素点のみ）。
 */
export default {
  number: 'hBP01-094',
  bloomEffect: {
    name: 'クロにちは！',
    *run(ctx) {
      // 色を決める #Promise ホロメン1人を選ぶ
      const colorSource = yield ctx.chooseHolomem({
        side: 'self', filter: (e) => ctx.hasTag(e.top, 'Promise'),
        title: '同色のエールを公開する基準にする #Promise ホロメンを選択',
      });
      if (!colorSource) { ctx.shuffleCheerDeck(); return; }
      const color = colorSource.top.color;
      if (!color) { ctx.shuffleCheerDeck(); return; }

      // エールデッキから同色のエールを公開（複数あれば選択）
      const matching = ctx.player.cheerDeck.filter((c) => c.color === color);
      if (matching.length === 0) { ctx.shuffleCheerDeck(); return; }
      const cheer = matching.length === 1
        ? matching[0]
        : yield ctx.chooseCard({ cards: matching, title: `公開する${color}エールを選択` });
      if (!cheer) { ctx.shuffleCheerDeck(); return; }

      // 送り先の #Promise ホロメンを選ぶ
      const target = yield ctx.chooseHolomem({
        side: 'self', filter: (e) => ctx.hasTag(e.top, 'Promise'),
        title: 'エールを送る #Promise ホロメンを選択',
      });
      if (!target) { ctx.shuffleCheerDeck(); return; }

      ctx.flashReveal(cheer);
      ctx.removeFromCheerDeck(cheer);
      ctx.log(`${ctx.player.name}: エールデッキから ${cheer.name} を公開`);
      ctx.attachCheer(cheer, target.holomem);
      ctx.shuffleCheerDeck();
    },
  },
};
