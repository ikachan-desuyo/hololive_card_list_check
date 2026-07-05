/**
 * 鷹嶺ルイ (hBP08-061) 紫・Debut・HP120（#JP #秘密結社holoX #トリ #お酒）
 * コラボエフェクト「秘密結社のおもてなし」:
 *   自分が後攻で最初のターンで、自分の推しホロメンが〈鷹嶺ルイ〉なら、
 *   相手は、自身のホロパワーの上から1枚を手札に加える。
 *   → 後攻初ターン＆推し名一致の時のみ。相手のホロパワー先頭を相手の手札へ移す（選択不要・強制）。
 * アーツ「holoX Coffeeをどうぞ」(any: 30): 追加効果なし（基礎ダメージのみ）。
 *
 * 保留: なし
 */
export default {
  number: 'hBP08-061',
  collabEffect: {
    name: '秘密結社のおもてなし',
    *run(ctx) {
      if (!ctx.isFirstTurnGoingSecond()) return;
      if (ctx.player.oshi?.name !== '鷹嶺ルイ') return;
      const opp = ctx.opponent;
      if (opp.holoPower.length === 0) {
        ctx.log(`${opp.name}: ホロパワーが無いため手札に加えられない`);
        return;
      }
      const card = opp.holoPower.shift();
      opp.hand.push(card);
      ctx.log(`${opp.name}: ホロパワーの上から1枚を手札に加えた`);
    },
  },
};
