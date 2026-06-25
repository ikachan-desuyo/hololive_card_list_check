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
      const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
      // 「1～3枚」= 最低1枚・最大3枚（候補が少なければその枚数まで）
      const picked = yield ctx.chooseCards({
        cards: cheers,
        min: 1,
        max: 3,
        title: 'エールデッキに戻すエールをアーカイブから選択（1～3枚）',
      });
      for (const c of picked) {
        ctx.removeFromArchive(c);
        ctx.player.cheerDeck.push(c);
        ctx.log(`${ctx.player.name}: ${c.name} をエールデッキに戻した`);
      }
      // 「そしてエールデッキをシャッフルする」
      if (picked.length > 0) ctx.shuffleCheerDeck();
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
