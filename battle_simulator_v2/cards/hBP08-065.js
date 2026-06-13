/**
 * 鷹嶺ルイ (hBP08-065) 紫・1st・HP180（#JP #秘密結社holoX #トリ #お酒）
 *
 * ブルームエフェクト「大穴きちゃーーー！」:
 *   [センターポジション限定] 自分の手札1枚をアーカイブできる:
 *     サイコロを1回振る。1なら、自分のデッキを3枚引く。1以外なら、自分のデッキを1枚引く。
 *   → bloomEffect。位置限定はエンジンで判定されないため sourceHolomemPos().zone === 'center' を自前で確認する。
 *     「アーカイブできる」=任意コスト。手札が無ければ発動不可。コストを払うか confirm で確認し、
 *     払う場合はアーカイブするカードを選ばせてから（yield* ctx.rollDice() で）サイコロを振り、
 *     出目が1なら3枚、それ以外なら1枚ドローする。
 *
 * アーツ「差していくよ！」(50+):
 *   自分の手札が2枚以下なら、このアーツ+30。
 *   → dmgBonus(ctx): コントローラーの手札枚数が2以下なら +30、それ以外0。
 *     基本値50はエンジンが素点処理する。
 *
 * 保留: なし（ブルームエフェクト・アーツとも全文実装）。
 */
export default {
  number: 'hBP08-065',

  bloomEffect: {
    name: '大穴きちゃーーー！',
    *run(ctx) {
      // [センターポジション限定]
      const pos = ctx.sourceHolomemPos();
      if (!pos || pos.zone !== 'center') {
        ctx.log('大穴きちゃーーー！: センターにいないため発動しない');
        return;
      }
      // 「手札1枚をアーカイブできる」=任意コスト。手札が無ければ発動不可。
      if (ctx.player.hand.length === 0) {
        ctx.log('大穴きちゃーーー！: 手札が無いため発動しない');
        return;
      }
      const card = yield ctx.chooseCard({
        cards: ctx.player.hand,
        title: 'アーカイブする手札を1枚選択（大穴きちゃーーー！）',
        optional: true,
        skipLabel: '発動しない',
      });
      if (!card) return;
      // コスト: 選んだ手札をアーカイブ
      ctx.removeFromHand(card);
      ctx.player.archive.push(card);
      ctx.log(`大穴きちゃーーー！: ${card.name} をアーカイブ`);
      // サイコロを1回振る
      const value = yield* ctx.rollDice();
      if (value === 1) {
        ctx.draw(3);
      } else {
        ctx.draw(1);
      }
    },
  },

  arts: {
    '差していくよ！': {
      // 自分の手札が2枚以下なら、このアーツ+30。
      dmgBonus(ctx) {
        return ctx.player.hand.length <= 2 ? 30 : 0;
      },
    },
  },
};
