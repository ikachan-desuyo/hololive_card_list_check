/**
 * IRyS (hBP08-009) 白・Debut・HP110
 * コラボエフェクト「分かり合える日が来るかもね」:
 *   自分のホロパワーを見る。その中からサポートカード1枚を公開し、手札に加える。
 *   そしてホロパワーをシャッフルする。手札に加えたなら、自分のデッキの上から1枚をホロパワーにする。
 *   → collabEffect。ホロパワー内のサポートカードのみ選択可（無ければ選べない＝null）。
 *     サポートカードを手札に加えた場合のみ、デッキトップ1枚をホロパワーへ移す。
 *     ホロパワーへの移動は専用プリミティブが無いため deck.shift() → holoPower.push() で直接処理する
 *     （hBP08-001 / hBP04-013 と同様）。
 * アーツ「あたしはもっと深いところを見てるの」(20): 効果なし（テキスト効果なし）。
 *
 * 保留: なし（コラボエフェクト実装済み。アーツは素点のみで効果テキスト無し）。
 */
export default {
  number: 'hBP08-009',

  collabEffect: {
    name: '分かり合える日が来るかもね',
    *run(ctx) {
      const p = ctx.player;
      if (p.holoPower.length === 0) {
        ctx.log('ホロパワーが無いため効果なし');
        return;
      }
      // ホロパワーを見る。その中からサポートカード1枚を選んで公開し手札に加える（無ければ選べない）
      const supports = p.holoPower.filter((c) => c.kind === 'support');
      const picked = yield ctx.chooseCard({
        cards: supports,
        title: 'ホロパワーから手札に加えるサポートカードを選択（任意）',
        optional: true,
        skipLabel: '加えない',
        displayCards: [...p.holoPower],
      });
      let added = false;
      if (picked) {
        p.holoPower.splice(p.holoPower.indexOf(picked), 1);
        ctx.flashReveal(picked);
        ctx.addToHand(picked);
        added = true;
      }
      // ホロパワーをシャッフルする
      ctx.engine._shuffle(p.holoPower);
      ctx.log('ホロパワーをシャッフルした');
      // 手札に加えたなら、デッキの上から1枚をホロパワーにする
      if (added && p.deck.length > 0) {
        p.holoPower.push(p.deck.shift());
        ctx.log('デッキの上から1枚をホロパワーにした');
      }
    },
  },
};
