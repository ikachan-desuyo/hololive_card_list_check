/**
 * 戌神ころね 2nd (hBP03-066) 黄・HP210（#JP #ゲーマーズ #ケモミミ）
 *
 * [ギフト] わんだふぉ～♡:
 *   このホロメンがダウンした時、自分のエールデッキの上から1枚を自分の〈戌神ころね〉に送る。
 *   → triggers.onDown。ダウン処理はアーカイブ前に発火するため、
 *     ステージ上の〈戌神ころね〉（このホロメン自身を含む）を選んでエールデッキトップを送る。
 *     ※テキストは「自分の〈戌神ころね〉」（別のとは書かれていない）ため、対象を選択させる。
 *
 * [アーツ] 最凶天災 (120+):
 *   「このアーツの対象が相手の2ndホロメンの時、このホロメンに重なっている1stホロメン1枚を
 *    アーカイブできる：このアーツ+50。」
 *   → arts.run で実装。ctx.artTarget（アーツの対象ホロメン。engine が runCtx.artTarget に設定）が
 *     相手の2ndホロメンの時、このホロメンのスタックの1stホロメン1枚をアーカイブして +50（任意）。
 */
export default {
  number: 'hBP03-066',
  arts: {
    '最凶天災': {
      *run(ctx) {
        const t = ctx.artTarget;
        if (!t || t.stack[0].bloomLevel !== '2nd') return;          // 対象が相手の2ndホロメンの時
        const firsts = ctx.sourceHolomem.stack.filter((c) => c.bloomLevel === '1st'); // 重なっている1stホロメン
        if (firsts.length === 0) return;
        const ok = yield ctx.confirm('重なっている1stホロメン1枚をアーカイブしてこのアーツ+50しますか？');
        if (!ok) return;
        const card = firsts.length === 1
          ? firsts[0]
          : yield ctx.chooseCard({ cards: firsts, title: 'アーカイブする1stホロメンを選択' });
        if (!card) return;
        const i = ctx.sourceHolomem.stack.indexOf(card);
        if (i !== -1) ctx.sourceHolomem.stack.splice(i, 1);
        ctx.player.archive.push(card);
        ctx.addArtBonus(50, '重なっている1stホロメンをアーカイブ');
      },
    },
  },
  triggers: {
    *onDown(ctx) {
      if (ctx.player.cheerDeck.length === 0) return;
      const candidates = ctx.holomems('self', (e) => e.top.name === '戌神ころね');
      if (candidates.length === 0) return;
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.name === '戌神ころね',
        title: 'エールデッキの上から1枚を送る〈戌神ころね〉を選択',
      });
      if (target) ctx.sendCheerFromCheerDeckTop(target.holomem);
    },
  },
};
