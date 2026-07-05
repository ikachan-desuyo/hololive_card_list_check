/**
 * 森カリオペ (hBP01-100) 無色・Spot・HP70（#EN #Myth #歌）
 * コラボエフェクト「ソウル収穫」:
 *   自分のアーカイブのエール1～3枚をエールデッキに戻せる。そしてエールデッキをシャッフルする。
 *   - 「戻せる」=任意。1～3枚を選んで戻す（最大3枚）。1枚も戻さないことも可能。
 *   - 1枚以上戻したらエールデッキをシャッフルする。
 * アーツ「ソウルご案内」(dmg:30) は素のダメージのみ（追加効果なし）。
 */
export default {
  number: 'hBP01-100',
  collabEffect: {
    name: 'ソウル収穫',
    *run(ctx) {
      const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      // 「1～3枚を戻せる」=任意（0可）、最大3枚（候補が少なければその枚数まで）
      const picked = yield ctx.chooseCards({
        cards: cheers,
        min: 0,
        max: 3,
        title: 'エールデッキに戻すエールを選択（0～3枚）',
      });
      for (const c of picked) {
        ctx.removeFromArchive(c);
        ctx.player.cheerDeck.push(c);
        ctx.log(`${ctx.player.name}: ${c.name} をエールデッキに戻した`);
      }
      if (picked.length > 0) ctx.shuffleCheerDeck();
    },
  },
};
