/**
 * クレイジー・オリー 1st (hBP02-051)
 * ブルームエフェクト「限界化！！」:
 *   自分の #ID2期生 を持つ Debut ホロメン1人を、自分のアーカイブのホロメンを使ってBloomできる。
 *   このブルームエフェクトはターンに1回しか使えない。
 *   → ctx.bloomFromArchiveFlow（アーカイブからBloomさせる共通フロー）を使用。
 *     Bloom の通常条件（同名・レベル遷移・HP>ダメージ等）は _canBloom が判定する。
 *     対象は「#ID2期生 を持つ Debut ホロメン」に限定。
 *
 * アーツ「推しを見て叫びまくるぞ！！」(dmg:20):
 *   追加のテキスト効果なし（基本ダメージのみ）。実装不要。
 */
export default {
  number: 'hBP02-051',
  bloomEffect: {
    name: '限界化！！',
    *run(ctx) {
      // ターンに1回制限
      const key = 'hBP02-051:限界化';
      if (ctx.oncePerTurnUsed(key)) return;
      const done = yield* ctx.bloomFromArchiveFlow({
        targetFilter: (e) => e.top.bloomLevel === 'Debut' && ctx.hasTag(e.top, 'ID2期生'),
        optional: true,
      });
      if (done) ctx.markOncePerTurn(key);
    },
  },
};
