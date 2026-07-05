/**
 * 不知火フレア (hBP01-097) 無色・Spot・HP80（#JP #3期生 #ハーフエルフ）
 * コラボエフェクト「それは「愛と絆の物語」」:
 *   自分のセンターホロメンとお休みしていないバックホロメン1人を交代させる。
 * アーツ「フレア～扉の向こう側へ～」(20): テキスト効果なし（素のダメージのみ）。
 */
export default {
  number: 'hBP01-097',
  collabEffect: {
    name: 'それは「愛と絆の物語」',
    *run(ctx) {
      const p = ctx.player;
      // センターがいて、かつお休みしていないバックホロメンがいる場合のみ交代できる
      if (!p.center) return;
      const candidates = ctx.holomems('self', (e) => e.pos.zone === 'back' && !e.holomem.rested);
      if (candidates.length === 0) return;
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.pos.zone === 'back' && !e.holomem.rested,
        title: 'センターと交代させるバックホロメン（お休みしていない）を選択',
      });
      if (!entry) return;
      const i = entry.pos.index;
      const center = p.center;
      p.center = p.back[i];
      p.back[i] = center;
      ctx.log(`${p.center.stack[0].name} がセンターに移動（交代）`);
    },
  },
};
