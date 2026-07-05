/**
 * 魔法少女シオン（hBP02-072）無色・Spot・HP70（#ホロウィッチ #2期生 #魔法）
 *
 * コラボエフェクト「眠れる神秘を我が物に！」:
 *   サイコロを1回振れる：偶数の時、自分のデッキから、イベント1枚を公開し、
 *   手札に加える。そしてデッキをシャッフルする。
 *   → 「振れる」＝任意。偶数（2/4/6）の時のみ、デッキのイベント(supportType==='イベント')を
 *      1枚選び公開して手札へ。その後デッキをシャッフル（偶数判定後の処理にのみシャッフルが含まれる）。
 *
 * アーツ「『魔女』の『ホロ』！」(20)：効果テキスト無し（ダメージのみ）。
 */
export default {
  number: 'hBP02-072',
  collabEffect: {
    name: '眠れる神秘を我が物に！',
    *run(ctx) {
      const roll = yield ctx.confirm('サイコロを1回振りますか？（偶数でデッキからイベント1枚を手札に加える）');
      if (!roll) return;
      const value = (yield* ctx.rollDice());
      if (value % 2 !== 0) return; // 偶数の時のみ
      const events = ctx.deckCards((c) => c.kind === 'support' && c.supportType === 'イベント');
      if (events.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: events,
          title: '手札に加えるイベントを選択',
        });
        if (picked) {
          ctx.removeFromDeck(picked);
          ctx.addToHand(picked, { reveal: true });
        }
      } else {
        ctx.log(`${ctx.player.name}: デッキにイベントが無い`);
      }
      ctx.shuffleDeck();
    },
  },
};
