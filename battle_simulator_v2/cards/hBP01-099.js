/**
 * 宝鐘マリン (hBP01-099) 無色・Spot・HP70（#JP #3期生 #絵 #海）
 * コラボエフェクト「それは「エジンバラ城」」:
 *   サイコロを１回振れる：奇数の時、相手のセンターホロメンとバックホロメン１人を交代させる。
 * アーツ「マリン～扉の向こう側へ～」(10): テキスト効果なし（基本ダメージのみ）。
 */
export default {
  number: 'hBP01-099',
  collabEffect: {
    name: 'それは「エジンバラ城」',
    *run(ctx) {
      // 「サイコロを振れる」= 任意。振らない選択も可。
      const ok = yield ctx.confirm('サイコロを1回振りますか？（奇数なら相手のセンターとバックを交代）');
      if (!ok) return;
      const roll = (yield* ctx.rollDice());
      if (roll % 2 === 0) return; // 偶数: 何も起きない
      const opp = ctx.opponent;
      if (!opp.center || opp.back.length === 0) return;
      const entry = yield ctx.chooseHolomem({
        side: 'opp', filter: (e) => e.pos.zone === 'back',
        title: '相手のセンターと交代させるバックホロメンを選択',
      });
      if (!entry) return;
      const i = entry.pos.index;
      const c = opp.center;
      opp.center = opp.back[i];
      opp.back[i] = c;
      ctx.log(`${opp.center.stack[0].name} が相手のセンターに移動（交代）`);
    },
  },
};
