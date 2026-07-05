/**
 * セシリア・イマーグリーン (hBP08-026) ホロメン・緑・2nd・HP200（#EN #Justice #語学）
 *
 * [コラボエフェクト] 機巧のシュトライヒ:
 *   自分のお休みしている#Justiceを持つホロメンが2人以上いるなら、
 *   このターンの間、このホロメンのアーツ+50。
 *   → お休み判定は holomem.rested。#Justice タグ保持かつ rested の自分ホロメンを数え、
 *     2人以上なら自分（sourceHolomem）に artsPlus+50 のターン限定修正を付与する。
 *     条件を満たさなければ何もしない。
 *
 * [アーツ] 奏楽のヴィンデ（90 / green+any、特攻: 青+50）: テキスト効果なし（素点＋特攻のみ。エンジン処理）。
 *
 * 保留: なし。
 */
export default {
  number: 'hBP08-026',

  collabEffect: {
    name: '機巧のシュトライヒ',
    *run(ctx) {
      // 自分のお休みしている#Justiceホロメンを数える
      const restingJustice = ctx.holomems('self',
        ({ holomem, top }) => holomem.rested && (top.tags || []).includes('Justice')).length;
      if (restingJustice < 2) {
        ctx.log('お休みしている#Justiceホロメンが2人未満のため、アーツ+50は発動しない');
        return;
      }
      const self = ctx.sourceHolomem;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 50, ownerIdx: ctx.playerIdx,
        match: (h) => h === self,
        description: `このターンの間、${self.stack[0].name} のアーツ+50`,
      });
    },
  },
};
