/**
 * 白銀ノエル (hSD09-005) 白・Debut・HP100（#JP #3期生 #お酒 #サマー）
 * コラボエフェクト「3期生の海の家」:
 *   このターンの間、自分のステージの「異なるカード名の#3期生を持つホロメン」1人につき、
 *   自分のセンターポジションの2ndホロメンのアーツ+10。
 *   → コラボ効果解決時点の自分ステージから #3期生 を持つホロメンの「異なるカード名」数を数え、
 *     その数×10 を、センターの2ndホロメンに付与する artsPlus 修正として登録する。
 *     対象は match で「センターポジション かつ top の bloomLevel が 2nd」を動的判定。
 * アーツ「夏が来たぞー！」(20): テキスト効果なし（追加効果無し）。
 */
export default {
  number: 'hSD09-005',
  collabEffect: {
    name: '3期生の海の家',
    *run(ctx) {
      // 自分ステージの #3期生 を持つホロメンの「異なるカード名」数を数える
      const names = new Set();
      for (const { top } of ctx.holomems('self', (e) => ctx.hasTag(e.top, '3期生'))) {
        names.add(top.name);
      }
      const count = names.size;
      if (count === 0) return;
      const amount = count * 10;
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount,
        ownerIdx: ctx.playerIdx,
        // 対象: 自分のセンターポジションの 2nd ホロメン
        match: (h) => ctx.engine._zoneOf(h) === 'center' && h.stack[0]?.bloomLevel === '2nd',
        description: `このターン、センターの2ndホロメンのアーツ+${amount}（異なるカード名の#3期生 ${count}人）`,
      });
    },
  },
  arts: {
    '夏が来たぞー！': {
      // 追加効果なし（基礎ダメージのみ）
    },
  },
};
