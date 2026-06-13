/**
 * 七詩ムメイ（推しホロメン hBP01-002）
 *
 * SP推しスキル「アメイジング・ドローイング」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキから、イベント1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）として実装。デッキ内の card_type=サポート・イベント を1枚選び手札へ。
 *      （「公開し」=reveal、加えた後にデッキをシャッフル）
 *
 * ※推しスキル「文明の守護者」[ホロパワー：-2][ターンに1回]:
 *   相手のターンで、自分の#Promiseを持つホロメンが相手からダメージを受ける時に使える：
 *   そのホロメン1人が受けるダメージ-50。
 *   → 被ダメージ割り込み（受ける時に使えるタイミング割り込み・ダメージ-N置換）。
 *     エンジン側の被ダメージ割り込みが未対応のため未実装。
 */
export default {
  number: 'hBP01-002',
  spOshiSkill: {
    *run(ctx) {
      const events = ctx.deckCards((c) => c.kind === 'support' && c.supportType === 'イベント');
      if (events.length === 0) {
        ctx.log(`${ctx.player.name}: デッキにイベントが無い`);
        ctx.shuffleDeck();
        return;
      }
      const picked = yield ctx.chooseCard({
        cards: events,
        title: '手札に加えるイベントを選択',
      });
      if (picked) {
        ctx.removeFromDeck(picked);
        ctx.addToHand(picked, { reveal: true });
      }
      ctx.shuffleDeck();
    },
  },
};
