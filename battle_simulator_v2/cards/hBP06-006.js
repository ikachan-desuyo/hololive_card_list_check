/**
 * ムーナ・ホシノヴァ (hBP06-006) 推しホロメン・青
 *
 * 推しスキル「満月の輝き」[ホロパワー：-1][ターンに1回]:
 *   相手のホロメン1人に特殊ダメージを与えた時に使える：相手のセンターホロメンと
 *   コラボホロメンに特殊ダメージ20を与える。
 *   → onSpecialDamageDealtOshiSkill で実装。engine が dealSpecialDamage（相手への特殊ダメージ）時に
 *     コスト＋発動確認を提示。発動で相手のセンター/コラボへ特殊20。[ターン1回]なので、自身が与える
 *     特殊20による再発火は使用済みフラグで止まる。
 *
 * SP推しスキル「双月の斉唱」[ホロパワー：-2][ゲームに1回]:
 *   お互いのステージのエールが合計6枚以上あるなら、自分のエールデッキから、エール1～3枚を公開し、
 *   自分の#ID1期生を持つホロメンに割り振って送る。そしてエールデッキをシャッフルする。
 *   → メインステップの能動SP推しスキルとして実装。コストはエンジンが処理するので run では支払わない。
 *     「公開」はエールデッキの上から1枚ずつ公開（任意の山札からの選択ではない）→ sendCheerFromCheerDeckTop を使用。
 */
export default {
  number: 'hBP06-006',

  // 推しスキル「満月の輝き」[ターン1回]: 相手に特殊ダメージを与えた時、相手のセンター/コラボに特殊ダメージ20
  onSpecialDamageDealtOshiSkill: {
    cost: 1,
    title: '推しスキル「満月の輝き」: 相手のセンター/コラボに特殊ダメージ20を与えますか？',
    *run(ctx) {
      for (const entry of ctx.holomems('opp', (e) => e.pos.zone === 'center' || e.pos.zone === 'collab')) {
        yield* ctx.dealSpecialDamage(entry, 20);
      }
    },
  },

  spOshiSkill: {
    name: '双月の斉唱',
    canUse(engine, ownerIdx) {
      const state = engine.state;
      // お互いのステージのエール合計が6枚以上
      let total = 0;
      for (const p of state.players) {
        for (const pos of engine._stagePositions(p)) {
          const h = engine._holomemAt(p, pos);
          total += (h.cheers || []).length;
        }
      }
      if (total < 6) return false;
      // 自分の#ID1期生を持つホロメンがステージにいること（送り先が無いと効果が無い）
      const me = state.players[ownerIdx];
      const hasTarget = engine._stagePositions(me).some((pos) => {
        const h = engine._holomemAt(me, pos);
        return (h.stack[0].tags || []).includes('ID1期生');
      });
      if (!hasTarget) return false;
      // エールデッキにエールが残っていること
      return me.cheerDeck.length > 0;
    },
    *run(ctx) {
      // 最大送付枚数 = min(3, エールデッキ残数)
      const maxSend = Math.min(3, ctx.player.cheerDeck.length);
      for (let i = 0; i < maxSend; i++) {
        // 送り先候補（#ID1期生）
        const targets = ctx.holomems('self', (e) => ctx.hasTag(e.top, 'ID1期生'));
        if (targets.length === 0) break;
        if (ctx.player.cheerDeck.length === 0) break;
        // 「1～3枚」なので2枚目以降は中断可能（optional）。1枚目は最低1枚送るため必須。
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => ctx.hasTag(e.top, 'ID1期生'),
          title: `エールデッキの上から公開して送る #ID1期生 ホロメンを選択（${i + 1}/${maxSend}）`,
          optional: i > 0,
        });
        if (!target) break; // 中断（0～2枚で止めることも可能）
        ctx.sendCheerFromCheerDeckTop(target.holomem);
      }
      ctx.shuffleCheerDeck();
    },
  },
};
