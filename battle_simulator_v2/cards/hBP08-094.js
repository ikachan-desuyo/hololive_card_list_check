/**
 * パパは仕事を辞める (hBP08-094) サポート・イベント・LIMITED
 *
 * サポート効果:
 *   このカードは、自分のコラボホロメンがいる時にしか使えない。
 *   自分のセンターホロメンを選ぶ。次の相手のターンの間、選んだホロメンが
 *   センターポジションで最初に受けるアーツダメージ-300。
 *   LIMITED: ターンに1枚しか使えない。
 *
 * 実装:
 *   - support.canUse: 自分のコラボがいて、かつセンターがいる時のみ使用可。
 *   - run: 自分のセンターホロメンを選ばせ（通常はセンターは1人だが厳密に選択させる）、
 *     damageReceivedDelta のターン修正を付与する。
 *     match で「対象ホロメン本人」かつ「zone==='center'」かつ「kind==='arts'」を判定し、-300。
 *   - 「次の相手のターンの間」有効にするため untilTurn = state.turn + 1 を指定する
 *     （このカードは自分のターンに使う＝turn T。自分のエンドステップ(turn T)では
 *      T < T+1 なので残り、次の相手ターン(turn T+1)のエンドステップで消滅）。
 *
 *   「最初に受けるアーツダメージ」の一発消費は once:true で表現。engine._applyDamageReceived が
 *   ダメージ適用時に effects.consumeOnceDamageReceivedMods で該当 once 修正を used=true にするため、
 *   2回目以降のアーツダメージには適用されない（最初の1回だけ-300）。
 */
export default {
  number: 'hBP08-094',

  support: {
    // 自分のコラボホロメンがいる時にしか使えない（＋対象となるセンターがいること）
    canUse(ctx) {
      return !!ctx.player.collab && !!ctx.player.center;
    },
    *run(ctx) {
      // 自分のセンターホロメンを選ぶ（厳密に選択フローを通す）
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.pos.zone === 'center',
        title: 'アーツダメージ-300を付与する自分のセンターホロメンを選ぶ',
      });
      if (!entry) return;

      const selected = entry.holomem;
      ctx.addTurnModifier({
        kind: 'damageReceivedDelta',
        ownerIdx: ctx.playerIdx,
        matchKind: 'arts',
        // 対象本人が「センターポジションで」受けるアーツダメージのみ -300
        match: (h, zone, kind) => h === selected && zone === 'center' && kind === 'arts',
        amount: -300,
        once: true, // 「最初に受けるアーツダメージ」だけ＝適用後に used 化（consumeOnceDamageReceivedMods）
        // 次の相手のターン終了まで有効（自分のターン=turn のエンドでは消えない）
        untilTurn: ctx.state.turn + 1,
        description: `${entry.top.name} が次の相手ターン中にセンターで受けるアーツダメージ-300`,
      });
    },
  },
};
