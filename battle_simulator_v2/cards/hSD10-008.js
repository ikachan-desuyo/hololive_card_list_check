/**
 * 綺々羅々ヴィヴィ (hSD10-008) 紫・1st・HP130（#DEV_IS #FLOW #GLOW）
 * コラボエフェクト「FLOW GLOWのメイク担当」:
 *   相手の手札すべてを見る。その中にサポートカードがあるなら、自分のデッキを1枚引く。
 * アーツ「そこに愛はあるんや！」(30): 追加効果なし（dmgは盤面値、ここでは定義不要）。
 *
 * 注: 相手の手札を「見る」のは情報公開のみで、ゲーム状態に影響する処理は
 *     「サポートがあれば1枚引く」だけ。手札内容は ctx.opponent.hand から判定する。
 */
export default {
  number: 'hSD10-008',
  collabEffect: {
    name: 'FLOW GLOWのメイク担当',
    *run(ctx) {
      const hand = ctx.opponent.hand || [];
      ctx.log(`${ctx.player.name}: 相手の手札 ${hand.length} 枚を確認した`);
      const hasSupport = hand.some((c) => c.kind === 'support');
      if (hasSupport) {
        ctx.draw(1);
      }
    },
  },
};
