/**
 * クロスインパクト (hBP07-095) サポート・イベント・LIMITED
 *
 * [サポート効果] このカードは、お互いのセンターホロメンが2ndホロメンでなければ使えない。
 *   → support.canUse で両者のセンターが 2nd Bloomレベルかを判定。
 *
 * お互いにサイコロを1回振る。
 *   自分の出た目の数が相手以上なら、このターンの間、自分のセンターホロメンのアーツ+100。
 *   自分の出た目の数が相手より小さいなら、自分のエールデッキの上から1枚を自分のホロメンに送る。
 *
 * LIMITED：ターンに1枚しか使えない（エンジン側でLIMITED制御）。
 */
import { rollDie } from '../core/rng.js';

export default {
  number: 'hBP07-095',
  support: {
    canUse(ctx) {
      const myCenter = ctx.player.center;
      const oppCenter = ctx.opponent.center;
      if (!myCenter || !oppCenter) return false;
      return myCenter.stack[0].bloomLevel === '2nd' && oppCenter.stack[0].bloomLevel === '2nd';
    },
    *run(ctx) {
      // 自分のサイコロ（diceFixed 等の自分側の継続効果を反映）
      const myRoll = (yield* ctx.rollDice());
      // 相手のサイコロ（相手側の能力ではないが、シード乱数で振る。継続効果の対象外）
      const oppRoll = rollDie(ctx.engine.rng);
      ctx.log(`🎲 相手のサイコロ: ${oppRoll}`);

      if (myRoll >= oppRoll) {
        // 自分の出た目が相手以上：自分のセンターホロメンのアーツ+100
        const center = ctx.player.center;
        if (center) {
          ctx.addTurnModifier({
            kind: 'artsPlus', amount: 100, ownerIdx: ctx.playerIdx,
            match: (h) => h === center,
            description: `このターンの間、${center.stack[0].name}（センター）のアーツ+100`,
          });
        }
      } else {
        // 自分の出た目が相手より小さい：エールデッキの上から1枚を自分のホロメンに送る
        if (ctx.player.cheerDeck.length === 0) return;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          title: 'エールデッキの上から1枚を送る自分のホロメンを選択',
        });
        if (target) ctx.sendCheerFromCheerDeckTop(target.holomem);
      }
    },
  },
};
