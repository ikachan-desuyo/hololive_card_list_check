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
 *   - 末尾の「相手のバックホロメンも対象にできる」は arts定義 extraTargetZones:['back'] で実装。
 */
export default {
  number: 'hBP01-081',
  collabEffect: {
    name: '空を駆ける光',
    *run(ctx) {
      // 送り先: 自分の青ホロメン（「送る」= 強制。青ホロメンがいなければ何もしない）
      const target = yield ctx.chooseHolomem({
        side: 'self',
        filter: (e) => ctx.engine._hasColor(e.holomem, '青'),
        title: 'エールデッキの上から1枚を送る青ホロメンを選択',
      });
      if (target) ctx.sendCheerFromCheerDeckTop(target.holomem);
    },
  },
  arts: {
    '輝く彗星': {
      // このアーツは相手のバックホロメンも対象にできる（対象拡張）
      extraTargetZones: ['back'],
      *run(ctx) {
        // コスト: このホロメンの青エール2枚をアーカイブできる
        const blueCheers = (ctx.sourceHolomem?.cheers || []).filter((c) => c.color === '青');
        if (blueCheers.length < 2) return; // コストを払えない
        const stacked = Math.max(0, (ctx.sourceHolomem.stack.length || 1) - 1);
        if (stacked === 0) return; // 重なっているホロメンがいなければボーナス0なので払う意味がない
        const ok = yield ctx.confirm(
          `青エール2枚をアーカイブしてこのアーツ+${stacked * 60}しますか？`);
        if (!ok) return;
        const picked = yield ctx.chooseCards({
          cards: blueCheers,
          count: 2,
          title: 'コスト: アーカイブする青エールを選択（2枚）',
        });
        if (picked.length < 2) return;
        for (const cheer of picked) {
          yield* ctx.archiveCheer(ctx.sourceHolomem, cheer);
        }
        // 重なっているホロメン1枚につき +60
        const recount = Math.max(0, (ctx.sourceHolomem.stack.length || 1) - 1);
        ctx.addArtBonus(recount * 60, '重なっているホロメン1枚につき+60');
      },
    },
  },
};
