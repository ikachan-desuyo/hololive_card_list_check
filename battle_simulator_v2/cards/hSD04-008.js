/**
 * 癒月ちょこ (hSD04-008) 紫・1st・HP230・Buzzホロメン（#JP #2期生 #料理）
 * アーツ「がんばってつくったよ」(40): 効果なし。
 * アーツ「召し上がれ」(60+):
 *   自分のアーカイブの#食べ物を持つイベント1枚を手札に戻せる：このアーツ+20。
 */
export default {
  number: 'hSD04-008',
  arts: {
    '召し上がれ': {
      *run(ctx) {
        const foods = ctx.player.archive.filter(
          (c) => c.kind === 'support' && c.supportType === 'イベント' && (c.tags || []).includes('食べ物'),
        );
        if (foods.length === 0) return;
        const ok = yield ctx.confirm('アーカイブの#食べ物イベント1枚を手札に戻してこのアーツ+20しますか？');
        if (!ok) return;
        const picked = yield ctx.chooseCard({ cards: foods, title: '手札に戻す #食べ物 のイベントを選択' });
        if (!picked) return;
        ctx.removeFromArchive(picked);
        ctx.addToHand(picked, { reveal: false });
        ctx.addArtBonus(20, '#食べ物イベントを手札へ');
      },
    },
  },
};
