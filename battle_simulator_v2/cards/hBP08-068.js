/**
 * 一伊那尓栖 (hBP08-068) ホロメン・Debut・紫・HP140
 *
 * コラボエフェクト「きタコれ！」:
 *   自分が後攻で最初のターンなら、このターンの間、相手のステージのホロメン全員は、
 *   すべての色を持つホロメンとして扱う。
 *   → 条件は ctx.isFirstTurnGoingSecond()。継続効果は kind:'treatedAllColors' を
 *     相手ステージ全員に付与する（同名推し hBP08-006 と同じ機構）。
 *
 * アーツ「引きこもり娘は外出の夢を見た」(dmg 10 / 紫):
 *   相手の推しホロメンと異なる色を持つ相手のセンターホロメンとコラボホロメンに
 *   特殊ダメージ20を与える。
 *   → 基本ダメージ10は通常どおりアーツの対象へ（エンジンが処理）。
 *     run でアーツ追加効果として、相手の推し色と異なる色のセンター/コラボへ
 *     特殊ダメージ20を与える（条件一致の全員。選択不要）。
 *
 * コラボエフェクトの「すべての色を持つ扱い」: kind:'treatedAllColors' のターン修正を付与する。
 *   エンジンの特攻判定（engine._isTreatedAllColors）がこの修正を読み、対象を全色扱いにする。
 *   なお、本アーツ自身の対象判定（推し色と異なる色か）は相手ホロメンの静的 color で判定しており、
 *   「全色扱い」修正には依存しない。
 */
export default {
  number: 'hBP08-068',

  collabEffect: {
    name: 'きタコれ！',
    *run(ctx) {
      // 後攻で自分の最初のターンのみ
      if (!ctx.isFirstTurnGoingSecond()) return;
      const opps = ctx.holomems('opp');
      if (opps.length === 0) return;
      for (const e of opps) {
        // 特攻判定（engine._isTreatedAllColors）が読むターン修正
        ctx.addTurnModifier({
          kind: 'treatedAllColors',
          ownerIdx: ctx.playerIdx,
          match: (h) => h === e.holomem,
          description: `このターン、${e.top.name}（相手）はすべての色を持つホロメンとして扱う`,
        });
      }
    },
  },

  arts: {
    '引きこもり娘は外出の夢を見た': {
      *run(ctx) {
        const oshiColor = ctx.opponent.oshi?.color || null;
        // 相手のセンターとコラボのうち、推しと「異なる色」を持つホロメンが対象（条件一致の全員）
        const targets = ctx.holomems(
          'opp',
          (e) => (e.pos.zone === 'center' || e.pos.zone === 'collab')
            && (ctx.isAllColors(e.holomem) || e.top.color !== oshiColor), // 全色扱いも「異なる色」
        );
        for (const t of targets) {
          yield* ctx.dealSpecialDamage(t, 20);
        }
      },
    },
  },
};
