/**
 * 一伊那尓栖 (hBP08-073) ホロメン・紫・2nd・HP210
 *
 * コラボエフェクト「お行儀よくしてね？」:
 *   相手のステージのホロメン2人を選ぶ。このターンの間、選んだホロメンは、
 *   すべての色を持つホロメンとして扱う。
 *   → collabEffect。相手ホロメンを2人（重複なし）選ぶ。相手のステージにホロメンが
 *     2人未満なら、いる分だけ選ぶ（「2人を選ぶ」＝いるだけ。0人なら何も起きない）。
 *
 * アーツ「おやつのクッキー抜きだよ！」(90 / 特攻: 青+50): 効果テキスト無し（素点のみ）。
 *   特攻はエンジンのアーツ計算側で処理されるため、ここでの run 実装は不要。
 *
 * 「すべての色を持つホロメンとして扱う」: 選んだ相手ホロメンに kind:'treatedAllColors' の
 *   ターン修正を付与する。エンジンの特攻判定（engine._isTreatedAllColors）がこれを読み、
 *   対象を全色扱いにする（被特攻の色一致でどの特攻色とも一致する）。推しホロメン版 hBP08-006 と同じ機構。
 */
export default {
  number: 'hBP08-073',

  collabEffect: {
    name: 'お行儀よくしてね？',
    *run(ctx) {
      // 相手のステージのホロメンを2人（重複なし）選ぶ。いなければいる分だけ。
      const chosen = [];
      for (let i = 0; i < 2; i++) {
        if (ctx.holomems('opp', (e) => !chosen.includes(e.holomem)).length === 0) break;
        const target = yield ctx.chooseHolomem({
          side: 'opp',
          filter: (e) => !chosen.includes(e.holomem),
          title: `すべての色として扱う相手ホロメンを選ぶ（${i + 1}/2）`,
        });
        if (!target) break;
        chosen.push(target.holomem);
        // 特攻判定（engine._isTreatedAllColors）が読むターン修正
        ctx.addTurnModifier({
          kind: 'treatedAllColors',
          ownerIdx: ctx.playerIdx,
          match: (h) => h === target.holomem,
          description: `このターン、${target.top.name} はすべての色を持つホロメンとして扱う`,
        });
      }
    },
  },
};
