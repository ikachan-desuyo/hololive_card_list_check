/**
 * エレガントパソコン (hBP08-090) サポート・アイテム・LIMITED
 *
 * サポート効果:
 *   自分のアーカイブの[マスコットとファン]合計1～3枚をデッキに戻してシャッフルする。
 *   その後、自分のデッキを2枚引く。
 *   LIMITED: ターンに1枚しか使えない。
 *   → 対象は自分のアーカイブの supportType が「マスコット」または「ファン」のカード。
 *     「合計1～3枚」= 最低1枚・最大3枚（マスコット/ファン混在可）。1枚ずつ選んで
 *     デッキに戻し（removeFromArchive → deck へ push）、戻し終えたらデッキをシャッフルする。
 *     1枚目は必須、2・3枚目は任意（「ここまでにする」で打ち切れる）。
 *     対象が1枚も無い場合は戻すものが無いのでシャッフルもスキップ（候補ゼロ）。
 *     その後、戻した枚数に関わらず自分のデッキを2枚引く。
 *   LIMITED（ターンに1枚）はエンジンが card.limited で自動制御するため run では扱わない。
 *
 * 保留: なし（全文 context.js のプリミティブで実装）。
 */
export default {
  number: 'hBP08-090',

  support: {
    *run(ctx) {
      // アーカイブの[マスコットとファン]を合計1～3枚、1枚ずつデッキに戻す
      let returned = 0;
      for (let i = 0; i < 3; i++) {
        const candidates = ctx.player.archive.filter(
          (c) => c.supportType === 'マスコット' || c.supportType === 'ファン');
        if (candidates.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: candidates,
          title: `デッキに戻すマスコット/ファンを選択 (${i + 1}/3枚目)`,
          optional: i > 0, // 1枚目は必須、2・3枚目は任意（「1～3枚」）
          skipLabel: 'ここまでにする',
        });
        if (!picked) break;
        ctx.removeFromArchive(picked);
        ctx.player.deck.push(picked);
        ctx.log(`${ctx.player.name}: ${picked.name} をアーカイブからデッキに戻した`);
        returned++;
      }

      // 1枚でも戻したならデッキをシャッフルする
      if (returned > 0) ctx.shuffleDeck();

      // その後、自分のデッキを2枚引く
      ctx.draw(2);
    },
  },
};
