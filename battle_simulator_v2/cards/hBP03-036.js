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
      if (ctx.deckCards((c) => c.name === '小鳥遊キアラ').length === 0) return;
      let archived = 0;
      while (archived < 4) {
        const candidates = ctx.deckCards((c) => c.name === '小鳥遊キアラ');
        if (candidates.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: candidates,
          title: `アーカイブする〈小鳥遊キアラ〉を選択（${archived}/4）`,
          optional: true,
          skipLabel: archived === 0 ? 'アーカイブしない' : 'これ以上アーカイブしない',
        });
        if (!picked) break;
        ctx.removeFromDeck(picked);
        ctx.player.archive.push(picked);
        ctx.flashReveal(picked);
        ctx.log(`${ctx.player.name}: ${picked.name} を公開してアーカイブ`);
        archived++;
      }
      // 公開・アーカイブを行ったらデッキをシャッフルする
      if (archived > 0) ctx.shuffleDeck();
    },
  },
};
