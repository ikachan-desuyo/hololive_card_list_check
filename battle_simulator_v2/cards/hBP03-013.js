/**
 * 姫森ルーナ (hBP03-013) 白・1st・HP110（#JP #4期生 #ベイビー）
 *
 * [キーワード/ギフト]「んなたんと一緒に、宇宙に行くのら～！」:
 *   [コラボポジション限定]自分のファンが付いているセンターホロメンの〈姫森ルーナ〉のアーツ+20。
 *   → auraArtsPlus（常時アウラ）で実装。このルーナがコラボにいる間、ファンが付いたセンターの〈姫森ルーナ〉に+20。
 *
 * [アーツ]「ムーンギャラクシー」(20):
 *   自分のアーカイブの〈ルーナイト〉1枚を自分の〈姫森ルーナ〉に付けられる。
 *   → 実装済み。アーカイブの〈ルーナイト〉を、付け先ルールを満たす自分の〈姫森ルーナ〉に付ける（任意）。
 */
export default {
  number: 'hBP03-013',
  // キーワード: [コラボ限定]ファンが付いているセンターの〈姫森ルーナ〉のアーツ+20（常時アウラ）
  auraArtsPlus(src, holomem, engine) {
    if (engine._zoneOf(src) !== 'collab') return 0;            // [コラボ限定]（このルーナ）
    if (engine._zoneOf(holomem) !== 'center') return 0;        // センターの
    if (holomem.stack[0].name !== '姫森ルーナ') return 0;       // 〈姫森ルーナ〉
    if (!holomem.attachments.some((a) => a.supportType === 'ファン')) return 0; // ファンが付いている
    return 20;
  },
  arts: {
    'ムーンギャラクシー': {
      *run(ctx) {
        const lunaights = ctx.player.archive.filter((c) => c.name === 'ルーナイト');
        if (lunaights.length === 0) return;
        const picked = yield ctx.chooseCard({
          cards: lunaights,
          title: '付ける〈ルーナイト〉を選択（任意）',
          optional: true,
          skipLabel: '付けない',
        });
        if (!picked) return;
        // 付け先は自分の〈姫森ルーナ〉。付け先ルール（ファンの装着可否など）を尊重する。
        const cand = ctx.holomems('self', (e) =>
          e.top.name === '姫森ルーナ' && ctx.engine._canAttachSupport(e.holomem, picked));
        if (cand.length === 0) return;
        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => e.top.name === '姫森ルーナ' && ctx.engine._canAttachSupport(e.holomem, picked),
          title: '〈ルーナイト〉を付ける〈姫森ルーナ〉を選択',
        });
        if (!target) return;
        ctx.removeFromArchive(picked);
        // アーカイブから付けるので「付けた時」トリガーも誘発する
        yield* ctx.attachSupportWithTrigger(picked, target.holomem);
      },
    },
  },
};
