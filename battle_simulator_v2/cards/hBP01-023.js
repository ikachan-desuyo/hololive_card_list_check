/**
 * ときのそら (hBP01-023) 白・2nd・HP210（#JP #0期生 #歌）
 *
 * [コラボエフェクト] 私たちは前に向かって…！
 *   自分のデッキを2枚引く。
 *   → collabEffect で実装（draw(2)）。
 *
 * [アーツ] 止まらねえぞ (80) main:白/白/無, 特攻:赤+50
 *   サイコロを1回振れる：奇数の時、同じホロメンに、このアーツをもう1回使う
 *   （このアーツはそのホロメンがダウンするまで繰り返せる）。
 *   → arts.run + ターン修正 kind:'reArts' で実装。サイコロを振り（任意）奇数なら、このホロメンに
 *      再アーツ権を付与（engine がこのアーツの再使用アクションを提示）。再使用時に run が再度走り、
 *      また奇数なら再度付与＝「ダウンするまで繰り返せる」を再アーツの連鎖で表現する。
 *      各回のダメージ・特攻・トリガーは engine が個別のアーツインスタンスとして処理する。
 */
export default {
  number: 'hBP01-023',
  collabEffect: {
    name: '私たちは前に向かって…！',
    *run(ctx) {
      ctx.draw(2);
    },
  },
  arts: {
    '止まらねえぞ': {
      *run(ctx) {
        // サイコロを1回振れる（任意）：奇数なら同じホロメンにこのアーツをもう1回使える
        const ok = yield ctx.confirm('サイコロを振って奇数ならこのアーツをもう1回使う？');
        if (!ok) return;
        const v = yield* ctx.rollDice();
        if (v % 2 !== 1) { ctx.log('止まらねえぞ: 偶数のため繰り返さない'); return; }
        const self = ctx.sourceHolomem;
        ctx.addTurnModifier({
          kind: 'reArts', ownerIdx: ctx.playerIdx, used: false,
          match: (hm) => hm === self,
          description: '奇数のためこのアーツをもう1回使える',
        });
        ctx.log('止まらねえぞ: 奇数 → このアーツをもう1回使える');
      },
    },
  },
};
