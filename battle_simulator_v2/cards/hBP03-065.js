/**
 * 戌神ころね (hBP03-065) 黄・1st・HP150（#JP #ゲーマーズ #ケモミミ）
 * アーツ「ほらよ～」(30):
 *   自分のエールデッキの上から1枚を、自分の#ゲーマーズを持つホロメンに送る。
 *
 * キーワード/ギフト「ボクシングスタイル」:
 *   [コラボポジション限定]相手のメインステップの間、自分のセンターホロメンの
 *   〈戌神ころね〉のHPは相手の能力で減らず、変動しない。
 *   → auraDamageDelta（常時アウラ）で実装。hBP04-024（らでん）と同型: 相手のメインステップ中、
 *     このころねがコラボにいる間、センターの〈戌神ころね〉が受けるダメージを実質無効化（-100000）。
 */
export default {
  number: 'hBP03-065',
  // キーワード「ボクシングスタイル」: [コラボ限定]相手のメインステップ間、センターの〈戌神ころね〉のHPは相手の能力で減らない
  auraDamageDelta(src, target, zone, engine) {
    if (engine._zoneOf(src) !== 'collab') return 0;                         // [コラボ限定]（キーワード保持者）
    if (zone !== 'center' || target.stack[0].name !== '戌神ころね') return 0; // 守る対象=センターの〈戌神ころね〉
    const s = engine.state;
    if (s.step !== 'main') return 0;                                        // メインステップの間
    const owner = engine.state.players.findIndex((p) => engine._stageHolomems(p).includes(target));
    if (owner < 0 || s.turnPlayer === owner) return 0;                      // 「相手の」メインステップ
    return -100000;                                                        // 相手の能力で減らない・変動しない
  },
  arts: {
    'ほらよ～': {
      *run(ctx) {
        if (ctx.player.cheerDeck.length === 0) return;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => ctx.hasTag(e.top, 'ゲーマーズ'),
          title: 'エールデッキの上から1枚を送る #ゲーマーズ ホロメンを選択',
        });
        if (!target) return;
        ctx.sendCheerFromCheerDeckTop(target.holomem);
      },
    },
  },
};
