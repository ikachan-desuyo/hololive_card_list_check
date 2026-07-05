/**
 * 小鳥遊キアラ (hYS01-003) 推しホロメン・赤
 *
 * 推しスキル「レッドバトン」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の赤コラボホロメンのアーツ+20。
 *   → oshiSkill（能動）。コラボポジションのホロメンが赤なら、このターンの間そのホロメンのアーツ+20。
 *     コラボが不在、または赤でない場合は何もしない（テキスト「赤コラボホロメンの」）。
 *     ※コスト[ホロパワー：-2]と「ターンに1回」はエンジンが処理するため run には書かない。
 *     ※対象はこの時点のコラボホロメン1人を参照で固定する（同名指定でなく位置＋色指定のため）。
 *
 * SP推しスキル「さあ！もう一度！」[ホロパワー：-1][ゲームに1回]:
 *   自分のアーカイブの赤ホロメン1枚を手札に戻す。
 *   → spOshiSkill（能動）。アーカイブの赤ホロメンカードを1枚選んで手札に戻す。
 *     対象が無ければ何もしない。
 *     ※コスト[ホロパワー：-1]と「ゲームに1回」はエンジンが処理するため run には書かない。
 *
 * 保留: なし
 */
const isRedHolomem = (c) => c.kind === 'holomen' && c.color === '赤';

export default {
  number: 'hYS01-003',

  oshiSkill: {
    name: 'レッドバトン',
    canUse(engine, ownerIdx) {
      // コラボポジションに赤ホロメンがいる時のみ意味がある
      const p = engine.state.players[ownerIdx];
      const collab = p.collab;
      return !!collab && collab.stack[0].color === '赤';
    },
    *run(ctx) {
      const collab = ctx.player.collab;
      if (collab && collab.stack[0].color === '赤') {
        ctx.addTurnModifier({
          kind: 'artsPlus', amount: 20, ownerIdx: ctx.playerIdx,
          match: (h) => h === collab,
          description: `このターンの間、${collab.stack[0].name}（赤コラボ）のアーツ+20`,
        });
      }
    },
  },

  spOshiSkill: {
    name: 'さあ！もう一度！',
    canUse(engine, ownerIdx) {
      // アーカイブに赤ホロメンが1枚以上ある時のみ意味がある
      const p = engine.state.players[ownerIdx];
      return p.archive.some(isRedHolomem);
    },
    *run(ctx) {
      const reds = ctx.player.archive.filter(isRedHolomem);
      if (reds.length === 0) return;
      const picked = yield ctx.chooseCard({
        cards: reds,
        title: '手札に戻す赤ホロメンをアーカイブから選択',
      });
      if (picked) {
        ctx.removeFromArchive(picked);
        ctx.addToHand(picked);
      }
    },
  },
};
