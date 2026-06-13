/**
 * 星街すいせい (hBP01-081) 青・2nd・HP210（#JP #0期生 #歌）
 * コラボエフェクト「空を駆ける光」:
 *   自分のエールデッキの上から1枚を、自分の青ホロメンに送る。
 * アーツ「輝く彗星」(60+ / 青青青無 / 特攻 赤+50):
 *   このホロメンの青エール2枚をアーカイブできる：
 *   このホロメンに重なっているホロメン1枚につき、このアーツ+60。
 *   （このアーツは相手のバックホロメンも対象にできる）
 *
 * 実装メモ:
 *   - コスト「青エール2枚をアーカイブできる」を払うと、重なっているホロメン
 *     （スタックの一番上を除いた枚数）1枚につきアーツ+60。run でコストを払い addArtBonus。
 *   - 末尾の「相手のバックホロメンも対象にできる」（アーツの対象拡張）は未実装。
 *     これはアーツの対象選択機構の変更が必要で、現エンジンの保留機構に該当する。
 *     ダメージ計算（コスト/ボーナス）は通常通り処理される。
 */
export default {
  number: 'hBP01-081',
  collabEffect: {
    name: '空を駆ける光',
    *run(ctx) {
      // 送り先: 自分の青ホロメン
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => e.top.color === '青',
        title: 'エールデッキの上から1枚を送る青ホロメンを選択',
        optional: true,
      });
      if (target) ctx.sendCheerFromCheerDeckTop(target.holomem);
    },
  },
  arts: {
    '輝く彗星': {
      *run(ctx) {
        // コスト: このホロメンの青エール2枚をアーカイブできる
        const blueCheers = (ctx.sourceHolomem?.cheers || []).filter((c) => c.color === '青');
        if (blueCheers.length < 2) return; // コストを払えない
        const stacked = Math.max(0, (ctx.sourceHolomem.stack.length || 1) - 1);
        if (stacked === 0) return; // 重なっているホロメンがいなければボーナス0なので払う意味がない
        const ok = yield ctx.confirm(
          `青エール2枚をアーカイブしてこのアーツ+${stacked * 60}しますか？`);
        if (!ok) return;
        for (let i = 0; i < 2; i++) {
          const remaining = (ctx.sourceHolomem.cheers || []).filter((c) => c.color === '青');
          const cheer = yield ctx.chooseCard({
            cards: remaining,
            title: `コスト: アーカイブする青エールを選択（${i + 1}/2）`,
          });
          if (!cheer) return;
          yield* ctx.archiveCheer(ctx.sourceHolomem, cheer);
        }
        // 重なっているホロメン1枚につき +60
        const recount = Math.max(0, (ctx.sourceHolomem.stack.length || 1) - 1);
        ctx.addArtBonus(recount * 60, '重なっているホロメン1枚につき+60');
      },
    },
  },
};
