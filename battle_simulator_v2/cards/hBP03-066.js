/**
 * 戌神ころね 2nd (hBP03-066) 黄・HP210（#JP #ゲーマーズ #ケモミミ）
 *
 * [ギフト] わんだふぉ～♡:
 *   このホロメンがダウンした時、自分のエールデッキの上から1枚を自分の〈戌神ころね〉に送る。
 *   → triggers.onDown。ダウン処理はアーカイブ前に発火するため、
 *     ステージ上の〈戌神ころね〉（このホロメン自身を含む）を選んでエールデッキトップを送る。
 *     ※テキストは「自分の〈戌神ころね〉」（別のとは書かれていない）ため、対象を選択させる。
 *
 * [アーツ] 最凶天災 (120+) — 未実装:
 *   「このアーツの対象が相手の2ndホロメンの時、このホロメンに重なっている1stホロメン1枚を
 *    アーカイブできる：このアーツ+50。」
 *   → このアーツの効果は「アーツの対象（相手のどのホロメンを攻撃しているか）」が
 *     相手の2ndホロメンかどうかに依存する。現在のエンジンは、アーツのテキスト効果(*run)や
 *     dmgBonus(ctx) にアーツの対象ホロメンを渡していない（EffectContext に target が無い）。
 *     対象を判定できないため、条件付きコスト+50 は正しく実装できない。保留。
 *     実装にはエンジン側でアーツ対象を ctx に渡す機構が必要。
 */
export default {
  number: 'hBP03-066',
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
  // arts「最凶天災」の条件付き+50 は対象判定が不可能なため未実装（上記JSDoc参照）。
};
