/**
 * 沙花叉クロヱ (hBP02-004) 推しホロメン・青
 *
 * 推しスキル「ぽえぽえぽえ～」[ホロパワー：1消費][ターンに1回]:
 *   自分のセンターホロメンが〈沙花叉クロヱ〉の時に使える：
 *   自分のデッキの上から3枚を見る。そのカードすべてを、アーカイブするか、
 *   好きな順でデッキの上に戻す。
 *   → oshiSkill（能動）。見た3枚は「すべてアーカイブ」か「すべて好きな順でデッキの上に戻す」の二択
 *     （1枚ずつ振り分けるのではなく、全体で一括の選択）。
 *
 * SP推しスキル「人生リセットボタン」[ホロパワー：3消費][ゲームに1回]:
 *   自分の手札を数えて、自分の[手札すべてとアーカイブのホロメンすべて]をデッキに戻して
 *   シャッフルする。そして手札からデッキに戻したカード1枚につき、自分のデッキを1枚引く。
 *   → spOshiSkill（能動）。引く枚数は「手札から戻した枚数」分のみ（アーカイブのホロメン分は数えない）。
 *
 * コスト [ホロパワー：N消費] はエンジンが処理するため run 内では支払わない。
 */
export default {
  number: 'hBP02-004',

  oshiSkill: {
    name: 'ぽえぽえぽえ～',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // センターホロメンが〈沙花叉クロヱ〉であること
      return !!p.center && p.center.stack[0].name === '沙花叉クロヱ';
    },
    *run(ctx) {
      const seen = ctx.lookTopDeck(3);
      if (seen.length === 0) return;
      ctx.flashReveal && seen.forEach((c) => ctx.flashReveal(c));
      const toDeck = yield ctx.confirm(
        `デッキの上から見た${seen.length}枚をどうする？`,
        'デッキの上に戻す',
        'すべてアーカイブする');
      if (toDeck) {
        // 好きな順でデッキの上に戻す
        const ordered = yield* ctx.orderCardsFlow(seen, 'デッキの上に戻す順番');
        ctx.deckToTop(ordered);
        ctx.log(`${ordered.length}枚をデッキの上に戻した`);
      } else {
        // すべてアーカイブする
        for (const c of seen) {
          ctx._unreveal(c);
          ctx.player.archive.push(c);
        }
        ctx.log(`${seen.length}枚をアーカイブした`);
        ctx.recordDeckArchive(seen.length);
      }
    },
  },

  spOshiSkill: {
    name: '人生リセットボタン',
    *run(ctx) {
      // 手札の枚数を数える（戻したあとに引く枚数になる）
      const handCount = ctx.player.hand.length;

      // 手札すべてをデッキに戻す
      ctx.returnHandToDeck();

      // アーカイブのホロメンすべてをデッキに戻す
      const archiveHolomems = ctx.player.archive.filter((c) => c.kind === 'holomen');
      for (const c of archiveHolomems) {
        ctx.removeFromArchive(c);
        ctx.player.deck.push(c);
      }
      if (archiveHolomems.length > 0) {
        ctx.log(`アーカイブのホロメン${archiveHolomems.length}枚をデッキに戻した`);
      }

      // シャッフル
      ctx.shuffleDeck();

      // 手札から戻した枚数ぶん引く
      if (handCount > 0) ctx.draw(handCount);
    },
  },
};
