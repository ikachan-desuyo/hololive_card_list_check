/**
 * 兎田ぺこら (hYS01-002) 推しホロメン・緑 / ライフ5
 *
 * 推しスキル「グリーンバトン」[ホロパワー：-2][ターンに1回]:
 *   このターンの間、自分の緑コラボホロメンのアーツ+20。
 *   → oshiSkill（能動・対象選択なし）。「緑コラボホロメン」＝コラボポジションにいて
 *     かつ緑のホロメン。コラボは1人だけだが、Bloom等で実体が変わっても追従するよう
 *     match は「評価時にコラボ位置にいて緑か」を動的判定する（位置はターン中に変わりうるため）。
 *     コスト[ホロパワー：-2]と[ターンに1回]制限はエンジンが処理するため run には書かない。
 *
 * SP推しスキル「みんな頑張ろー！」[ホロパワー：-1][ゲームに1回]:
 *   自分の緑ホロメン全員のHP20回復。
 *   → spOshiSkill（能動・対象選択なし）。自分のステージの緑ホロメン全員をそれぞれ20回復する。
 *     コスト[ホロパワー：-1]と[ゲームに1回]制限はエンジンが処理するため run には書かない。
 *
 * 保留: なし（全効果実装済み）。
 */

const isGreen = (card) => card && card.color === '緑';

export default {
  number: 'hYS01-002',

  oshiSkill: {
    name: 'グリーンバトン',
    canUse(engine, ownerIdx) {
      // 自分の緑コラボホロメンがいる時のみ使う価値がある（コラボが緑なら使える）
      const p = engine.state.players[ownerIdx];
      return !!(p.collab && isGreen(p.collab.stack[0]));
    },
    *run(ctx) {
      const owner = ctx.playerIdx;
      const engine = ctx.engine;
      // 「緑コラボホロメン」＝コラボ位置にいて緑のホロメン（評価時に動的判定）
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 20,
        ownerIdx: owner,
        match: (h) => {
          const p = engine.state.players[owner];
          return p.collab === h && isGreen(h.stack[0]);
        },
        description: 'このターンの間、自分の緑コラボホロメンのアーツ+20',
      });
    },
  },

  spOshiSkill: {
    name: 'みんな頑張ろー！',
    canUse(engine, ownerIdx) {
      // 自分の緑ホロメンが1人以上いる時のみ
      const p = engine.state.players[ownerIdx];
      return engine._stageHolomems(p).some((h) => isGreen(h.stack[0]));
    },
    *run(ctx) {
      // 自分の緑ホロメン全員のHPを20回復（対象選択なし）
      for (const { holomem } of ctx.holomems('self', (e) => isGreen(e.top))) {
        ctx.heal(holomem, 20);
      }
    },
  },
};
