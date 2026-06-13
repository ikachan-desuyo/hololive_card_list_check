/**
 * 猫又おかゆ (hSD03-001) 推しホロメン・青
 *
 * 推しスキル「ブルーマイク」[ホロパワー：2消費][ターンに1回]:
 *   このターンの間、自分の青センターホロメンのアーツ+20。
 *   → oshiSkill（能動）。「青センターホロメン」を動的に判定する artsPlus 修正を付与する。
 *     対象は「自分のセンター かつ 色が青」のホロメン。修正は match で毎回判定するため、
 *     センターが入れ替わっても常に「青センター」へ追従する（テキストどおりの解釈）。
 *     ※コスト[ホロパワー：2消費]はエンジン側が処理するため run には書かない。
 *
 * SP推しスキル「バックショット」[ホロパワー：1消費][ゲームに1回]:
 *   自分のステージのホロメンが相手のバックホロメンにダメージを与えた時に使える：
 *   その相手のバックホロメン1人に特殊ダメージ50を与える。
 *   → 【未実装・保留】これは「ダメージを与えた時に使える」タイミング割り込み型の
 *     SP推しスキル。現行エンジンには「自分のホロメンが相手のバックにダメージを与えた」
 *     瞬間に割り込んで推しスキルを起動させる仕組みが無いため保留する。
 *     能動起動型ではないので spOshiSkill としては実装しない。
 */
export default {
  number: 'hSD03-001',
  oshiSkill: {
    name: 'ブルーマイク',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // 青のセンターホロメンがいる時のみ意味がある
      return !!(p.center && p.center.stack[0].color === '青');
    },
    *run(ctx) {
      const engine = ctx.engine;
      const ownerIdx = ctx.playerIdx;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 20,
        ownerIdx,
        // 「自分の青センターホロメン」を動的に判定（センター入れ替えに追従）
        match: (h) => {
          const p = engine.state.players[ownerIdx];
          return p.center === h && h.stack[0].color === '青';
        },
        description: 'このターンの間、自分の青センターホロメンのアーツ+20',
      });
    },
  },
  // SP推しスキル「バックショット」は割り込みタイミング型のため未実装（上部JSDoc参照）。
};
