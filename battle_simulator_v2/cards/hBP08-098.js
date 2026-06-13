/**
 * hololive Mythology (hBP08-098) サポート・イベント・LIMITED
 *
 * [サポート効果]
 *   このカードは、自分のステージのホロメン全員が #Myth を持つホロメンでなければ使えない。
 *   自分のデッキの上から4枚を公開する。その中から2枚を手札に加える。そして残ったカードをアーカイブする。
 *   LIMITED:ターンに1枚しか使えない。
 *
 * 実装方針:
 *   - canUse: 自分のステージにホロメンが1人以上いて、その全員が #Myth を持つこと
 *     （ステージにホロメンがいない＝全員条件を満たすホロメンが0なので使えない）。
 *     加えて LIMITED（ターンに1枚）を oncePerTurnUsed で判定。
 *   - 本体: デッキ上4枚を公開（lookTopDeck で解決領域に置く）。その中から2枚を選んで手札に加える
 *     （chooseCard を2回。残り候補からの選択。displayCards で残り全体を公開表示）。
 *     公開した枚数が4枚未満（デッキ残り少）の場合、加える枚数も残り枚数が上限になる。
 *     手札に加えなかった残りカードはすべてアーカイブする。
 *
 * 保留: なし（全文 context.js のプリミティブで実装）。
 */
const hasMyth = (ctx, c) => ctx.hasTag(c, 'Myth');

export default {
  number: 'hBP08-098',

  support: {
    canUse(ctx) {
      if (ctx.oncePerTurnUsed('hBP08-098:hololive Mythology')) return false;
      const stage = ctx.holomems('self');
      // ステージにホロメンがいなければ使えない（全員が#Myth＝0人では満たさない）
      if (stage.length === 0) return false;
      return stage.every((e) => hasMyth(ctx, e.top));
    },
    *run(ctx) {
      ctx.markOncePerTurn('hBP08-098:hololive Mythology');

      // デッキの上から4枚を公開（解決領域に置く）
      const seen = ctx.lookTopDeck(4);
      if (seen.length === 0) {
        ctx.log('デッキにカードがない');
        return;
      }
      for (const c of seen) ctx.flashReveal(c);

      // その中から2枚（デッキ残りが少なければその枚数）を手札に加える
      const toAdd = Math.min(2, seen.length);
      const remaining = [...seen];
      for (let i = 0; i < toAdd; i++) {
        if (remaining.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: remaining,
          title: `手札に加えるカードを選択（${i + 1}/${toAdd}）`,
          displayCards: seen,
        });
        if (!picked) break;
        remaining.splice(remaining.indexOf(picked), 1);
        ctx.addToHand(picked);
      }

      // 残ったカードをアーカイブする
      for (const c of remaining) {
        ctx._unreveal(c);
        ctx.player.archive.push(c);
      }
      if (remaining.length > 0) {
        ctx.log(`${ctx.player.name}: 残り${remaining.length}枚をアーカイブ（${remaining.map((c) => c.name).join(' / ')}）`);
      }
    },
  },
};
