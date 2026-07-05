/**
 * アーニャ・メルフィッサ (hBP06-082) 黄・2nd・HP200（#ID #ID2期生 #語学）
 *
 * [ギフト]「眠らない街」（auraDamageDelta で実装）:
 *   [コラボポジション限定]自分の推しホロメンが〈アーニャ・メルフィッサ〉なら、
 *   自分の〈古代武器〉が付いている[センターホロメンとコラボホロメン]が受けるアーツダメージ-30。
 *   → auraDamageDelta（kind==='arts'限定の常時アウラ）で実装。このアーニャがコラボにいて推しがアーニャの時、
 *     〈古代武器〉付きのセンター/コラボが受けるアーツダメージ-30（damageReceivedDelta が集計）。
 *
 * [アーツ]「奇妙な来客」(70 / 特攻: 青+50):
 *   このターンに自分の推しスキル「神秘の儀式」を使っていたなら、
 *   自分のアーカイブの〈アーニャ・メルフィッサ〉1～3枚を手札に戻せる。
 *   ※「神秘の儀式」はアーニャ推し(hBP04-007)の通常推しスキル。
 *     エンジンは通常推しスキル使用を player.usedOshiSkillThisTurn で追跡する（SPはこのフラグを立てない）。
 *     アーニャ推しの通常スキルは「神秘の儀式」のみのため、
 *     推しが〈アーニャ・メルフィッサ〉かつ usedOshiSkillThisTurn を厳密条件とする。
 *   「1～3枚」「戻せる」=任意（0枚可）、最大3枚まで1枚ずつ選択。
 */
export default {
  number: 'hBP06-082',
  // ギフト「眠らない街」: [コラボ限定]推しが〈アーニャ・メルフィッサ〉なら、〈古代武器〉付きの前衛が受けるアーツダメージ-30
  auraDamageDelta(src, target, zone, engine, kind) {
    if (kind !== 'arts') return 0;                              // アーツダメージ-30
    if (engine._zoneOf(src) !== 'collab') return 0;            // [コラボ限定]（このアーニャ自身）
    const ownerIdx = engine.state.players.findIndex((p) => engine._stageHolomems(p).includes(src));
    if (ownerIdx < 0) return 0;
    if (engine.state.players[ownerIdx].oshi?.name !== 'アーニャ・メルフィッサ') return 0; // 推しがアーニャ
    if (zone !== 'center' && zone !== 'collab') return 0;       // センター/コラボの
    if (!target.attachments.some((a) => a.name === '古代武器')) return 0; // 〈古代武器〉が付いている
    return -30;
  },
  arts: {
    '奇妙な来客': {
      *run(ctx) {
        const oshi = ctx.player.oshi;
        // 推しが〈アーニャ・メルフィッサ〉で、このターンに通常推しスキル（=神秘の儀式）を使っていること
        if (!oshi || oshi.name !== 'アーニャ・メルフィッサ' || !ctx.player.usedOshiSkillThisTurn) return;

        // 最大3枚まで、アーカイブの〈アーニャ・メルフィッサ〉を手札に戻す（0枚可）
        const candidates = ctx.player.archive.filter((c) => c.name === 'アーニャ・メルフィッサ');
        const picked = yield ctx.chooseCards({
          cards: candidates,
          min: 0, max: 3,
          title: 'アーカイブの〈アーニャ・メルフィッサ〉を手札に戻す（最大3枚・任意）',
        });
        for (const c of picked) {
          ctx.removeFromArchive(c);
          ctx.addToHand(c);
        }
      },
    },
  },
};
