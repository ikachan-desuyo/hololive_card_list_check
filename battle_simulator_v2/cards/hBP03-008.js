/**
 * アユンダ・リス (hBP03-008) 推しホロメン・黄
 *
 * 推しスキル「ホロライブID一家」[ホロパワー：-2][ターンに1回]:
 *   自分の#ID1期生を持つホロメンがダウンした時に使える：自分のデッキを1枚引く。
 *   → ダウン処理中に使える推しスキル (12.1.5.2) として onDownOshiSkill で実装。
 *     ダウンしたホロメンが #ID1期生 を持つ場合に発火。ターン制限なし（テキストに
 *     「相手のターンで」等の制約は無いため、自分・相手どちらのターンでも対象）。
 *
 * SP推しスキル「がんばり～リス！」[ホロパワー：-2][ゲームに1回]:
 *   このターンの間、自分のステージの〈アユンダ・リス〉全員のアーツ+50。
 *   → メインステップの能動SP推しスキル。コストはエンジンが処理するので run では支払わない。
 */
import { EffectContext } from '../core/effects/context.js';

export default {
  number: 'hBP03-008',

  // 「（ホロメンが）ダウンした時に使える」推しスキル (11.3.1.1 / 12.1.5.2)
  onDownOshiSkill: {
    cost: 2,
    title: '推しスキル「ホロライブID一家」: デッキを1枚引きますか？',
    canUse(engine, ownerIdx, downedHolomem) {
      const p = engine.state.players[ownerIdx];
      const top = downedHolomem.stack[0];
      return !p.usedOshiSkillThisTurn &&        // [ターンに1回]
        p.holoPower.length >= 2 &&              // [ホロパワー：-2]
        (top?.tags || []).includes('ID1期生') &&
        p.deck.length >= 1;
    },
    apply(engine, ownerIdx) {
      const p = engine.state.players[ownerIdx];
      p.archive.push(...p.holoPower.splice(0, 2));
      p.usedOshiSkillThisTurn += 1;
      new EffectContext(engine, ownerIdx, {}).draw(1);
      engine.log('推しスキル「ホロライブID一家」: デッキを1枚引いた');
    },
  },

  // SP推しスキル「がんばり～リス！」[ホロパワー：-2][ゲームに1回]
  spOshiSkill: {
    *run(ctx) {
      ctx.addTurnModifier({
        kind: 'artsPlus',
        amount: 50,
        ownerIdx: ctx.playerIdx,
        match: (h) => h.stack[0]?.name === 'アユンダ・リス',
        description: 'このターンの間、自分のステージの〈アユンダ・リス〉全員のアーツ+50',
      });
    },
  },
};
