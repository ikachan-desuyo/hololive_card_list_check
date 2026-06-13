/**
 * 兎田ぺこら (hBP03-023) 緑・1st・Buzzホロメン・HP230（#JP #3期生 #ケモミミ）
 *
 * コラボエフェクト「あんたたちぃ」:
 *   サイコロを1回振れる：偶数の時、自分のデッキからファン1枚を公開し手札に加える。そしてデッキをシャッフルする。
 *   ※「振れる」=任意。偶数(2/4/6)のみ効果。奇数は何も起きない。
 *
 * アーツ「カードするぺこ」(80+):
 *   このターンに自分の〈兎田ぺこら〉の能力でサイコロを1回以上振っていた時、このアーツ+40。
 *   ※「〈兎田ぺこら〉の能力でサイコロを振った」をターン中フラグで判定する。
 *     このカードのコラボエフェクトで振った場合に DICE_FLAG をマークし、
 *     dmgBonus でそのフラグの有無を見る（ownerIdx=自分にスコープされる）。
 *     他の〈兎田ぺこら〉カードがサイコロを振る能力を実装する際は、同じキーで
 *     ctx.markOncePerTurn(DICE_FLAG) を呼べばこのアーツの判定に乗る。
 */

// このターンに〈兎田ぺこら〉がサイコロを振ったことを示す共有ターンフラグのキー
const DICE_FLAG = '兎田ぺこら:diceRolled';

export default {
  number: 'hBP03-023',
  collabEffect: {
    name: 'あんたたちぃ',
    *run(ctx) {
      const ok = yield ctx.confirm('サイコロを1回振りますか？（偶数: デッキからファン1枚を手札へ）', '振る', '振らない');
      if (!ok) return;
      const v = ctx.rollDice();
      // 〈兎田ぺこら〉の能力でサイコロを振った（アーツ「カードするぺこ」の判定用フラグ）
      ctx.markOncePerTurn(DICE_FLAG);
      // 偶数(2/4/6)の時のみ効果
      if (v % 2 === 0) {
        const fans = ctx.deckCards((c) => c.kind === 'support' && c.supportType === 'ファン');
        if (fans.length === 0) {
          ctx.log('デッキにファンが無いため手札に加えられなかった');
        } else {
          const picked = yield ctx.chooseCard({ cards: fans, title: '手札に加えるファンを選択' });
          if (picked) {
            ctx.removeFromDeck(picked);
            ctx.addToHand(picked, { reveal: true });
          }
        }
        ctx.shuffleDeck();
      }
    },
  },
  arts: {
    'カードするぺこ': {
      dmgBonus(ctx) {
        // このターンに〈兎田ぺこら〉の能力でサイコロを振っていたなら +40
        return ctx.oncePerTurnUsed(DICE_FLAG) ? 40 : 0;
      },
    },
  },
};
