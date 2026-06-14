/**
 * 不知火フレア (hBP07-085) 黄・1st・HP170（#JP #3期生 #ハーフエルフ）
 *
 * [ギフト] 私のとっておき！:
 *   自分のターンで、このホロメンがコラボポジションに移動した時、自分のデッキの上から3枚を見る。
 *   その中から、〈不知火フレア〉1枚を公開し、手札に加える。そして残ったカードをアーカイブする。
 *   → コラボ移動時に発火する効果なので collabEffect として実装（エンジンはコラボ移動時に
 *     collabEffect を実行する。コラボ移動は常に自分のターン）。
 *
 * [アーツ] 元気いっぱいカラフルパフェ (20+):
 *   自分の推しホロメンが〈不知火フレア〉なら、自分の〈不知火フレア〉1人を選ぶ。
 *   このターンの間、選んだホロメンのエール1枚につき、選んだホロメンのアーツ+20。
 */
export default {
  number: 'hBP07-085',
  collabEffect: {
    name: '私のとっておき！',
    *run(ctx) {
      const seen = ctx.lookTopDeck(3);
      if (seen.length === 0) return;
      const flares = seen.filter((c) => c.name === '不知火フレア');
      if (flares.length > 0) {
        const picked = yield ctx.chooseCard({
          cards: flares,
          title: '手札に加える〈不知火フレア〉を選択',
          displayCards: seen.filter((c) => !flares.includes(c)),
        });
        if (picked) {
          ctx.addToHand(picked, { reveal: true });
        }
      }
      // 残った（手札に加えなかった）カードをアーカイブ
      const rest = ctx.player.revealed.filter((c) => seen.includes(c));
      for (const c of rest) {
        ctx._unreveal(c);
        ctx.player.archive.push(c);
      }
      ctx.recordDeckArchive(rest.length);
      if (rest.length > 0) ctx.log(`${ctx.player.name}: 残り${rest.length}枚をアーカイブした`);
    },
  },
  arts: {
    '元気いっぱいカラフルパフェ': {
      *run(ctx) {
        if (ctx.player.oshi?.name !== '不知火フレア') return;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.top.name === '不知火フレア',
          title: 'このターン エール1枚につきアーツ+20する〈不知火フレア〉を選択',
        });
        if (!target) return;
        const chosen = target.holomem;
        ctx.addTurnModifier({
          kind: 'artsPlus',
          amount: (h) => (h.cheers?.length || 0) * 20,
          ownerIdx: ctx.playerIdx,
          match: (h) => h === chosen,
          description: `このターン、${chosen.stack[0].name} のエール1枚につきアーツ+20`,
        });
      },
    },
  },
};
