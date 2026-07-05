/**
 * 星街すいせい (hBP01-079) 青・1st・HP120（#JP #0期生 #歌）
 * ブルームエフェクト「あっと驚かせるから見逃さないでね！」:
 *   相手のバックホロメン1人に特殊ダメージ20を与える（ダウンしても相手のライフは減らない）。
 * アーツ「すいちゃんはーー今日もかわいいーー！！」(50): テキスト効果なし。
 */
export default {
  number: 'hBP01-079',
  bloomEffect: {
    name: 'あっと驚かせるから見逃さないでね！',
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'back',
        title: '特殊ダメージ20を与える相手のバックホロメンを選択',
      });
      if (target) yield* ctx.dealSpecialDamage(target, 20, { noLifeOnDown: true });
    },
  },
};
