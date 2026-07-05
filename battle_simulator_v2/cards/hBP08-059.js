/**
 * フワワ・アビスガード (hBP08-059) 青・ホロメン・2nd・HP210（#EN #Advent #ケモミミ）
 *
 * [キーワード:ギフト]「深淵からの愛情」:
 *   自分のステージに赤エールが6枚以上あるなら、このホロメンのアーツは、相手のDebut以外のバックホロメンも対象にできる。
 *   → artTargetExtraTargets（受動アウラ。engine._performanceActions が対象生成時に評価）で実装。
 *     自分のステージの赤エールが6枚以上なら、相手のDebut以外のバックホロメンを対象に追加する。
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
 */
const MOCOCO = 'モココ・アビスガード';

export default {
  number: 'hBP08-059',

  // ギフト「深淵からの愛情」: 自分のステージに赤エール6枚以上なら、このホロメンのアーツは相手のDebut以外バックも対象にできる
  artTargetExtraTargets(h, engine, opp) {
    const owner = engine.state.players.find((p) => engine._stageHolomems(p).includes(h));
    if (!owner) return [];
    let red = 0;
    for (const sh of engine._stageHolomems(owner)) red += (sh.cheers || []).filter((c) => c.color === '赤').length;
    if (red < 6) return [];
    const extra = [];
    opp.back.forEach((b, bi) => {
      if (b && b.stack[0].bloomLevel !== 'Debut') extra.push({ zone: 'back', index: bi });
    });
    return extra;
  },

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

        // 好きな枚数（このホロメンの赤エールの数まで・0枚可）をまとめて付け替える
        const redCheers = (self.cheers || []).filter((c) => c.color === '赤');
        const picked = yield ctx.chooseCards({
          cards: redCheers,
          min: 0,
          title: '付け替える赤エールを選択（好きな枚数・任意）',
        });
        for (const cheer of picked) {
          ctx.moveCheer(cheer, self, target.holomem);
        }
      },
    },
  },
};
