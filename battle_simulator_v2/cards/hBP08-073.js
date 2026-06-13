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
 * 【保留: 「すべての色を持つホロメンとして扱う」消費側が未実装】
 *   選んだ相手ホロメンを全色扱いにする継続効果は、主に相手の被特攻判定
 *   （engine.js のダメージ計算 `if (tCard.color === tk.color)`）で意味を持つが、
 *   エンジンの色参照は装着カードの静的 color を直接読んでおり、「実効色」を差し込む
 *   フックがまだ無い。ここでは意図を残すため kind:'treatedAllColors' のターン修正を
 *   積むが、現状この修正を読む消費側コードは無く、実効果は発生しない（inert）。
 *   推しホロメン版 hBP08-006 と同じ機構。エンジンの特攻判定を実効色参照
 *   （modifiers の treatedAllColors を見る）に置き換えた時点で機能する。
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
        // 保留: この修正を読む消費側はまだ無い（inert）。意図の記録として付与する。
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
