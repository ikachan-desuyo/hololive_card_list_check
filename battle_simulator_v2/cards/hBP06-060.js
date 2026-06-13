/**
 * 森カリオペ (hBP06-060) 青・2nd・HP210（#EN #Myth #歌）
 * アーツ「Bull's-eye!!!!」(60):
 *   自分の推しホロメンが〈森カリオペ〉なら、自分のデッキの上から2枚をアーカイブできる。
 *   アーカイブしたなら、自分のエールデッキの上から1枚を自分のホロメンに送る。
 * アーツ「Memento Mori.」(200+):
 *   このターンの間、自分のステージの#Mythを持つホロメン1人のアーツ+20。
 *   その後、自分の推しホロメンが〈森カリオペ〉で、自分のアーカイブのホロメンが8枚以上あるなら、
 *   自分のデッキを1枚引ける。
 */
export default {
  number: 'hBP06-060',
  arts: {
    "Bull's-eye!!!!": {
      *run(ctx) {
        // 推しが〈森カリオペ〉でなければ何もしない
        if (ctx.player.oshi?.name !== '森カリオペ') return;
        if (ctx.player.deck.length === 0) return;
        const ok = yield ctx.confirm('デッキの上から2枚をアーカイブしますか？');
        if (!ok) return;
        const cards = ctx.player.deck.splice(0, Math.min(2, ctx.player.deck.length));
        for (const c of cards) {
          ctx.player.archive.push(c);
          ctx.log(`${ctx.player.name}: ${c.name} をアーカイブした`);
        }
        // アーカイブしたなら（=実際に1枚以上アーカイブできたなら）エールデッキの上から1枚を送る
        if (cards.length === 0) return;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          title: 'エールを送るホロメンを選択',
        });
        if (target) ctx.sendCheerFromCheerDeckTop(target.holomem);
      },
    },
    'Memento Mori.': {
      *run(ctx) {
        // このターンの間、#Mythを持つホロメン1人のアーツ+20
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => ctx.hasTag(e.top, 'Myth'),
          title: 'このターン アーツ+20する #Myth ホロメンを選択',
        });
        if (target) {
          const chosen = target.holomem;
          ctx.addTurnModifier({
            kind: 'artsPlus', amount: 20, ownerIdx: ctx.playerIdx,
            match: (h) => h === chosen,
            description: `このターン、${chosen.stack[0].name} のアーツ+20`,
          });
        }
        // その後、推しが〈森カリオペ〉でアーカイブのホロメンが8枚以上ならデッキを1枚引ける
        if (ctx.player.oshi?.name !== '森カリオペ') return;
        const archiveHolomem = ctx.player.archive.filter((c) => c.kind === 'holomen').length;
        if (archiveHolomem < 8) return;
        const ok = yield ctx.confirm('デッキを1枚引きますか？');
        if (ok) ctx.draw(1);
      },
    },
  },
};
