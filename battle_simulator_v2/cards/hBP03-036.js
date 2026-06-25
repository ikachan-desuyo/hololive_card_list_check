/**
 * 小鳥遊キアラ 1st (hBP03-036) 赤
 * ブルームエフェクト「ハッピータイム」:
 *   自分のデッキから、〈小鳥遊キアラ〉1～4枚を公開し、アーカイブできる。
 *   そしてデッキをシャッフルする。
 *   → 任意効果（「できる」）。1枚ずつ最大4枚まで選んで公開・アーカイブし、
 *     対象を選び終えたらデッキをシャッフルする。
 * アーツ「鋼の翼」: dmg 50（テキスト効果なし。ダメージのみ）。
 */
export default {
  number: 'hBP03-036',
  bloomEffect: {
    name: 'ハッピータイム',
    *run(ctx) {
      // デッキ内の〈小鳥遊キアラ〉が無ければ何もしない
      const candidates = ctx.deckCards((c) => c.name === '小鳥遊キアラ');
      if (candidates.length === 0) return;
      // 「1～4枚」だが「できる」=0枚（アーカイブしない）も可。最大4枚。
      const picked = yield ctx.chooseCards({
        cards: candidates,
        min: 0,
        max: 4,
        title: 'アーカイブする〈小鳥遊キアラ〉を選択（最大4枚・任意）',
      });
      for (const c of picked) {
        ctx.removeFromDeck(c);
        ctx.player.archive.push(c);
        ctx.flashReveal(c);
        ctx.log(`${ctx.player.name}: ${c.name} を公開してアーカイブ`);
      }
      // 公開・アーカイブを行ったらデッキをシャッフルする
      if (picked.length > 0) ctx.shuffleDeck();
    },
  },
};
