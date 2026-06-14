/**
 * 響咲リオナ (hBP06-002) 推しホロメン・白
 *
 * 推しスキル「やりたいように、私は私らしく」[ホロパワー：-2][ターンに1回]:
 *   自分のデッキの上から2枚をアーカイブする。その後、このターンの間、
 *   自分の#FLOW GLOWを持つ[センターホロメンとコラボホロメン]のアーツ+20。
 *   → メインステップの能動推しスキル。コストはエンジンが処理するので run では支払わない。
 *
 * SP推しスキル「生き抜いていくんです！」[ホロパワー：-1][ゲームに1回]:
 *   自分のデッキの枚数が5枚以下で、自分の#FLOW GLOWを持つホロメンが相手のセンターホロメンを
 *   ダウンさせた時に使える：相手のライフ-1。
 *   → 攻撃側の「ダメージを与えた時／ダウンさせた時」タイミング推しスキルなので
 *     onDamageDealtOshiSkills(sp:true) で実装。attackInfo.sourceHolomem(攻撃者)が #FLOW GLOW、
 *     attackInfo.downed に相手のセンターが含まれ、自分のデッキ5枚以下を条件に
 *     opponent.lifeDamage += 1（アーツ解決後の _checkTiming でライフ処理される）。
 */
const isFlowGlow = (ctx, top) => ctx.hasTag(top, 'FLOW') && ctx.hasTag(top, 'GLOW');
const cardIsFlowGlow = (top) => !!top && (top.tags || []).includes('FLOW') && (top.tags || []).includes('GLOW');

export default {
  number: 'hBP06-002',
  oshiSkill: {
    *run(ctx) {
      // デッキの上から2枚をアーカイブ
      const cards = ctx.lookTopDeck(2);
      for (const c of cards) {
        ctx._unreveal(c);
        ctx.player.archive.push(c);
        ctx.log(`デッキの上から ${c.name} をアーカイブ`);
      }
      // このターンの間、#FLOW GLOW のセンター/コラボのアーツ+20
      const ownerIdx = ctx.playerIdx;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 20,
        ownerIdx,
        match: (h) => {
          const top = h.stack[0];
          if (!top || !isFlowGlow(ctx, top)) return false;
          const zone = ctx.engine._zoneOf(h);
          return zone === 'center' || zone === 'collab';
        },
        description: 'このターン、#FLOW GLOW のセンター/コラボホロメンのアーツ+20',
      });
    },
  },

  // SP推しスキル「生き抜いていくんです！」: #FLOW GLOWのホロメンが相手のセンターをダウンさせた時、デッキ5枚以下なら相手のライフ-1
  onDamageDealtOshiSkills: [
    {
      sp: true,
      cost: 1,
      title: 'SP推しスキル「生き抜いていくんです！」: 相手のライフ-1しますか？',
      canUse(engine, ownerIdx, attackInfo) {
        const p = engine.state.players[ownerIdx];
        if (p.deck.length > 5) return false;                          // 自分のデッキ5枚以下
        if (!cardIsFlowGlow(attackInfo.sourceHolomem?.stack[0])) return false; // 攻撃者が#FLOW GLOW
        return (attackInfo.downed || []).some((t) => engine._zoneOf(t) === 'center'); // 相手センターをダウン
      },
      *run(ctx) {
        ctx.reduceOpponentLife(1); // 相手のライフ-1（免疫があれば減らない。_checkTiming でライフ処理）
        ctx.log('SP推しスキル「生き抜いていくんです！」: 相手のライフ-1');
      },
    },
  ],
};
