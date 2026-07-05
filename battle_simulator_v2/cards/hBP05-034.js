/**
 * 尾丸ポルカ (hBP05-034) 赤・2nd・HP190
 * キーワード「おまたせ～！」:
 *   [センターポジション限定]自分の手札を好きな枚数アーカイブできる：
 *   アーカイブしたカード1枚につき、自分のアーカイブの〈座員〉1枚を手札に戻す。
 *   → 起動型能力（コスト: 手札アーカイブ、効果: 同数の〈座員〉回収）
 * アーツ「Are you ready？」(110+):
 *   自分の推しホロメンが〈尾丸ポルカ〉なら、自分のアーカイブのカード10枚につき、このアーツ+30。
 */
export default {
  number: 'hBP05-034',
  activatedAbilities: [{
    name: 'おまたせ～！',
    oncePerTurn: false,
    canUse(ctx) {
      if (ctx.sourceHolomemPos()?.zone !== 'center') return false; // [センター限定]
      if (ctx.player.hand.length === 0) return false;
      return ctx.player.archive.some((c) => c.name === '座員');
    },
    *run(ctx) {
      // 手札を1枚ずつアーカイブ→そのつどアーカイブの〈座員〉1枚を手札に戻す
      while (ctx.player.hand.length > 0 && ctx.player.archive.some((c) => c.name === '座員')) {
        const card = yield ctx.chooseCard({
          cards: [...ctx.player.hand],
          title: 'アーカイブする手札を選択（任意）',
          optional: true,
          skipLabel: 'これ以上アーカイブしない',
        });
        if (!card) break;
        ctx.removeFromHand(card);
        ctx.player.archive.push(card);
        ctx.log(`${card.name} をアーカイブした`);
        const zain = ctx.player.archive.filter((c) => c.name === '座員');
        const back = yield ctx.chooseCard({ cards: zain, title: '手札に戻す〈座員〉を選択' });
        if (back) {
          ctx.removeFromArchive(back);
          ctx.addToHand(back, { reveal: false });
          ctx.log('〈座員〉を手札に戻した');
        }
      }
    },
  }],
  arts: {
    'Are you ready？': {
      dmgBonus(ctx) {
        if (ctx.player.oshi?.name !== '尾丸ポルカ') return 0;
        return Math.floor(ctx.player.archive.length / 10) * 30;
      },
    },
  },
};
