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
      // アーカイブの[マスコットとファン]を合計1～3枚、一度に選んでデッキに戻す
      const candidates = ctx.player.archive.filter(
        (c) => c.supportType === 'マスコット' || c.supportType === 'ファン');
      const picked = yield ctx.chooseCards({
        cards: candidates,
        min: 1, // 「1～3枚」: 最低1枚（候補が1枚未満なら全部）
        max: 3,
        title: 'デッキに戻すマスコット/ファンを選択（1～3枚）',
      });
      for (const c of picked) {
        ctx.removeFromArchive(c);
        ctx.player.deck.push(c);
        ctx.log(`${ctx.player.name}: ${c.name} をアーカイブからデッキに戻した`);
      }

      // 1枚でも戻したならデッキをシャッフルする
      if (picked.length > 0) ctx.shuffleDeck();

      // その後、自分のデッキを2枚引く
      ctx.draw(2);
    },
  },
};
