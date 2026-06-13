/**
 * ムーナ・ホシノヴァ (hBP01-088) 青・Debut・HP90（#ID #ID1期生 #歌）
 * アーツ「ムーン　ムーン　ムーナだよ！」(10):
 *   サイコロを１回振れる：偶数の時、相手のバックホロメン１人に特殊ダメージ20を与える
 *   （ダウンしても相手のライフは減らない）。
 *   → 「振れる」=任意。偶数なら相手のバック1人に noLifeOnDown 付き特殊ダメージ20。
 */
export default {
  number: 'hBP01-088',
  arts: {
    'ムーン　ムーン　ムーナだよ！': {
      *run(ctx) {
        const ok = yield ctx.confirm('サイコロを1回振りますか？');
        if (!ok) return;
        const value = (yield* ctx.rollDice());
        if (value % 2 !== 0) return; // 偶数の時のみ
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => e.pos.zone === 'back',
          title: '特殊ダメージ20を与える相手のバックホロメンを選択',
        });
        if (target) yield* ctx.dealSpecialDamage(target, 20, { noLifeOnDown: true });
      },
    },
  },
};
