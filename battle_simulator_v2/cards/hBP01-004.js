/**
 * 兎田ぺこら (hBP01-004) 推しホロメン・緑
 *
 * 推しスキル「野兎たち～」[ホロパワー：-2][ターンに1回]:
 *   相手のターンで、自分のホロメンがダウンした時に使える：
 *   自分のダウンしたホロメン1人の緑エールすべてを、自分の他のホロメンに割り振って付け替える。
 *   → 【保留】「自分のホロメンがダウンした時に使える」タイミング割り込み推しスキルのため未実装。
 *      ダウン時にプレイヤーへ推しスキル発動を割り込みで問い合わせる機構が現状ないので、ここでは書かない。
 *
 * SP推しスキル「幸運兎」[ホロパワー：-3][ゲームに1回]:
 *   このターンの間、自分のサイコロの目の数すべてを6として扱う。
 *   → spOshiSkill（能動）として実装。
 *      addTurnModifier({kind:'diceFixed', value:6}) を積む。ctx.rollDice() が
 *      自分(playerIdx)の diceFixed 修正を参照して目を6に置き換える（context.js rollDice 参照）。
 *      ターン終了時に duration:'turn' の修正は自動消滅する。
 *      コスト[ホロパワー：-3]・[ゲームに1回]はエンジン側で処理するため run 内では書かない。
 */
export default {
  number: 'hBP01-004',
  spOshiSkill: {
    name: '幸運兎',
    *run(ctx) {
      ctx.addTurnModifier({
        kind: 'diceFixed',
        value: 6,
        ownerIdx: ctx.playerIdx,
        description: 'このターンの間、自分のサイコロの目をすべて6として扱う',
      });
    },
  },
};
