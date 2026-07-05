/**
 * IRyS (hBP08-008) ホロメン・白・Debut・HP130
 *
 * [コラボエフェクト] Promise of Spring:
 *   自分が後攻で最初のターンなら、自分のステージの#Promiseを持つホロメン1人を選ぶ。
 *   このターンの間、選んだホロメンのアーツ+30。
 *   さらに、自分のステージに紫エールがあるなら、自分のデッキを1枚引く。
 *   → 後攻最初のターン判定は ctx.isFirstTurnGoingSecond()。
 *      条件を満たさなければ何もしない。
 *      対象は自分のステージの #Promise ホロメン1人（必ず1人選ぶ。候補が無ければ何もしない）。
 *      アーツ+30 はこのターン限定の addTurnModifier（kind:'artsPlus', match=選んだホロメン）。
 *      「さらに」のドローは独立で、紫エールがステージにあるなら1枚引く
 *      （ctx.ownStageCheerColors() に '紫' が含まれるか。アーツ+30 の成否とは独立だが、
 *       条件「後攻最初のターン」は共通なので run 全体がその時のみ動く）。
 *
 * [アーツ] 芽吹く春（30 / any）: テキスト効果なし（素点ダメージのみ）。
 *
 * 保留: なし。
 */
export default {
  number: 'hBP08-008',

  collabEffect: {
    name: 'Promise of Spring',
    *run(ctx) {
      // 自分が後攻で最初のターンなら
      if (!ctx.isFirstTurnGoingSecond()) return;

      // 自分のステージの #Promise ホロメン1人を選ぶ
      const hasPromise = ctx.holomems('self',
        ({ top }) => (top.tags || []).includes('Promise')).length > 0;
      if (hasPromise) {
        const entry = yield ctx.chooseHolomem({
          side: 'self',
          filter: ({ top }) => (top.tags || []).includes('Promise'),
          title: 'このターンの間アーツ+30する#Promiseホロメンを選択',
        });
        if (entry) {
          const chosen = entry.holomem;
          ctx.addTurnModifier({
            kind: 'artsPlus', amount: 30, ownerIdx: ctx.playerIdx,
            match: (h) => h === chosen,
            description: `このターンの間、${chosen.stack[0].name} のアーツ+30`,
          });
        }
      } else {
        ctx.log('ステージに#Promiseホロメンがいない');
      }

      // さらに、自分のステージに紫エールがあるなら、デッキを1枚引く
      if (ctx.ownStageCheerColors().includes('紫')) {
        ctx.draw(1);
      }
    },
  },
};
