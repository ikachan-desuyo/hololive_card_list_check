/**
 * ラプラス・ダークネス (hBP04-059) 紫・2nd・HP200（#JP #秘密結社holoX #シューター）
 *
 * ブルームエフェクト「Yes My Dark！」:
 *   自分の手札1枚をアーカイブすることで、サイコロを3回振れる：奇数が出た回数1回につき、自分のデッキを1枚引く。
 *   このブルームエフェクトはターンに1回しか使えない。
 *   ※「アーカイブすることで」=コスト。手札が1枚も無ければ発動不可。任意（振らない選択可）。
 *
 * アーツ「吾輩最強伝説」(120, 特攻 青+50):
 *   相手のセンターホロメンに、このターンに自分が能力でサイコロを振った回数1回につき、特殊ダメージ10を与える。
 *   ※基本ダメージ120はエンジンが処理。テキスト効果として、ターン中に自分が能力で振ったサイコロの回数 × 10 の
 *     特殊ダメージを相手センターへ与える。
 *
 * ダイス回数のカウント方法:
 *   ctx.rollDice() が振るたびに共通モディファイア（kind:'abilityDiceRoll'）を自動で積むため、
 *   ctx.abilityDiceCountThisTurn() で「このターンに自分が能力で振った回数」を取得する。
 *   このカード以外の能力（他のホロメンのコラボ/推しスキル等）で振ったぶんも含めて正しく数える。
 */
export default {
  number: 'hBP04-059',
  bloomEffect: {
    name: 'Yes My Dark！',
    *run(ctx) {
      // ターンに1回制限
      if (ctx.oncePerTurnUsed('hBP04-059:YesMyDark')) {
        ctx.log('「Yes My Dark！」はこのターン使用済み');
        return;
      }
      // 手札が無ければアーカイブできない＝発動不可
      if (ctx.player.hand.length === 0) {
        ctx.log('手札が無いため「Yes My Dark！」を発動できない');
        return;
      }
      const ok = yield ctx.confirm('「Yes My Dark！」を発動しますか？（手札1枚をアーカイブ→サイコロ3回）', '発動する', '発動しない');
      if (!ok) return;

      // コスト: 手札1枚をアーカイブ
      const cost = yield ctx.chooseCard({ cards: ctx.player.hand, title: 'アーカイブする手札を1枚選択' });
      if (!cost) return;
      ctx.removeFromHand(cost);
      ctx.player.archive.push(cost);
      ctx.log(`${ctx.player.name}: ${cost.name} をアーカイブ（「Yes My Dark！」のコスト）`);
      ctx.markOncePerTurn('hBP04-059:YesMyDark');

      // サイコロを3回振る：奇数の回数ぶんドロー（rollDice が回数を共通カウントする）
      let odds = 0;
      for (let i = 0; i < 3; i++) {
        const v = yield* ctx.rollDice();
        if (v % 2 === 1) odds++;
      }
      if (odds > 0) ctx.draw(odds);
      else ctx.log('奇数が出なかったためドローなし');
    },
  },
  arts: {
    '吾輩最強伝説': {
      *run(ctx) {
        // このターンに自分が能力で振ったサイコロの回数 × 特殊ダメージ10 を相手センターへ
        const count = ctx.abilityDiceCountThisTurn();
        if (count <= 0) return;
        const center = ctx.holomems('opp', (e) => e.pos.zone === 'center')[0];
        if (center) {
          ctx.log(`「吾輩最強伝説」: 能力で振ったサイコロ${count}回ぶんの特殊ダメージ`);
          yield* ctx.dealSpecialDamage(center, count * 10);
        }
      },
    },
  },
};
