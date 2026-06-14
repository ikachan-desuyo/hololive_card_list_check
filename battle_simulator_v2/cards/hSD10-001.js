/**
 * 輪堂千速 (hSD10-001) 推しホロメン・緑
 *
 * 推しスキル「エンジン全開！レッツゴー！」[ホロパワー：-2][ターンに1回]:
 *   このターンに自分のホロメンがBloomしていたなら、このターンの間、
 *   自分のステージの#FLOW GLOWを持つホロメン1人のアーツ+30。
 *   → oshiSkill（能動）。「Bloomしていたなら」は h.bloomedTurn が現在ターンの
 *     ホロメンが自分のステージにいるかで判定（engine.state.turn が全体ターン番号、
 *     Bloom解決時に h.bloomedTurn = s.turn が設定される）。
 *     ※コスト[ホロパワー：-2]はエンジン側が処理するため run には書かない。
 *
 * SP推しスキル「向こう側の景色を見に行かない？」[ホロパワー：-2][ゲームに1回]:
 *   自分のエールデッキの上から1枚を自分のホロメンに送る。その後、自分の#FLOW GLOWを持つ
 *   ホロメン1人を選ぶ。このターンの間、選んだホロメンのエール1枚につき、選んだホロメンのアーツ+20。
 *   → spOshiSkill（能動）。エール送り先は「自分のホロメン」（タグ制限なし）。
 *     アーツ修正は「選んだホロメンのエール1枚につき」なので amount を動的関数
 *     (h)=>h.cheers.length*20 にして付与する（送ったエールも数に含まれる）。
 */
// #FLOW GLOW はタグが 'FLOW' と 'GLOW' に分割格納されるため両方を確認する
const isFlowGlow = (top) => !!top && (top.tags || []).includes('FLOW') && (top.tags || []).includes('GLOW');

export default {
  number: 'hSD10-001',
  oshiSkill: {
    name: 'エンジン全開！レッツゴー！',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // このターンにBloomしたホロメンがいる かつ #FLOW GLOW ホロメンが自分のステージにいる
      const bloomedThisTurn = engine._stageHolomems(p).some((h) => h.bloomedTurn === engine.state.turn);
      if (!bloomedThisTurn) return false;
      const hasFlowGlow = engine._stageHolomems(p).some((h) => isFlowGlow(h.stack[0]));
      return hasFlowGlow;
    },
    *run(ctx) {
      const p = ctx.player;
      const bloomedThisTurn = ctx.engine._stageHolomems(p).some((h) => h.bloomedTurn === ctx.state.turn);
      if (!bloomedThisTurn) return;
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => isFlowGlow(e.top),
        title: 'このターン アーツ+30する #FLOW GLOW ホロメンを選択',
      });
      if (!entry) return;
      const chosen = entry.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 30, ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターンの間、${chosen.stack[0].name} のアーツ+30`,
      });
    },
  },
  spOshiSkill: {
    name: '向こう側の景色を見に行かない？',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // エールを送る先（自分のホロメン）がいて、#FLOW GLOW ホロメンもいる必要がある
      if (engine._stageHolomems(p).length === 0) return false;
      return engine._stageHolomems(p).some((h) => isFlowGlow(h.stack[0]));
    },
    *run(ctx) {
      // エールデッキの上から1枚を自分のホロメンに送る
      const dest = yield ctx.chooseHolomem({
        side: 'self',
        title: 'エールデッキの上から1枚を送るホロメンを選択',
      });
      if (!dest) return;
      ctx.sendCheerFromCheerDeckTop(dest.holomem);
      // その後、#FLOW GLOW ホロメン1人を選ぶ
      const entry = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => isFlowGlow(e.top),
        title: 'エール1枚につきアーツ+20する #FLOW GLOW ホロメンを選択',
      });
      if (!entry) return;
      const chosen = entry.holomem;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: (h) => (h.cheers ? h.cheers.length * 20 : 0),
        ownerIdx: ctx.playerIdx,
        match: (h) => h === chosen,
        description: `このターンの間、${chosen.stack[0].name} のエール1枚につきアーツ+20`,
      });
    },
  },
};
