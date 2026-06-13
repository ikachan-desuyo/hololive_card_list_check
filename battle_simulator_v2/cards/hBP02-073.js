/**
 * 魔法少女マリン (hBP02-073) 無色・Spot・HP70（#ホロウィッチ #3期生 #魔法）
 *
 * コラボエフェクト「きらめくお宝、ロックオン！」:
 *   サイコロを1回振れる：偶数の時、自分のデッキから、ファン1枚を公開し、手札に加える。
 *   そしてデッキをシャッフルする。
 *   ※「振れる」=任意。偶数(2/4/6)のみ効果。奇数は何も起きない。
 *   ※ファンは support かつ supportType==='ファン' で識別（hBP03-023 等と同型）。
 *     デッキにファンが無くてもシャッフルは行う。
 *
 * アーツ「『海賊』の『ホロ』！」(20):
 *   追加のテキスト効果なし（基本ダメージ20のみ）。エンジンが処理するため定義不要。
 */
export default {
  number: 'hBP02-073',
  collabEffect: {
    name: 'きらめくお宝、ロックオン！',
    *run(ctx) {
      const ok = yield ctx.confirm('サイコロを1回振りますか？（偶数: デッキからファン1枚を手札へ）', '振る', '振らない');
      if (!ok) return;
      const v = (yield* ctx.rollDice());
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
};
