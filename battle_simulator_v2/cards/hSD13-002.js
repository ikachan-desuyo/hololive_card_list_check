/**
 * ジジ・ムリン (hSD13-002) 推しホロメン・黄
 *
 * 推しスキル「Boat Goes Binted」[ホロパワー：-1][ターンに1回]:
 *   相手のセンターポジションとコラボポジションのホロメンを入れ替える。
 *   → oshiSkill（能動）。相手の center と collab を入れ替えるだけ。両方が居ないと
 *     「入れ替える」が成立しないため、両方存在する時のみ使用可。
 *     コスト[ホロパワー：-1]・[ターンに1回]はエンジンが処理するため run には書かない。
 *
 * SP推しスキル「自由奔放な『追跡者』」[ホロパワー：-3][ゲームに1回]:
 *   自分のデッキから、2ndホロメンの〈ジジ・ムリン〉2枚を公開し、ステージに出す。
 *   そしてデッキをシャッフルする。その後、自分のアーカイブのエールを自分のホロメン全員に
 *   1枚ずつ送る。
 *   → spOshiSkill（能動）。
 *     ① デッキから bloomLevel==='2nd' かつ name==='ジジ・ムリン' のホロメンを最大2枚、
 *        公開してステージ（バック）に出す（ステージ上限6まで）。
 *     ② デッキをシャッフル。
 *     ③ アーカイブのエールを、自分のステージ上の全ホロメンに1枚ずつ送る
 *        （「1枚ずつ」=各ホロメンに1枚。送るエールはアーカイブにある分だけ）。
 *     コスト[ホロパワー：-3]・[ゲームに1回]はエンジンが処理するため run には書かない。
 */
export default {
  number: 'hSD13-002',

  oshiSkill: {
    name: 'Boat Goes Binted',
    canUse(engine, ownerIdx) {
      const opp = engine.state.players[1 - ownerIdx];
      // センターとコラボの両方が居る時のみ「入れ替える」が成立する
      return !!opp.center && !!opp.collab;
    },
    *run(ctx) {
      const opp = ctx.opponent;
      if (!opp.center || !opp.collab) return;
      const tmp = opp.center;
      opp.center = opp.collab;
      opp.collab = tmp;
      ctx.log(`相手のセンターとコラボを入れ替えた（センター: ${opp.center.stack[0].name} / コラボ: ${opp.collab.stack[0].name}）`);
    },
  },

  spOshiSkill: {
    name: '自由奔放な『追跡者』',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // デッキに 2nd〈ジジ・ムリン〉が居て、ステージに空きがあること
      const has = p.deck.some(
        (c) => c.kind === 'holomen' && c.bloomLevel === '2nd' && c.name === 'ジジ・ムリン');
      return has && engine._stageCount(p) < 6;
    },
    *run(ctx) {
      // ① デッキから 2nd〈ジジ・ムリン〉を最大2枚公開してステージに出す
      let placed = 0;
      for (let i = 0; i < 2; i++) {
        if (ctx.engine._stageCount(ctx.player) >= 6) break; // ステージ上限
        const cand = ctx.deckCards(
          (c) => c.kind === 'holomen' && c.bloomLevel === '2nd' && c.name === 'ジジ・ムリン');
        if (cand.length === 0) break;
        // 同名・同レベルのため任意の1枚で良いが、選択肢を提示（残り1枚なら自動でもよい）
        const picked = cand.length === 1
          ? cand[0]
          : yield ctx.chooseCard({ cards: cand, title: 'ステージに出す 2nd〈ジジ・ムリン〉を選択' });
        if (!picked) break;
        ctx.removeFromDeck(picked);
        ctx.log(`${ctx.player.name}: ${picked.name}〔2nd〕を公開`);
        if (!ctx.putToBack(picked)) break;
        placed += 1;
      }

      // ② デッキをシャッフル
      ctx.shuffleDeck();

      // ③ アーカイブのエールを自分のホロメン全員に1枚ずつ送る
      const members = ctx.holomems('self');
      for (const e of members) {
        const cheers = ctx.player.archive.filter((c) => c.kind === 'cheer');
        if (cheers.length === 0) break; // アーカイブにエールが無ければ終了
        const cheer = cheers.length === 1
          ? cheers[0]
          : yield ctx.chooseCard({
            cards: cheers,
            title: `${e.top.name} に送るエールをアーカイブから選択`,
          });
        if (!cheer) continue;
        ctx.removeFromArchive(cheer);
        ctx.attachCheer(cheer, e.holomem);
      }
      void placed;
    },
  },
};
