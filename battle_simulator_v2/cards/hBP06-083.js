/**
 * ラムダック (hBP06-083) 黄・1st・HP170（#JP #2期生 #4期生 #トリ #ケモミミ #歌）
 *
 * コラボエフェクト「おしまいのあじまり」:
 *   自分の手札の〈大空スバル〉1枚を公開し、デッキの下に戻せる（コスト・任意）：
 *   自分のアーカイブの[〈角巻わため〉か〈大空スバル〉]1枚を手札に戻す。
 *
 * アーツ「I am スバル＆わため！ Yeah！！」(80):
 *   [コラボポジション限定]
 *   自分の推しホロメンが〈角巻わため〉か〈大空スバル〉なら、このアーツに必要な黄-1。
 *   自分のセンターホロメンが2ndホロメンの〈角巻わため〉なら、かわりに、このアーツに必要な黄-3。
 *   → アーツ必要エール軽減オーラ。このホロメン自身（src===target）のアーツのみ対象。
 *     このホロメンはアーツが1つだけなので、そのアーツへの軽減と一致する。
 */
export default {
  number: 'hBP06-083',

  // 合体ユニット: エクストラ「このホロメンは〈角巻わため〉〈大空スバル〉としても扱う」を card_data から取得済み
  //   → card.nameAliases として正規化され、engine._bloomNameMatches が別名Bloomを許可する（ハードコード不要）。

  collabEffect: {
    name: 'おしまいのあじまり',
    *run(ctx) {
      // コスト: 手札の〈大空スバル〉1枚を公開してデッキの下に戻す（任意）
      const subaruInHand = ctx.player.hand.filter(
        (c) => c.kind === 'holomen' && c.name === '大空スバル');
      if (subaruInHand.length === 0) return; // コストを払えないので効果も発動しない

      const ok = yield ctx.confirm(
        '手札の〈大空スバル〉1枚を公開してデッキの下に戻し、アーカイブから〈角巻わため〉か〈大空スバル〉1枚を手札に戻しますか？');
      if (!ok) return;

      const picked = yield ctx.chooseCard({
        cards: subaruInHand,
        title: 'デッキの下に戻す〈大空スバル〉を選択',
      });
      if (!picked) return;
      ctx.removeFromHand(picked);
      ctx.log(`${ctx.player.name}: ${picked.name} を公開しデッキの下に戻した`);
      ctx.deckToBottom([picked]);

      // 効果: アーカイブの〈角巻わため〉か〈大空スバル〉1枚を手札に戻す
      const candidates = ctx.player.archive.filter(
        (c) => c.name === '角巻わため' || c.name === '大空スバル');
      if (candidates.length === 0) return;
      const ret = yield ctx.chooseCard({
        cards: candidates,
        title: '手札に戻す〈角巻わため〉/〈大空スバル〉を選択',
      });
      if (!ret) return;
      ctx.removeFromArchive(ret);
      ctx.addToHand(ret);
    },
  },

  // このホロメン自身（src===target）がコラボポジションにいる時、条件に応じて黄を軽減する
  artsCostReduceAura(src, target, engine) {
    if (src !== target) return []; // このホロメン自身のアーツのみ対象
    if (engine._zoneOf(src) !== 'collab') return []; // [コラボポジション限定]

    const ownerIdx = engine.state.players.findIndex((p) =>
      engine._stageHolomems(p).includes(src));
    if (ownerIdx === -1) return [];
    const p = engine.state.players[ownerIdx];

    // 「かわりに」: センターが2ndホロメンの〈角巻わため〉なら黄-3（こちらを優先）
    const center = p.center;
    if (center && center.stack[0].name === '角巻わため' && center.stack[0].bloomLevel === '2nd') {
      return [{ color: '黄', amount: 3 }];
    }

    // 推しホロメンが〈角巻わため〉か〈大空スバル〉なら黄-1
    const oshiName = p.oshi?.name;
    if (oshiName === '角巻わため' || oshiName === '大空スバル') {
      return [{ color: '黄', amount: 1 }];
    }
    return [];
  },

  arts: {
    'I am スバル＆わため！ Yeah！！': {
      // テキスト効果はコスト軽減のみ（artsCostReduceAura で実装）。追加のダメージ/効果なし。
    },
  },
};
