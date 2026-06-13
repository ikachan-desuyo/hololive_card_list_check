/**
 * アキ・ローゼンタール (hBP03-022) 緑・1st・Buzzホロメン・HP250（#1期生 #ハーフエルフ #お酒）
 *
 * アーツ「情熱のベリーダンサー」(50):
 *   自分の推しホロメンが〈アキ・ローゼンタール〉の時、自分のツールが付いているホロメン全員のHP10回復。
 *
 * 【未実装】ギフト「異国の世界の姿」:
 *   [センターポジション・コラボポジション限定]相手のパフォーマンスステップが開始する時に使える：
 *   このターンの間、自分のライフは相手の能力で減らない。
 *   → 「ライフが相手の能力で減らない」割り込み機構（被ダメージ/ライフ減少の無効化）と
 *     「相手のパフォーマンスステップ開始時」トリガーが未対応のため保留。
 */
export default {
  number: 'hBP03-022',
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
