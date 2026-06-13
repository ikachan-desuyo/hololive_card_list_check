/**
 * 思い出のドーナツショップ (hBP08-092) サポート・イベント・LIMITED
 *
 * [サポート効果]
 *   ① 自分のデッキから、〈フワワ・アビスガード〉と〈モココ・アビスガード〉1枚ずつを公開し、手札に加える。
 *      そしてデッキをシャッフルする。
 *   ② その後、自分のライフが相手より少ないなら、相手のホロメン1人に特殊ダメージ20を与える。
 *   LIMITED：ターンに1枚しか使えない（LIMITED制御はエンジン側）。
 *
 * 実装メモ:
 *   - 「1枚ずつ」= 各カード名につき最大1枚（合計で同名2枚ではなく、別名のカードを各1枚）。
 *     〈フワワ・アビスガード〉と〈モココ・アビスガード〉を個別にサーチする。
 *     候補が無い名前はスキップ（デッキは非公開領域なので「見つからなかった」も許容）。
 *   - 「自分のライフが相手より少ないなら」= ライフ枚数の厳密比較（player.life.length < opponent.life.length）。
 *   - 特殊ダメージはジェネレータなので yield* で呼ぶ。「ライフは減らない」記載は無いので通常どおり。
 *
 * 保留: なし（全文実装）。
 */
const NAMES = ['フワワ・アビスガード', 'モココ・アビスガード'];

export default {
  number: 'hBP08-092',
  support: {
    *run(ctx) {
      // ① 〈フワワ・アビスガード〉と〈モココ・アビスガード〉を各1枚サーチして手札に加える
      for (const name of NAMES) {
        const cand = ctx.deckCards((c) => c.kind === 'holomen' && ctx.nameIs(c, name));
        if (cand.length === 0) {
          ctx.log(`デッキに〈${name}〉が見つからなかった`);
          continue;
        }
        const picked = yield ctx.chooseCard({
          cards: cand,
          title: `手札に加える〈${name}〉を選択`,
        });
        if (!picked) continue;
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();

      // ② 自分のライフが相手より少ないなら、相手のホロメン1人に特殊ダメージ20
      if (ctx.player.life.length < ctx.opponent.life.length) {
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          title: '特殊ダメージ20を与える相手ホロメンを選択',
        });
        if (target) yield* ctx.dealSpecialDamage(target, 20);
      } else {
        ctx.log('自分のライフが相手以上のため、特殊ダメージは発生しない');
      }
    },
  },
};
