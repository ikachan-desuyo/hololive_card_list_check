/**
 * 一条莉々華 2nd (hBP04-037) 赤・HP200
 * ブルームエフェクト「KPG」:
 *   サイコロを1回振れる。4以上の時、相手のコラボホロメンがいないなら、
 *   相手は、自身のバックホロメン1人をコラボポジションに移動させる（移動はコラボとしては扱わない）。
 *   → rollDice（任意なので confirm で発動可否を確認）→ moveToCollabOwner（相手の決定ポイント）。
 * アーツ「お？　喧嘩する？」(80 / 赤無無 / 特攻 黄+50):
 *   相手のセンターホロメンに特殊ダメージ50を与える。
 *   その後、このターンに自分が〈限界飯〉を使っていた時、
 *   相手のセンターホロメンかコラボホロメンに特殊ダメージ30を与える（対象は自分が選ぶ）。
 *   ※基礎ダメージ80はエンジンが dmg フィールドで処理。run は追加の特殊ダメージのみ。
 */
export default {
  number: 'hBP04-037',
  bloomEffect: {
    name: 'KPG',
    *run(ctx) {
      // 「振れる」＝任意。発動するか確認する。
      const doRoll = yield ctx.confirm('サイコロを1回振りますか？（KPG）');
      if (!doRoll) return;
      const value = yield* ctx.rollDice();
      if (value < 4) return;
      if (ctx.opponent.collab) {
        ctx.log('相手のコラボホロメンがいるため発動しない');
        return;
      }
      const backs = ctx.holomems('opp', (e) => e.pos.zone === 'back');
      if (backs.length === 0) return;
      const entry = yield ctx.opponentChoosesHolomem({
        filter: (e) => e.pos.zone === 'back',
        title: 'コラボポジションに移動させるバックホロメンを選ぶ（KPG）',
      });
      if (entry) ctx.moveToCollabOwner(entry.holomem);
    },
  },
  arts: {
    'お？　喧嘩する？': {
      *run(ctx) {
        // 相手のセンターホロメンに特殊ダメージ50
        const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
        if (center) yield* ctx.dealSpecialDamage(center, 50);
        // その後、このターンに自分が〈限界飯〉を使っていた時、追加で特殊ダメージ30
        if (!ctx.usedSupportNamed('限界飯')) return;
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
          title: '特殊ダメージ30を与える相手ホロメンを選択（限界飯）',
        });
        if (target) yield* ctx.dealSpecialDamage(target, 30);
      },
    },
  },
};
