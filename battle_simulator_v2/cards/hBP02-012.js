/**
 * 白上フブキ 1st (hBP02-012) 白・1st・HP100（#JP #1期生 #ゲーマーズ #ケモミミ #絵）
 *
 * ブルームエフェクト「ちょっと動かしますね」:
 *   自分のステージのマスコット1枚を、自分のホロメンに付け替えられる。
 *   解釈: 自分のステージのホロメンに付いているマスコット1枚を選び（任意）、
 *         別の付け先（マスコット未装着のホロメン）に移し替える。元の付け先から外して
 *         新しい付け先に付ける。「まで」表現ではなく「付け替えられる」=任意。
 *
 * アーツ「力をかしてくださいね」(50+):
 *   このターンの間、自分のマスコットが付いている[センターホロメンとコラボホロメン]のアーツ+20。
 *   解釈: ターン中、センター/コラボにいて、かつマスコットが付いているホロメンのアーツ+20
 *         （addTurnModifier で動的判定。位置・装着状態は毎回 match で評価される）。
 */
export default {
  number: 'hBP02-012',
  bloomEffect: {
    name: 'ちょっと動かしますね',
    *run(ctx) {
      // 自分のステージでマスコットが付いているホロメンを集める
      const sources = ctx.holomems('self', (e) =>
        e.holomem.attachments.some((a) => a.supportType === 'マスコット'));
      if (sources.length === 0) {
        ctx.log('ステージにマスコットが付いていない');
        return;
      }
      // 付いているマスコット候補一覧（どのホロメンに付いているかを保持）
      const mascots = [];
      for (const e of sources) {
        for (const a of e.holomem.attachments) {
          if (a.supportType === 'マスコット') mascots.push({ card: a, from: e.holomem });
        }
      }
      const picked = yield ctx.chooseCard({
        cards: mascots.map((m) => m.card),
        title: '付け替えるマスコットを選択',
        optional: true,
      });
      if (!picked) return;
      const entry = mascots.find((m) => m.card === picked);
      const from = entry.from;
      // 付け替え先（マスコット未装着のホロメン。元の付け先と同じでも意味が無いので除外）
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.holomem !== from
          && !e.holomem.attachments.some((a) => a.supportType === 'マスコット'),
        title: `${picked.name} を付け替えるホロメンを選択`,
        optional: true,
      });
      if (!target) return;
      // 元の付け先から外す
      const idx = from.attachments.indexOf(picked);
      if (idx !== -1) from.attachments.splice(idx, 1);
      // 新しい付け先へ
      ctx.attachSupport(picked, target.holomem);
    },
  },
  arts: {
    '力をかしてくださいね': {
      *run(ctx) {
        ctx.addTurnModifier({
          kind: 'artsPlus',
          amount: 20,
          ownerIdx: ctx.playerIdx,
          match: (h) => {
            const zone = ctx.engine._zoneOf(h);
            if (zone !== 'center' && zone !== 'collab') return false;
            return h.attachments.some((a) => a.supportType === 'マスコット');
          },
          description: 'このターン、マスコット付きのセンター/コラボホロメンのアーツ+20',
        });
      },
    },
  },
};
