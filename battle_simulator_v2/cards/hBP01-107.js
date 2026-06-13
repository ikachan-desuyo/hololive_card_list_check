/**
 * アンコール (hBP01-107) サポート・イベント
 * [サポート効果]:
 *   自分のアーカイブのエール1～3枚をエールデッキに戻す。そしてエールデッキをシャッフルする。
 *   → 「1～3枚」= 最低1枚・最大3枚。アーカイブのエールを1枚ずつ選び、エールデッキに戻す。
 *     最後に必ずエールデッキをシャッフルする（カードが1枚以上戻せた場合）。
 *     アーカイブにエールが無い場合は使用不可（support.canUse で弾く）。
 */
export default {
  number: 'hBP01-107',
  support: {
    canUse(ctx) {
      // アーカイブにエールが1枚以上あること
      return ctx.player.archive.some((c) => c.kind === 'cheer');
    },
    *run(ctx) {
      let returned = 0;
      for (let i = 0; i < 3; i++) {
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: cheers,
          title: `エールデッキに戻すエールをアーカイブから選択（${i + 1}/3・1～3枚）`,
          // 1枚目は必須、2枚目以降は任意（「1～3枚」のため最低1枚）
          optional: i > 0,
          skipLabel: 'ここまでにする',
        });
        if (!picked) break;
        ctx.removeFromArchive(picked);
        ctx.player.cheerDeck.push(picked);
        ctx.log(`${ctx.player.name}: ${picked.name} をエールデッキに戻した`);
        returned++;
      }
      // 「そしてエールデッキをシャッフルする」
      if (returned > 0) ctx.shuffleCheerDeck();
    },
  },
  ai: {
    // アーカイブのエールが尽きてエールデッキが補充できると価値が高い。
    // エールデッキが空に近い、かつアーカイブにエールがある時のみ使う。
    supportValue({ engine, player }) {
      const archivedCheers = player.archive.filter((c) => c.kind === 'cheer').length;
      if (archivedCheers === 0) return 0;
      // エールデッキが少ないほど価値が高い
      if (player.cheerDeck.length <= 2) return 30;
      return 5;
    },
  },
};
