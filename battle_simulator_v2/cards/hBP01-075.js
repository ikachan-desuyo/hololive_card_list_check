/**
 * ハコス・ベールズ (hBP01-075)
 * コラボエフェクト「カオスシャッフル」:
 *   お互い、手札すべてを好きな順でデッキの下に戻す。
 *   次に、お互い、デッキに戻したカード1枚につき、それぞれのデッキを1枚引く。
 *   → 「好きな順で」= 各プレイヤーが自分の手札の戻し順を選ぶ（orderCardsFlow）。
 *     相手側の順序選択は相手プレイヤーが行う（相手所有の EffectContext を使う）。
 */
import { EffectContext } from '../core/effects/context.js';

export default {
  number: 'hBP01-075',
  collabEffect: {
    name: 'カオスシャッフル',
    *run(ctx) {
      // 自分→相手の順に処理（順序選択は各自が行う）
      const ctxes = [ctx, new EffectContext(ctx.engine, 1 - ctx.playerIdx, {})];
      const counts = [];
      for (const c of ctxes) {
        const p = c.player;
        const n = p.hand.length;
        counts.push(n);
        if (n > 1) {
          // 好きな順でデッキの下に戻す（戻し順は持ち主が選ぶ）
          const ordered = yield* c.orderCardsFlow(p.hand.slice(), 'デッキの下に戻す順番');
          p.hand = [];
          c.deckToBottom(ordered);
        } else {
          c.deckToBottom(p.hand);
          p.hand = [];
        }
        ctx.log(`${p.name}: 手札${n}枚をデッキの下に戻した`);
      }
      // 次に、戻した1枚につきそれぞれ1枚引く
      ctxes.forEach((c, i) => {
        if (counts[i] > 0) c.draw(counts[i]);
      });
    },
  },
};
