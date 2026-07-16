/**
 * 兎田ぺこら (hBP05-016) 白・2nd・HP210（#JP/#3期生/#ケモミミ）
 *
 * アーツ「ウーサペコラを崇めるぺこ」(120+ / 特攻 赤+50):
 *   このホロメンに重なっているホロメン1枚につき、サイコロを1回振れる:出た目の合計数1につき、このアーツ+10。
 *   → 「重なっているホロメン」= スタックのトップを除いた枚数（stack.length - 1）。
 *     その枚数ぶんサイコロを振れる（「振れる」=任意。1個ずつ振るか確認し、途中でやめられる）。
 *     出た目の合計1につきアーツ+10（addArtBonus）。
 *     ここで振った目の合計を、ギフト「最強女神」が参照できるよう sourceHolomem に一時保存する。
 *
 * ギフト「最強女神」(キーワード/ギフト):
 *   このホロメンがアーツを使った時、そのアーツでサイコロを振って出た目の合計数が奇数なら、
 *   自分のデッキを1枚引く。偶数なら、自分のデッキを2枚引く。
 *   → triggers.onArtsUse（アーツ解決後に発火）。
 *     「そのアーツでサイコロを振って出た目の合計数」= 直前のアーツ run で振った目の合計。
 *     このカードのアーツは上記1種のみで、そのアーツが run 内でサイコロを振るため、
 *     run が合計値を sourceHolomem に保存し、onArtsUse がそれを読んで奇数/偶数で1/2枚引く。
 *     合計0（＝重なりが無い等でサイコロを1個も振らなかった場合）は偶数として扱い2枚引く。
 *
 * 保留: なし
 */
export default {
  number: 'hBP05-016',

  // ギフト「最強女神」: アーツを使った時、そのアーツのサイコロ合計が奇数=1枚, 偶数=2枚ドロー
  triggers: {
    *onArtsUse(ctx) {
      const h = ctx.sourceHolomem;
      if (!h) return;
      // 直前のアーツ run が記録したサイコロの合計（未記録＝サイコロを振らないアーツなら 0 扱い）
      const sum = h._saikyoMegamiDiceSum || 0;
      delete h._saikyoMegamiDiceSum; // 1回のアーツぶんで消費する
      if (sum % 2 === 1) {
        ctx.log('ギフト「最強女神」: サイコロの合計が奇数 → 1枚ドロー');
        ctx.draw(1);
      } else {
        ctx.log('ギフト「最強女神」: サイコロの合計が偶数 → 2枚ドロー');
        ctx.draw(2);
      }
    },
  },

  arts: {
    'ウーサペコラを崇めるぺこ': {
      *run(ctx) {
        const h = ctx.sourceHolomem;
        // 重なっているホロメン = スタックのトップを除いた枚数
        const stacked = Math.max(0, (h?.stack.length || 1) - 1);
        let sum = 0;
        for (let i = 0; i < stacked; i++) {
          const ok = yield ctx.confirm(
            `サイコロを振りますか？（残り${stacked - i}回振れる）`, '振る', '振らない');
          if (!ok) break;
          const v = (yield* ctx.rollDice());
          // 〈兎田ぺこら〉の能力でサイコロを振った（hBP03-023「カードするぺこ」の判定用共有フラグ）
          ctx.markOncePerTurn('兎田ぺこら:diceRolled');
          sum += v;
        }
        // 出た目の合計1につき、このアーツ+10
        if (sum > 0) ctx.addArtBonus(sum * 10, `サイコロの合計${sum}`);
        // ギフト「最強女神」が参照するため、振った目の合計を保存
        if (h) h._saikyoMegamiDiceSum = sum;
      },
    },
  },
};
