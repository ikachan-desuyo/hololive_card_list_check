/**
 * miComet (hBP05-040) ホロメン・1st・赤・HP150
 *
 * [コラボエフェクト] ビジネスフレンド:
 *   自分のライフが3以下なら、自分のこのターンにBloomしたセンターホロメンの
 *   〈さくらみこ〉か〈星街すいせい〉を、自分の手札のホロメンを使ってもう1回Bloomできる。
 *   → センターがこのターンにBloom済み（bloomedTurn===turn）で、かつトップ名が
 *      さくらみこ/星街すいせいのとき、手札のホロメンで「もう1回」Bloomできる。
 *      通常Bloomの判定（同名・レベル遷移・新HP>ダメージ 8.3.2-3）は満たす必要があるが、
 *      「このターンBloom済みは不可」の制限のみ迂回する。Bloom後はブルームエフェクトも誘発する。
 *
 * [アーツ] ビジネスパートナー（90 / any any any）:
 *   このホロメンのエール1枚を自分のバックホロメンに付け替えられる（任意）。
 *
 * 保留: なし。
 */

// 「もう1回Bloom」用の判定。_canBloom と同等だが「このターンBloom済みは不可」のみ無視する (8.3.2-3)。
function canReBloom(engine, h, card) {
  const top = h.stack[0];
  if (card.kind !== 'holomen') return false;
  if (h.faceDown) return false;
  if (top.bloomLevel === 'Spot') return false;
  if (top.name !== card.name) return false;          // 同名であること
  if ((card.hp || 0) <= h.damage) return false;      // 新HPがダメージより大きいこと
  if (card.bloomLevel === '1st') {
    return top.bloomLevel === 'Debut' || top.bloomLevel === '1st';
  }
  if (card.bloomLevel === '2nd') {
    return top.bloomLevel === '1st' || top.bloomLevel === '2nd';
  }
  return false;
}

export default {
  number: 'hBP05-040',

  collabEffect: {
    name: 'ビジネスフレンド',
    *run(ctx) {
      // 自分のライフが3以下
      if (ctx.player.life.length > 3) return;
      const center = ctx.player.center;
      if (!center) return;
      const centerTop = center.stack[0];
      // このターンにBloomしたセンターであること
      if (center.bloomedTurn !== ctx.state.turn) return;
      // 〈さくらみこ〉か〈星街すいせい〉
      if (centerTop.name !== 'さくらみこ' && centerTop.name !== '星街すいせい') return;

      // 手札のホロメンのうち、このセンターへ「もう1回Bloom」できるもの
      const candidates = ctx.player.hand.filter(
        (c) => canReBloom(ctx.engine, center, c));
      if (candidates.length === 0) return;

      const card = yield ctx.chooseCard({
        cards: candidates,
        title: `${centerTop.name} をもう1回Bloomするホロメンを選択`,
        optional: true,
        skipLabel: 'Bloomしない',
      });
      if (!card) return;

      ctx.removeFromHand(card);
      center.stack.unshift(card);
      center.bloomedTurn = ctx.state.turn;
      ctx.log(`${center.stack[1].name} → ${card.name}〔${card.bloomLevel}〕にもう1回Bloom（ビジネスフレンド）`);

      // ブルームエフェクト (13.3) を誘発
      const def = ctx.engine.registry.get(card.number)?.bloomEffect;
      if (def) {
        ctx.log(`《ブルームエフェクト》${def.name}`);
        yield* ctx.runBloomEffect(def, card, center);
      }
    },
  },

  arts: {
    'ビジネスパートナー': {
      *run(ctx) {
        const self = ctx.sourceHolomem;
        if (!self || self.cheers.length === 0) return;
        const backs = ctx.holomems('self', (e) => e.holomem !== self && e.pos.zone === 'back');
        if (backs.length === 0) return;
        const cheer = yield ctx.chooseCard({
          cards: self.cheers,
          title: '付け替えるエールを選択（任意）',
          optional: true,
          skipLabel: '付け替えない',
        });
        if (!cheer) return;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.holomem !== self && e.pos.zone === 'back',
          title: '付け替え先のバックホロメンを選択',
        });
        if (target) ctx.moveCheer(cheer, self, target.holomem);
      },
    },
  },
};
