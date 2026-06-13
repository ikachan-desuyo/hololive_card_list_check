/**
 * アーニャ・メルフィッサ (hBP06-082) 黄・2nd・HP200（#ID #ID2期生 #語学）
 *
 * [ギフト]「眠らない街」（未実装・保留）:
 *   [コラボポジション限定]自分の推しホロメンが〈アーニャ・メルフィッサ〉なら、
 *   自分の〈古代武器〉が付いている[センターホロメンとコラボホロメン]が受けるアーツダメージ-30。
 *   → 別ホロメンへの「アーツダメージ限定」被ダメージ軽減オーラ。
 *     現エンジンの被ダメージ軽減(damageReceivedDelta)は装着カード起点かつアーツ/特殊の区別が無いため、
 *     この常時アウラ（被ダメージ割り込み）は規約上の保留機構に該当する。未実装。
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
  arts: {
    '奇妙な来客': {
      *run(ctx) {
        const oshi = ctx.player.oshi;
        // 推しが〈アーニャ・メルフィッサ〉で、このターンに通常推しスキル（=神秘の儀式）を使っていること
        if (!oshi || oshi.name !== 'アーニャ・メルフィッサ' || !ctx.player.usedOshiSkillThisTurn) return;

        // 最大3枚まで、アーカイブの〈アーニャ・メルフィッサ〉を1枚ずつ手札に戻す（0枚可）
        for (let i = 0; i < 3; i++) {
          const candidates = ctx.player.archive.filter((c) => c.name === 'アーニャ・メルフィッサ');
          if (candidates.length === 0) break;
          const picked = yield ctx.chooseCard({
            cards: candidates,
            title: `アーカイブの〈アーニャ・メルフィッサ〉を手札に戻す（${i + 1}/3・任意）`,
            optional: true,
            skipLabel: 'これ以上戻さない',
          });
          if (!picked) break;
          ctx.removeFromArchive(picked);
          ctx.addToHand(picked);
        }
      },
    },
  },
};
