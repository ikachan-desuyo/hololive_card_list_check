/**
 * セシリア・イマーグリーン (hBP08-025) ホロメン・緑・1st・HP160
 *
 * [コラボエフェクト] 喫茶の時間:
 *   自分のお休みしている#Justiceを持つホロメンが2人以上いるなら、
 *   このターンの間、自分のステージのホロメン全員のアーツ+20。
 *   → 条件: 自分のステージ上で rested（お休み）かつ #Justice タグを持つホロメンが2人以上。
 *      お休みしているホロメンはバック等にいてもステージ上なので ctx.holomems('self') で走査し、
 *      holomem.rested と #Justice タグで数える。
 *      満たすなら addTurnModifier(kind:'artsPlus') を「自分のステージのホロメン全員」に適用
 *      （match=オーナーのステージ上にいる全ホロメン。ターン終了で自動消滅）。
 *
 * [アーツ] 休憩も大事でしょ？（30 / any）: テキスト効果なし（素点ダメージのみ）。
 *
 * 保留: なし。
 */
export default {
  number: 'hBP08-025',

  collabEffect: {
    name: '喫茶の時間',
    *run(ctx) {
      // 自分のお休みしている#Justiceホロメンが2人以上か
      const restedJustice = ctx.holomems('self',
        ({ holomem, top }) => holomem.rested && (top.tags || []).includes('Justice')).length;
      if (restedJustice < 2) {
        ctx.log('お休みしている#Justiceホロメンが2人未満のため効果なし');
        return;
      }
      // このターンの間、自分のステージのホロメン全員のアーツ+20
      const owner = ctx.playerIdx;
      ctx.addTurnModifier({
        kind: 'artsPlus', amount: 20, ownerIdx: owner,
        match: (h) => {
          const p = ctx.engine.state.players[owner];
          return ctx.engine._stagePositions(p)
            .some((q) => ctx.engine._holomemAt(p, q) === h);
        },
        description: 'このターンの間、自分のステージのホロメン全員のアーツ+20',
      });
    },
  },
};
