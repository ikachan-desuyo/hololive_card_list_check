/**
 * 猫又おかゆ (hBP07-057) 青・2nd・HP200（#JP #ゲーマーズ #ケモミミ）
 * コラボエフェクト「君と遊ぶとドキドキしちゃう…」:
 *   相手のホロメン1人に特殊ダメージ30を与える。
 * アーツ「おりゃー！！油断したでしょ～」(100, 特攻:赤+50):
 *   自分の推しホロメンが〈猫又おかゆ〉で、相手のHPが100以上減っているバックホロメンがいるなら、
 *   相手のホロメン1人に特殊ダメージ50を与える。
 *   → アーツの通常ダメージ後の追加効果として arts.run で処理する。
 */
export default {
  number: 'hBP07-057',
  collabEffect: {
    name: '君と遊ぶとドキドキしちゃう…',
    *run(ctx) {
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        title: '特殊ダメージ30を与える相手ホロメンを選択',
      });
      if (target) yield* ctx.dealSpecialDamage(target, 30);
    },
  },
  arts: {
    'おりゃー！！油断したでしょ～': {
      *run(ctx) {
        // 条件: 自分の推しホロメンが〈猫又おかゆ〉
        if (ctx.player.oshi?.name !== '猫又おかゆ') return;
        // 条件: 相手のHPが100以上減っているバックホロメンがいる
        const hasDamagedBack = ctx.holomems('opp', (e) =>
          e.pos.zone === 'back' && e.holomem.damage >= 100).length > 0;
        if (!hasDamagedBack) return;
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          title: '特殊ダメージ50を与える相手ホロメンを選択',
        });
        if (target) yield* ctx.dealSpecialDamage(target, 50);
      },
    },
  },
};
