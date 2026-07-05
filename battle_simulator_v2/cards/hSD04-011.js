/**
 * 姫森ルーナ (hSD04-011) 無色・Spot・HP60（#JP #4期生）
 * コラボエフェクト「ちょこてんて～」:
 *   自分のホロパワーを見る。その中から1枚を公開し、手札に加える。
 *   そして自分の手札1枚をホロパワーにする。
 * アーツ「んな～～～～～～～～」(10): テキスト効果なし（ダメージのみ）。
 *
 * 実装メモ: ホロパワーは player.holoPower 配列で表現される独立した領域。
 *   1) holoPower から1枚選び手札へ（addToHand で公開ログ）
 *   2) 手札1枚を holoPower へ戻す（手札→ホロパワーともプレイヤー所有領域。保存則維持）
 *   ホロパワーが空なら 1) を飛ばす。1) の結果手札は必ず1枚以上あるので 2) は常に実行可能。
 */
export default {
  number: 'hSD04-011',
  collabEffect: {
    name: 'ちょこてんて～',
    *run(ctx) {
      const hp = ctx.player.holoPower;
      if (hp.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: [...hp],
          title: 'ホロパワーから手札に加えるカードを選択',
        });
        if (picked) {
          const i = hp.indexOf(picked);
          if (i !== -1) hp.splice(i, 1);
          ctx.addToHand(picked, { reveal: true });
        }
      }
      // 手札1枚をホロパワーにする
      const hand = ctx.player.hand;
      if (hand.length === 0) return;
      const toPower = yield ctx.chooseCard({
        cards: [...hand],
        title: 'ホロパワーにする手札を選択',
      });
      if (!toPower) return;
      ctx.removeFromHand(toPower);
      ctx.player.holoPower.push(toPower);
      ctx.log(`${ctx.player.name}: 手札の ${toPower.name} をホロパワーにした`);
    },
  },
};
