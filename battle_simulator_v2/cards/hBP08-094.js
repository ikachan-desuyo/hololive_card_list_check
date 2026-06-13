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
 * 保留: 「最初に受けるアーツダメージ」の "最初の1回だけ" という一発消費は、
 *   エンジンの被ダメージ経路（system.js damageReceivedDelta）が修正を summ するだけで
 *   消費フラグを立てる仕組みを持たないため厳密には enforce できない。
 *   reArts のように engine 側で used を立てる専用処理が無い。
 *   そのため本実装では「次の相手ターン中、センターで受けるアーツダメージは（複数回でも）-300」
 *   となり、稀に過剰軽減になり得る（安全側＝防御側有利だが厳密にはオーバー）。
 *   一発消費を正しく実装するには engine の damageReceivedDelta 適用箇所に
 *   「適用後にその modifier を used/除去する」フックを追加する必要があり、ここでは保留。
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
        // 次の相手のターン終了まで有効（自分のターン=turn のエンドでは消えない）
        untilTurn: ctx.state.turn + 1,
        description: `${entry.top.name} が次の相手ターン中にセンターで受けるアーツダメージ-300`,
      });
    },
  },
};
