/**
 * 時の支配者 -Promise- (hBP07-097) サポート・イベント・LIMITED
 *
 * [サポート効果] このカードは、自分のステージのホロメン全員が #Promise を持つホロメンでなければ使えない。
 *   自分のデッキから、#Promise を持つホロメン2枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   その後、自分のライフが相手より少ないなら、自分のステージのホロメン1人を選ぶ。
 *   このターンの間、選んだホロメンのアーツ+20。
 * LIMITED：ターンに1枚しか使えない（エンジン側で制御）。
 *
 * 実装メモ:
 *   - 「2枚を公開し、手札に加える」は固定枚数のサーチ（「まで」ではない）。
 *     候補が2枚未満ならある分だけ加える。
 *   - 「自分のライフが相手より少ないなら」= ライフ枚数の厳密比較（< ）。
 */
export default {
  number: 'hBP07-097',
  support: {
    canUse(ctx) {
      const all = ctx.holomems('self');
      // ステージにホロメンがいて、全員が #Promise を持つこと
      return all.length > 0 && all.every((e) => ctx.hasTag(e.top, 'Promise'));
    },
    *run(ctx) {
      // デッキから #Promise ホロメン2枚を公開して手札に加える（固定枚数。候補が尽きたら打ち切り）
      for (let i = 0; i < 2; i++) {
        const cand = ctx.deckCards((c) => c.kind === 'holomen' && ctx.hasTag(c, 'Promise'));
        if (cand.length === 0) break;
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: `手札に加える #Promise のホロメンを選択（${i + 1}/2）`,
        });
        if (!picked) break;
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();

      // その後、自分のライフが相手より少ないなら、ホロメン1人のアーツをこのターン+20
      if (ctx.player.life.length < ctx.opponent.life.length) {
        const target = yield ctx.chooseHolomem({
          side: 'self',
          title: 'このターン、アーツ+20するホロメンを選択',
        });
        if (target) {
          const chosen = target.holomem;
          ctx.addTurnModifier({
            kind: 'artsPlus', amount: 20, ownerIdx: ctx.playerIdx,
            match: (h) => h === chosen,
            description: `このターンの間、${chosen.stack[0].name} のアーツ+20`,
          });
        }
      }
    },
  },
};
