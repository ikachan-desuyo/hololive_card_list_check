/**
 * アキ・ローゼンタール (hBP03-022) 緑・1st・Buzzホロメン・HP250（#1期生 #ハーフエルフ #お酒）
 *
 * アーツ「情熱のベリーダンサー」(50):
 *   自分の推しホロメンが〈アキ・ローゼンタール〉の時、自分のツールが付いているホロメン全員のHP10回復。
 *
 * ギフト「異国の世界の姿」:
 *   [センターポジション・コラボポジション限定]相手のパフォーマンスステップが開始する時に使える：
 *   このターンの間、自分のライフは相手の能力で減らない。
 *   → triggers.onPerformanceStepStart で実装。相手のパフォーマンス開始時（自分が非ターンプレイヤー）に
 *     turn 修正 kind:'lifeImmuneOpponentAbility' を自分(ownerIdx)に付与。ctx.reduceOpponentLife が
 *     この免疫を見てライフ減少をキャンセルする（「相手の能力でライフが減らない」）。
 */
export default {
  number: 'hBP03-022',
  triggers: {
    *onPerformanceStepStart(ctx) {
      if (ctx.state.turnPlayer === ctx.playerIdx) return; // 「相手の」パフォーマンスステップ
      const z = ctx.sourceHolomemPos()?.zone;
      if (z !== 'center' && z !== 'collab') return;       // [センター・コラボ限定]
      // 既に免疫が乗っているなら重複不要
      if (ctx.state.modifiers.some((m) => m.kind === 'lifeImmuneOpponentAbility' && m.ownerIdx === ctx.playerIdx)) return;
      ctx.addTurnModifier({
        kind: 'lifeImmuneOpponentAbility',
        ownerIdx: ctx.playerIdx,
        description: 'このターン、自分のライフは相手の能力で減らない',
      });
      ctx.log('アキ・ローゼンタール「異国の世界の姿」: このターン、自分のライフは相手の能力で減らない');
    },
  },
  arts: {
    '情熱のベリーダンサー': {
      *run(ctx) {
        const oshi = ctx.player.oshi;
        if (!oshi || oshi.name !== 'アキ・ローゼンタール') return;
        const targets = ctx.holomems('self', (e) =>
          e.holomem.attachments.some((a) => a.supportType === 'ツール'));
        for (const t of targets) {
          ctx.heal(t.holomem, 10);
        }
      },
    },
  },
};
