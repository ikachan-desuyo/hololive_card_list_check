/**
 * 森カリオペ (hBP02-057) 紫・1st・HP130（#EN, #Myth, #歌）
 * ブルームエフェクト「みんなで作る最高のfes」:
 *   自分の手札の同じタグを持つホロメン2枚をアーカイブできる：自分のデッキを2枚引く。
 *   → コスト（任意）: 手札のホロメンカードのうち、同じタグを共有する2枚をアーカイブ。
 *     効果: デッキを2枚引く。
 * アーツ「一緒にブチアガろうぜ！」(50): テキスト効果なし（ダメージのみ）。
 */
export default {
  number: 'hBP02-057',
  bloomEffect: {
    name: 'みんなで作る最高のfes',
    *run(ctx) {
      // 手札のホロメンカード
      const holomens = ctx.player.hand.filter((c) => c.kind === 'holomen');
      // 「同じタグを持つホロメン2枚」が成立するか事前判定
      const hasPair = holomens.some((a) =>
        holomens.some((b) => b !== a && (a.tags || []).some((t) => (b.tags || []).includes(t))));
      if (!hasPair) return;

      const ok = yield ctx.confirm('手札の同じタグを持つホロメン2枚をアーカイブしてデッキを2枚引きますか？');
      if (!ok) return;

      // コスト1枚目: 任意のホロメン
      const first = yield ctx.chooseCard({
        cards: holomens.filter((a) =>
          holomens.some((b) => b !== a && (a.tags || []).some((t) => (b.tags || []).includes(t)))),
        title: 'アーカイブするホロメン1枚目を選択（タグ共有ペア）',
      });
      if (!first) return;

      // コスト2枚目: 1枚目とタグを共有する別のホロメン
      const second = yield ctx.chooseCard({
        cards: holomens.filter((c) =>
          c !== first && (first.tags || []).some((t) => (c.tags || []).includes(t))),
        title: 'アーカイブするホロメン2枚目を選択（1枚目とタグ共有）',
      });
      if (!second) return;

      // コスト支払い: 2枚をアーカイブ
      for (const c of [first, second]) {
        ctx.removeFromHand(c);
        ctx.player.archive.push(c);
        ctx.log(`${ctx.player.name}: ${c.name} をアーカイブした`);
      }

      // 効果: デッキを2枚引く
      ctx.draw(2);
    },
  },
  // アーツ「一緒にブチアガろうぜ！」はテキスト効果なし（ダメージのみ）のため定義不要。
};
