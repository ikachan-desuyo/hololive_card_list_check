/**
 * 不知火フレア (hBP05-067) 黄・2nd・HP200（#3期生）
 * アーツ「みんなに笑っててほしいから」(120+): サイコロを1回振れる：出た目の数が自分のライフ以上なら、
 *   このアーツ+60。出た目の数が自分のライフ以下なら、自分のデッキを1枚引く。
 * ギフト「カラフルストリーム」: このホロメンがアーツを使った時、このホロメンのエール2枚を自分のバックホロメン1人に
 *   送れる。その後、自分のアーカイブの、エールを送られたホロメンと同じカード名の1stホロメン1枚を手札に戻す。
 *   → triggers.onArtsUse（アーツ解決後に発火）
 */
export default {
  number: 'hBP05-067',
  triggers: {
    *onArtsUse(ctx) {
      const h = ctx.sourceHolomem;
      if (!h || h.cheers.length < 2) return;
      const backs = ctx.holomems('self', (e) => e.pos.zone === 'back');
      if (backs.length === 0) return;
      const ok = yield ctx.confirm('このホロメンのエール2枚をバックホロメンに送りますか？');
      if (!ok) return;
      const dest = yield ctx.chooseHolomem({ side: 'self', filter: (e) => e.pos.zone === 'back', title: 'エール2枚を送るバックホロメンを選択' });
      if (!dest) return;
      for (let i = 0; i < 2; i++) {
        const cheer = h.cheers[0];
        if (!cheer) break;
        ctx.moveCheer(cheer, h, dest.holomem);
      }
      // 送られたホロメンと同名の1stホロメンをアーカイブから手札へ
      const name = dest.holomem.stack[0].name;
      const cand = ctx.player.archive.filter((c) => c.kind === 'holomen' && c.bloomLevel === '1st' && c.name === name);
      if (cand.length === 0) return;
      const back = yield ctx.chooseCard({ cards: cand, title: `手札に戻す〈${name}〉の1stホロメンを選択（任意）`, optional: true, skipLabel: '戻さない' });
      if (back) { ctx.removeFromArchive(back); ctx.addToHand(back, { reveal: false }); }
    },
  },
  arts: {
    'みんなに笑っててほしいから': {
      *run(ctx) {
        const ok = yield ctx.confirm('サイコロを振りますか？', '振る', '振らない');
        if (!ok) return;
        const v = ctx.rollDice();
        const life = ctx.player.life.length;
        if (v >= life) ctx.addArtBonus(60, 'サイコロの目がライフ以上');
        if (v <= life) ctx.draw(1);
      },
    },
  },
};
