/**
 * ペンライト (hBP01-105) サポート・アイテム・LIMITED
 *
 * [サポート効果] このカードは、自分のホロパワー1枚をアーカイブしなければ使えない。
 *   自分のエールデッキから、自分のホロメン1人と同色のエール1枚を公開し、自分のホロメンに送る。
 *   そしてエールデッキをシャッフルする。
 * LIMITED：ターンに1枚しか使えない。
 *
 * 実装メモ:
 * - ホロパワー1枚アーカイブのコスト と LIMITED（ターン1回）はエンジンのサポート処理側で扱う。
 * - 色を決めるホロメン1人をプレイヤーが選ぶ（位置制限なし）。
 *   そのホロメンの色と同色のエールをエールデッキから公開（複数あれば選択）。
 *   送り先のホロメンは別途選ぶ（同色制限はなく、自分のホロメンなら誰でも可）。
 * - 同色エールが無い／送り先がいない場合は公開せず、シャッフルのみ行う（テキスト通り）。
 */
export default {
  number: 'hBP01-105',
  ai: {
    // エール加速。盤面にホロメンがいて、エールデッキが残っているほど有用。
    supportValue({ engine, player }) {
      if (player.cheerDeck.length === 0 || engine._stageHolomems(player).length === 0) return 0;
      return 22;
    },
  },
  support: {
    canUse(ctx) {
      // ホロパワーが無ければコストを払えず使えない
      return ctx.player.holoPower.length > 0;
    },
    *run(ctx) {
      // 色を決めるホロメン1人を選ぶ
      const colorSource = yield ctx.chooseHolomem({
        side: 'self',
        title: '同色のエールを公開する基準にするホロメンを選択',
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

      // 送り先のホロメンを選ぶ（同色制限なし）
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
