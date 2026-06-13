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
      const moved = [];
      for (let i = 0; i < 3; i++) {
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer' && !moved.includes(c));
        if (cheers.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: cheers,
          title: `エールデッキに戻すエールを選択（${moved.length}/3）`,
          optional: true,
          skipLabel: moved.length === 0 ? '戻さない' : '戻すのをやめる',
        });
        if (!picked) break;
        ctx.removeFromArchive(picked);
        ctx.player.cheerDeck.push(picked);
        ctx.log(`${ctx.player.name}: ${picked.name} をエールデッキに戻した`);
        moved.push(picked);
      }
      if (moved.length > 0) ctx.shuffleCheerDeck();
    },
  },
};
