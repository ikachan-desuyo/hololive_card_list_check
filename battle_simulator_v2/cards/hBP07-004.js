/**
 * 赤井はあと (hBP07-004) 推しホロメン・赤
 *
 * 推しステージスキル「はあちゃまなう」[ターンに1回]:
 *   自分のターンで、自分の〈赤井はあと〉が自分の能力でステージからデッキに戻った時、自分のデッキを2枚引く。
 *   → ctx.returnHolomemToDeck（能力でホロメンをデッキに戻す共通プリミティブ）が
 *     engine._dispatchReturnedToDeck 経由で oshiStageSkill.onReturnedToDeck を発火する。
 *     下記推しスキルがこのプリミティブを使うため、〈赤井はあと〉が戻ると本ステージスキルが誘発する。
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

  // 推しステージスキル「はあちゃまなう」[ターンに1回]:
  //   自分のターンで〈赤井はあと〉が自分の能力でステージからデッキに戻った時、デッキを2枚引く。
  //   ※強制ではなく、条件成立時に [ターンに1回] 発動するかどうかを選べる（発動しないことも可）。
  //     発動しなかった場合は [ターンに1回] を消費しないため、同ターンの次の機会に再び選べる。
  //   シグネチャは (ctx, returnedCards)。ジェネレータにして ctx.confirm で発動可否を選ばせる。
  oshiStageSkill: {
    name: 'はあちゃまなう',
    *onReturnedToDeck(ctx, cards) {
      if (ctx.state.turnPlayer !== ctx.playerIdx) return; // 自分のターン限定
      const p = ctx.player;
      if (p._haachamaNowTurn === ctx.state.turn) return;  // [ターンに1回]（既に発動済みなら出さない）
      if (!cards.some((c) => c.name === '赤井はあと')) return;
      // 任意発動（既定ラベルなので「任意効果の発動確認」設定にも従う）
      const ok = yield ctx.confirm('はあちゃまなう: 〈赤井はあと〉がデッキに戻った。デッキを2枚引きますか？（ターンに1回）');
      if (!ok) return; // 発動しない → [ターンに1回] は消費しない（同ターンの次の機会に再び選べる）
      p._haachamaNowTurn = ctx.state.turn;
      let drawn = 0;
      for (let i = 0; i < 2 && p.deck.length > 0; i++) { p.hand.push(p.deck.shift()); drawn++; }
      ctx.log(`はあちゃまなう: 〈赤井はあと〉がデッキに戻った→${drawn}枚引く`);
    },
  },

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
        // 能力でデッキの下に戻す（付属カードはアーカイブ・「デッキに戻った時」誘発も発火）
        yield* ctx.returnHolomemToDeck(back.holomem, { bottom: true });
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
