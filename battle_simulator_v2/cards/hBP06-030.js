/**
 * 姫森ルーナ (hBP06-030) 緑・1st・HP180（#JP,#4期生,#ベイビー）
 * アーツ「届けたいのら！」(20):
 *   自分のアーカイブの〈ルーナイト〉1枚を自分の〈姫森ルーナ〉に付けられる。
 *   （付け先は「他の」指定が無いので、このホロメン自身も対象になりうる。
 *    ツール/マスコット上限・付け先ルールを尊重して _canAttachSupport で絞る。）
 *
 * 【未実装】ギフト「みんなへ感謝の気持ち」:
 *   [コラボポジション限定]相手のターンで、自分のセンターホロメンに付いている〈ルーナイト〉を
 *   アーカイブする時、アーカイブするかわりに自分のバックの〈姫森ルーナ〉に付け替えられる。
 *   → 装着カードのアーカイブ処理に割り込む「アーカイブ置換」機構が現状無いため保留
 *      （被ダメージ/アーカイブ割り込み系。エンジン側のフック追加が必要）。
 */
export default {
  number: 'hBP06-030',
  arts: {
    '届けたいのら！': {
      *run(ctx) {
        const knights = ctx.player.archive.filter((c) => c.name === 'ルーナイト');
        if (knights.length === 0) return;
        const picked = yield ctx.chooseCard({
          cards: knights,
          title: '付ける〈ルーナイト〉を選択（アーカイブ・任意）',
          optional: true,
          skipLabel: '付けない',
        });
        if (!picked) return;
        const targets = ctx.holomems('self', (e) =>
          e.top.name === '姫森ルーナ' && ctx.engine._canAttachSupport(e.holomem, picked));
        if (targets.length === 0) return;
        const dest = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.top.name === '姫森ルーナ' && ctx.engine._canAttachSupport(e.holomem, picked),
          title: '〈ルーナイト〉を付ける〈姫森ルーナ〉を選択',
        });
        if (!dest) return;
        ctx.removeFromArchive(picked);
        // アーカイブから付けるので「付けた時」トリガーも誘発させる
        yield* ctx.attachSupportWithTrigger(picked, dest.holomem);
      },
    },
  },
};
