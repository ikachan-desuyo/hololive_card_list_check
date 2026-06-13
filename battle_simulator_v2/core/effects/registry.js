/**
 * カード効果レジストリ
 *
 * 個別カードの効果定義は battle_simulator_v2/cards/<カードナンバー>.js に置き、
 * cards/index.js の IMPLEMENTED に登録する（動的 import で遅延読み込み）。
 *
 * カード定義の形式:
 *   export default {
 *     number: 'hBP04-048',
 *     bloomEffect:  { name, *run(ctx) {...} },          // ブルームエフェクト (13.3)
 *     collabEffect: { name, *run(ctx) {...} },          // コラボエフェクト (13.2)
 *     giftEffect:   { name, *run(ctx) {...} },          // ギフト (13.4) ※未対応
 *     arts: { 'アーツ名': {
 *       *run(ctx) {...},                                 // テキスト効果（パイプライン段階4）
 *       dmgBonus(ctx) { return N; },                     // 条件付き「このアーツ+N」
 *     } },
 *     support: {
 *       canUse(ctx) { return bool; },                    // 追加の使用条件
 *       *run(ctx) {...},                                 // サポート効果本体
 *     },
 *     attached: {                                        // 付いている間の常時修正
 *       artsPlus(holomem, engine) { return N; },
 *       hpPlus(holomem, engine) { return N; },
 *       specialDmgPlus(sourceHolomem, targetEntry, engine) { return N; },
 *     },
 *     attachRule: {                                      // 付け先制限（雪民など）
 *       canAttach(holomem) { return bool; },
 *       unlimited: true,                                 // 1人に何枚でも
 *     },
 *     ai: {                                              // AI用のカード固有知識（任意）
 *       supportValue({ engine, player, card }) {},       // サポートの使用価値（0=使わない）
 *     },
 *     oshiSkill / spOshiSkill: { canUse(engine, idx), *run(ctx) },
 *     onDownOshiSkill: { cost, title, canUse(engine, idx, holomem), apply(engine, idx, holomem) },
 *   }
 *
 * 設計原則: カード固有の知識（効果もAI評価も）は必ずこのカード定義に置く。
 * エンジンや core/ai/heuristic.js にカード番号を直書きしない（実装対象は874種ある）。
 * ai ブロックが無いカードは、AIがカードテキストのパターンから汎用評価する。
 */

import { IMPLEMENTED } from '../../cards/index.js';
import { compileCard } from './text-compiler.js';

export class EffectRegistry {
  constructor() {
    this.defs = new Map(); // number -> def
  }

  /**
   * デッキ内カードの効果定義を事前読み込みする（ゲーム開始時に呼ぶ）。
   * 優先順: 手書き定義（cards/<番号>.js） > テキストコンパイラの自動実装 > 未実装
   * lib (CardLibrary) を渡すと自動コンパイルが有効になる。
   */
  async preload(numbers, lib = null) {
    const unique = [...new Set(numbers)];
    await Promise.all(unique.map(async (number) => {
      if (this.defs.has(number)) return;
      const loader = IMPLEMENTED[number];
      if (loader) {
        try {
          const mod = await loader();
          this.defs.set(number, mod.default);
          return;
        } catch (e) {
          console.error(`カード効果の読み込み失敗: ${number}`, e);
        }
      }
      if (lib) {
        const card = lib.getByNumber(number);
        if (card) {
          try {
            const compiled = compileCard(card);
            if (compiled) this.defs.set(number, compiled);
          } catch (e) {
            console.error(`カード効果の自動コンパイル失敗: ${number}`, e);
          }
        }
      }
    }));
  }

  get(number) {
    return this.defs.get(number) || null;
  }

  /** アーツ定義の取得（アーツ名で引く） */
  getArt(number, artName) {
    return this.get(number)?.arts?.[artName] || null;
  }
}
