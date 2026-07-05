/**
 * 七詩ムメイ（推しホロメン hBP01-002）
 *
 * SP推しスキル「アメイジング・ドローイング」[ホロパワー：-2][ゲームに1回]:
 *   自分のデッキから、イベント1枚を公開し、手札に加える。そしてデッキをシャッフルする。
 *   → spOshiSkill（能動）として実装。デッキ内の card_type=サポート・イベント を1枚選び手札へ。
 *      （「公開し」=reveal、加えた後にデッキをシャッフル）
 *
 * 推しスキル「文明の守護者」[ホロパワー：-2][ターンに1回]:
 *   相手のターンで、自分の#Promiseを持つホロメンが相手からダメージを受ける時に使える：
 *   そのホロメン1人が受けるダメージ-50。
 *   → onDamageOshiSkill.reduce（被ダメージ割り込み・通常推しスキル=ターンに1回）で実装。
 *     相手ターンの被弾のみ engine が提示。#Promise を持つ受け手の時だけ使える。
 */
export default {
  number: 'hBP01-002',

  // 推しスキル「文明の守護者」: #Promiseホロメンが受けるダメージ-50（相手ターンの被弾時、ターンに1回）
  onDamageOshiSkill: {
    cost: 2,
    title: '推しスキル「文明の守護者」: 受けるダメージ-50しますか？',
    canUse(engine, defIdx, target) {
      return (target.stack[0].tags || []).includes('Promise');
    },
    reduce() { return 50; },
  },

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
