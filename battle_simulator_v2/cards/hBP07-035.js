/**
 * 輪堂千速 (hBP07-035) ホロメン・緑・2nd・HP190（#DEV_IS #FLOW #GLOW）
 * バトンタッチ: 無色
 *
 * コラボエフェクト「Give Me Hype!!」:
 *   このターンに自分の #FLOW #GLOW を持つホロメンがBloomした回数1回につき、
 *   自分のエールデッキの上から1枚をこのホロメンに送る。
 *   ※ このエンジンは「このターンにBloomした」を holomem.bloomedTurn === 現ターン で判定する
 *     （各ホロメンは1ターンに1回までしかBloomできない＝8.3）。
 *     ステージ上に現存する #FLOW #GLOW ホロメンのうち、このターンにBloomしたものの数を回数とする。
 *     Bloom後にダウンして退場したホロメンの分はカウントできない（このエンジンの制約・既存実装 hBP07-033 と同様）。
 *
 * アーツ「サージングエキゾースト」(160):
 *   このホロメンのエールを数えて、そのすべてを好きな順でエールデッキの下に戻す。
 *   その後、自分の手札がこの能力で戻したエールの枚数と同じになるまで、自分のデッキを引く。
 *   ※「同じになるまで引く」=（戻した枚数 - 現在の手札枚数）枚を引く。手札がすでに多い場合は0枚。
 */
export default {
  number: 'hBP07-035',
  collabEffect: {
    name: 'Give Me Hype!!',
    *run(ctx) {
      const turn = ctx.state.turn;
      const count = ctx.holomems('self', (e) =>
        e.holomem.bloomedTurn === turn &&
        ctx.hasTag(e.top, 'FLOW') &&
        ctx.hasTag(e.top, 'GLOW')).length;
      if (count <= 0) {
        ctx.log('このターンにBloomした #FLOW #GLOW ホロメンがいないため、エールは送られない');
        return;
      }
      for (let i = 0; i < count; i++) {
        if (ctx.player.cheerDeck.length === 0) break;
        ctx.sendCheerFromCheerDeckTop(ctx.sourceHolomem);
      }
    },
  },
  arts: {
    'サージングエキゾースト': {
      *run(ctx) {
        const holomem = ctx.sourceHolomem;
        if (!holomem) return;
        const cheers = [...holomem.cheers];
        const returnedCount = cheers.length;
        if (returnedCount > 0) {
          // 好きな順でエールデッキの下に戻す
          const ordered = yield* ctx.orderCardsFlow(cheers, 'エールデッキの下に戻す順番');
          for (const cheer of ordered) {
            const idx = holomem.cheers.indexOf(cheer);
            if (idx !== -1) holomem.cheers.splice(idx, 1);
          }
          ctx.player.cheerDeck.push(...ordered);
          ctx.log(`${holomem.stack[0].name} のエール${returnedCount}枚を好きな順でエールデッキの下に戻した`);
        }
        // 手札が戻した枚数と同じになるまでデッキを引く
        const need = returnedCount - ctx.player.hand.length;
        if (need > 0) ctx.draw(need);
      },
    },
  },
};
