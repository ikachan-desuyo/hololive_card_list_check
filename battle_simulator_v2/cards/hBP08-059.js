/**
 * フワワ・アビスガード (hBP08-059) 青・ホロメン・2nd・HP210（#EN #Advent #ケモミミ）
 *
 * [キーワード:ギフト]「深淵からの愛情」:
 *   自分のステージに赤エールが6枚以上あるなら、このホロメンのアーツは、相手のDebut以外のバックホロメンも対象にできる。
 *   → 保留: これは「アーツの対象拡張」を常時（条件付き）行う受動ギフトだが、
 *     エンジンの対象生成（_performanceActions）が現状で消費するのは
 *     kind:'artTargetDamagedBack'（HP減バック拡張）のみで、
 *     「Debut以外のバックも対象にできる」種別を読む処理が無い。
 *     受動ギフトには run のフックも無く（ターン修正を能動的に積む契機が無い）、
 *     現状では実効する手段が無いため未実装とする（hBP08-018 と同様の保留）。
 *     エンジン側に「赤エール6枚以上なら相手のDebut以外バックも対象可」の判定を
 *     追加した時点で有効化すること。
 *
 * アーツ「ふわふわバウンダリースパナー」(80+ / 特攻[白+50]):
 *   このターンに自分の〈モココ・アビスガード〉がアーツを使っていたなら、このアーツ+50。
 *   その後、このホロメンの赤エールを好きな枚数選び、自分の〈モココ・アビスガード〉1人に付け替える。
 *   → dmgBonus(ctx): 自分の前列（センター/コラボ）に〈モココ・アビスガード〉がいて、
 *     その枠が今ターンのパフォーマンスステップでアーツ使用済み（ctx.state.perfUsed[zone]）なら +50。
 *     ※アーツは前列のみ使用可・1ステップに各枠1回なので perfUsed[zone] が今ターンの使用を表す。
 *       このアーツ解決時点で自分（フワワ）の枠は既に perfUsed=true だが、付け替え先=モココ≠フワワ
 *       かつ別枠なのでモココ枠の perfUsed のみを見れば誤検出しない。
 *   → run: ダメージ確定後（解決領域）に、このホロメンの赤エールを「好きな枚数」（0枚可）1枚ずつ選び、
 *     付け替え先の〈モココ・アビスガード〉1人（最初に1人選び、全てそこへ）に moveCheer する。
 *     付け替え先が居なければ付け替えできない（任意効果なので何もしないだけ）。
 *     基本ダメージ80・特攻[白+50] はエンジンが素点処理する。
 *
 * 保留: ギフト「深淵からの愛情」の対象拡張（上記）。アーツは全文実装。
 */
const MOCOCO = 'モココ・アビスガード';

export default {
  number: 'hBP08-059',

  arts: {
    'ふわふわバウンダリースパナー': {
      // このターンに自分の〈モココ・アビスガード〉がアーツを使っていたなら +50
      dmgBonus(ctx) {
        const usedMococo = ctx.holomems('self', (e) => ctx.nameIs(e.top, MOCOCO))
          .some((e) => (e.pos.zone === 'center' || e.pos.zone === 'collab')
            && ctx.state.perfUsed?.[e.pos.zone]);
        return usedMococo ? 50 : 0;
      },
      *run(ctx) {
        const self = ctx.sourceHolomem;
        if (!self) return;
        // このホロメンの赤エールが無ければ付け替え不可
        if (!(self.cheers || []).some((c) => c.color === '赤')) return;
        // 付け替え先の〈モココ・アビスガード〉1人（このホロメン自身は除く＝名前判定で十分だが念のため除外）
        const targets = ctx.holomems('self', (e) => ctx.nameIs(e.top, MOCOCO) && e.holomem !== self);
        if (targets.length === 0) return;

        const ok = yield ctx.confirm('赤エールを〈モココ・アビスガード〉に付け替えますか？');
        if (!ok) return;

        const target = yield ctx.chooseHolomem({
          side: 'self',
          filter: (e) => ctx.nameIs(e.top, MOCOCO) && e.holomem !== self,
          title: '赤エールの付け替え先〈モココ・アビスガード〉を選択',
        });
        if (!target) return;

        // 好きな枚数（このホロメンの赤エールの数まで・0枚で打ち切り可）を1枚ずつ付け替える
        while (true) {
          const redCheers = (self.cheers || []).filter((c) => c.color === '赤');
          if (redCheers.length === 0) break;
          const picked = yield ctx.chooseCard({
            cards: redCheers,
            title: `付け替える赤エールを選択（残り${redCheers.length}枚・任意）`,
            optional: true,
            skipLabel: 'ここまでにする',
          });
          if (!picked) break;
          ctx.moveCheer(picked, self, target.holomem);
        }
      },
    },
  },
};
