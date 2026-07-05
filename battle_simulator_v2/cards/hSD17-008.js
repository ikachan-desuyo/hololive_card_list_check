/**
 * 星街すいせい (hSD17-008) ホロメン・1st
 *
 * キーワード「明日への歌」:
 *   相手のターンで、このホロメンがダウンした時、自分のデッキを1枚引く。
 *   → triggers.onDown で実装。ダウン処理中（アーカイブ前）に発火する (Q629)。
 *     「相手のターンで」= turnPlayer が自分でない時のみ。
 *   ※コンパイラは「ダウンした時」のトリガーを生成しないため手書きが必要（gift未実装だった）。
 *
 * アーツ「あなたの一番星」(10？ / テキスト効果):
 *   相手のバックホロメン1人に特殊ダメージ10を与える。
 */
export default {
  number: 'hSD17-008',
  triggers: {
    *onDown(ctx) {
      if (ctx.state.turnPlayer === ctx.playerIdx) return; // 「相手のターンで」限定
      ctx.draw(1);
      ctx.log('星街すいせい「明日への歌」: ダウン時にデッキを1枚引いた');
    },
  },
  arts: {
    'あなたの一番星': {
      *run(ctx) {
        const backs = ctx.holomems('opp', (e) => e.pos.zone === 'back');
        if (backs.length === 0) return;
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'back',
          title: '特殊ダメージ10を与える相手のバックホロメンを選択',
        });
        if (target) yield* ctx.dealSpecialDamage(target, 10);
      },
    },
  },
};
