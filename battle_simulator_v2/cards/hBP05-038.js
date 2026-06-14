/**
 * モココ・アビスガード (hBP05-038) 赤・1st・HP160（#EN #Advent #ケモミミ）
 *
 * ギフト「モココェ」:
 *   [コラボポジション限定]自分のSP推しスキル「BAU BAU!」を使った時、このターンの間、
 *   このホロメンのアーツ+70。自分のステージに2ndホロメンがいるなら、さらに、
 *   このターンの間、このホロメンのアーツ+50。
 *   → triggers.onOshiSkillUsed で実装。自分が推しスキルを使った時（ctx.oshiSkillInfo.sp かつ
 *     text に「BAU BAU!」を含む）、このホロメンがコラボ位置なら artsPlus +70、
 *     さらに自分のステージに2ndホロメンがいれば +50 のターン修正を付与する。
 *
 * アーツ「ノーーーーーーエ！」(30):
 *   このアーツは、自分のセンターホロメンが〈フワワ・アビスガード〉なら、
 *   エール1枚を必要とせずに使える。
 *   → このアーツの必要エールは[any]1個＝無色1。センターが〈フワワ・アビスガード〉のとき、
 *     自身対象の artsCostReduceAura で無色-1（実質コスト0）にして再現する。
 *     （このカードのアーツはこの1種のみのため self 限定オーラで厳密。
 *      ダメージは固定30で増減なし。）
 */
export default {
  number: 'hBP05-038',

  arts: {
    'ノーーーーーーエ！': {
      // dmg は固定30（増減なし）。コスト軽減のみ（artsCostReduceAura で表現）。
    },
  },

  // このカードのアーツ「ノーーーーーーエ！」(必要エール 無色1) は、
  // 自分のセンターホロメンが〈フワワ・アビスガード〉なら必要エール 無色-1（=0）。
  artsCostReduceAura(src, target, engine) {
    if (src !== target) return [];
    const owner = engine.state.players.find((p) => engine._stageHolomems(p).includes(src));
    if (!owner) return [];
    const center = owner.center;
    if (center && center.stack[0]?.name === 'フワワ・アビスガード') {
      return [{ color: '無色', amount: 1 }];
    }
    return [];
  },

  triggers: {
    // ギフト「モココェ」: SP推しスキル「BAU BAU!」を使った時、コラボ位置ならアーツ+70（+2ndがいれば更に+50）
    *onOshiSkillUsed(ctx) {
      const info = ctx.oshiSkillInfo;
      if (!info || !info.sp || !/BAU BAU[!！]/.test(info.text || '')) return;
      const self = ctx.sourceHolomem;
      if (ctx.sourceHolomemPos()?.zone !== 'collab') return; // [コラボポジション限定]
      ctx.addTurnModifier({
        kind: 'artsPlus', ownerIdx: ctx.playerIdx, amount: 70,
        match: (hm) => hm === self, description: 'モココェ: BAU BAU!使用でアーツ+70',
      });
      const has2nd = ctx.holomems('self', (e) => e.top.bloomLevel === '2nd').length > 0;
      if (has2nd) {
        ctx.addTurnModifier({
          kind: 'artsPlus', ownerIdx: ctx.playerIdx, amount: 50,
          match: (hm) => hm === self, description: 'モココェ: 2ndがいるのでさらにアーツ+50',
        });
      }
    },
  },
};
