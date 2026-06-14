/**
 * 赤井はあと (hBP07-004) 推しホロメン・赤
 *
 * 推しステージスキル「はあちゃまなう」[ターンに1回]:
 *   自分のターンで、自分の〈赤井はあと〉が自分の能力でステージからデッキに戻った時、自分のデッキを2枚引く。
 *   → 保留: 「ホロメンが自分の能力でステージからデッキに戻った時」を発火させる汎用イベントが
 *     エンジンに無い（deckToBottom 等は領域移動プリミティブで発生源・トリガー通知を持たない）。
 *     全デッキ戻し箇所への発生源属性付き通知（broad機構）が必要なため未実装。
 *
 * 推しスキル「ワールドワイドな最強アイドル！」[ホロパワー：-2][ターンに1回]:
 *   自分のバックポジションのDebutホロメンの〈赤井はあと〉1人をデッキの下に戻す。
 *   その後、自分のステージの〈赤井はあと〉1人を選ぶ。このターンの間、選んだホロメンのアーツ+50。
 *
 * 実装メモ:
 *   - 「デッキの下に戻す」対象はバックの Debut（=スタックの一番上が Debut）の〈赤井はあと〉に限定。
 *     ホロメンがステージを離れるので、付いているエール／サポートはアーカイブへ（4.4.7 と同様の扱い）、
 *     ホロメンカード本体（スタック）はデッキの下へ戻す。Debut はスタックの最下段なので通常 stack=[Debut カード]。
 *   - その後、ステージに残っている〈赤井はあと〉1人を選び、このターンの間アーツ+50（match で対象ホロメンのみ）。
 *   - 「ターンに1回」「ホロパワー：-2」はエンジン側で処理されるため run 内では支払わない。
 *   - canUse: 戻す対象（バックの Debut〈赤井はあと〉）がいなければスキル全体が使えない。
 */
export default {
  number: 'hBP07-004',
  oshiSkill: {
    name: 'ワールドワイドな最強アイドル！',
    // 戻す対象が必須なので、いなければ使用不可
    canUse(engine, idx) {
      const p = engine.state.players[idx];
      return p.back.some(
        (h) => h.stack[0].name === '赤井はあと' && h.stack[0].bloomLevel === 'Debut',
      );
    },
    *run(ctx) {
      // 1) バックポジションの Debut〈赤井はあと〉1人を選んでデッキの下に戻す
      const back = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) =>
          e.pos.zone === 'back' && e.top.name === '赤井はあと' && e.top.bloomLevel === 'Debut',
        title: 'デッキの下に戻すバックの Debut〈赤井はあと〉を選択',
      });
      if (back) {
        const h = back.holomem;
        // 付いているエール／サポートはアーカイブへ
        if (h.cheers.length || h.attachments.length) {
          ctx.player.archive.push(...h.cheers, ...h.attachments);
          ctx.log(`${back.top.name} の付属カードをアーカイブ`);
        }
        // ホロメンをステージから取り除き、本体（スタック）をデッキの下へ
        ctx.engine._removeHolomem(ctx.player, back.pos);
        ctx.deckToBottom(h.stack);
        ctx.log(`${back.top.name} をデッキの下に戻した`);
      }

      // 2) ステージに残る〈赤井はあと〉1人を選び、このターンの間アーツ+50
      const targets = ctx.holomems('self', (e) => e.top.name === '赤井はあと');
      if (targets.length === 0) return;
      const chosen = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.name === '赤井はあと',
        title: 'アーツ+50する〈赤井はあと〉を選択',
      });
      if (chosen) {
        const src = chosen.holomem;
        ctx.addTurnModifier({
          kind: 'artsPlus',
          amount: 50,
          ownerIdx: ctx.playerIdx,
          match: (h) => h === src,
          description: 'このターン、選んだ〈赤井はあと〉のアーツ+50',
        });
      }
    },
  },
};
