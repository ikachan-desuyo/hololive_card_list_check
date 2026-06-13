/**
 * 森カリオペ (hBP04-062) Buzzホロメン・紫・HP240
 * アーツ「最期の一杯」(50 / 紫無):
 *   自分のデッキの上から2枚を見る。その中から、1枚をアーカイブする。
 *   そして残ったカードをデッキの上に戻す。
 * ※ギフト「永遠の休息」（鎌/Death-sensei装着中、#Mythセンターのアーツ+30の継続効果）は
 *   常時継続効果のため未実装（エンジンの継続効果モデル拡張が必要）。
 */
export default {
  number: 'hBP04-062',
  arts: {
    '最期の一杯': {
      *run(ctx) {
        const looked = ctx.lookTopDeck(2); // 解決領域(revealed)に置かれる
        if (looked.length === 0) return;
        const picked = yield ctx.chooseCard({
          cards: looked,
          title: 'アーカイブするカードを選択',
        });
        const rest = looked.slice();
        if (picked) {
          ctx._unreveal(picked);
          ctx.player.archive.push(picked);
          ctx.log(`${picked.name} をアーカイブした`);
          rest.splice(rest.indexOf(picked), 1);
        }
        if (rest.length > 0) ctx.deckToTop(rest); // 残りはデッキの上に戻す
      },
    },
  },
};
