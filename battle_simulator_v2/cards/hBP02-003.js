/**
 * 宝鐘マリン (hBP02-003) 推しホロメン・赤
 *
 * 推しスキル「Ahoy!」[ホロパワー：-3][ターンに1回]:
 *   自分のこのターンにBloomした#3期生を持つホロメン1人を、自分の手札のホロメンを使って
 *   もう1回Bloomさせる。
 *   → 「もう一度Bloom（特殊Bloom）」機構が必要。エンジン未対応（保留リスト）のため未実装。
 *      この推しスキルの主目的が再Bloomそのものであり、部分実装できる箇所が無いため見送る。
 *
 * SP推しスキル「出航～！」[ホロパワー：-2][ゲームに1回]:
 *   相手のセンターホロメンかコラボホロメンどちらかに、自分のセンターホロメンの〈宝鐘マリン〉に
 *   重なっているホロメン1枚につき、特殊ダメージ50を与える。
 *   → spOshiSkill（能動）として実装。
 *      ・自分のセンターが〈宝鐘マリン〉である時のみ意味がある（テキストの「センターホロメンの
 *        〈宝鐘マリン〉に重なっている」を厳密解釈し、センター名一致を条件にする）。
 *      ・「重なっているホロメン」= stack.slice(1)（Bloomで下に重なったホロメンカード）。
 *        その枚数 × 50 が特殊ダメージ量。0枚なら何も起きない。
 *      ・対象は相手のセンターかコラボのどちらか1人をプレイヤーが選ぶ。
 *      ・コスト[ホロパワー：-2]はエンジン側が処理するため run には書かない。
 */
export default {
  number: 'hBP02-003',
  spOshiSkill: {
    name: '出航～！',
    canUse(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      // 自分のセンターが〈宝鐘マリン〉で、重なっているホロメンが1枚以上あること
      if (!p.center || p.center.stack[0]?.name !== '宝鐘マリン') return false;
      if (p.center.stack.length <= 1) return false;
      // 相手にセンターかコラボのホロメンがいること
      const opp = engine.state.players[1 - ownerIdx];
      const hasTarget = !!opp.center ||
        engine._stageHolomems(opp).some((h) => engine._zoneOf(h) === 'collab');
      return hasTarget;
    },
    *run(ctx) {
      const center = ctx.player.center;
      if (!center || center.stack[0]?.name !== '宝鐘マリン') return;
      const stackedCount = center.stack.length - 1; // 重なっているホロメンの枚数
      if (stackedCount <= 0) return;
      const amount = stackedCount * 50;
      const targets = ctx.holomems('opp', (e) => e.pos.zone === 'center' || e.pos.zone === 'collab');
      if (targets.length === 0) return;
      const target = yield ctx.chooseHolomem({
        side: 'opp',
        filter: (e) => e.pos.zone === 'center' || e.pos.zone === 'collab',
        title: `特殊ダメージ${amount}を与える相手のセンターorコラボホロメンを選択`,
      });
      if (!target) return;
      yield* ctx.dealSpecialDamage(target, amount);
    },
  },
};
