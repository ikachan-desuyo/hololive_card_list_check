/**
 * 角巻わため (hBP07-001) 推しホロメン・白
 *
 * 推しスキル「角ドリルしたろか？」[ホロパワー：-6][ターンに1回]:
 *   このターンの間、自分のステージの〈角巻わため〉全員のアーツ+100。
 *   → oshiSkill として実装（能動スキル）。
 *      addTurnModifier(kind:'artsPlus') で、名前が「角巻わため」のホロメンにのみ +100。
 *      コスト[ホロパワー：-6]はエンジン側が処理するため run 内では書かない。
 */
export default {
  number: 'hBP07-001',
  oshiSkill: {
    name: '角ドリルしたろか？',
    *run(ctx) {
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 100,
        ownerIdx: ctx.playerIdx,
        // 自分のステージの〈角巻わため〉全員（名前一致）
        match: (h) => h.stack[0]?.name === '角巻わため',
        description: 'このターンの間、自分のステージの〈角巻わため〉全員のアーツ+100',
      });
    },
  },
};
