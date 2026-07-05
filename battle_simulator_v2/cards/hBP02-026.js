/**
 * 大神ミオ (hBP02-026) 緑・1st・HP100（#JP #ゲーマーズ #ケモミミ #料理）
 *
 * ブルームエフェクト「アイドルとして成長した姿」:
 *   自分のエールデッキから、自分のステージの#ゲーマーズを持つホロメン1人と同色のエール1枚を公開し、
 *   自分のホロメンに送る。そしてエールデッキをシャッフルする。
 *   → 色を決める#ゲーマーズホロメン1人をプレイヤーが選ぶ（位置制限なし）。
 *     同色エールが複数あれば公開するエールを選ぶ。送り先はステージ上の自分のホロメン全般（タグ制限なし）。
 *     同色エールが無い場合は公開せず、シャッフルのみ行う。
 *
 * アーツ「今年も見守っててね！」(20): テキスト効果なし（素点のみ）。
 */
export default {
  number: 'hBP02-026',
  bloomEffect: {
    name: 'アイドルとして成長した姿',
    *run(ctx) {
      // 色を決める #ゲーマーズ ホロメン1人を選ぶ
      const colorSource = yield ctx.chooseHolomem({
        side: 'self', filter: (e) => ctx.hasTag(e.top, 'ゲーマーズ'),
        title: '同色のエールを公開する基準にする #ゲーマーズ ホロメンを選択',
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

      // 送り先は自分のホロメン全般（テキストは「自分のホロメンに送る」＝タグ制限なし）
      const target = yield ctx.chooseHolomem({
        side: 'self',
        title: 'エールを送る自分のホロメンを選択',
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
