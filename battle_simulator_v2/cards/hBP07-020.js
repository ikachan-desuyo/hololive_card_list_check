/**
 * ベスティア・ゼータ (hBP07-020) 白・2nd・HP200（#ID #ID3期生）
 * コラボエフェクト「Ya ya ya ya ya～!」:
 *   サイコロを1回振る。奇数なら、相手のセンターポジションの2ndホロメンの残りHPを100にする。
 *
 * 「残りHPを100にする」は通常ダメージでも回復でもなく、残りHPを直接100に設定する効果。
 * 残りHP = effectiveHp - damage なので、damage = effectiveHp - 100 に設定する。
 * （残りHPが既に100以下のときは現状維持。100より大きいときのみ実質ダメージとなる。
 *   残りHP100＞0 なのでこの効果単体でダウンすることはない。）
 * 対象は「相手のセンターポジション」かつ「2nd」のホロメンのみ。
 */
export default {
  number: 'hBP07-020',
  collabEffect: {
    name: 'Ya ya ya ya ya～!',
    *run(ctx) {
      const value = (yield* ctx.rollDice());
      if (value % 2 === 0) {
        ctx.log('偶数のため効果なし');
        return;
      }
      // 相手のセンターポジションの 2nd ホロメン
      const center = ctx.holomems('opp', (e) => e.pos.zone === 'center' && e.top.bloomLevel === '2nd')[0];
      if (!center) {
        ctx.log('対象（相手センターの2ndホロメン）がいないため効果なし');
        return;
      }
      const h = center.holomem;
      const maxHp = ctx.engine.effectiveHp(h);
      const newDamage = Math.max(0, maxHp - 100);
      h.damage = newDamage;
      ctx.log(`${center.top.name} の残りHPを100にする（累計ダメージ${h.damage}/${maxHp}）`);
    },
  },
  // アーツ「もっとパフォーマンスしたい！」は素点100＋特攻のみで追加効果なし（実装不要）。
};
