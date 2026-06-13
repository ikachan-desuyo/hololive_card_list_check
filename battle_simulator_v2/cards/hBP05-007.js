/**
 * 不知火フレア (hBP05-007) 推しホロメン・黄 ライフ5
 *
 * 推しスキル「キミの力になりたいから」[ホロパワー：-2][ターンに1回]:
 *   自分のコラボポジションの[Debutホロメンか1stホロメンかSpotホロメン]と、
 *   バックホロメンの〈不知火フレア〉1人を交代させる。
 *   → oshiSkill。コラボがDebut/1st/Spotで、かつバックに〈不知火フレア〉がいる時のみ使える。
 *
 * SP推しスキル「みんなで盛り上がろう！」[ホロパワー：-2][ゲームに1回]:
 *   自分のステージのエール1～5枚を自分の〈不知火フレア〉1人に付け替えられる。その後、
 *   このターンの間、自分のセンターホロメンのエール1枚につき、自分のステージのホロメン全員のアーツ+10。
 *   → spOshiSkill。付け替えは「まで」相当（0枚可・最大5枚）。先に付け替え先〈不知火フレア〉を1人選び、
 *     ステージ上のエールを最大5枚そこへ移す。その後アーツ修正を積む（センターのエール枚数で動的計算）。
 *     ※「自分のステージのホロメン全員」=センター/コラボ/バック全員（match=自分側のステージ上ホロメン）。
 */

function isFrontDebut1stSpot(top) {
  return top.kind === 'holomen' &&
    (top.bloomLevel === 'Debut' || top.bloomLevel === '1st' || top.bloomLevel === 'Spot');
}

export default {
  number: 'hBP05-007',

  // 推しスキル: コラボ(Debut/1st/Spot)とバックの〈不知火フレア〉を交代
  oshiSkill: {
    name: 'キミの力になりたいから',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      if (!p.collab || !isFrontDebut1stSpot(p.collab.stack[0])) return false;
      return p.back.some((h) => h.stack[0].name === '不知火フレア');
    },
    *run(ctx) {
      const p = ctx.player;
      if (!p.collab || !isFrontDebut1stSpot(p.collab.stack[0])) return;
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.pos.zone === 'back' && e.top.name === '不知火フレア',
        title: 'コラボと交代させるバックの〈不知火フレア〉を選択',
      });
      if (!entry) return;
      const i = entry.pos.index;
      const c = p.collab;
      p.collab = p.back[i];
      p.back[i] = c;
      ctx.log(`${p.collab.stack[0].name} がコラボに移動（交代）`);
    },
  },

  // SP推しスキル: ステージのエール最大5枚を〈不知火フレア〉1人へ付け替え、その後アーツ修正
  spOshiSkill: {
    name: 'みんなで盛り上がろう！',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // 付け替え先〈不知火フレア〉がステージにいること（付け替え0枚でもアーツ修正は得られる）
      return [p.center, p.collab, ...p.back].some((h) => h && h.stack[0].name === '不知火フレア');
    },
    *run(ctx) {
      // 付け替え先〈不知火フレア〉を1人選ぶ
      const dest = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.name === '不知火フレア',
        title: 'エールの付け替え先〈不知火フレア〉を選択',
      });
      if (dest) {
        // ステージのエールを最大5枚、選んだ〈不知火フレア〉へ付け替える（0枚可）
        for (let moved = 0; moved < 5; moved++) {
          // 付け替え元候補（付け先以外に付いているエール）を列挙
          const sources = ctx.holomems('self', (e) => e.holomem !== dest.holomem && e.holomem.cheers.length > 0);
          const cheerOptions = [];
          for (const e of sources) {
            for (const cheer of e.holomem.cheers) cheerOptions.push({ cheer, from: e.holomem, fromName: e.top.name });
          }
          if (cheerOptions.length === 0) break;
          const picked = yield ctx.chooseCard({
            cards: cheerOptions.map((o) => o.cheer),
            title: `〈不知火フレア〉へ付け替えるエールを選択（${moved}/5枚目）`,
            optional: true,
            skipLabel: 'これ以上付け替えない',
          });
          if (!picked) break;
          const opt = cheerOptions.find((o) => o.cheer === picked);
          ctx.moveCheer(picked, opt.from, dest.holomem);
        }
      }
      // その後、このターンの間、自分のセンターのエール1枚につき自分のステージのホロメン全員のアーツ+10
      const ownIdx = ctx.playerIdx;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        ownerIdx: ownIdx,
        amount: (h, engine) => {
          const center = engine.state.players[ownIdx].center;
          const cnt = center ? center.cheers.length : 0;
          return cnt * 10;
        },
        // 自分側のステージ上ホロメン全員
        match: (h) => {
          const p = ctx.state.players[ownIdx];
          return h === p.center || h === p.collab || p.back.includes(h);
        },
        description: 'このターン、自分のセンターのエール1枚につき自分のステージのホロメン全員のアーツ+10',
      });
      ctx.log('みんなで盛り上がろう！: 自分のセンターのエール枚数×10、自分のステージのホロメン全員のアーツ+10');
    },
  },
};
