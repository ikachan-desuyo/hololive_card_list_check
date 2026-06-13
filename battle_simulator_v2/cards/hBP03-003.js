/**
 * さくらみこ（推しホロメン hBP03-003）
 *
 * 推しスキル「35P帰ってくるのかッ！？って！」[ホロパワー：-2][ターンに1回]:
 *   サイコロを1回振れる：
 *     1か2か4か6の時、自分のアーカイブの〈35P〉1枚を手札に戻す。
 *     3か5の時、自分のアーカイブの〈35P〉2枚を手札に戻す。
 *   ※「振れる」=任意。サイコロの目で戻す枚数が変わる。
 *   ※アーカイブに〈35P〉が無い時はコストを払わないよう canUse で弾く。
 *
 * SP推しスキル「あきらめない心にぇ」[ホロパワー：-2][ゲームに1回]:
 *   自分のセンターホロメンの色が赤の時に使える：
 *   自分の手札を好きな枚数選んで好きな順でデッキの下に戻す。
 *   そして手札が5枚になるまで、自分のデッキを引く。
 */
const is35P = (card) => card && card.name === '35P';

export default {
  number: 'hBP03-003',

  oshiSkill: {
    // アーカイブに〈35P〉が1枚もない時は空振りになるので使えない
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      return p.archive.some(is35P);
    },
    *run(ctx) {
      // 「振れる」=任意
      const go = yield ctx.confirm('サイコロを振りますか？', '振る', '振らない');
      if (!go) return;
      const roll = ctx.rollDice();
      const count = (roll === 3 || roll === 5) ? 2 : 1; // 3か5で2枚、それ以外(1/2/4/6)で1枚
      for (let i = 0; i < count; i++) {
        const cards = ctx.player.archive.filter(is35P);
        if (cards.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards,
          title: `アーカイブから手札に戻す〈35P〉を選択（${i + 1}/${count}）`,
        });
        if (!picked) break;
        ctx.removeFromArchive(picked);
        ctx.addToHand(picked);
      }
    },
  },

  spOshiSkill: {
    // センターホロメンの色が赤の時のみ使える
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      return !!p.center && p.center.stack[0].color === '赤';
    },
    *run(ctx) {
      // 手札を好きな枚数選んでデッキの下に戻す（「好きな枚数」=0枚も可）
      const toReturn = [];
      while (ctx.player.hand.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: ctx.player.hand,
          title: 'デッキの下に戻す手札を選択（好きな枚数）',
          optional: true,
          skipLabel: '選び終わる',
        });
        if (!picked) break;
        ctx.removeFromHand(picked);
        toReturn.push(picked);
      }
      if (toReturn.length > 0) {
        // 好きな順でデッキの下に戻す
        const ordered = yield* ctx.orderCardsFlow(toReturn, 'デッキの下に戻す順番');
        ctx.deckToBottom(ordered);
        ctx.log(`${ctx.player.name}: 手札${ordered.length}枚をデッキの下に戻した`);
      }
      // 手札が5枚になるまで引く（既に5枚以上なら引かない）
      const need = 5 - ctx.player.hand.length;
      if (need > 0) ctx.draw(need);
    },
  },
};
