/**
 * 癒月ちょこ (hBP05-056) 紫・2nd・HP200（#料理）
 * アーツ「愛を込めて」(90+): このターンに自分が使っていた#食べ物を持つイベント1枚につき、このアーツ+20。
 *   ただし、数える枚数は2枚まで。
 * アーツ「夜に寄り添う」(150): 自分の手札2枚をアーカイブできる：
 *   自分のアーカイブの#料理を持つホロメン1枚を手札に戻す。
 */
export default {
  number: 'hBP05-056',
  arts: {
    '愛を込めて': {
      dmgBonus(ctx) {
        const n = ctx.countSupportThisTurn((c) =>
          c.supportType === 'イベント' && (c.tags || []).includes('食べ物'));
        return Math.min(n, 2) * 20;
      },
    },
    '夜に寄り添う': {
      *run(ctx) {
        if (ctx.player.hand.length < 2) return;
        const dishes = ctx.player.archive.filter((c) => c.kind === 'holomen' && (c.tags || []).includes('料理'));
        if (dishes.length === 0) return;
        const ok = yield ctx.confirm('手札2枚をアーカイブして、アーカイブの#料理ホロメンを手札に戻しますか？');
        if (!ok) return;
        for (let i = 0; i < 2; i++) {
          const card = yield ctx.chooseCard({ cards: [...ctx.player.hand], title: `コスト: アーカイブする手札を選択（${i + 1}/2）` });
          if (!card) return;
          ctx.removeFromHand(card);
          ctx.player.archive.push(card);
        }
        const back = yield ctx.chooseCard({
          cards: ctx.player.archive.filter((c) => c.kind === 'holomen' && (c.tags || []).includes('料理')),
          title: '手札に戻す #料理 のホロメンを選択',
        });
        if (back) { ctx.removeFromArchive(back); ctx.addToHand(back, { reveal: false }); }
      },
    },
  },
};
