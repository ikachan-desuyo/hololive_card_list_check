/**
 * 不知火フレア (hBP08-088) 黄・2nd・HP200（#JP #3期生 #ハーフエルフ）
 *
 * [ギフト/キーワード]「メロゥ・フラワリー」:
 *   [ターンに1回]自分のターンで、このホロメンがコラボポジションに移動した時、
 *   相手のセンターホロメンとコラボホロメンに特殊ダメージ20を与える。
 *   → コラボ移動は自分のターン中のメインアクションでのみ起こる（8.4.3）ため、
 *     collabEffect フックが「自分のターンでコラボポジションに移動した時」とちょうど一致する。
 *     [ターンに1回] 制限を ctx.oncePerTurnUsed/markOncePerTurn で表現する（同一ターン内に
 *     一度コラボから外れて再度コラボした場合などに二重発火しないよう安全側）。
 *     相手のセンターとコラボの両方（存在する方）に各20の特殊ダメージ。記載が無いので
 *     ダウンしてもライフは通常どおり減る（noLifeOnDown は指定しない）。
 *
 * [アーツ]「リレーションファンタジー」(140+ / yellow,yellow,any、特攻 白+50):
 *   [コラボポジション限定]自分のセンターホロメンが#3期生を持つホロメンなら、このアーツ+30。
 *   → [コラボポジション限定]は+30の効果テキスト行に係る表記（アーツ自体はどこからでも使える。
 *     hBP08-081 / hBP05-012 等の同型カードと同じ扱い）。
 *     +30 は dmgBonus で、コラボポジションにいて、かつコントローラーのセンターの
 *     スタック上面が #3期生 タグを持つ時のみ加算。
 *     特攻（白+50）はカードデータからエンジンが自動適用するためここでは扱わない。
 *
 * 保留: なし
 */
export default {
  number: 'hBP08-088',

  collabEffect: {
    name: 'メロゥ・フラワリー',
    *run(ctx) {
      const key = 'hBP08-088_mellow_flowery';
      if (ctx.oncePerTurnUsed(key)) return;
      // 相手のセンターとコラボに特殊ダメージ20
      const targets = ctx.holomems('opp', (e) => e.pos.zone === 'center' || e.pos.zone === 'collab');
      if (targets.length === 0) return;
      ctx.markOncePerTurn(key);
      for (const entry of targets) {
        yield* ctx.dealSpecialDamage(entry, 20);
      }
    },
  },

  arts: {
    'リレーションファンタジー': {
      dmgBonus(ctx) {
        // [コラボポジション限定]（+30の効果行にのみ係る。アーツ自体はどこからでも使える）
        if (ctx.engine._zoneOf(ctx.sourceHolomem) !== 'collab') return 0;
        // 自分のセンターホロメンが#3期生を持つホロメンなら +30
        const center = ctx.player.center;
        return center && ctx.hasTag(center.stack[0], '3期生') ? 30 : 0;
      },
    },
  },
};
